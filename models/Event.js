const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        required: true,
        trim: true
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    eventType: {
        type: String,
        enum: ['TECH TALK', 'HACKATHON', 'WORKSHOP', 'SEMINAR', 'NETWORKING', 'OTHER'],
        required: true,
        default: 'WORKSHOP'
    },
    mode: {
        type: String,
        enum: ['Online', 'Offline'],
        required: true
    },
    bannerImage: {
        type: String,
        required: true
    },
    registrationMode: {
        type: String,
        enum: ['internal', 'external'],
        required: true,
        default: 'internal'
    },
    externalLink: {
        type: String,
        trim: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    views: {
        type: Number,
        default: 0
    },
    totalRegistrations: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
