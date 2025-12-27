const express = require('express');
const router = express.Router();
const Tenant = require('../models/Tenant');
const auth = require('../middleware/auth');

// Create Tenant (Setup)
router.post('/', auth, async (req, res) => {
    const { name, mobile, unitRate } = req.body;
    try {
        let tenant = await Tenant.findOne({ ownerId: req.user.id });
        if (tenant) return res.status(400).json({ msg: 'Tenant already exists' });

        tenant = new Tenant({
            ownerId: req.user.id,
            name,
            mobile,
            unitRate
        });

        await tenant.save();
        res.json(tenant);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get Tenant
router.get('/', auth, async (req, res) => {
    try {
        const tenant = await Tenant.findOne({ ownerId: req.user.id });
        if (!tenant) return res.status(404).json({ msg: 'Tenant not found' });
        res.json(tenant);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Update Tenant (Only Unit Rate allowed mainly, but strict requirements say "Tenant name cannot be edited later")
router.put('/', auth, async (req, res) => {
    const { unitRate } = req.body;
    try {
        let tenant = await Tenant.findOne({ ownerId: req.user.id });
        if (!tenant) return res.status(404).json({ msg: 'Tenant not found' });

        tenant.unitRate = unitRate;
        await tenant.save();
        res.json(tenant);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
