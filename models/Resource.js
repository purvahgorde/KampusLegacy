const mongoose = require('mongoose');

const CATEGORIES = [
    'Programming',
    'Career Advice',
    'Design',
    'Engineering',
    'Data Science',
    'Product Management',
    'Interview Prep',
    'Soft Skills',
    'Finance',
    'Entrepreneurship',
    'General',
];

const resourceSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: { type: String, enum: CATEGORIES, default: 'General' },
    // File storage
    fileName: { type: String, default: '' },          // original file name
    fileStoredName: { type: String, default: '' },    // uuid name on disk
    fileSize: { type: Number, default: 0 },           // bytes
    mimeType: { type: String, default: '' },
    filePath: { type: String, default: '' },          // relative path under /uploads
    // Author
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Engagement
    views: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
});
resourceSchema.statics.CATEGORIES = CATEGORIES;

module.exports = mongoose.model('Resource', resourceSchema);
