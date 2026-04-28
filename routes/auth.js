const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateOTP, sendOTPEmail } = require('../utils/mailer');

const router = express.Router();

// In-memory OTP store: { email -> { otp, expiresAt, userData } }
// For production, use Redis or a DB-backed store.
const otpStore = new Map();

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
// Step 1: Validate data and send OTP
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, role, university, graduationYear, domain, jobTitle, company, bio } = req.body;

        // Basic validation
        if (!name || !email || !password || !role) {
            return res.render('login', { error: 'All fields are required.', mode: 'signup' });
        }
        if (!['student', 'mentor'].includes(role)) {
            return res.render('login', { error: 'Invalid role selected.', mode: 'signup' });
        }
        if (password.length < 6) {
            return res.render('login', { error: 'Password must be at least 6 characters.', mode: 'signup' });
        }

        // Check duplicate email
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.render('login', { error: 'An account with this email already exists.', mode: 'signup' });
        }

        // Generate & store OTP (10 min TTL)
        const otp = generateOTP();
        otpStore.set(email.toLowerCase(), {
            otp,
            expiresAt: Date.now() + 10 * 60 * 1000,
            userData: { name, email: email.toLowerCase(), password, role, university, graduationYear, domain, jobTitle, company, bio },
        });

        // Send OTP email
        await sendOTPEmail(email, otp, name.split(' ')[0]);

        // Show OTP verification page
        return res.render('verify-otp', {
            email: email.toLowerCase(),
            error: null,
            success: `A 6-digit code was sent to ${email}. It expires in 10 minutes.`,
        });
    } catch (err) {
        console.error('Signup error:', err);
        return res.render('login', { error: 'Something went wrong. Please try again.', mode: 'signup' });
    }
});

// ─── POST /auth/verify-otp ────────────────────────────────────
// Step 2: Verify OTP and create account
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const record = otpStore.get(email?.toLowerCase());

        if (!record) {
            return res.render('verify-otp', {
                email,
                error: 'OTP expired or not found. Please sign up again.',
                success: null,
            });
        }

        if (Date.now() > record.expiresAt) {
            otpStore.delete(email.toLowerCase());
            return res.render('verify-otp', {
                email,
                error: 'Your OTP has expired. Please sign up again.',
                success: null,
            });
        }

        if (record.otp !== otp.trim()) {
            return res.render('verify-otp', {
                email,
                error: 'Incorrect OTP. Please try again.',
                success: null,
            });
        }

        // OTP valid — create the user
        const { userData } = record;
        otpStore.delete(email.toLowerCase());

        const user = await User.create({
            name: userData.name,
            email: userData.email,
            password: userData.password,
            role: userData.role,
            university: userData.university || '',
            graduationYear: userData.graduationYear ? parseInt(userData.graduationYear) : null,
            domain: userData.domain || '',
            jobTitle: userData.jobTitle || '',
            company: userData.company || '',
            bio: userData.bio || '',
        });

        setAuthCookie(res, user);
        return res.redirect(`/${user.role}/home`);
    } catch (err) {
        console.error('OTP verify error:', err);
        return res.render('verify-otp', { email: req.body.email, error: 'Something went wrong.', success: null });
    }
});

// ─── POST /auth/resend-otp ────────────────────────────────────
router.post('/resend-otp', async (req, res) => {
    try {
        const { email } = req.body;
        const record = otpStore.get(email?.toLowerCase());

        if (!record) {
            return res.render('verify-otp', {
                email,
                error: 'Session expired. Please sign up again.',
                success: null,
            });
        }

        const otp = generateOTP();
        record.otp = otp;
        record.expiresAt = Date.now() + 10 * 60 * 1000;
        otpStore.set(email.toLowerCase(), record);

        await sendOTPEmail(email, otp, record.userData.name.split(' ')[0]);

        return res.render('verify-otp', {
            email,
            error: null,
            success: 'A new OTP has been sent to your email.',
        });
    } catch (err) {
        console.error('Resend OTP error:', err);
        return res.render('verify-otp', { email: req.body.email, error: 'Could not resend OTP.', success: null });
    }
});

// ─── POST /auth/login ─────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.render('login', { error: 'Email and password are required.', mode: 'login' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.render('login', { error: 'Invalid email or password.', mode: 'login' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.render('login', { error: 'Invalid email or password.', mode: 'login' });
        }

        setAuthCookie(res, user);
        return res.redirect(`/${user.role}/home`);
    } catch (err) {
        console.error('Login error:', err);
        return res.render('login', { error: 'Something went wrong. Please try again.', mode: 'login' });
    }
});

// ─── GET /auth/logout ─────────────────────────────────────────
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    return res.redirect('/');
});

module.exports = router;
