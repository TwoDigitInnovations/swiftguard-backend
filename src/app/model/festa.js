"use strict";
const mongoose = require("mongoose");
const festa = new mongoose.Schema(
  {
    event_date: {
      type: Date,
    },
    singer: {
      type: String,
    },
    with: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

festa.set("toJSON", {
  getters: true,
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Festa", festa);
