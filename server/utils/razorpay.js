const Razorpay = require('razorpay');

let razorpayInstance = null;

/**
 * Get Razorpay instance (lazy init)
 */
function getRazorpay() {
    if (razorpayInstance) return razorpayInstance;
    
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!keyId || !keySecret) {
        console.warn('⚠️ Razorpay credentials not set. Payment features disabled.');
        return null;
    }
    
    razorpayInstance = new Razorpay({
        key_id: keyId,
        key_secret: keySecret
    });
    
    console.log('✅ Razorpay initialized');
    return razorpayInstance;
}

/**
 * Create Razorpay order
 * @param {number} amount - Amount in rupees
 * @param {string} billId - Bill ID for reference
 * @returns {Promise<Object>} Razorpay order object
 */
async function createOrder(amount, billId) {
    const razorpay = getRazorpay();
    if (!razorpay) throw new Error('Razorpay not configured');
    
    const options = {
        amount: Math.round(amount * 100), // Razorpay expects paise
        currency: 'INR',
        receipt: `bill_${billId}`,
        notes: {
            billId: billId
        }
    };
    
    const order = await razorpay.orders.create(options);
    console.log('✅ Razorpay order created:', order.id);
    return order;
}

/**
 * Verify Razorpay payment signature
 * @param {string} orderId - Razorpay order ID
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} signature - Razorpay signature
 * @returns {boolean} Whether signature is valid
 */
function verifyPayment(orderId, paymentId, signature) {
    const crypto = require('crypto');
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
    
    return expectedSignature === signature;
}

/**
 * Verify Razorpay webhook signature
 * @param {string} body - Raw request body
 * @param {string} signature - X-Razorpay-Signature header
 * @returns {boolean} Whether webhook is authentic
 */
function verifyWebhook(body, signature) {
    const crypto = require('crypto');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
        console.warn('⚠️ RAZORPAY_WEBHOOK_SECRET not set');
        return false;
    }
    
    const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');
    
    return expectedSignature === signature;
}

module.exports = {
    getRazorpay,
    createOrder,
    verifyPayment,
    verifyWebhook
};
