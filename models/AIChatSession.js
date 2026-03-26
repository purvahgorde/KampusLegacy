const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    role: { type: String, enum: ['user', 'model'], required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const aiChatSessionSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    messages: [messageSchema]
}, { timestamps: true });

module.exports = mongoose.model('AIChatSession', aiChatSessionSchema);
