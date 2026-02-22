const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const Connection = require('../models/Connection');

const router = express.Router();

// Mentor Community Home
router.get('/home', requireAuth, requireRole('mentor'), (req, res) => {
    res.render('mentor/home', { user: req.user });
});

// Mentor Management Dashboard
router.get('/dashboard', requireAuth, requireRole('mentor'), (req, res) => {
    res.render('mentor/dashboard', { user: req.user });
});

// ─── GET /mentor/messages ─────────────────────────────────────
// Messaging page — list of accepted (mentee) students
router.get('/messages', requireAuth, requireRole('mentor'), async (req, res) => {
    try {
        const connections = await Connection.find({
            mentor: req.user._id,
            status: 'accepted',
        }).populate('student', '-password').lean();

        const connectedStudents = connections.map(c => c.student);
        res.render('mentor/messages', { user: req.user, connectedStudents });
    } catch (err) {
        console.error('Mentor messages error:', err);
        res.render('mentor/messages', { user: req.user, connectedStudents: [] });
    }
});

// ─── GET /mentor/requests ─────────────────────────────────────
// Show all pending + accepted connection requests for this mentor
router.get('/requests', requireAuth, requireRole('mentor'), async (req, res) => {
    try {
        const connections = await Connection.find({ mentor: req.user._id })
            .populate('student', '-password')
            .lean();

        const pending = connections.filter(c => c.status === 'pending');
        const accepted = connections.filter(c => c.status === 'accepted');

        res.render('mentor/requests', { user: req.user, pending, accepted });
    } catch (err) {
        console.error('Error loading requests:', err);
        res.redirect('/mentor/home');
    }
});

// ─── POST /mentor/requests/:id/accept ────────────────────────
router.post('/requests/:id/accept', requireAuth, requireRole('mentor'), async (req, res) => {
    try {
        await Connection.findOneAndUpdate(
            { _id: req.params.id, mentor: req.user._id },
            { status: 'accepted' }
        );
        res.redirect('/mentor/requests');
    } catch (err) {
        console.error('Accept error:', err);
        res.redirect('/mentor/requests');
    }
});

// ─── POST /mentor/requests/:id/reject ────────────────────────
router.post('/requests/:id/reject', requireAuth, requireRole('mentor'), async (req, res) => {
    try {
        await Connection.findOneAndUpdate(
            { _id: req.params.id, mentor: req.user._id },
            { status: 'rejected' }
        );
        res.redirect('/mentor/requests');
    } catch (err) {
        console.error('Reject error:', err);
        res.redirect('/mentor/requests');
    }
});

module.exports = router;
