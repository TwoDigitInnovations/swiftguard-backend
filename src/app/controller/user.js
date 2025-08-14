"use strict";
const userHelper = require("./../helper/user");
const response = require("./../responses");
const passport = require("passport");
const jwtService = require("./../services/jwtService");
const mailNotification = require("./../services/mailNotification");
const mongoose = require("mongoose");
const Device = mongoose.model("Device");
const User = mongoose.model("User");
const Verification = mongoose.model("Verification");
const Notification = mongoose.model("Notification");
const Identity = mongoose.model("Identity");
const Client = mongoose.model("Client");

module.exports = {
  // login controller
  login: (req, res) => {
    passport.authenticate("local", async (err, user, info) => {
      if (err) {
        return response.error(res, err);
      }
      if (!user) {
        return response.unAuthorize(res, info);
      }
      //console.log('user=======>>',user);
      let token = await new jwtService().createJwtToken({
        id: user._id,
        user: user.fullName || user.username,
        type: user.type,
      });

      await Device.updateOne(
        { device_token: req.body.device_token },
        { $set: { player_id: req.body.player_id, user: user._id } },
        { upsert: true }
      );

      return response.ok(res, {
        token,
        username: user.username,
        type: user.type,
        email: user.email,
        id: user._id,
        isOrganization: user.isOrganization,
        profile: user.profile,
        fullName: user.fullName,
      });
    })(req, res);
  },

  loginwithidentity: (req, res) => {
    passport.authenticate("local", async (err, user, info) => {
      if (err) {
        return response.error(res, err);
      }
      if (!user) {
        return response.unAuthorize(res, info);
      }
      //console.log('user=======>>',user);
      let token = await new jwtService().createJwtToken({
        id: user._id,
        user: user.fullName || user.username,
        type: user.type,
      });

      await Device.updateOne(
        { device_token: req.body.device_token },
        { $set: { player_id: req.body.player_id, user: user._id } },
        { upsert: true }
      );
      let identity = []
      let ident = await Identity.find({ user: user._id }).lean();
      console.log(ident)
      if (ident.length > 0) {
        identity = ident.map((i) => {
          i.image = `${process.env.ASSET_ROOT}/${i.key}`;
          return i;
        })
      }
      return response.ok(res, {
        token,
        username: user.username,
        type: user.type,
        email: user.email,
        id: user._id,
        isOrganization: user.isOrganization,
        profile: user.profile,
        fullName: user.fullName,
        identity,
        verified: user.verified,
      });
    })(req, res);
  },
  signUp: async (req, res) => {
    try {
      const payload = req.body;
      let user = await User.find({
        $or: [
          { username: payload.username.toLowerCase() },
          { email: payload.email.toLowerCase() },
        ],
      }).lean();
      if (!user.length) {
        // let user = await User.findOne({ email: payload.email.toLowerCase()  }).lean();
        // if (!user) {
        let user = new User({
          username: payload.username.toLowerCase(),
          password: payload.password,
          type: payload.type,
          phone: payload.phone,
          email: payload.email.toLowerCase(),
          fullName: payload.fullName,
        });
        if (payload.isOrganization) {
          user.isOrganization = true;
          user.organization = payload.organization;
          user.orgShortCode = payload.orgShortCode;
          user.orgAddress = payload.orgAddress;
          user.orgPhone = payload.phone;
        }
        user.password = user.encryptPassword(req.body.password);
        await user.save();
        mailNotification.welcomeMail({
          email: user.email,
          username: user.username,
        });
        // let token = await new jwtService().createJwtToken({ id: user._id, email: user.username });
        return response.created(res, { username: user.username });
      } else {
        return response.conflict(res, {
          message: "username or email already exists.",
        });
      }
    } catch (error) {
      return response.error(res, error);
    }
  },
  changePasswordProfile: async (req, res) => {
    try {
      let user = await User.findById(req.user.id);
      if (!user) {
        return response.notFound(res, { message: "User doesn't exists." });
      }
      user.password = user.encryptPassword(req.body.password);
      await user.save();
      mailNotification.passwordChange({ email: user.email });
      return response.ok(res, { message: "Password changed." });
    } catch (error) {
      return response.error(res, error);
    }
  },
  me: async (req, res) => {
    try {
      let [user, identity] = await Promise.all([
        userHelper.find({ _id: req.user.id }).lean(),
        Identity.find({ user: req.user.id }).lean(),
      ]);
      user.identity = identity.map((i) => {
        i.image = `${process.env.ASSET_ROOT}/${i.key}`;
        return i;
      });
      return response.ok(res, user);
    } catch (error) {
      return response.error(res, error);
    }
  },
  updateUser: async (req, res) => {
    try {
      delete req.body.password;
      if (req.body.location) {
        req.body.location = {
          type: "Point",
          // [longitude, latitude]
          coordinates: req.body.location,
        };
      }
      const id = req.body.gaurd_id || req.user.id;
      await User.updateOne({ _id: id }, { $set: req.body });
      return response.ok(res, { message: "Profile Updated." });
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
        await mailNotification.sendOTPmail({
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
      mailNotification.passwordChange({ email: user.email });
      return response.ok(res, { message: "Password changed! Login now." });
    } catch (error) {
      return response.error(res, error);
    }
  },
  notification: async (req, res) => {
    try {
      let notifications = await Notification.find({
        for: req.user.id,
        deleted: { $ne: true },
      })
        .populate({
          path: "invited_for job",
          populate: { path: "job", populate: "client" },
        })
        .sort({ updatedAt: -1 })
        .lean();
      //   const data = notifications.sort(
      //     (a, b) => b.invited_for?.updatedAt - a.invited_for?.updatedAt
      //   );
      return response.ok(res, { notifications: notifications });
    } catch (error) {
      return response.error(res, error);
    }
  },

  notificationPage: async (req, res) => {
    try {
      let notifications = await Notification.find({
        for: req.user.id,
        deleted: { $ne: true },
      })
        .populate({
          path: "invited_for",
        })
        .populate({
          path: "job",
          populate: { path: "client" },
        })
        .sort({ createdAt: -1 })
        .skip(req.body.limit * (req.body.page - 1))
        .limit(req.body.limit)
        .lean();
      //   const data = notifications.sort(
      //     (a, b) => b.invited_for?.updatedAt - a.invited_for?.updatedAt
      //   );
      return response.ok(res, { notifications: notifications });
    } catch (error) {
      return response.error(res, error);
    }
  },
  deleteNotification: async (req, res) => {
    try {
      let notification_id = req.params["not_id"];
      await Notification.updateMany(
        notification_id
          ? { for: req.user.id, _id: notification_id }
          : { for: req.user.id },
        { deleted: true }
      );
      return response.ok(res, { message: "Notification(s) deleted!" });
    } catch (error) {
      return response.error(res, error);
    }
  },
  updateSettings: async (req, res) => {
    try {
      await User.findByIdAndUpdate(req.user.id, { $set: req.body });
      return response.ok(res, { message: "Settings updated." });
    } catch (error) {
      return response.error(res, error);
    }
  },
  getSettings: async (req, res) => {
    try {
      const settings = await User.findById(req.user.id, {
        notification: 1,
        distance: 1,
      });
      return response.ok(res, { settings });
    } catch (error) {
      return response.error(res, error);
    }
  },
  fileUpload: async (req, res) => {
    try {
      const userId = req.body.gaurd_id || req.user.id;
      let key = req.file && req.file.key,
        type = req.body.type;
      let ident = await Identity.findOne({ type, user: userId });
      if (!ident) {
        ident = new Identity({ key, type, user: userId });
      }
      if (key) {
        ident.key = key; //update file location
      }
      if (req.body.expire && type == "SI_BATCH") {
        ident.expire = req.body.expire;
      }
      await ident.save();
      return response.ok(res, {
        message: "File uploaded.",
        file: `${process.env.ASSET_ROOT}/${key}`,
      });
    } catch (error) {
      return response.error(res, error);
    }
  },
  allOrganization: async (req, res) => {
    try {
      const users = await userHelper.findAll({ isOrganization: true }).lean();
      return response.ok(res, { users });
    } catch (error) {
      return response.error(res, error);
    }
  },
  guardListWithIdentity: async (req, res) => {
    try {
      let cond = { type: "PROVIDER" };
      if (req.body && req.body.search) {
        cond = {
          type: "PROVIDER",
          $or: [
            { username: { $regex: req.body.search } },
            { email: { $regex: req.body.search } },
          ],
        };
      }
      let guards = await userHelper.findAll(cond).lean();

      const ids = guards.map((a) => a._id);
      const identity = await Identity.find({ user: { $in: ids } }).lean();
      const hash = {};
      identity.map((r) => {
        if (hash[r.user]) {
          hash[r.user].push(r);
        } else {
          hash[r.user] = [r];
        }
      });
      guards.map((g) => {
        g.identity = hash[g._id];
      });
      return response.ok(res, { guards });
    } catch (error) {
      return response.error(res, error);
    }
  },
  guardListSearch: async (req, res) => {
    try {
      const cond = {
        type: "PROVIDER",
      };
      if (req.body && req.body.search) {
        cond['$or'] = [{ username: { $regex: req.body.search } },
        { email: { $regex: req.body.search } },]
      }
      let guards = await User.find(cond).lean();
      return response.ok(res, { guards });
    } catch (error) {
      return response.error(res, error);
    }
  },
  //////////Inten Surya's code ---!!!caution!!!/////

  //GuardList

  verifyGuard: async (req, res) => {
    try {
      await User.updateOne(
        { email: req.body.email },
        { $set: { verified: req.body.verified } }
      );
      return response.ok(res, {
        message: req.body.verified ? "Guard Verified." : "Guard Suspended.",
      });
    } catch (error) {
      return response.error(res, error);
    }
  },

  getStaffList: async (req, res) => {
    try {
      //let cond = { type: 'PROVIDER'};
      let guards = await User.find({ type: "PROVIDER" }, { username: 1 });
      return response.ok(res, { guards });
    } catch (error) {
      return response.error(res, error);
    }
  },

  regNewClient: async (req, res) => {
    try {
      const payload = req.body;
      let client = new Client(payload);
      await client.save();
      return response.ok(res, { message: "Client created!" });
    } catch (error) {
      return response.error(res, error);
    }
  },

  getAllClients: async (req, res) => {
    try {
      let cond = { organization: req.user.id };
      let client = req.params["client_id"];
      let org_id = req.query["org_id"];
      if (client) cond._id = client;
      if (req.user.type == "ADMIN" && org_id) cond.organization = org_id;
      let clients = await Client.find(cond).lean();
      return response.ok(res, { clients });
    } catch (error) {
      return response.error(res, error);
    }
  },
  deleteClient: async (req, res) => {
    try {
      let client = req.params["client_id"];
      await Client.deleteOne({ _id: client });
      return response.ok(res, { message: "Client deleted." });
    } catch (error) {
      return response.error(res, error);
    }
  },
  updateClient: async (req, res) => {
    try {
      let client = req.params["client_id"];
      await Client.findByIdAndUpdate(client, { $set: req.body });
      return response.ok(res, { message: "Client updated!" });
    } catch (error) {
      return response.error(res, error);
    }
  },

  updateGuardCommission: async (req, res) => {
    try {
      await User.findByIdAndUpdate(req.params.id, { commission: req.params.type });
      return response.ok(res, { message: "commission updated!" });
    } catch (error) {
      return response.error(res, error);
    }
  },

  verifyPayroll: async (req, res) => {
    const user = await User.findOne({ email: req.body.email });

    const isvalid = user.isValidPassword(req.body.password)
    if (!isvalid) {
      return response.error(res, { message: 'Unauthorised' });
    }

    const u = await User.findByIdAndUpdate(req.body.userid, {
      payroll: req.body.payroll
    }, { upsert: true, new: true })
    let data = {}

    if (req.body.type === 'verify') {
      data.subject = 'Verify Payroll Frequency',
        data.msg = 'Your payroll frequency has been approved. Thank you.',
        data.email = u.email
    } else {
      data.subject = 'Suspend Payroll Frequency',
        data.msg = 'Your payroll frequency has been suspended. if any query please contact our support team. Thank you.',
        data.email = u.email
    }

    // await mailNotification.payrollNotifyToUser(data)
    return response.ok(res, { message: req.body.msg });

  },
};
