'use strict';
const mongoose = require('mongoose');
const invoice = new mongoose.Schema({
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client'
    },
    invoice_id: {
        type: String,
        unique: true
    },
    jobDetails: {
        type: Array, default: []
    },
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['unPaid', 'paid'],
        default: 'unPaid'
    },
    amount: {
        type: Number, default: 0
    },
    startDate: {
        type: Date
    },
    note: {
        type: String
    },
    endDate: {
        type: Date
    },
    deleted: {
        type: Boolean,
        default: false
    },
    archive: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

invoice.set('toJSON', {
    getters: true,
    virtuals: false,
    transform: (doc, ret, options) => {
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('Invoice', invoice);
