const mongoose = require('mongoose');

const BillSchema = new mongoose.Schema({
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    month: { type: String, required: true },
    previousReading: { type: Number, required: true },
    currentReading: { type: Number, required: true },
    units: { type: Number, required: true },
    amount: { type: Number, required: true },
    unitRate: { type: Number, required: true },
    previousPhotoUrl: { type: String },
    currentPhotoUrl: { type: String, required: true },
    status: { type: String, enum: ['UNPAID', 'PAID'], default: 'UNPAID' },
    createdAt: { type: Date, default: Date.now },
    revisionOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill' },
    smsSent: { type: Boolean, default: false },
    smsSentAt: { type: Date },
    // Payment tracking (supports UPI + Razorpay)
    payment: {
        // UPI manual flow
        upiId: { type: String },
        tenantConfirmedAt: { type: Date },
        ownerConfirmedAt: { type: Date },
        
        // Razorpay flow
        razorpayOrderId: { type: String },
        razorpayPaymentId: { type: String },
        razorpaySignature: { type: String },
        method: { type: String }, // upi, card, netbanking, etc.
        
        // Common
        status: { 
            type: String, 
            enum: ['PENDING', 'TENANT_CONFIRMED', 'PAID', 'FAILED'], 
            default: 'PENDING' 
        },
        paidAt: { type: Date },
        referenceId: { type: String }
    }
});

module.exports = mongoose.model('Bill', BillSchema);
