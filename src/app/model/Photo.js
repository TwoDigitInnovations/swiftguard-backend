'use strict';
const mongoose = require('mongoose');
const photoSchema = new mongoose.Schema({
    key: {
        type: String
    },
    incident_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Incident'
    },
}, {
    timestamps: true
});

photoSchema.set('toJSON', {
    getters: true,
    virtuals: false,
    transform: (doc, ret, options) => {
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('Photo', photoSchema);
