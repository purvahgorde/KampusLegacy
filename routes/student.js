const express = require('express');
const AIChatSession = require('../models/AIChatSession');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI("AIzaSyAhGPe2osfZvvQ3BaiTRQWxJkLd0As5dG0");
const { requireAuth, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const Connection = require('../models/Connection');
const Opportunity = require('../models/Opportunity');
const Application = require('../models/Application');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

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

        // Fetch dynamic content from accepted mentors
        const acceptedIds = connections.filter(c => c.status === 'accepted').map(c => c.mentor);

        const upcomingEventsRaw = await Event.find({ author: { $in: acceptedIds }, isActive: true, date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } })
            .sort({ date: 1 })
            .limit(2)
            .populate('author', 'name profilePicture')
            .lean();

        const studentRegs = await EventRegistration.find({ student: req.user._id }).lean();
        const regSet = new Set(studentRegs.map(r => r.event.toString()));

        const upcomingEvents = upcomingEventsRaw.map(e => ({
            ...e,
            isRegistered: regSet.has(e._id.toString())
        }));

        const freshOpportunities = await Opportunity.find({ author: { $in: acceptedIds }, isActive: true })
            .sort({ createdAt: -1 })
            .limit(3)
            .populate('author', 'name profilePicture company')
            .lean();

        res.render('student/home', {
            user: req.user,
            mentors: availableMentors,
            upcomingEvents,
            freshOpportunities
        });
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

// ═══════════════════════════════════════════════════════════════
// ─── OPPORTUNITIES ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

// GET /student/opportunities — list opportunities from connected mentors
router.get('/opportunities', requireAuth, requireRole('student'), async (req, res) => {
    try {
        const connections = await Connection.find({ student: req.user._id, status: 'accepted' }).lean();
        const mentorIds = connections.map(c => c.mentor);

        const opportunities = await Opportunity.find({ author: { $in: mentorIds }, isActive: true })
            .populate('author', 'name profilePicture company')
            .sort({ createdAt: -1 })
            .lean();

        // Get student's existing applications
        const applications = await Application.find({ student: req.user._id }).lean();
        const appliedOppIds = applications.map(a => a.opportunity.toString());

        // Annotate opportunities with applied status
        const oppsWithStatus = opportunities.map(opp => ({
            ...opp,
            hasApplied: appliedOppIds.includes(opp._id.toString()),
            application: applications.find(a => a.opportunity.toString() === opp._id.toString()) || null
        }));

        res.render('student/opportunities', {
            user: req.user,
            opportunities: oppsWithStatus,
            stats: {
                available: opportunities.length,
                applied: applications.length,
                pending: applications.filter(a => a.status === 'pending').length
            }
        });
    } catch (err) {
        console.error('Student opportunities error:', err);
        res.render('student/opportunities', { user: req.user, opportunities: [], stats: { available: 0, applied: 0, pending: 0 } });
    }
});

// POST /student/opportunities/:id/view
router.post('/opportunities/:id/view', requireAuth, requireRole('student'), async (req, res) => {
    try {
        await Opportunity.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false });
    }
});

// POST /student/opportunities/:id/apply
router.post('/opportunities/:id/apply', requireAuth, requireRole('student'), resumeUpload.single('resume'), async (req, res) => {
    try {
        const opportunityId = req.params.id;
        const opp = await Opportunity.findById(opportunityId);
        if (!opp || !opp.isActive) return res.status(400).json({ error: 'Opportunity not available' });

        // Check if already applied
        const existing = await Application.findOne({ opportunity: opportunityId, student: req.user._id });
        if (existing) return res.status(400).json({ error: 'Already applied' });

        const file = req.file;
        if (!file && opp.applicationMode === 'direct') {
            return res.status(400).json({ error: 'Resume is required' });
        }

        await Application.create({
            opportunity: opportunityId,
            student: req.user._id,
            resumeFileName: file ? file.originalname : '',
            resumePath: file ? '/uploads/resumes/' + file.filename : '',
            coverLetter: req.body.coverLetter || '',
            status: 'pending'
        });

        await Opportunity.findByIdAndUpdate(opportunityId, { $inc: { totalApplications: 1 } });

        res.json({ success: true });
    } catch (err) {
        console.error('Apply error:', err);
        if (err.code === 11000) return res.status(400).json({ error: 'Already applied' });
        res.status(500).json({ error: err.message || 'Application failed' });
    }
});

