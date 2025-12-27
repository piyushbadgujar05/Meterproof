const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const auth = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const puppeteer = require('puppeteer');
const pdfTemplate = require('../utils/pdfTemplate');
const sendBillSMS = require('../utils/sendSMS');
const generateUpiLink = require('../utils/generateUpiLink');
const { sendPaymentConfirmationToTenant, sendPaymentConfirmationToOwner } = require('../utils/sendEmail');

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer Storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'meterproof',
    format: async () => 'jpg',
    public_id: (req, file) => file.fieldname + '-' + Date.now(),
    transformation: [{ width: 800, crop: 'limit' }]
  }
});
const upload = multer({ storage });

// Get All Bills (History)
router.get('/', auth, async (req, res, next) => {
  try {
    const bills = await Bill.find({ ownerId: req.user.id }).sort({ month: -1 });
    res.json(bills);
  } catch (err) {
    next(err);
  }
});

// Get Last Bill (For Billing Screen)
router.get('/last', auth, async (req, res, next) => {
  try {
    const bill = await Bill.findOne({ ownerId: req.user.id }).sort({ month: -1 });
    res.json(bill);
  } catch (err) {
    next(err);
  }
});

// Create Bill
router.post('/', [auth, upload.single('currentPhoto')], async (req, res, next) => {
  try {
    const { currentReading, month } = req.body;

    const tenant = await Tenant.findOne({ ownerId: req.user.id });
    if (!tenant) return res.status(400).json({ msg: 'Tenant setup required' });

    let existingBill = await Bill.findOne({ ownerId: req.user.id, month });
    if (existingBill) return res.status(400).json({ msg: 'Bill for this month already exists' });

    const lastBill = await Bill.findOne({ ownerId: req.user.id }).sort({ month: -1 });
    let previousReading = 0;
    let previousPhotoUrl = '';
    if (lastBill) {
      previousReading = lastBill.currentReading;
      previousPhotoUrl = lastBill.currentPhotoUrl;
    }

    const units = currentReading - previousReading;
    if (units < 0) return res.status(400).json({ msg: 'Current reading cannot be less than previous reading' });

    const amount = units * tenant.unitRate;

    const currentPhotoUrl = req.file ? req.file.path : '';
    if (!currentPhotoUrl) return res.status(400).json({ msg: 'Photo is mandatory' });

    // Get owner's UPI ID
    const owner = await User.findById(req.user.id);

    const newBill = new Bill({
      ownerId: req.user.id,
      tenantId: tenant._id,
      month,
      previousReading,
      currentReading,
      units,
      amount,
      unitRate: tenant.unitRate,
      previousPhotoUrl,
      currentPhotoUrl,
      status: 'UNPAID',
      // Initialize payment object with owner's UPI
      payment: {
        upiId: owner.upiId || '',
        status: 'PENDING'
      }
    });

    await newBill.save();

    // Generate PDF before sending SMS
    try {
      const populated = await Bill.findById(newBill._id)
        .populate('tenantId', 'name mobile unitRate')
        .populate('ownerId', 'name mobile');

      const htmlContent = pdfTemplate({
        bill: populated,
        owner: populated.ownerId,
        tenant: populated.tenantId
      });

      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
      });
      await browser.close();

      if (!newBill.smsSent) {
        const frontendUrl = process.env.FRONTEND_URL || '';
        const billLink = `${frontendUrl}/view-bill/${newBill._id}`;
        await sendBillSMS(tenant, newBill, billLink);
        newBill.smsSent = true;
        newBill.smsSentAt = new Date();
        await newBill.save();
      }
    } catch (e) {
      console.error('Post-save PDF/SMS flow failed:', e.message);
    }

    res.json(newBill);
  } catch (err) {
    next(err);
  }
});

