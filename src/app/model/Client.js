"use strict";
const mongoose = require("mongoose");
const clientSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
    },
    billingName: {
      type: String,
    },
    billingcycle: {
      type: String,
    },
    rate: {
      type: Number,
    },
    WorkerRatePerHour: {
      type: Number,
    },
    TaskType: {
      type: String,
    },
    vat: {
      type: Number,
    },
    address: {
      type: String,
    },
    billingAddress: {
      type: String,
    },
    email: {
      type: String,
    },
    phoneNumber: {
      type: String,
    },
    clientRef: {
      type: String,
    },
    discount:{
      type:Number,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

clientSchema.set("toJSON", {
  getters: true,
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Client", clientSchema);
