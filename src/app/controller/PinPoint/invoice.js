const mongoose = require("mongoose");
const response = require("../../responses");
const Bill = require("../../model/PinPoint/bill");
const PinClient = require("../../model/PinPoint/client");
const { sendPdfPinpoint } = require("../../services/mailNotification");
const moment = require("moment");
const User = require("../../model/user");
const Verification = require("../../model/verification");
const mailNotification = require("../../services/mailNotification");
const userHelper = require("../../helper/user");

module.exports = {
  generateBill: async (req, res) => {
    try {
      const payload = req.body;
      const client = new PinClient({
        client_name: payload.client_name,
        client_address: payload.client_address,
        client_phone: payload.client_phone,
        client_email: payload.client_email,
      });

      const c = await client.save();
      const random = Math.floor(Math.random() * 999) + 100;
      const date = moment(payload.invoice_date).format("DDMMYY");
      const bill = new Bill({
        client: c._id,
        invoice_date: payload.invoice_date,
        amount: payload.amount,
        items: payload.items,
        invoice_id: payload.invoice_id,
        discount: payload.discount,
        sub_amount: payload.sub_amount,
      });

      const b = await bill.save();
      return response.ok(res, { message: "Invoice generated.", data: b });
    } catch (error) {
      return response.error(res, error);
    }
  },

  updateBill: async (req, res) => {
    try {
      await PinClient.findByIdAndUpdate(req.body.client_id, req.body);
      const data = await Bill.findByIdAndUpdate(req.body.id, req.body, {
        new: true,
        upsert: true,
      }).populate("client");
      return response.ok(res, { message: "Invoice updated.", data });
    } catch (error) {
      return response.error(res, error);
    }
  },

  getBill: async (req, res) => {
    try {
      const data = await Bill.find().populate("client");
      return response.ok(res, { message: "Invoice generated.", data });
    } catch (error) {
      return response.error(res, error);
    }
  },

  getBillById: async (req, res) => {
    try {
      const data = await Bill.findById(req.params.id).populate("client");
      return response.ok(res, { message: "Invoice generated.", data });
    } catch (error) {
      return response.error(res, error);
    }
  },

  deleteBillById: async (req, res) => {
    try {
      const data = await Bill.findByIdAndDelete(req.params.id);
      return response.ok(res, { message: "Invoice deleted.", data });
    } catch (error) {
      return response.error(res, error);
    }
  },

  sendMailWithPdfPinPoint: async (req, res) => {
    try {
      const data = req.body;
      const attachments = [
        {
          filename: "Receipt",
          path: data.attachment,
          // content: data.attachment.split(",").pop(),
          // contentType: "application/pdf"
        },
      ];
      sendPdfPinpoint({ email: data.email, attachments });
      return response.ok(res, { message: "Receipt sent." });
    } catch (error) {
      return response.error(res, error);
    }
  },

  sendOTP: async (req, res) => {
    try {
      const email = req.body.email;
      if (!email) {
        return response.badReq(res, { message: "Email required." });
      }
      const user = await User.findOne({ email });
      if (user) {
        let ver = await Verification.findOne({ user: user._id });
        // OTP is fixed for Now: 0000
        let ran_otp = Math.floor(1000 + Math.random() * 9000);
        await mailNotification.sendOTPmailPinpoint({
          code: ran_otp,
          email: user.email,
        });
        // let ran_otp = '0000';
        if (
          !ver ||
          new Date().getTime() > new Date(ver.expiration_at).getTime()
        ) {
          ver = new Verification({
            user: user._id,
            otp: ran_otp,
            expiration_at: userHelper.getDatewithAddedMinutes(5),
          });
          await ver.save();
        }
        let token = await userHelper.encode(ver._id);

        return response.ok(res, { message: "OTP sent.", token });
      } else {
        return response.notFound(res, { message: "User does not exists." });
      }
    } catch (error) {
      return response.error(res, error);
    }
  },
  verifyOTP: async (req, res) => {
    try {
      const otp = req.body.otp;
      const token = req.body.token;
      if (!(otp && token)) {
        return response.badReq(res, { message: "otp and token required." });
      }
      let verId = await userHelper.decode(token);
      let ver = await Verification.findById(verId);
      if (
        otp == ver.otp &&
        !ver.verified &&
        new Date().getTime() < new Date(ver.expiration_at).getTime()
      ) {
        let token = await userHelper.encode(
          ver._id + ":" + userHelper.getDatewithAddedMinutes(5).getTime()
        );
        ver.verified = true;
        await ver.save();
        return response.ok(res, { message: "OTP verified", token });
      } else {
        return response.notFound(res, { message: "Invalid OTP" });
      }
    } catch (error) {
      return response.error(res, error);
    }
  },
  changePassword: async (req, res) => {
    try {
      const token = req.body.token;
      const password = req.body.password;
      const data = await userHelper.decode(token);
      const [verID, date] = data.split(":");
      if (new Date().getTime() > new Date(date).getTime()) {
        return response.forbidden(res, { message: "Session expired." });
      }
      let otp = await Verification.findById(verID);
      if (!otp.verified) {
        return response.forbidden(res, { message: "unAuthorize" });
      }
      let user = await User.findById(otp.user);
      if (!user) {
        return response.forbidden(res, { message: "unAuthorize" });
      }
      await otp.remove();
      user.password = user.encryptPassword(password);
      await user.save();
      mailNotification.passwordChangePinPoint({ email: user.email });
      return response.ok(res, { message: "Password changed! Login now." });
    } catch (error) {
      return response.error(res, error);
    }
  },
};
