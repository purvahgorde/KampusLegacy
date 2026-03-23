const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { requireAuth, requireRole } = require('../middleware/auth');
const Connection = require('../models/Connection');
const Resource = require('../models/Resource');
const router = express.Router();

// ─── Multer file upload config ─────────────────────────────────
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    },
});
const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});
// ─── Mentor Community Home ──────────────────────────────────────
router.get('/home', requireAuth, requireRole('mentor'), (req, res) => {
    res.render('mentor/home', { user: req.user });
});

// ─── Mentor Dashboard ──────────────────────────────────────────
router.get('/dashboard', requireAuth, requireRole('mentor'), async (req, res) => {
    try {
        const resources = await Resource.find({ author: req.user._id })
            .sort({ createdAt: -1 })
            .lean();
        const latest4 = resources.slice(0, 4);
        const totalViews = resources.reduce((s, r) => s + r.views, 0);
        const totalDownloads = resources.reduce((s, r) => s + r.downloads, 0);
        const acceptedConnections = await Connection.countDocuments({ mentor: req.user._id, status: 'accepted' });
        res.render('mentor/dashboard', {
            user: req.user,
            resources: latest4,
            allResources: resources,
            stats: {
                students: acceptedConnections,
                totalResources: resources.length,
                totalViews,
                totalDownloads,
            },
            categories: Resource.CATEGORIES,
        });
    } catch (err) {
        console.error('Dashboard error:', err);
        res.render('mentor/dashboard', {
            user: req.user,
            resources: [],
            allResources: [],
            stats: { students: 0, totalResources: 0, totalViews: 0, totalDownloads: 0 },
            categories: Resource.CATEGORIES,
        });
    }
});

// ─── Mentor Resources (full list) ──────────────────────────────
router.get('/resources', requireAuth, requireRole('mentor'), async (req, res) => {
    try {
        const resources = await Resource.find({ author: req.user._id })
            .sort({ createdAt: -1 })
            .lean();
        const totalViews = resources.reduce((s, r) => s + r.views, 0);
        const totalDownloads = resources.reduce((s, r) => s + r.downloads, 0);
        res.render('mentor/resources', {
            user: req.user,
            resources,
            stats: {
                totalResources: resources.length,
                totalViews,
                totalDownloads,
            },
            categories: Resource.CATEGORIES,
        });
    } catch (err) {
        console.error('Resources error:', err);
        res.redirect('/mentor/dashboard');
    }
});
// ─── POST Upload Resource ───────────────────────────────────────
router.post('/resources/upload', requireAuth, requireRole('mentor'), upload.single('file'), async (req, res) => {
    try {
        const { title, description, category } = req.body;
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No file uploaded' });
        const resource = await Resource.create({
            title: title || file.originalname,
            description: description || '',
            category: category || 'General',
            fileName: file.originalname,
            fileStoredName: file.filename,
            fileSize: file.size,
            mimeType: file.mimetype,
            filePath: '/uploads/' + file.filename,
            author: req.user._id,
        });
        res.json({ success: true, resource });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Upload failed' });
    }
});
// ─── DELETE Resource ────────────────────────────────────────────
router.delete('/resources/:id', requireAuth, requireRole('mentor'), async (req, res) => {
    try {
        const resource = await Resource.findOne({ _id: req.params.id, author: req.user._id });
        if (!resource) return res.status(404).json({ error: 'Not found' });
        // Delete physical file
        const filePath = path.join(__dirname, '../public', resource.filePath);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        await resource.deleteOne();
        res.json({ success: true });
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ error: 'Delete failed' });
    }
});
// ─── GET /mentor/messages ───────────────────────────────────────
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

// ─── GET /mentor/requests ───────────────────────────────────────
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

// ─── POST Accept/Reject Requests ───────────────────────────────
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
