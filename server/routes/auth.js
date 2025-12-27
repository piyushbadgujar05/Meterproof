const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
    const { name, mobile, email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'User already exists' });

        user = new User({ name, mobile, email, password });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        const payload = { user: { id: user.id } };
        jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: 360000 }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });
    } catch (err) {
        console.error('❌ Register error:', err);
        // Handle MongoDB duplicate key error
        if (err.code === 11000) {
            return res.status(400).json({ msg: 'Email already registered' });
        }
        res.status(500).json({ msg: 'Server error during registration' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
        return res.status(400).json({ msg: 'Please provide email and password' });
    }
    
    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ msg: 'Invalid Credentials' });
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
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error('❌ Get user error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router;
