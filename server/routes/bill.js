const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const Tenant = require('../models/Tenant');
const auth = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const puppeteer = require('puppeteer');
const pdfTemplate = require('../utils/pdfTemplate');
const sendBillSMS = require('../utils/sendSMS');

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
      status: 'UNPAID'
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

// Generate PDF (Public)
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

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
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
    next(err);
  }
});

// Get Single Bill (Public)
router.get('/:id', async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('tenantId', 'name mobile unitRate')
      .populate('ownerId', 'name mobile');
    if (!bill) return res.status(404).json({ msg: 'Bill not found' });
    res.json(bill);
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
    await bill.save();
    const populatedBill = await Bill.findById(req.params.id)
      .populate('tenantId', 'name mobile unitRate')
      .populate('ownerId', 'name mobile');
    res.json(populatedBill);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

