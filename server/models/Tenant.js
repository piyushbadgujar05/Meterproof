const mongoose = require('mongoose');

const TenantSchema = new mongoose.Schema({
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true }, // One tenant per owner
    name: { type: String, required: true },
    mobile: { type: String },
    language: { type: String, enum: ['en', 'mr'], default: 'en' },
    unitRate: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tenant', TenantSchema);
