'use strict';
const mongoose = require('mongoose');
const incidentSchema = new mongoose.Schema({
    title: {
        type: String
    },
    details: {
        type: String
    },
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job'
    },
    posted_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

incidentSchema.set('toJSON', {
    getters: true,
    virtuals: false,
    transform: (doc, ret, options) => {
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('Incident', incidentSchema);
