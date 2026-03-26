const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { requireAuth, requireRole } = require('../middleware/auth');
const Connection = require('../models/Connection');
const Resource = require('../models/Resource');
const Opportunity = require('../models/Opportunity');
const Application = require('../models/Application');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const router = express.Router();

// ─── Multer: resource uploads ──────────────────────────────────
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

// ─── Multer: resume uploads ─────────────────────────────────────
const resumeDir = path.join(__dirname, '../public/uploads/resumes');
if (!fs.existsSync(resumeDir)) fs.mkdirSync(resumeDir, { recursive: true });
const resumeStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, resumeDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    },
});
const resumeUpload = multer({
    storage: resumeStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.doc', '.docx'];
        if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
        else cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
    },
});

// ─── Multer: event banners ──────────────────────────────────────
const eventDir = path.join(__dirname, '../public/uploads/events');
if (!fs.existsSync(eventDir)) fs.mkdirSync(eventDir, { recursive: true });
const eventStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, eventDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    },
});
const eventUpload = multer({
    storage: eventStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB for banner
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
        else cb(new Error('Only JPG, PNG, and WebP images are allowed'));
    },
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

// ═══════════════════════════════════════════════════════════════
// ─── OPPORTUNITIES ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

// GET /mentor/opportunities — list all + stats
router.get('/opportunities', requireAuth, requireRole('mentor'), async (req, res) => {
    try {
        const opportunities = await Opportunity.find({ author: req.user._id })
            .sort({ createdAt: -1 })
            .lean();
        const totalViews = opportunities.reduce((s, o) => s + o.views, 0);
        const totalApplications = opportunities.reduce((s, o) => s + o.totalApplications, 0);
        res.render('mentor/opportunities', {
            user: req.user,
            opportunities,
            stats: {
                totalPosted: opportunities.length,
                totalViews,
                totalApplications,
                activeCount: opportunities.filter(o => o.isActive).length,
            },
            types: Opportunity.TYPES,
        });
    } catch (err) {
        console.error('Mentor opportunities error:', err);
        res.render('mentor/opportunities', {
            user: req.user,
            opportunities: [],
            stats: { totalPosted: 0, totalViews: 0, totalApplications: 0, activeCount: 0 },
            types: Opportunity.TYPES,
        });
    }
});

// POST /mentor/opportunities/create
router.post('/opportunities/create', requireAuth, requireRole('mentor'), async (req, res) => {
    try {
        const { title, company, type, location, salary, description, requirements, deadline, applicationMode, externalLink } = req.body;
        if (!title || !company || !description) return res.json({ success: false, error: 'Title, company and description are required.' });
        if (applicationMode === 'external' && !externalLink) return res.json({ success: false, error: 'Please provide the external application link.' });
        await Opportunity.create({
            title: title.trim(),
            company: company.trim(),
            type: type || 'Internship',
            location: location ? location.trim() : 'Remote',
            salary: salary ? salary.trim() : '',
            description: description.trim(),
            requirements: requirements ? requirements.trim() : '',
            deadline: deadline || null,
            applicationMode: applicationMode || 'direct',
            externalLink: applicationMode === 'external' ? externalLink.trim() : '',
            author: req.user._id,
        });
        res.json({ success: true });
    } catch (err) {
        console.error('Create opportunity error:', err);
        res.json({ success: false, error: 'Failed to create opportunity.' });
    }
});

// GET /mentor/opportunities/:id — detail + applicants
router.get('/opportunities/:id', requireAuth, requireRole('mentor'), async (req, res) => {
    try {
        const opportunity = await Opportunity.findOne({ _id: req.params.id, author: req.user._id }).lean();
        if (!opportunity) return res.redirect('/mentor/opportunities');
        const applications = await Application.find({ opportunity: req.params.id })
            .populate('student', 'name email profilePicture')
            .sort({ appliedAt: -1 })
            .lean();
        res.render('mentor/opportunity-detail', { user: req.user, opportunity, applications });
    } catch (err) {
        console.error('Opportunity detail error:', err);
        res.redirect('/mentor/opportunities');
    }
});

// PATCH /mentor/opportunities/:id/toggle — open/close
router.patch('/opportunities/:id/toggle', requireAuth, requireRole('mentor'), async (req, res) => {
    try {
        const opp = await Opportunity.findOne({ _id: req.params.id, author: req.user._id });
        if (!opp) return res.json({ success: false, error: 'Not found' });
        opp.isActive = !opp.isActive;
        await opp.save();
        res.json({ success: true, isActive: opp.isActive });
    } catch (err) {
        res.json({ success: false, error: 'Toggle failed' });
    }
});

// DELETE /mentor/opportunities/:id
router.delete('/opportunities/:id', requireAuth, requireRole('mentor'), async (req, res) => {
    try {
        const opp = await Opportunity.findOne({ _id: req.params.id, author: req.user._id });
        if (!opp) return res.json({ success: false, error: 'Not found' });
        // Delete associated applications & their resume files
        const apps = await Application.find({ opportunity: req.params.id });
        apps.forEach(app => {
            if (app.resumePath) {
                const fp = path.join(__dirname, '../public', app.resumePath);
                if (fs.existsSync(fp)) fs.unlinkSync(fp);
            }
        });
        await Application.deleteMany({ opportunity: req.params.id });
        await opp.deleteOne();
        res.json({ success: true });
    } catch (err) {
        console.error('Delete opportunity error:', err);
        res.json({ success: false, error: 'Delete failed' });
    }
});

// PATCH /mentor/opportunities/applications/:appId/status — update applicant status
router.patch('/opportunities/applications/:appId/status', requireAuth, requireRole('mentor'), async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'reviewed', 'shortlisted', 'rejected'];
        if (!validStatuses.includes(status)) return res.json({ success: false, error: 'Invalid status' });
        const app = await Application.findById(req.params.appId).populate('opportunity');
        if (!app || app.opportunity.author.toString() !== req.user._id.toString()) return res.json({ success: false, error: 'Not found' });
        app.status = status;
        await app.save();
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, error: 'Status update failed' });
    }
});

