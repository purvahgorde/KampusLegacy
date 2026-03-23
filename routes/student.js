const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const Connection = require('../models/Connection');

const router = express.Router();

// Student Home / Hub
router.get('/home', requireAuth, requireRole('student'), async (req, res) => {
    try {
        const mentors = await User.find({ role: 'mentor' })
            .sort({ createdAt: -1 })
            .select('-password')
            .lean();

        const connections = await Connection.find({ student: req.user._id }).lean();
        const connectedMentorIds = connections.map(c => c.mentor.toString());

        const availableMentors = mentors.filter(m => !connectedMentorIds.includes(m._id.toString())).slice(0, 4);

        res.render('student/home', { user: req.user, mentors: availableMentors });
    } catch (err) {
        console.error('Home error:', err);
        res.render('student/home', { user: req.user, mentors: [] });
    }
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

// ─── GET /student/resources ───────────────────────────────────
// Show resources from connected mentors
router.get('/resources', requireAuth, requireRole('student'), async (req, res) => {
    try {
        const connections = await Connection.find({
            student: req.user._id,
            status: 'accepted',
        }).lean();

        const mentorIds = connections.map(c => c.mentor);

        const Resource = require('../models/Resource');
        const resources = await Resource.find({ author: { $in: mentorIds } })
            .populate('author', 'name jobTitle company profilePicture')
            .sort({ createdAt: -1 })
            .lean();

        res.render('student/resources', { user: req.user, resources });
    } catch (err) {
        console.error('Student resources error:', err);
        res.render('student/resources', { user: req.user, resources: [] });
    }
});

// ─── POST /student/resources/:id/view ─────────────────────────
router.post('/resources/:id/view', requireAuth, requireRole('student'), async (req, res) => {
    try {
        const Resource = require('../models/Resource');
        await Resource.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false });
    }
});

// ─── GET /student/resources/:id/download ──────────────────────
router.get('/resources/:id/download', requireAuth, requireRole('student'), async (req, res) => {
    try {
        const Resource = require('../models/Resource');
        const resource = await Resource.findById(req.params.id);
        if (!resource) return res.status(404).send('Not found');

        await Resource.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } });

        const filePath = require('path').join(__dirname, '../public', resource.filePath);
        res.download(filePath, resource.fileName);
    } catch (err) {
        console.error('Download error:', err);
        res.status(500).send('Download failed');
    }
});

module.exports = router;
