const mongoose = require("mongoose");
const response = require("./../responses");
const Job = mongoose.model("Job");
const Invoice = mongoose.model("Invoice");
const dayjs = require("dayjs");
const User = mongoose.model("User");
const Client = mongoose.model("Client");
const JobInvite = mongoose.model("JobInvite");
const notification = require("./../services/notification");
const Identity = mongoose.model("Identity");
const { find } = require("../helper/user");
const { sendPdf, sendPdfForuserJob } = require("../services/mailNotification");
const Festa = mongoose.model("Festa");
const moment = require("moment");

function getDateRange(query) {
  const currDate = new Date().getTime();
  const lastWDate = currDate - 7 * 60 * 60 * 24 * 1000;
  return [
    new Date(query["startDate"] || lastWDate),
    new Date(query["endDate"] || currDate),
  ];
}

module.exports = {
  sendMailWithPdf: async (req, res) => {
    try {
      const data = req.body;
      const attachments = [
        {
          filename: "Invoice.png",
          path: data.attachment,
          // content: data.attachment.split(",").pop(),
          // contentType: "application/pdf"
        },
      ];
      sendPdf({ email: data.email, attachments });
      return response.ok(res, { message: "Invoice sent." });
    } catch (error) {
      return response.error(res, error);
    }
  },

  sendMailWithPdfForUserJob: async (req, res) => {
    try {
      const data = req.body;
      const attachments = [
        {
          filename: `${data.title}.pdf`,
          path: data.attachment,
          // content: data.attachment.split(",").pop(),
          // contentType: "application/pdf"
        },
      ];
      sendPdfForuserJob({ email: data.email, attachments, title: data.title, name: data.name });
      return response.ok(res, { message: "Pdf sent to user." });
    } catch (error) {
      return response.error(res, error);
    }
  },

  addNote: async (req, res) => {
    try {
      await Invoice.findByIdAndUpdate(req.params["invoice_id"], {
        note: req.body.note,
      });
      return response.ok(res, { message: "Note updated." });
    } catch (error) {
      return response.error(res, error);
    }
  },
  listClient: async (req, res) => {
    try {
      let startDate = new Date(req.query["start"]);
      let endDate = new Date(req.query["end"]);
      let s_endDate = new Date(req.query["end"]);

      let posted_by = req.user.id;
      // req.body.posted_by ? req.body.posted_by :
      let jobs = await Job.find(
        {
          posted_by: posted_by,
          startDate: {
            $gte: startDate,
            $lt: new Date(endDate.setDate(endDate.getDate() + 1)),
          },
        },
        { client: 1 }
      )
        .populate("client", "fullName billingcycle")
        .lean();
      // let clients = jobs.map(j => j.client);
      const obbj = {};
      const clients = jobs.filter((j) => {
        if (j.client && !obbj[j.client._id]) {
          obbj[j.client._id] = true;
          return j.client;
        }
      });
      let newClientList = [];
      await Promise.all(
        clients.map(async (f) => {
          let invoice = await Invoice.findOne({
            client: f.client._id,
            startDate,
            endDate: s_endDate,
            deleted: { $ne: true }
          }).populate('client');
          console.log(invoice);
          if (invoice) {
            f.created = true;
            f.invoice = invoice

          } else {
            f.created = false;
          }
          newClientList.push(f);
        })
      );

      return response.ok(res, { clients: newClientList });
    } catch (error) {
      return response.error(res, error);
    }
  },
  generateInvoice: async (req, res) => {
    try {
      let startDate = new Date(req.body.start);
      let endDate = new Date(req.body.end);
      let s_endDate = new Date(req.body.end);

      const client_ids = Array.isArray(req.body.client_id)
        ? req.body.client_id
        : [req.body.client_id];
      let invoice = [];

      for (let client_id of client_ids) {
        const clientObj = {};
        let jobs = await Job.find({
          client: client_id,
          startDate: {
            $gte: startDate,
            $lt: new Date(endDate.setDate(endDate.getDate() + 1)),
          },
        })
          .populate("client")
          .lean();
        let list = [],
          amount = 0;
        for (let j of jobs) {
          try {
            clientObj[client_id] =
              String(j.client_obj.clientRef || j.client.clientRef) + Math.floor(Math.random() * 10000);
          } catch (err) {
            clientObj[client_id] = Math.floor(Math.random() * 10000);
            console.error(err);
          }
          if (!j.applicant.length) continue;
          const date1 = dayjs(j.startDate);
          const date2 = dayjs(j.endDate);
          let diff = date2.diff(date1, "hour", true);
          let obj = {
            date1,
            date: date1.format("DD-MM-YYYY"),
            msg: `${j.applicant.length} staff to ${j.client_obj.fullName || j.client.fullName}`,
            startDate: j.startDate,
            endDate: j.endDate,
            rate: j.client_obj.rate || j.client.rate,
            hour: diff,
            person: j.applicant.length,
            amount: diff * j.applicant.length * (j.client_obj.rate || j.client.rate),
            id: j._id,
          };
          amount += obj.amount;
          list.push(obj);
        }
        list.sort(function (a, b) {
          return new Date(a.date1).getTime() - new Date(b.date1).getTime();
        });

        if (!list.length) {
          invoice.push({
            client_id,
            message: "No job done in this time frame.",
          });
          continue;
        }

        if (req.body.invoiceID) {
          invoice.push(
            await Invoice.findByIdAndUpdate(
              req.body.invoiceID,
              {
                jobDetails: list,
                amount: amount,
                deleted: false,
                archive: false
              },
              { new: true }
            )
          );
        } else {
          invoice.push(
            await Invoice.create({
              organization: req.user.id,
              client: client_id,
              invoice_id: clientObj[client_id],
              jobDetails: list,
              amount: amount,
              startDate: startDate,
              endDate: s_endDate,
              deleted: req.body.deleted
            })
          );
        }
      }
      return response.ok(res, { invoice });
    } catch (error) {
      return response.error(res, error);
    }
  },
  getInvoice: async (req, res) => {
    try {
      // let client = req.params["client_id"];
      let invoice = req.params["invoice_id"];
      // , deleted: false 
      let cond = { organization: req.user.id };
      if (!invoice) { cond.deleted = { $ne: true }; cond.archive = { $ne: true } };
      if (invoice) cond._id = invoice;

      let invoices = await Invoice.find(cond).populate("client").lean();
      return response.ok(res, { invoices });
    } catch (error) {
      return response.error(res, error);
    }
  },
  getArchiveInvoice: async (req, res) => {
    try {
      // let client = req.params["client_id"];
      let invoice = req.params["invoice_id"];
      // , deleted: false 
      let cond = { organization: req.user.id, archive: true };
      // if (!invoice) { cond.deleted = { $ne: true }; cond.archive = { $ne: true } };
      // if (invoice) cond._id = invoice;

      let invoices = await Invoice.find(cond).populate("client").lean();
      return response.ok(res, { invoices });
    } catch (error) {
      return response.error(res, error);
    }
  },
  updateInvoice: async (req, res) => {
    try {
      let invoice = await Invoice.findByIdAndUpdate(req.params.id, { deleted: false }, { upsert: true, new: true }).populate("client").lean();
      return response.ok(res, { invoice });
    } catch (error) {
      return response.error(res, error);
    }
  },
  updateStatus: async (req, res) => {
    try {
      let invoice = req.params["invoice_id"];
      await Invoice.updateOne({ _id: invoice }, { status: req.body.status });
      return response.ok(res, { message: "Status updated." });
    } catch (error) {
      return response.error(res, error);
    }
  },
  deleteInvoice: async (req, res) => {
    try {
      let invoice = req.params["invoice_id"];
      // await Invoice.deleteOne({ _id: invoice });
      await Invoice.findByIdAndUpdate(invoice, { archive: req.query.isArchive })
      return response.ok(res, { message: "Invoice archived." });
    } catch (error) {
      return response.error(res, error);
    }
  },
  // deleteInvoice: async (req, res) => {
  //   try {
  //     let invoice = req.params["invoice_id"];
  //     // await Invoice.deleteOne({ _id: invoice });
  //     await Invoice.findByIdAndUpdate(invoice, { archive: true })
  //     return response.ok(res, { message: "Invoice deleted." });
  //   } catch (error) {
  //     return response.error(res, error);
  //   }
  // },
  removeInvoice: async (req, res) => {
    try {
      let invoice = req.params["invoice_id"];
      await Invoice.deleteOne({ _id: invoice });
      return response.ok(res, { message: "Invoice deleted." });
    } catch (error) {
      return response.error(res, error);
    }
  },

  removeAllInvoice: async (req, res) => {
    try {
      await Invoice.deleteMany({ deleted: true });
      return response.ok(res, { message: "Invoice deleted." });
    } catch (error) {
      return response.error(res, error);
    }
  },

  repeatJob: async (req, res) => {
    try {
      // monday(1) ....... suturday(6), sunday(0)
      // req.body.repeat = [4, 6];
      // req.body.repeat = 1;
      // req.body.startDate = "2023-04-10";
      // req.body.endDate = "2023-04-23";
      // req.body.staff = ['63fc8de24aa0fa34e78ba390'];

      // Repeat job multiple times
      let job_id = req.params["job_id"];
      let job = await Job.findById(job_id).lean();
      delete job._id;

      let staff = req.body.staff;

      let startDate = new Date(req.body.startDate);
      let endDate = new Date(req.body.endDate);

      const repeat = Array.isArray(req.body.repeat) ? "W" : "D";
      for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
        const jj = JSON.parse(JSON.stringify(job));
        // console.log("counter + diff", counter, diff, d.getDay(), d.toDateString());
        if (repeat == "D" || req.body.repeat.includes(d.getDay())) {
          let sD = new Date(jj.startDate);
          let eD = new Date(jj.endDate);
          // const dateDiff = eD.getDate() - sD.getDate();
          const dateDiff = moment(eD).diff(sD, 'hours')
          sD.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
          eD.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
          //eD.setDate(sD.getDate() + dateDiff);
          eD.setHours(sD.getHours() + dateDiff);
          // if endDate is on different day
          jj.startDate = sD;
          jj.endDate = eD;
          jj.posted_by = req.user.id;
          jj.invited = staff;
          jj.applicant = [];
          jj.client_obj = await Client.findById(job.client)
          const nj = await Job.create(jj);
          for (let u of staff) {
            let JobIn = await JobInvite.create({
              invited: u,
              job: nj._id,
              by: nj.posted_by,
            });
            await notification.push(
              {
                to: u,
                from: nj.posted_by,
                content: `You have been invited for a job(${nj.title}).`,
              },
              JobIn._id
            );
          }
        }
      }
      const uuser = await User.findById(job.posted_by, { username: 1 }).lean();
      const start = moment(req.body.startDate).format("DD-MM-YYYY");
      const end = moment(req.body.endDate).format("DD-MM-YYYY");
      await notification.adminActivity({
        to: job.posted_by,
        job: job_id,
        content: `Admin (${uuser.username}) repeated this job from  ${start} to  ${end}.`,
        // Admin (AdminName) repeated this job from (dateStart) to
      });
      return response.ok(res, { message: "Jobs Created." });
    } catch (error) {
      return response.error(res, error);
    }
  },
  //(1) Net Income Generation Trend
  getStatsOfNetIncome: async (req, res) => {
    try {
      let org = req.params["org_id"];
      let view = req.params["view"];
      let message = "Yearly View";
      const matchCond = {
        $match: {
          posted_by: new mongoose.Types.ObjectId(org),
        },
      };
      if (req.query["startDate"]) {
        view = "DAILY";
      }
      let pip = [
        matchCond,
        {
          $project: {
            startDate: 1,
            job_hrs: 1,
            amount: 1,
            client: 1,
            client_obj: 1,
            year: { $year: "$startDate" },
          },
        },
        // {
        //   $lookup: {
        //     from: "clients",
        //     localField: "client",
        //     foreignField: "_id",
        //     as: "client",
        //   },
        // },
        { $unwind: "$client" },
        {
          $project: {
            year: 1,
            "Net Income": { $multiply: ["$client_obj.rate", "$job_hrs"] },
          },
        },
        {
          $group: {
            _id: "$year",
            "Net Income": { $sum: "$Net Income" },
          },
        },
        { $sort: { _id: 1 } },
      ];
      if (view == "MONTHLY") {
        message = "Monthly View";
        pip = [
          matchCond,
          {
            $project: {
              startDate: 1,
              job_hrs: 1,
              amount: 1,
              client: 1,
              client_obj: 1,
              year: { $year: "$startDate" },
              month: { $month: "$startDate" },
            },
          },
          { $match: { year: new Date().getFullYear() } },
          // {
          //   $lookup: {
          //     from: "clients",
          //     localField: "client",
          //     foreignField: "_id",
          //     as: "client",
          //   },
          // },
          { $unwind: "$client" },
          {
            $project: {
              month: 1,
              "Net Income": { $multiply: ["$client_obj.rate", "$job_hrs"] },
            },
          },
          {
            $group: {
              _id: "$month",
              "Net Income": { $sum: "$Net Income" },
            },
          },
          { $sort: { _id: 1 } },
          {
            $project: {
              _id: {
                $arrayElemAt: [
                  [
                    "",
                    "January",
                    "February",
                    "March",
                    "April",
                    "May",
                    "June",
                    "July",
                    "August",
                    "September",
                    "October",
                    "November",
                    "December",
                  ],
                  "$_id",
                ],
              },
              "Net Income": 1,
            },
          },
        ];
      } else if (view == "DAILY") {
        const [st, et] = getDateRange(req.query);

        const newEt = new Date(new Date(et).setDate(new Date(et).getDate() + 1))
        console.log(newEt)
        matchCond.$match.startDate = { $gte: st, $lte: newEt };
        message = `${st.toDateString()} to ${et.toDateString()}`;
        pip = [
          matchCond,
          // {
          //   $lookup: {
          //     from: "clients",
          //     localField: "client",
          //     foreignField: "_id",
          //     as: "client",
          //   },
          // },
          { $unwind: "$client" },
          {
            $project: {
              startDate: 1,
              "Net Income": { $multiply: ["$client_obj.rate", "$job_hrs"] },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$startDate" },
              },
              "Net Income": { $sum: "$Net Income" },
            },
          },
          { $sort: { _id: 1 } },
        ];
      }

      let stats = await Job.aggregate(pip);
      return response.ok(res, {
        stats,
        message: `Net Income Trend(£): ${message}`,
      });
    } catch (error) {
      return response.error(res, error);
    }
  },
  // REMOVED
  //(*) Count of Users, Staff & Client On-boarded
  getStatsOfResources: async (req, res) => {
    try {
      const org = req.params["org_id"];
      let view = req.params["view"];
      const obj = { $match: { organization: new mongoose.Types.ObjectId(org) } };

      if (view == "MONTHLY") {
      }
      let clientP = Client.aggregate([
        obj,
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            clients: {
              $sum: 1,
            },
          },
        },
      ]);
      let usersP = User.aggregate([
        { $match: { isOrganization: true } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            users: {
              $sum: 1,
            },
          },
        },
      ]);

      let [clients, users] = await Promise.all([clientP, usersP]);
      const map = new Map();
      clients.forEach((item) => map.set(item._id, item));
      users.forEach((item) =>
        map.set(item._id, { ...map.get(item._id), ...item })
      );
      const stats = Array.from(map.values());
      return response.ok(res, {
        stats,
        message: "Count of Users, Staff & Client On-boarded.",
      });
    } catch (error) {
      return response.error(res, error);
    }
  },
  //(2) Net Income, Expense and Profit
  getStatsOfIncome: async (req, res) => {
    try {
      let org = req.params["org_id"];
      let view = req.params["view"];
      let message = "Yearly View";
      const matchCond = {
        $match: {
          posted_by: new mongoose.Types.ObjectId(org),
        },
      };
      if (req.query["startDate"]) {
        view = "DAILY";
      }
      let pip = [
        matchCond,
        // {
        //   $lookup: {
        //     from: "clients",
        //     localField: "client",
        //     foreignField: "_id",
        //     as: "client",
        //   },
        // },
        { $unwind: "$client" },
        {
          $project: {
            year: { $year: "$startDate" },
            Vat: "$client_obj.vat",
            Wages: { $multiply: ["$amount", "$job_hrs"] },
            Profit: {
              $subtract: [
                {
                  $multiply: [
                    {
                      $add: [
                        "$client_obj.rate",
                        {
                          $multiply: [
                            "$client_obj.rate",
                            { $divide: ["$client_obj.vat", 100] },
                          ],
                        },
                      ],
                    },
                    "$job_hrs",
                  ],
                },
                { $multiply: ["$amount", "$job_hrs"] },
              ],
            },
          },
        },
        {
          $project: {
            year: 1,
            Wages: 1,
            Profit: 1,
            Vat: 1,
            "Net Income": { $add: ["$Wages", "$Profit"] },
          },
        },
        { $sort: { year: 1 } },
        {
          $group: {
            _id: "$year",
            Wage: { $sum: "$Wages" },
            Profit: { $sum: "$Profit" },
            Vat: { $sum: "$Vat" },
            "Net Income": { $sum: "$Net Income" },
          },
        },
      ];
      if (view == "MONTHLY") {
        message = "Monthly View";
        pip = [
          matchCond,
          {
            $project: {
              startDate: 1,
              job_hrs: 1,
              amount: 1,
              client: 1,
              client_obj: 1,
              month: { $month: "$startDate" },
              day: { $dayOfMonth: "$startDate" },
              year: { $year: "$startDate" },
            },
          },
          { $match: { year: new Date().getFullYear() } },
          // {
          //   $lookup: {
          //     from: "clients",
          //     localField: "client",
          //     foreignField: "_id",
          //     as: "client",
          //   },
          // },
          { $unwind: "$client" },
          {
            $project: {
              Vat: "$client_obj.vat",
              month: 1,
              Wages: { $multiply: ["$amount", "$job_hrs"] },
              Profit: {
                $subtract: [
                  {
                    $multiply: [
                      {
                        $add: [
                          "$client_obj.rate",
                          {
                            $multiply: [
                              "$client_obj.rate",
                              { $divide: ["$client_obj.vat", 100] },
                            ],
                          },
                        ],
                      },
                      "$job_hrs",
                    ],
                  },
                  { $multiply: ["$amount", "$job_hrs"] },
                ],
              },
            },
          },
          {
            $project: {
              Wages: 1,
              Profit: 1,
              Vat: 1,
              month: 1,
              "Net Income": { $add: ["$Wages", "$Profit"] },
            },
          },
          { $sort: { month: 1 } },
          {
            $group: {
              _id: {
                $arrayElemAt: [
                  [
                    "",
                    "January",
                    "February",
                    "March",
                    "April",
                    "May",
                    "June",
                    "July",
                    "August",
                    "September",
                    "October",
                    "November",
                    "December",
                  ],
                  "$month",
                ],
              },
              Wage: { $sum: "$Wages" },
              Profit: { $sum: "$Profit" },
              Vat: { $sum: "$Vat" },
              "Net Income": { $sum: "$Net Income" },
            },
          },
        ];
      } else if (view == "DAILY") {
        const [st, et] = getDateRange(req.query);

        const newEt = new Date(new Date(et).setDate(new Date(et).getDate() + 1))
        console.log(newEt)
        matchCond.$match.startDate = { $gte: st, $lte: newEt };
        message = `${st.toDateString()} to ${et.toDateString()}`;
        pip = [
          matchCond,
          // {
          //   $lookup: {
          //     from: "clients",
          //     localField: "client",
          //     foreignField: "_id",
          //     as: "client",
          //   },
          // },
          { $unwind: "$client" },
          {
            $project: {
              startDate: 1,
              Vat: "$client_obj.vat",
              Wages: { $multiply: ["$amount", "$job_hrs"] },
              Profit: {
                $subtract: [
                  {
                    $multiply: [
                      {
                        $add: [
                          "$client_obj.rate",
                          {
                            $multiply: [
                              "$client_obj.rate",
                              { $divide: ["$client_obj.vat", 100] },
                            ],
                          },
                        ],
                      },
                      "$job_hrs",
                    ],
                  },
                  { $multiply: ["$amount", "$job_hrs"] },
                ],
              },
            },
          },
          {
            $project: {
              startDate: 1,
              Wages: 1,
              Profit: 1,
              Vat: 1,
              "Net Income": { $add: ["$Wages", "$Profit"] },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$startDate" },
              },
              Wage: { $sum: "$Wages" },
              Profit: { $sum: "$Profit" },
              Vat: { $sum: "$Vat" },
              "Net Income": { $sum: "$Net Income" },
            },
          },
          { $sort: { _id: 1 } },
        ];
      }
      let stats = await Job.aggregate(pip);

      return response.ok(res, {
        stats,
        message: `Net Income, Expense and Profit(£): ${message}`,
      });
    } catch (error) {
      return response.error(res, error);
    }
  },
  //(3) Top 5 Clients by gross revenue contribution
  getStatsOfClients: async (req, res) => {
    try {
      let org = req.params["org_id"];
      const [st, et] = getDateRange(req.query);

      const newEt = new Date(new Date(et).setDate(new Date(et).getDate() + 1))
      console.log(newEt)
      const matchCond = {
        posted_by: new mongoose.Types.ObjectId(org),
      };
      let message = "Aggregate View";
      if (req.query["startDate"]) {

        matchCond.startDate = { $gte: st, $lte: newEt };
        message = `${st.toDateString()} to ${et.toDateString()}`;
      }
      // const clients = await Client.find({ organization: mongoose.Types.ObjectId(org) }).lean();
      // const c_ids = clients.map(c => c._id);
      // const cond = { client: { $in: c_ids } };
      const jobs = await Job.find(matchCond).populate("client").lean();
      let clients_with_revenue = {};
      jobs.forEach((j) => {
        if (!j.client) return;
        const date1 = dayjs(j.startDate);
        const date2 = dayjs(j.endDate);
        let diff = date2.diff(date1, "hour", true);
        if (clients_with_revenue[j.client._id]) {
          clients_with_revenue[j.client._id].amount +=
            j.client.rate * j.person * diff;
        } else {
          clients_with_revenue[j.client._id] = {
            name: j.client.fullName,
            amount: j.client.rate * j.person * diff,
          };
        }
      });
      clients_with_revenue = Object.entries(clients_with_revenue).sort(
        (a, b) => {
          return b[1].amount - a[1].amount;
        }
      );
      let top_revenue = clients_with_revenue.slice(0, 5);
      let stats = top_revenue.map((t) => {
        return { name: t[1].name, revenue: t[1].amount };
      });
      return response.ok(res, {
        stats,
        message: `Top 5 Clients by gross revenue contribution(£): ${message}`,
      });
    } catch (error) {
      return response.error(res, error);
    }
  },
  dashboardStats: async (req, res) => {
    try {
      let pip = [
        {
          $match: {
            posted_by: new mongoose.Types.ObjectId(req.user.id),
          },
        },
        // {
        //   $lookup: {
        //     from: "clients",
        //     localField: "client",
        //     foreignField: "_id",
        //     as: "client",
        //   },
        // },
        { $unwind: "$client" },
        {
          $project: {
            posted_by: 1,
            Wages: { $multiply: ["$amount", "$job_hrs"] },
            Profit: {
              $subtract: [
                {
                  $multiply: [
                    {
                      $add: [
                        "$client_obj.rate",
                        {
                          $multiply: [
                            "$client_obj.rate",
                            { $divide: ["$client_obj.vat", 100] },
                          ],
                        },
                      ],
                    },
                    "$job_hrs",
                  ],
                },
                { $multiply: ["$amount", "$job_hrs"] },
              ],
            },
          },
        },
        {
          $project: {
            posted_by: 1,
            Wages: 1,
            Profit: 1,
            "Net Income": { $add: ["$Wages", "$Profit"] },
          },
        },
        {
          $group: {
            _id: "$posted_by",
            pay: { $sum: "$Wages" },
            income: { $sum: "$Net Income" },
          },
        },
      ];
      let stats = await Job.aggregate(pip);

      return response.ok(res, stats);
    } catch (error) {
      return response.error(res, error);
    }
  },

  gaurdPay: async (req, res) => {
    try {
      const startDate = new Date(req.query["startDate"]);
      const endDate = new Date(req.query["endDate"]);
      const page = parseInt(req.query.page);
      const limit = parseInt(req.query.limit);
      const skip = (Number(page - 1) * limit);

      const jobs = await Job.find({
        posted_by: new mongoose.Types.ObjectId(req.user.id),
        startDate: {
          $gte: startDate,
          $lt: new Date(endDate.setDate(endDate.getDate() + 1)),
        },
      }).populate("applicant", "_id username fullName commission");

      const gaurds = {};

      for (let job of jobs) {
        let wages = 0;
        for (let a of job.applicant) {
          let wg = job.amount * job.job_hrs

          let commission = 0
          if (a.commission) {
            commission = (wg / 100) * 3
            if (commission >= 1) {
              wages = wg - 0.99
            } else {
              wages = wg - commission
            }
          } else {
            wages = wg;
          }

          if (gaurds[a.username]) {
            if (gaurds[a.username].job_id !== job._id.toString()) {
              gaurds[a.username] = {
                name: a.fullName,
                wages: wages + gaurds[a.username].wages,
                job_id: job._id.toString(),
              };
            }
          } else {
            gaurds[a.username] = {
              name: a.fullName,
              wages,
              job_id: job._id.toString(),
            };
          }
          gaurds[a.username]._id = a._id;
        }
      }

      return response.ok(res, {
        guards: Object.values(gaurds).slice(skip, skip + limit), // <-- pagination applied here
        totalPages: Math.ceil(Object.values(gaurds).length / limit),
        currentPage: page,
      });

    } catch (error) {
      return response.error(res, error);
    }
  },

  gaurdJobHistory: async (req, res) => {
    try {
      const gaurd = new mongoose.Types.ObjectId(req.params["gaurd"]);
      const startDate = new Date(req.query["startDate"]);
      const endDate = new Date(req.query["endDate"]);

      let [gaurdDetails, identity] = await Promise.all([
        find({ _id: gaurd }).lean(),
        Identity.find({ user: gaurd }).lean(),
      ]);
      gaurdDetails.identity = identity.map((i) => {
        i.image = `${process.env.ASSET_ROOT}/${i.key}`;
        return i;
      });
      let jobs = await Job.find({
        applicant: gaurd,
        startDate: {
          $gte: startDate,
          $lt: new Date(endDate.setDate(endDate.getDate() + 1)),
        },
      })
        .populate("client", "fullName rate")
        .lean();
      jobs = jobs.map((j) => {
        j.pay = j.amount;
        let wg = j.amount * j.job_hrs

        let commission = 0
        if (gaurdDetails.commission) {
          commission = (wg / 100) * 3
          if (commission >= 1) {
            wages = wg - 0.99
            commission = 0.99
          } else {
            wages = wg - commission
          }
        } else {
          wages = wg;
        }
        j.wages = wages
        j.commission = commission
        return j;
      });
      return response.ok(res, { gaurdDetails, jobs });
    } catch (error) {
      return response.error(res, error);
    }
  },

  createEvent: async (req, res) => {
    try {
      const allEvent = await Festa.find({});
      if (allEvent.length >= 4) {
        return response.error(res, {
          message: "Please remove any event then try again!",
        });
      }
      const payload = req.body || {};
      const festa = new Festa({
        ...payload,
      });
      await festa.save();
      return response.ok(res, { message: "Event created successfully" });
    } catch (error) {
      return response.error(res, error);
    }
  },

  getevent: async (req, res) => {
    try {
      const festa = await Festa.find({});
      return response.ok(res, festa);
    } catch (error) {
      return response.error(res, error);
    }
  },

  deleteEvent: async (req, res) => {
    try {
      await Festa.findByIdAndDelete(new mongoose.Types.ObjectId(req.body.id));
      return response.ok(res, { message: "Event deleted successfully" });
    } catch (error) {
      return response.error(res, error);
    }
  },
};
