const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Cookie options
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: false,          // set true in production (HTTPS)
    maxAge: 7 * 24 * 60 * 60 * 1000,   // 7 days
    sameSite: 'lax',
};

/**
 * Helper: generate JWT and set it as an HTTP-only cookie.
 */
function setAuthCookie(res, user) {
    const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
    res.cookie('token', token, COOKIE_OPTIONS);
}

// ─── POST /auth/signup ────────────────────────────────────────
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, role, university, graduationYear, domain, jobTitle, company, bio } = req.body;

        // Basic validation
        if (!name || !email || !password || !role) {
            return res.render('login', {
                error: 'All fields are required.',
                mode: 'signup',
            });
        }

        if (!['student', 'mentor'].includes(role)) {
            return res.render('login', {
                error: 'Invalid role selected.',
                mode: 'signup',
            });
        }

        if (password.length < 6) {
            return res.render('login', {
                error: 'Password must be at least 6 characters.',
                mode: 'signup',
            });
        }

        // Check duplicate email
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.render('login', {
                error: 'An account with this email already exists.',
                mode: 'signup',
            });
        }

        // Create user with all profile fields
        const user = await User.create({
            name,
            email,
            password,
            role,
            university: university || '',
            graduationYear: graduationYear ? parseInt(graduationYear) : null,
            domain: domain || '',
            jobTitle: jobTitle || '',
            company: company || '',
            bio: bio || '',
        });

        // Set JWT cookie and redirect
        setAuthCookie(res, user);
        return res.redirect(`/${user.role}/home`);
    } catch (err) {
        console.error('Signup error:', err);
        return res.render('login', {
            error: 'Something went wrong. Please try again.',
            mode: 'signup',
        });
    }
});

// ─── POST /auth/login ─────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // Basic validation
        if (!email || !password) {
            return res.render('login', {
                error: 'Email and password are required.',
                mode: 'login',
            });
        }

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.render('login', {
                error: 'Invalid email or password.',
                mode: 'login',
            });
        }

        // Compare password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.render('login', {
                error: 'Invalid email or password.',
                mode: 'login',
            });
        }

        // Set JWT cookie and redirect
        setAuthCookie(res, user);
        return res.redirect(`/${user.role}/home`);
    } catch (err) {
        console.error('Login error:', err);
        return res.render('login', {
            error: 'Something went wrong. Please try again.',
            mode: 'login',
        });
    }
});

// ─── GET /auth/logout ─────────────────────────────────────────
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    return res.redirect('/');
});

module.exports = router;
