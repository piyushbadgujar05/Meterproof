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
    // UPI Payment tracking
    payment: {
        upiId: { type: String },              // Owner's UPI ID at bill creation
        status: { 
            type: String, 
            enum: ['PENDING', 'TENANT_CONFIRMED', 'PAID'], 
            default: 'PENDING' 
        },
        tenantConfirmedAt: { type: Date },    // When tenant clicked "I have paid"
        ownerConfirmedAt: { type: Date },     // When owner confirmed payment
        referenceId: { type: String }         // UPI transaction reference (optional)
    }
});

module.exports = mongoose.model('Bill', BillSchema);
