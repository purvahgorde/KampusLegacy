const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    opportunity: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Resume (for direct-apply opportunities)
    resumeFileName: { type: String, default: '' },
    resumePath: { type: String, default: '' },
    // Optional cover letter
    coverLetter: { type: String, default: '' },
    // Status managed by mentor
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'shortlisted', 'rejected'],
        default: 'pending',
    },
    appliedAt: { type: Date, default: Date.now },
});

// Prevent a student from applying more than once to the same opportunity
applicationSchema.index({ opportunity: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