// GET /mentor/opportunities/applications/:appId/resume — download resume
router.get('/opportunities/applications/:appId/resume', requireAuth, requireRole('mentor'), async (req, res) => {
    try {
        const app = await Application.findById(req.params.appId).populate('opportunity');
        if (!app || !app.resumePath) return res.status(404).send('Not found');
        if (app.opportunity.author.toString() !== req.user._id.toString()) return res.status(403).send('Forbidden');
        const filePath = path.join(__dirname, '../public', app.resumePath);
        res.download(filePath, app.resumeFileName);
    } catch (err) {
        res.status(500).send('Download failed');
    }
});

// ═══════════════════════════════════════════════════════════════
// ─── EVENTS ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

// GET /mentor/events — list all + stats
router.get('/events', requireAuth, requireRole('mentor'), async (req, res) => {
    try {
        const events = await Event.find({ author: req.user._id })
            .sort({ createdAt: -1 })
            .lean();
        const totalViews = events.reduce((s, e) => s + e.views, 0);
        const totalRegistrations = events.reduce((s, e) => s + e.totalRegistrations, 0);
        res.render('mentor/events', {
            user: req.user,
            events,
            stats: {
                totalPosted: events.length,
                totalViews,
                totalRegistrations,
                activeCount: events.filter(e => e.isActive).length,
            }
        });
    } catch (err) {
        console.error('Mentor events error:', err);
        res.render('mentor/events', {
            user: req.user,
            events: [],
            stats: { totalPosted: 0, totalViews: 0, totalRegistrations: 0, activeCount: 0 }
        });
    }
});

// POST /mentor/events/create
router.post('/events/create', requireAuth, requireRole('mentor'), eventUpload.single('bannerImage'), async (req, res) => {
    try {
        const { title, description, date, time, location, mode, registrationMode, externalLink } = req.body;
        const file = req.file;

        if (!title || !description || !date || !time || !location || !mode) {
            return res.json({ success: false, error: 'Please provide all required fields.' });
        }
        if (registrationMode === 'external' && !externalLink) {
            return res.json({ success: false, error: 'External link is required for external registration mode.' });
        }
        if (!file) {
            return res.json({ success: false, error: 'Banner image is required.' });
        }

        await Event.create({
            title: title.trim(),
            description: description.trim(),
            date: new Date(date),
            time: time.trim(),
            location: location.trim(),
            mode,
            registrationMode: registrationMode || 'internal',
            externalLink: registrationMode === 'external' ? externalLink.trim() : '',
            bannerImage: '/uploads/events/' + file.filename,
            author: req.user._id,
        });
        res.json({ success: true });
    } catch (err) {
        console.error('Create event error:', err);
        res.json({ success: false, error: 'Failed to create event.' });
    }
});

// GET /mentor/events/:id — detail + registrations
router.get('/events/:id', requireAuth, requireRole('mentor'), async (req, res) => {
    try {
        const eventItem = await Event.findOne({ _id: req.params.id, author: req.user._id }).lean();
        if (!eventItem) return res.redirect('/mentor/events');
        
        const registrations = await EventRegistration.find({ event: req.params.id })
            .populate('student', 'name email profilePicture')
            .sort({ registeredAt: -1 })
            .lean();
            
        res.render('mentor/event-detail', { user: req.user, event: eventItem, registrations });
    } catch (err) {
        console.error('Event detail error:', err);
        res.redirect('/mentor/events');
    }
});

// PATCH /mentor/events/:id/toggle
router.patch('/events/:id/toggle', requireAuth, requireRole('mentor'), async (req, res) => {
    try {
        const ev = await Event.findOne({ _id: req.params.id, author: req.user._id });
        if (!ev) return res.json({ success: false, error: 'Not found' });
        ev.isActive = !ev.isActive;
        await ev.save();
        res.json({ success: true, isActive: ev.isActive });
    } catch (err) {
        res.json({ success: false, error: 'Toggle failed' });
    }
});

// DELETE /mentor/events/:id
router.delete('/events/:id', requireAuth, requireRole('mentor'), async (req, res) => {
    try {
        const ev = await Event.findOne({ _id: req.params.id, author: req.user._id });
        if (!ev) return res.json({ success: false, error: 'Not found' });
        
        // Delete banner file
        if (ev.bannerImage) {
            const fp = path.join(__dirname, '../public', ev.bannerImage);
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
        }
        
        await EventRegistration.deleteMany({ event: req.params.id });
        await ev.deleteOne();
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, error: 'Delete failed' });
    }
});

// PATCH /mentor/events/registrations/:regId/status
router.patch('/events/registrations/:regId/status', requireAuth, requireRole('mentor'), async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['registered', 'attended', 'cancelled'];
        if (!validStatuses.includes(status)) return res.json({ success: false, error: 'Invalid status' });
        
        const reg = await EventRegistration.findById(req.params.regId).populate('event');
        if (!reg || reg.event.author.toString() !== req.user._id.toString()) {
            return res.json({ success: false, error: 'Not found' });
        }
        
        reg.status = status;
        await reg.save();
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, error: 'Status update failed' });
    }
});

module.exports = router;
