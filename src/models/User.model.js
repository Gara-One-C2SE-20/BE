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
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);