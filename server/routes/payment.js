const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const auth = require('../middleware/auth');
const { createOrder, verifyPayment, verifyWebhook } = require('../utils/razorpay');
const { sendPaymentConfirmationToOwner } = require('../utils/sendEmail');

/**
 * Create Razorpay order for a bill
 * POST /api/payment/create-order
 */
router.post('/create-order', async (req, res) => {
    try {
        const { billId } = req.body;
        
        if (!billId) {
            return res.status(400).json({ msg: 'Bill ID is required' });
        }
        
        const bill = await Bill.findById(billId)
            .populate('tenantId', 'name mobile')
            .populate('ownerId', 'name mobile email');
        
        if (!bill) {
            return res.status(404).json({ msg: 'Bill not found' });
        }
        
        if (bill.status === 'PAID') {
            return res.status(400).json({ msg: 'Bill is already paid' });
        }
        
        // Create Razorpay order
        const order = await createOrder(bill.amount, billId);
        
        // Store order ID in bill
        bill.payment = bill.payment || {};
        bill.payment.razorpayOrderId = order.id;
        await bill.save();
        
        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
            billId: bill._id,
            tenant: bill.tenantId?.name,
            description: `Electricity Bill - ${bill.month}`
        });
    } catch (err) {
        console.error('❌ Create order error:', err);
        res.status(500).json({ msg: 'Failed to create payment order' });
    }
});

/**
 * Verify payment after Razorpay checkout
 * POST /api/payment/verify
 */
router.post('/verify', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, billId } = req.body;
        
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ msg: 'Missing payment details' });
        }
        
        // Verify signature
        const isValid = verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);
        
        if (!isValid) {
            console.error('❌ Invalid payment signature');
            return res.status(400).json({ msg: 'Payment verification failed' });
        }
        
        // Find bill by order ID
        const bill = await Bill.findOne({ 'payment.razorpayOrderId': razorpay_order_id })
            .populate('tenantId', 'name mobile email')
            .populate('ownerId', 'name mobile email');
        
        if (!bill) {
            return res.status(404).json({ msg: 'Bill not found for this order' });
        }
        
        // Mark as paid
        bill.status = 'PAID';
        bill.payment.razorpayPaymentId = razorpay_payment_id;
        bill.payment.razorpaySignature = razorpay_signature;
        bill.payment.status = 'PAID';
        bill.payment.paidAt = new Date();
        await bill.save();
        
        console.log('✅ Payment verified and bill marked as PAID:', bill._id);
        
        // Send confirmation email to owner
        try {
            await sendPaymentConfirmationToOwner({
                tenant: bill.tenantId,
                bill: bill,
                owner: bill.ownerId
            });
        } catch (emailErr) {
            console.error('❌ Email failed:', emailErr.message);
        }
        
        res.json({ 
            success: true, 
            msg: 'Payment verified successfully',
            bill: bill
        });
    } catch (err) {
        console.error('❌ Verify payment error:', err);
        res.status(500).json({ msg: 'Payment verification failed' });
    }
});

/**
 * Razorpay Webhook Handler
 * POST /api/payment/webhook
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const signature = req.headers['x-razorpay-signature'];
        const body = req.body.toString();
        
        // Verify webhook signature
        if (!verifyWebhook(body, signature)) {
            console.error('❌ Invalid webhook signature');
            return res.status(400).json({ msg: 'Invalid signature' });
        }
        
        const event = JSON.parse(body);
        console.log('📥 Webhook event:', event.event);
        
        if (event.event === 'payment.captured') {
            const payment = event.payload.payment.entity;
            const orderId = payment.order_id;
            
            const bill = await Bill.findOne({ 'payment.razorpayOrderId': orderId })
                .populate('tenantId', 'name mobile email')
                .populate('ownerId', 'name mobile email');
            
            if (bill && bill.status !== 'PAID') {
                bill.status = 'PAID';
                bill.payment.razorpayPaymentId = payment.id;
                bill.payment.status = 'PAID';
                bill.payment.method = payment.method;
                bill.payment.paidAt = new Date();
                await bill.save();
                
                console.log('✅ Webhook: Bill marked as PAID via webhook:', bill._id);
                
                // Send notifications
                try {
                    await sendPaymentConfirmationToOwner({
                        tenant: bill.tenantId,
                        bill: bill,
                        owner: bill.ownerId
                    });
                } catch (emailErr) {
                    console.error('❌ Webhook email failed:', emailErr.message);
                }
            }
        }
        
        res.json({ status: 'ok' });
    } catch (err) {
        console.error('❌ Webhook error:', err);
        res.status(500).json({ msg: 'Webhook processing failed' });
    }
});

/**
 * Get payment status for a bill
 * GET /api/payment/status/:billId
 */
router.get('/status/:billId', async (req, res) => {
    try {
        const bill = await Bill.findById(req.params.billId);
        
        if (!bill) {
            return res.status(404).json({ msg: 'Bill not found' });
        }
        
        res.json({
            billId: bill._id,
            amount: bill.amount,
            status: bill.status,
            payment: bill.payment
        });
    } catch (err) {
        console.error('❌ Get payment status error:', err);
        res.status(500).json({ msg: 'Failed to get payment status' });
    }
});

module.exports = router;
