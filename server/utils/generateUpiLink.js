/**
 * Generate UPI Deep Link for payment
 * Works with GPay, PhonePe, Paytm, and other UPI apps
 * 
 * @param {Object} options
 * @param {string} options.upiId - Payee UPI ID (e.g., owner@upi)
 * @param {string} options.name - Payee name
 * @param {number} options.amount - Amount in INR
 * @param {string} options.note - Transaction note/description
 * @returns {string} UPI deep link URL
 */
function generateUpiLink({ upiId, name, amount, note }) {
    if (!upiId || !amount) {
        throw new Error('UPI ID and amount are required');
    }

    const params = new URLSearchParams({
        pa: upiId,                           // Payee address (UPI ID)
        pn: name || 'MeterProof Payment',    // Payee name
        am: amount.toFixed(2),               // Amount (2 decimal places)
        cu: 'INR',                           // Currency
        tn: note || 'Electricity Bill Payment' // Transaction note
    });

    return `upi://pay?${params.toString()}`;
}

module.exports = generateUpiLink;
