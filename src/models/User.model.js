const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ['CUSTOMER', 'STAFF', 'ADMIN'],
        default: 'CUSTOMER'
    },
    profile: {
        fullName: { type: String },
        phone: { type: String },
        address: { type: String },
        dateOfBirth: { type: Date },
        avatarUrl: { type: String }
    },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: true },
    emailVerification: {
        codeHash: { type: String, default: null },
        expiresAt: { type: Date, default: null },
        attempts: { type: Number, default: 0 },
        sentAt: { type: Date, default: null }
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);