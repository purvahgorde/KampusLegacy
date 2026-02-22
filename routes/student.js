const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const Connection = require('../models/Connection');

const router = express.Router();

// Student Home / Hub
router.get('/home', requireAuth, requireRole('student'), (req, res) => {
    res.render('student/home', { user: req.user });
});

// Student Personal Dashboard — pass connected mentors for the chat panel
router.get('/dashboard', requireAuth, requireRole('student'), async (req, res) => {
    try {
        const connections = await Connection.find({
            student: req.user._id,
            status: 'accepted',
        }).populate('mentor', '-password').lean();

        const connectedMentors = connections.map(c => c.mentor);
        res.render('student/dashboard', { user: req.user, connectedMentors });
    } catch (err) {
        console.error('Dashboard error:', err);
        res.render('student/dashboard', { user: req.user, connectedMentors: [] });
    }
});

// ─── GET /student/mentors ─────────────────────────────────────
// Show all mentors + connection statuses for the logged-in student
router.get('/mentors', requireAuth, requireRole('student'), async (req, res) => {
    try {
        const mentors = await User.find({ role: 'mentor' }).select('-password').lean();

        // Get all connections for this student
        const connections = await Connection.find({ student: req.user._id }).lean();

        // Build a map: mentorId → connection
        const connectionMap = {};
        connections.forEach(c => {
            connectionMap[c.mentor.toString()] = c;
        });

        // Annotate each mentor with connection status
        const mentorsWithStatus = mentors.map(mentor => ({
            ...mentor,
            connection: connectionMap[mentor._id.toString()] || null,
        }));

        res.render('student/mentors', { user: req.user, mentors: mentorsWithStatus });
    } catch (err) {
        console.error('Error loading mentors:', err);
        res.redirect('/student/home');
    }
});

// ─── POST /student/connect/:mentorId ─────────────────────────
// Send a connection request to a mentor
router.post('/connect/:mentorId', requireAuth, requireRole('student'), async (req, res) => {
    try {
        const { mentorId } = req.params;

        // Verify the target is actually a mentor
        const mentor = await User.findOne({ _id: mentorId, role: 'mentor' });
        if (!mentor) return res.redirect('/student/mentors');

        // Create if not exists (upsert-style)
        await Connection.findOneAndUpdate(
            { student: req.user._id, mentor: mentorId },
            { status: 'pending', createdAt: new Date() },
            { upsert: true, new: true }
        );

        res.redirect('/student/mentors');
    } catch (err) {
        console.error('Connection request error:', err);
        res.redirect('/student/mentors');
    }
});

module.exports = router;
