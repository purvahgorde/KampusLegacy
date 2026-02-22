const express = require('express');
const { requireAuth } = require('../middleware/auth');
const Message = require('../models/Message');
const Connection = require('../models/Connection');
const User = require('../models/User');

const router = express.Router();

// ─── GET /api/messages/:userId ────────────────────────────────
// Fetch conversation between the logged-in user and another user
// Only allowed if they have an accepted connection
router.get('/messages/:userId', requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const myId = req.user._id;

        // Verify connection exists (either direction)
        const connection = await Connection.findOne({
            status: 'accepted',
            $or: [
                { student: myId, mentor: userId },
                { student: userId, mentor: myId },
            ],
        });

        if (!connection) {
            return res.status(403).json({ error: 'Not connected' });
        }

        const messages = await Message.find({
            $or: [
                { sender: myId, receiver: userId },
                { sender: userId, receiver: myId },
            ],
        })
            .sort({ createdAt: 1 })
            .lean();

        // Format timestamps nicely
        const formatted = messages.map(m => ({
            ...m,
            mine: m.sender.toString() === myId.toString(),
            time: new Date(m.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
            }),
        }));

        res.json({ messages: formatted });
    } catch (err) {
        console.error('Fetch messages error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── POST /api/messages/:userId ───────────────────────────────
// Send a message to another user
router.post('/messages/:userId', requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const myId = req.user._id;
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Message cannot be empty' });
        }

        // Verify connection
        const connection = await Connection.findOne({
            status: 'accepted',
            $or: [
                { student: myId, mentor: userId },
                { student: userId, mentor: myId },
            ],
        });

        if (!connection) {
            return res.status(403).json({ error: 'Not connected' });
        }

        const message = await Message.create({
            sender: myId,
            receiver: userId,
            content: content.trim(),
        });

        res.json({
            message: {
                ...message.toObject(),
                mine: true,
                time: new Date(message.createdAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                }),
            },
        });
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── GET /api/contacts ────────────────────────────────────────
// Get the list of people this user can message (accepted connections)
router.get('/contacts', requireAuth, async (req, res) => {
    try {
        const myId = req.user._id;

        const connections = await Connection.find({
            status: 'accepted',
            $or: [{ student: myId }, { mentor: myId }],
        })
            .populate('student', '-password')
            .populate('mentor', '-password')
            .lean();

        // Return the "other" person in each connection
        const contacts = connections.map(c => {
            const other = c.student._id.toString() === myId.toString()
                ? c.mentor
                : c.student;
            return other;
        });

        res.json({ contacts });
    } catch (err) {
        console.error('Contacts error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