// Generate PDF (Public) - Works on both local and Render
router.post('/:id/generate-pdf', async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('tenantId', 'name mobile unitRate')
      .populate('ownerId', 'name mobile');
    if (!bill) return res.status(404).json({ msg: 'Bill not found' });

    const htmlContent = pdfTemplate({
      bill,
      owner: bill.ownerId,
      tenant: bill.tenantId
    });

    let browser;
    try {
      // Use puppeteer-core with chromium on production (Render)
      if (process.env.NODE_ENV === 'production') {
        const chromium = require('@sparticuz/chromium');
        browser = await puppeteer.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless
        });
      } else {
        // Local development
        browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
      }
    } catch (browserErr) {
      console.error('❌ Browser launch failed:', browserErr.message);
      return res.status(500).json({ msg: 'PDF generation temporarily unavailable' });
    }

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    });
    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdfBuffer.length,
      'Content-Disposition': `attachment; filename="MeterProof_Bill_${bill.month}.pdf"`
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('❌ PDF generation error:', err.message);
    next(err);
  }
});

// Get Single Bill (Public) - includes UPI link if payment pending
router.get('/:id', async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('tenantId', 'name mobile unitRate')
      .populate('ownerId', 'name mobile upiId');
    if (!bill) return res.status(404).json({ msg: 'Bill not found' });
    
    // Generate UPI link if payment is pending and UPI ID exists
    let upiLink = null;
    if (bill.status === 'UNPAID' && bill.payment?.upiId) {
      upiLink = generateUpiLink({
        upiId: bill.payment.upiId,
        name: bill.ownerId?.name || 'Owner',
        amount: bill.amount,
        note: `Electricity Bill ${bill.month}`
      });
    }
    
    res.json({
      ...bill.toObject(),
      upiLink
    });
  } catch (err) {
    next(err);
  }
});

// Toggle Status (Owner Only)
router.put('/:id/status', auth, async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ msg: 'Bill not found' });
    if (bill.ownerId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    bill.status = bill.status === 'UNPAID' ? 'PAID' : 'UNPAID';
    
    // Update payment status when owner marks as paid
    if (bill.status === 'PAID' && bill.payment) {
      bill.payment.status = 'PAID';
      bill.payment.ownerConfirmedAt = new Date();
    } else if (bill.payment) {
      bill.payment.status = 'PENDING';
      bill.payment.ownerConfirmedAt = null;
    }
    
    await bill.save();
    const populatedBill = await Bill.findById(req.params.id)
      .populate('tenantId', 'name mobile unitRate')
      .populate('ownerId', 'name mobile upiId');
    res.json(populatedBill);
  } catch (err) {
    next(err);
  }
});

// Tenant confirms payment (Public - no auth required)
router.post('/:id/tenant-confirm', async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ msg: 'Bill not found' });
    
    if (bill.status === 'PAID') {
      return res.status(400).json({ msg: 'Bill is already paid' });
    }
    
    // Update payment status
    if (!bill.payment) bill.payment = {};
    bill.payment.status = 'TENANT_CONFIRMED';
    bill.payment.tenantConfirmedAt = new Date();
    
    await bill.save();
    
    const populatedBill = await Bill.findById(req.params.id)
      .populate('tenantId', 'name mobile unitRate')
      .populate('ownerId', 'name mobile');
    
    res.json({ 
      msg: 'Payment confirmation recorded. Owner will verify and confirm.',
      bill: populatedBill 
    });
  } catch (err) {
    next(err);
  }
});

// Owner confirms payment received (Requires auth)
router.put('/:id/owner-confirm', auth, async (req, res, next) => {
  try {
    const { referenceId } = req.body;
    const bill = await Bill.findById(req.params.id)
      .populate('tenantId', 'name mobile email')
      .populate('ownerId', 'name mobile email upiId');
    
    if (!bill) return res.status(404).json({ msg: 'Bill not found' });
    if (bill.ownerId._id.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    
    // Mark as paid
    bill.status = 'PAID';
    if (!bill.payment) bill.payment = {};
    bill.payment.status = 'PAID';
    bill.payment.ownerConfirmedAt = new Date();
    if (referenceId) bill.payment.referenceId = referenceId;
    
    await bill.save();
    
    // Send confirmation emails
    try {
      await sendPaymentConfirmationToOwner({
        tenant: bill.tenantId,
        bill: bill,
        owner: bill.ownerId
      });
      console.log('✅ Payment confirmation email sent to owner');
    } catch (emailErr) {
      console.error('❌ Email to owner failed:', emailErr.message);
    }
    
    res.json(bill);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