// ═══════════════════════════════════════════════════════════════
// ─── EVENTS ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

// GET /student/events — list events from connected mentors
router.get('/events', requireAuth, requireRole('student'), async (req, res) => {
    try {
        const connections = await Connection.find({ student: req.user._id, status: 'accepted' }).lean();
        const mentorIds = connections.map(c => c.mentor);

        const events = await Event.find({ author: { $in: mentorIds }, isActive: true })
            .populate('author', 'name profilePicture company')
            .sort({ date: 1, time: 1 }) // Sort upcoming events ascending
            .lean();

        // Get student's existing registrations
        const registrations = await EventRegistration.find({ student: req.user._id }).lean();
        const registeredEventIds = registrations.map(r => r.event.toString());

        // Annotate events with registration status
        const eventsWithStatus = events.map(ev => ({
            ...ev,
            hasRegistered: registeredEventIds.includes(ev._id.toString()),
            registration: registrations.find(r => r.event.toString() === ev._id.toString()) || null
        }));

        res.render('student/events', {
            user: req.user,
            events: eventsWithStatus,
            stats: {
                available: events.length,
                registered: registrations.length,
                upcoming: events.filter(e => new Date(e.date) >= new Date()).length
            }
        });
    } catch (err) {
        console.error('Student events error:', err);
        res.render('student/events', { user: req.user, events: [], stats: { available: 0, registered: 0, upcoming: 0 } });
    }
});

// POST /student/events/:id/view
router.post('/events/:id/view', requireAuth, requireRole('student'), async (req, res) => {
    try {
        await Event.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false });
    }
});

// POST /student/events/:id/register
router.post('/events/:id/register', requireAuth, requireRole('student'), async (req, res) => {
    try {
        const eventId = req.params.id;
        const ev = await Event.findById(eventId);
        if (!ev || !ev.isActive) return res.status(400).json({ error: 'Event not available' });

        // Check if already registered
        const existing = await EventRegistration.findOne({ event: eventId, student: req.user._id });
        if (existing) return res.status(400).json({ error: 'Already registered' });

        await EventRegistration.create({
            event: eventId,
            student: req.user._id,
            status: 'registered'
        });

        await Event.findByIdAndUpdate(eventId, { $inc: { totalRegistrations: 1 } });

        res.json({ success: true });
    } catch (err) {
        console.error('Register error:', err);
        if (err.code === 11000) return res.status(400).json({ error: 'Already registered' });
        res.status(500).json({ error: err.message || 'Registration failed' });
    }
});

// --- AI Career Counselor ---
router.get('/counselor', requireAuth, requireRole('student'), async (req, res) => {
    try {
        let session = await AIChatSession.findOne({ student: req.user._id }).lean();
        if (!session) {
            session = { messages: [] };
        }
        res.render('student/counselor', { user: req.user, chatHistory: session.messages });
    } catch (err) {
        console.error('Counselor GET error:', err);
        res.render('student/counselor', { user: req.user, chatHistory: [] });
    }
});

router.post('/counselor/message', requireAuth, requireRole('student'), async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Message required' });

        let session = await AIChatSession.findOne({ student: req.user._id });
        if (!session) {
            session = new AIChatSession({ student: req.user._id, messages: [] });
        }

        // build history
        const systemInstruction = "You are an AI Career Counselor for KampusLegacy. You must provide helpful, encouraging, and factual career advice to the student user. Keep your answers concise and well-formatted.";

        let history = session.messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        session.messages.push({ role: 'user', text: message });

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction
        });

        const chat = model.startChat({ history });
        const result = await chat.sendMessage(message);
        const responseText = result.response.text();

        session.messages.push({ role: 'model', text: responseText });
        await session.save();

        res.json({ success: true, response: responseText });
    } catch (err) {
        console.error('AI Chat POST error:', err);
        res.status(500).json({ error: 'AI Error' });
    }
});

module.exports = router;
