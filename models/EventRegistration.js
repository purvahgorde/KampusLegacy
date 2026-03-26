const mongoose = require('mongoose');

const eventRegistrationSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['registered', 'attended', 'cancelled'],
        default: 'registered'
    },
    registeredAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Prevent a student from registering for the same event more than once
eventRegistrationSchema.index({ event: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('EventRegistration', eventRegistrationSchema);
