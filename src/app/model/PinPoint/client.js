"use strict";
const mongoose = require("mongoose");
const pinclientSchema = new mongoose.Schema(
  {
    client_name: {
      type: String,
    },
    client_address: {
      type: String,
    },
    client_phone: {
      type: String,
    },
    client_email: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

pinclientSchema.set("toJSON", {
  getters: true,
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("PinClient", pinclientSchema);
