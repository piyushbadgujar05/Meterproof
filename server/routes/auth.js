const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { sendVerificationEmail } = require('../utils/sendEmail');

/**
 * Generate secure verification token
 */
function generateVerifyToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    return { token, hashedToken, expires };
}

// Register
router.post('/register', async (req, res) => {
    const { name, mobile, email, password } = req.body;
    
    try {
        // Check if email exists
        let existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ msg: 'Email already registered' });
        }

        // Check if mobile exists
        existingUser = await User.findOne({ mobile });
        if (existingUser) {
            return res.status(409).json({ msg: 'Mobile number already registered' });
        }

        // Generate verification token
        const { token, hashedToken, expires } = generateVerifyToken();

        // Create user
        const user = new User({ 
            name, 
            mobile, 
            email: email.toLowerCase(), 
            password,
            emailVerified: false,
            emailVerifyToken: hashedToken,
            emailVerifyExpires: expires
        });
        
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        // Send verification email
        await sendVerificationEmail(user, token);

        res.status(201).json({ 
            msg: 'Registration successful! Please check your email to verify your account.',
            emailSent: true
        });
    } catch (err) {
        console.error('❌ Register error:', err);
        if (err.code === 11000) {
            // Duplicate key error
            const field = Object.keys(err.keyPattern)[0];
            return res.status(409).json({ msg: `${field} already registered` });
        }
        res.status(500).json({ msg: 'Server error during registration' });
    }
});

// Verify Email
router.get('/verify-email/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        // Hash the token from URL
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        
        // Find user with this token and valid expiry
        const user = await User.findOne({
            emailVerifyToken: hashedToken,
            emailVerifyExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid or expired verification link' });
        }

        // Mark as verified
        user.emailVerified = true;
        user.emailVerifyToken = undefined;
        user.emailVerifyExpires = undefined;
        await user.save();

        res.json({ msg: 'Email verified successfully! You can now login.' });
    } catch (err) {
        console.error('❌ Verify email error:', err);
        res.status(500).json({ msg: 'Server error during verification' });
    }
});

// Resend Verification Email
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ msg: 'Email is required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.status(404).json({ msg: 'No account found with this email' });
        }

        if (user.emailVerified) {
            return res.status(400).json({ msg: 'Email is already verified' });
        }

        // Generate new token
        const { token, hashedToken, expires } = generateVerifyToken();
        user.emailVerifyToken = hashedToken;
        user.emailVerifyExpires = expires;
        await user.save();

        // Send email
        await sendVerificationEmail(user, token);

        res.json({ msg: 'Verification email sent! Please check your inbox.' });
    } catch (err) {
        console.error('❌ Resend verification error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ msg: 'Please provide email and password' });
    }
    
    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ msg: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ msg: 'Invalid credentials' });
        }

        // Check email verification
        if (!user.emailVerified) {
            return res.status(403).json({ 
                msg: 'Email not verified. Please check your inbox.',
                needsVerification: true,
                email: user.email
            });
        }

        const payload = { user: { id: user.id } };
        jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: 360000 }, (err, token) => {
            if (err) {
                console.error('❌ JWT sign error:', err);
                return res.status(500).json({ msg: 'Token generation failed' });
            }
            res.json({ token });
        });
    } catch (err) {
        console.error('❌ Login error:', err);
        res.status(500).json({ msg: 'Server error during login' });
    }
});

// Get User (Check Auth)
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password -emailVerifyToken');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error('❌ Get user error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Update UPI ID (Owner)
router.put('/upi', auth, async (req, res) => {
    try {
        const { upiId } = req.body;
        
        if (!upiId) {
            return res.status(400).json({ msg: 'UPI ID is required' });
        }
        
        const upiRegex = /^[\w.\-]+@[\w]+$/;
        if (!upiRegex.test(upiId)) {
            return res.status(400).json({ msg: 'Invalid UPI ID format (e.g., name@upi)' });
        }
        
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { upiId },
            { new: true }
        ).select('-password -emailVerifyToken');
        
        res.json({ msg: 'UPI ID updated successfully', user });
    } catch (err) {
        console.error('❌ Update UPI error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router;
