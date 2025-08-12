'use strict';
const mongoose = require('mongoose');
const notificationSchema = new mongoose.Schema({
    for: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    message: {
        type: String
    },
    invited_for: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobInvite'
    },
    deleted: {
        type: Boolean, default: false
    },
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job'
    }
}, {
    timestamps: true
});

notificationSchema.set('toJSON', {
    getters: true,
    virtuals: false,
    transform: (doc, ret, options) => {
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('Notification', notificationSchema);
