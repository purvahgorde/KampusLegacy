const mongoose = require('mongoose');

const TYPES = ['Job', 'Internship', 'Part-time', 'Freelance', 'Volunteer'];

const opportunitySchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    type: { type: String, enum: TYPES, default: 'Internship' },
    location: { type: String, default: 'Remote', trim: true },
    salary: { type: String, default: '', trim: true },       // e.g. "₹5-8 LPA" or "Unpaid"
    description: { type: String, required: true },
    requirements: { type: String, default: '' },             // skills / qualifications
    deadline: { type: Date, default: null },
    // Application mode
    applicationMode: {
        type: String,
        enum: ['direct', 'external'],
        default: 'direct',
    },
    externalLink: { type: String, default: '' },             // required if mode = external
    // Author / poster
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Status
    isActive: { type: Boolean, default: true },
    // Engagement
    views: { type: Number, default: 0 },
    totalApplications: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
});

opportunitySchema.statics.TYPES = TYPES;

module.exports = mongoose.model('Opportunity', opportunitySchema);
