const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Landing page
router.get('/', (req, res) => {
    res.render('landing');
});

// Login & Sign-up page (redirect if already logged in)
router.get('/login', (req, res) => {
    try {
        const token = req.cookies?.token;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // Already authenticated — redirect to their home page
            return res.redirect(`/${decoded.role}/home`);
        }
    } catch (_) {
        // Invalid token — continue to login page
    }
    const mode = req.query.mode === 'signup' ? 'signup' : 'login';
    res.render('login', { error: null, mode });
});

module.exports = router;
