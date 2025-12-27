const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    mobile: { 
        type: String, 
        required: true, 
        unique: true,
        index: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true,
        index: true 
    },
    password: { type: String, required: true },
    upiId: { type: String, default: '' },
    
    // Email verification
    emailVerified: { type: Boolean, default: false },
    emailVerifyToken: String,
    emailVerifyExpires: Date,
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
