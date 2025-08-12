'use strict';
const mongoose = require('mongoose');
const reviewSchema = new mongoose.Schema({
    title: {
        type: String
    },
    details: {
        type: String
    },
    rating: {
        type: Number
    },
    for: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
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

reviewSchema.set('toJSON', {
    getters: true,
    virtuals: false,
    transform: (doc, ret, options) => {
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('Review', reviewSchema);
