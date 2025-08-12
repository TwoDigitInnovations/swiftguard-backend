'use strict';
const mongoose = require('mongoose');
const identitySchema = new mongoose.Schema({
    key: {
        type: String
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    type: {
        type: String,
        enum: ['DL', 'SI_BATCH', 'PASSPORT']
    },
    expire: {
        type: Date
    },
    verified: {
        type: Boolean, default: false
    }
}, {
    timestamps: true
});

identitySchema.set('toJSON', {
    getters: true,
    virtuals: false,
    transform: (doc, ret, options) => {
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('Identity', identitySchema);
