"use strict";
const mongoose = require("mongoose");
const bill = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PinClient",
    },
    invoice_id: {
      type: String,
    },
    items: {
      type: Array,
      default: [],
    },

    status: {
      type: String,
      enum: ["unPaid", "paid"],
      default: "unPaid",
    },
    amount: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    sub_amount: {
      type: Number,
      default: 0,
    },
    invoice_date: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

bill.set("toJSON", {
  getters: true,
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Bill", bill);
