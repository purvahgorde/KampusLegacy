const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * requireAuth — verify JWT from cookie, attach user to req.
 * If invalid or missing, redirect to /login.
 */
const requireAuth = async (req, res, next) => {
    try {
        const token = req.cookies?.token;

        if (!token) {
            return res.redirect('/login');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            res.clearCookie('token');
            return res.redirect('/login');
        }

        req.user = user;
        next();
    } catch (err) {
        res.clearCookie('token');
        return res.redirect('/login');
    }
};

/**
 * requireRole(role) — after requireAuth, check user role.
 * If mismatch, redirect to the correct home page.
 */
const requireRole = (role) => {
    return (req, res, next) => {
        if (req.user.role !== role) {
            // Redirect to their actual home page
            return res.redirect(`/${req.user.role}/home`);
        }
        next();
    };
};

module.exports = { requireAuth, requireRole };
