const mongoose = require("mongoose");
const response = require("./../responses");
const Job = mongoose.model("Job");
const User = mongoose.model("User");
const Review = mongoose.model("Review");
const Incident = mongoose.model("Incident");
const JobInvite = mongoose.model("JobInvite");
const Photo = mongoose.model("Photo");
const dayjs = require("dayjs");
const Notification = mongoose.model("Notification");
const Invoice = mongoose.model("Invoice");
const Client = mongoose.model("Client");
const NewJob = mongoose.model("NewJob");

const notification = require("./../services/notification");
const userHelper = require("./../helper/user");
const newJob = require("../model/newJob");

const JobStatus = {
  REVOKED: "Reassigned to someone else.",
  DELETED: "Job no longer available.",
  PUBLIC: "Job made public.",
};

const compareArrays = (a, b) => {
  if (a.length !== b.length) return false;
  else {
    // Comparing each element of your array
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }
};

module.exports = {
  createJob: async (req, res) => {
    try {
      const jobDetails = req.body;
      let job = new Job(jobDetails);
      job.startDate = new Date(jobDetails.startDate).getTime();
      job.endDate = new Date(jobDetails.endDate).getTime();
      job.posted_by = jobDetails.posted_by ? jobDetails.posted_by : req.user.id;
      let users = [];
      if (jobDetails.staff && jobDetails.staff.length > 0) {
        job.public = false;
        let user = await userHelper.find({ _id: job.posted_by }).lean();
        // let isPast = job.startDate < new Date().getTime();
        await Promise.all(
          jobDetails.staff.map(async (staff) => {
            const staffDetail = await userHelper.find({ _id: staff }).lean();
            let JobIn = await JobInvite.create({
              invited: staff,
              job: job._id,
              by: job.posted_by,
            });
            users.push(staffDetail.fullName);
            // console.log(isPast);
            notification.adminActivity({
              to: job.posted_by,
              job: job._id,
              content: `${staffDetail.fullName} is invited for the job.`,
            });
            // if (!isPast) {
            notification.push(
              {
                to: staff,
                from: job.posted_by,
                content: `You have been invited by ${user.fullName} for a job.`,
              },
              JobIn._id
            );
            // }
          })
          // for (let i = 0; i < jobDetails.staff.length; i++) {

          //   const staff = await userHelper
          //     .find({ _id: jobDetails.staff[i] })
          //     .lean();
          //   let JobIn = await JobInvite.create({
          //     invited: jobDetails.staff[i],
          //     job: job._id,
          //     by: job.posted_by,
          //   });
          //   notification.adminActivity({
          //     to: job.posted_by,
          //     job: job._id,
          //     content: `${staff.username} is invited for the job.`,
          //   });
          //   notification.push(
          //     {
          //       to: jobDetails.staff[i],
          //       from: job.posted_by,
          //       content: `You have been invited by ${user.username} for a job.`,
          //     },
          //     JobIn._id
          //   );
          // }
        );
        job.invited = jobDetails.staff;
      }
      job.location = {
        type: "Point",
        // [longitude, latitude]
        coordinates: jobDetails.location,
      };
      const date1 = dayjs(jobDetails.startDate);
      const date2 = dayjs(jobDetails.endDate);
      job.job_hrs = date2.diff(date1, "hour", true);

      if (jobDetails.client_id) {
        job.client_obj = await Client.findById(jobDetails.client_id)
        job.client = jobDetails.client_id;
      }

      await job.save();

      const uuser = await User.findById(job.posted_by, {
        username: 1,
        fullName: 1,
      }).lean();
      await notification.adminActivity({
        to: job.posted_by,
        job: job._id,
        content: `Admin (${uuser.username}) created a job. `,
      });

      // ${`and invited ${users.toString()} for the job`}

      return response.ok(res, { id: job._id, message: "Job created!" });
    } catch (error) {
      return response.error(res, error);
    }
  },

  asignJob: async (req, res) => {
    try {
      const jobDetails = req.body;
      let job = new Job(jobDetails);
      job.startDate = new Date(jobDetails.startDate).getTime();
      job.endDate = new Date(jobDetails.endDate).getTime();
      job.posted_by = jobDetails.posted_by ? jobDetails.posted_by : req.user.id;
      let users = [];
      if (jobDetails.staff && jobDetails.staff.length > 0) {
        job.public = false;
        let user = await userHelper.find({ _id: job.posted_by }).lean();
        // let isPast = job.startDate < new Date().getTime();

        await Promise.all(
          jobDetails.staff.map(async (staff) => {
            const staffDetail = await userHelper.find({ _id: staff }).lean();
            let JobIn = await JobInvite.create({
              invited: staff,
              job: job._id,
              by: job.posted_by,
              status: "ASSIGNED",
            });
            users.push(staffDetail.fullName);
            // console.log(isPast);
            // notification.adminActivity({
            //   to: job.posted_by,
            //   job: job._id,
            //   content: `${staffDetail.username} is assigned for the job.`,
            // });
          })
        );
        job.applicant = jobDetails.staff;
      }
      job.location = {
        type: "Point",
        // [longitude, latitude]
        coordinates: jobDetails.location,
      };
      const date1 = dayjs(jobDetails.startDate);
      const date2 = dayjs(jobDetails.endDate);
      job.job_hrs = date2.diff(date1, "hour", true);

      if (jobDetails.client_id) {
        job.client_obj = await Client.findById(jobDetails.client_id)
        job.client = jobDetails.client_id;
      }

      await job.save();

      const uuser = await User.findById(job.posted_by, { username: 1 }).lean();
      await notification.adminActivity({
        to: job.posted_by,
        job: job._id,
        content: `Admin (${uuser.username
          }) created a job and assigned ${users.toString()} for the job`,
      });

      return response.ok(res, { id: job._id, message: "Job created!" });
    } catch (error) {
      return response.error(res, error);
    }
  },

  deleteJob: async (req, res) => {
    try {
      let job_id = req.params["job_id"];
      // await Job.deleteOne({ _id: job_id });
      let job = await Job.findById(job_id);
      let newd = await Invoice.find({
        "jobDetails.id": new mongoose.Types.ObjectId(job_id),
      })
      // .populate("client")
      // .lean();
      console.log(newd)
      if (newd.length) {
        newd.map(async (inv) => {
          const newJobdetail = inv.jobDetails.filter(
            (f) => f.id.toString() !== job_id
          );

          const newtotal = newJobdetail.reduce(
            (total, ele) => total + ele.amount,
            0
          );
          inv.jobDetails = newJobdetail,
            inv.amount = newtotal
          await inv.save()
        })


        // await Invoice.findOneAndUpdate(
        //   { "jobDetails.id": mongoose.Types.ObjectId(job_id) },
        //   {
        //     jobDetails: newJobdetail,
        //     amount: newtotal,
        //   },
        //   { new: true }
        // );

      }
      await job.remove();
      for (let i = 0; i < job.applicant.length; i++) {
        await notification.notify({
          to: job.applicant[i],
          from: job.posted_by,
          content: "Job no longer available.",
        });
      }
      await JobInvite.updateMany({ job: job_id }, { job_status: "DELETED" });

      const uuser = await User.findById(job.posted_by, { username: 1 }).lean();
      await notification.adminActivity({
        to: job.posted_by,
        job: job_id,
        content: `Admin (${uuser.username}) deleted job for ${job.title}.`,
      });

      return response.ok(res, { message: "Job deleted!" });
    } catch (error) {
      return response.error(res, error);
    }
  },
  getJob: async (req, res) => {
    try {
      let job_id = req.params["job_id"];
      const job = await Job.findById(job_id)
        .populate("invited", "username fullName")
        .lean();
      return response.ok(res, { job });
    } catch (error) {
      return response.error(res, error);
    }
  },
  updateJob: async (req, res) => {
    try {
      let job_id = req.params["job_id"];

      const job = await Job.findById(job_id).lean();

      console.log("Job time changed logs", job);
      req.body.location = {
        type: "Point",
        // [longitude, latitude]
        coordinates: req.body.location,
      };
      req.body.client = req.body.client_id;

      let staff = req.body.staff || [];
      let staff_ids = [];
      let jobInvites = await JobInvite.find({
        job: job_id,
        job_status: "ACTIVE",
      });
      if (jobInvites.length > 0) {
        staff_ids = jobInvites.map((j) => j.invited && j.invited.toString());
      }
      let posted_by = req.body.posted_by ? req.body.posted_by : req.user.id;
      if (job.public == false && req.body.public == true) {
        await JobInvite.updateMany({ job: job_id }, { job_status: "PUBLIC" });
        req.body.invited = [];
        req.body.applicant = [];
        req.body.public = true;
      } else if (staff && !compareArrays(staff_ids, staff)) {
        console.log("Staff changed notification ");
        let toAdd = staff.filter((x) => !staff_ids.includes(x));
        const user = await userHelper.find({ _id: posted_by }).lean();
        for (let i = 0; i < toAdd.length; i++) {
          let oldUser = await JobInvite.findOne({ invited: toAdd[i], job: job_id })

          if (!oldUser) {
            let JobIn = await JobInvite.create({
              invited: toAdd[i],
              job: job_id,
              by: posted_by,
            });

            const uuser = await User.findById(toAdd[i], {
              username: 1,
              fullName: 1,
            }).lean();
            await notification.push(
              {
                to: toAdd[i],
                from: posted_by,
                content: `You have been invited by ${user.fullName} for a job.`,
              },
              JobIn._id
            );

            await notification.adminActivity({
              to: posted_by,
              job: JobIn._id,
              content: `${uuser.fullName} is invited for the job.`,
            });
          } else {
            oldUser.status = 'PENDING'
            oldUser.job_status = "ACTIVE"
            await notification.notify(
              {
                to: toAdd[i],
                from: posted_by,
                content: `You have been invited by ${user.fullName} for a job.`,
              },
              oldUser._id
            );
            await oldUser.save()
          }
        }
        // if applied then send new notification
        let toRemove = staff_ids.filter((x) => !staff.includes(x));
        await JobInvite.updateMany(
          { job: job_id, invited: { $in: toRemove } },
          { job_status: "REVOKED" }
        );
        //notification that JOb revoked
        for (let i = 0; i < toRemove.length; i++) {
          await notification.notify({
            to: toRemove[i],
            from: posted_by,
            content: "Job has been assigned to someone else.",
          });
        }
        if (job.applicant) {
          req.body.applicant = job.applicant.filter(
            (a) => !toRemove.includes(a.toString())
          );
        }

        req.body.invited = staff;
        req.body.public = false;
      } else {
        console.log("Job Updated notification ");
        await Notification.updateMany(
          { job: job_id },
          { $set: { deleted: false } }
        );

        let toRemove = staff_ids.filter((x) => staff && !staff.includes(x));
        let newstaffid = staff_ids.filter((x) => !toRemove.includes(x));
        console.log("applicant before", toRemove);
        console.log("applicant after", newstaffid);
        for (let i = 0; i < newstaffid.length; i++) {
          await notification.notify({
            to: newstaffid[i],
            from: posted_by,
            content: "Job has been updated.",
          });
        }
      }
      if (req.body.isPast) {
        let toAdd = [];
        if (staff.length > job.person) {
          return response.notFound(res, {
            code: "FULL",
            message: `Vacancy Full! Required sfaff is only ${job.person} and your selected staff is ${staff.length}`,
          });
        }
        toAdd = staff;
        let users = await User.findById(posted_by, {
          username: 1,
          fullName: 1,
        }).lean();
        for (let i = 0; i < toAdd.length; i++) {
          const oldUser = await JobInvite.findOne({ invited: toAdd[i], job: job_id })

          if (!oldUser) {
            let JobIn = await JobInvite.create({
              invited: toAdd[i],
              job: job_id,
              by: posted_by,
              job_status: "ACTIVE",
              status: "ASSIGNED",
            });
            let uuser = await User.findById(toAdd[i], {
              username: 1,
              fullName: 1,
            }).lean();
            await notification.adminActivity({
              to: posted_by,
              job: JobIn._id,
              content: `Admin (${users.username}) updated a job and assigned ${uuser.fullName} for the job`,
            });
          } else {
            oldUser.status = 'ASSIGNED'
            oldUser.job_status = 'ACTIVE'
            await oldUser.save()
          }
        }
        if (staff.length > 0) {
          await JobInvite.updateMany(
            { job: job_id, invited: { $in: staff } },
            { job_status: "ACTIVE", status: "ASSIGNED" },
            { upsert: true, new: true }
          );
        }

        req.body.applicant = staff;
      } else {
        // let toRemove = staff_ids.filter((x) => !staff.includes(x));
        await JobInvite.updateMany(
          { job: job_id, job_status: "ACTIVE", },
          { status: "PENDING" },
          { upsert: true, new: true }
        );
        req.body.applicant = [];
      }
      const date1 = dayjs(req.body.startDate);
      const date2 = dayjs(req.body.endDate);
      req.body.job_hrs = date2.diff(date1, "hour", true);
      if (!job.client_obj || req.body.client_id !== job.client.toString()) {
        req.body.client_obj = await Client.findById(req.body.client_id)
      }

      await Job.findByIdAndUpdate(job_id, req.body);

      const uuser = await User.findById(job.posted_by, { username: 1 }).lean();
      await notification.adminActivity({
        to: job.posted_by,
        job: job_id,
        content: `Admin (${uuser.username}) updated job for ${job.title}.`,
      });

      return response.ok(res, { message: "Job updated!" });
    } catch (error) {
      return response.error(res, error);
    }
  },

  updateJobs: async (req, res) => {
    try {
      let job_id = req.params["job_id"];
      // console.log(req.body);
      const job = await Job.findById(job_id).lean();
      // let isPast = new Date(job.startDate).getTime() < new Date().getTime();
      // console.log("isPast", isPast);
      console.log("Job time changed logs", job);
      req.body.location = {
        type: "Point",
        // [longitude, latitude]
        coordinates: req.body.location,
      };
      req.body.client = req.body.client_id;

      let staff = req.body.staff || [];
      console.log(staff);
      let staff_ids = [];
      // if (staff) {
      let jobInvites = await JobInvite.find({
        job: job_id,
        job_status: "ACTIVE",
      });

      if (jobInvites.length > 0) {
        staff_ids = jobInvites.map((j) => j.invited && j.invited.toString());
      }
      console.log(staff_ids);
      // }
      // await JobInvite.updateMany({ job: job_id }, { job_status: "PENDING" });

      let posted_by = req.body.posted_by ? req.body.posted_by : req.user.id;

      if (job.public == false && req.body.public == true) {
        await JobInvite.updateMany({ job: job_id }, { job_status: "PUBLIC" });
        req.body.invited = [];
        req.body.applicant = [];
        req.body.public = true;
      } else if (staff && !compareArrays(staff_ids, staff)) {
        console.log("Staff changed notification ");
        let toAdd = staff.filter((x) => !staff_ids.includes(x));
        // let posted_by = req.body.posted_by ? req.body.posted_by : req.user.id;

        // if (toAdd.length === 0 && staff.length > 0) {
        //   req.body.applicant = [];
        //   await JobInvite.updateMany(
        //     { job: job_id, invited: { $in: staff } },
        //     { status: "PENDING" }
        //   );
        //   for (let i = 0; i < staff.length; i++) {
        //     await notification.notify({
        //       to: staff[i],
        //       from: posted_by,
        //       content: "Job has been updated.",
        //     });
        //     // }
        //   }
        // }
        // console.log(toAdd, staff);
        const user = await userHelper.find({ _id: posted_by }).lean();
        for (let i = 0; i < toAdd.length; i++) {
          const oldUser = await JobInvite.findOne({ invited: toAdd[i], job: job_id })
          oldUser.status = 'PENDING'
          await notification.notify(
            {
              to: toAdd[i],
              from: posted_by,
              content: `You have been invited by ${user.fullName} for a job.`,
            },
            oldUser._id
          );
          await oldUser.save()
          if (!oldUser) {
            let JobIn = await JobInvite.create({
              invited: toAdd[i],
              job: job_id,
              by: posted_by,
            });

            const uuser = await User.findById(toAdd[i], {
              username: 1,
              fullName: 1,
            }).lean();
            // if (!isPast) {
            await notification.push(
              {
                to: toAdd[i],
                from: posted_by,
                content: `You have been invited by ${user.fullName} for a job.`,
              },
              JobIn._id
            );

            await notification.adminActivity({
              to: posted_by,
              job: JobIn._id,
              content: `${uuser.fullName} is invited for the job.`,
            });
          }



          // }
        }
        // if applied then send new notification
        let toRemove = staff_ids.filter((x) => !staff.includes(x));
        await JobInvite.updateMany(
          { job: job_id, invited: { $in: toRemove } },
          { job_status: "REVOKED" }
        );
        //notification that JOb revoked
        // if (!isPast) {
        for (let i = 0; i < toRemove.length; i++) {
          await notification.notify({
            to: toRemove[i],
            from: posted_by,
            content: "Job has been assigned to someone else.",
          });
          // }
        }
        if (job.applicant) {
          req.body.applicant = job.applicant.filter(
            (a) => !toRemove.includes(a.toString())
          );
        }


        // console.log("staff in body", staff);
        // console.log("staff in Previous state", staff_ids);
        // console.log("staff toAdd", toAdd);
        // console.log("staff toRemove", toRemove);
        // console.log("applicant before", job.applicant);
        // console.log("applicant after", req.body.applicant);

        req.body.invited = staff;
        req.body.public = false;
      } else {
        console.log("Job Updated notification ");

        // if (!isPast) {

        /// chetan's code
        // let jobi = await JobInvite.find({ job: job_id });
        // await Promise.all(
        //   jobi.map(async (item) => {
        //     await Notification.updateMany(
        //       { invited_for: item._id },
        //       { deleted: false }
        //     );
        //   })
        // );

        await Notification.updateMany(
          { job: job_id },
          { $set: { deleted: false } }
        );

        let toRemove = staff_ids.filter((x) => staff && !staff.includes(x));
        let newstaffid = staff_ids.filter((x) => !toRemove.includes(x));
        console.log("applicant before", toRemove);
        console.log("applicant after", newstaffid);
        for (let i = 0; i < newstaffid.length; i++) {
          await notification.notify({
            to: newstaffid[i],
            from: posted_by,
            content: "Job has been updated.",
          });
        }
        // }
      }
      if (req.body.isPast) {
        let toAdd = [];
        let applicantuser = []
        if (job.applicant) {
          applicantuser = job.applicant.map((f) => f && f.toString());
        }
        if (applicantuser.length >= job.person) {
          return response.notFound(res, {
            code: "FULL",
            message: "Vacancy Full!",
          });
        }
        if (staff.length > job.person) {
          return response.notFound(res, {
            code: "FULL",
            message: `Vacancy Full! Required sfaff is only ${job.person} and your selected staff is ${staff.length}`,
          });
        }
        if (applicantuser.length > 0) {
          toAdd = staff.filter((x) => !applicantuser.includes(x));
        } else {
          toAdd = staff;
        }

        let users = await User.findById(posted_by, {
          username: 1,
          fullName: 1,
        }).lean();
        for (let i = 0; i < toAdd.length; i++) {
          const oldUser = await JobInvite.findOne({ invited: toAdd[i], job: job_id })
          oldUser.status = 'ASSIGNED'
          await oldUser.save()
          if (!oldUser) {
            let JobIn = await JobInvite.create({
              invited: toAdd[i],
              job: job_id,
              by: posted_by,
              job_status: "ACTIVE",
              status: "ASSIGNED",
            });
            let uuser = await User.findById(toAdd[i], {
              username: 1,
              fullName: 1,
            }).lean();
            // if (!isPast) {
            // await notification.push(
            //   {
            //     to: toAdd[i],
            //     from: posted_by,
            //     content: `You have been invited by ${user.fullName} for a job.`,
            //   },
            //   JobIn._id
            // );
            await notification.adminActivity({
              to: posted_by,
              job: JobIn._id,
              content: `Admin (${users.username}) updated a job and assigned ${uuser.fullName} for the job`,
            });
          }

          // }
        }
        if (applicantuser.length > 0 && staff_ids.length > 0) {
          let isExist = staff_ids.filter((x) => applicantuser.includes(x));
          await JobInvite.updateMany(
            { job: job_id, invited: { $in: isExist } },
            { job_status: "ACTIVE", status: "ASSIGNED" },
            { upsert: true, new: true }
          );
        }

        req.body.applicant = req.body.staff;
      } else {
        let toRemove = staff_ids.filter((x) => !staff.includes(x));
        await JobInvite.updateMany(
          { job: job_id, invited: { $nin: toRemove } },
          { job_status: "ACTIVE", status: "PENDING" },
          { upsert: true, new: true }
        );
        req.body.applicant = [];
      }

      // req.body.invited = [];

      const date1 = dayjs(req.body.startDate);
      const date2 = dayjs(req.body.endDate);
      req.body.job_hrs = date2.diff(date1, "hour", true);

      await Job.findByIdAndUpdate(job_id, req.body);

      const uuser = await User.findById(job.posted_by, { username: 1 }).lean();
      await notification.adminActivity({
        to: job.posted_by,
        job: job_id,
        content: `Admin (${uuser.username}) updated job for ${job.title}.`,
      });

      return response.ok(res, { message: "Job updated!" });
    } catch (error) {
      return response.error(res, error);
    }
  },
  listProviderJobs: async (req, res) => {
    try {
      const jobs = await Job.find({
        posted_by: req.user.id,
        endDate: { $gt: new Date().getTime() },
      });
      return response.ok(res, { jobs });
    } catch (error) {
      return response.error(res, error);
    }
  },
  addReview: async (req, res) => {
    try {
      const reviewDetails = req.body;
      reviewDetails.posted_by = req.user.id;
      if (req.params["review_id"]) {
        await Review.findByIdAndUpdate(req.params["review_id"], reviewDetails, {
          upsert: true,
        });
      } else {
        let review = new Review({
          title: reviewDetails.title,
          details: reviewDetails.details,
          rating: reviewDetails.rating,
          job: reviewDetails.job_id,
          posted_by: req.user.id,
          for: reviewDetails.for,
        });
        await review.save();
      }
      return response.ok(res, { message: "Review Added!" });
    } catch (error) {
      return response.error(res, error);
    }
  },
  addIncident: async (req, res) => {
    try {
      const incidentDetails = req.body;
      const incident = new Incident({
        title: incidentDetails.title,
        details: incidentDetails.details,
        job: incidentDetails.job_id,
        posted_by: req.user.id,
      });
      if (req.files.length) {
        const files = req.files;
        for (let f = 0; f < files.length; f++) {
          await Photo.create({ key: files[f].key, incident_id: incident._id });
        }
      }
      await incident.save();
      return response.ok(res, { message: "Incident Added!" });
    } catch (error) {
      return response.error(res, error);
    }
  },
  getIncidents: async (req, res) => {
    try {
      let incidents = await Incident.find({})
        .populate("posted_by", "fullName")
        .lean();
      let ids = incidents.map((i) => i._id);
      const photos = await Photo.find({ incident_id: { $in: ids } });

      incidents.map(async (ele) => {
        ele.url = process.env.ASSET_ROOT;
        ele.photos = photos.filter((f) => {
          ele.image = `${process.env.ASSET_ROOT}/${f.key}`;
          return f.incident_id.toString() === ele._id.toString();
        });
      });

      return response.ok(res, { incident: incidents });
    } catch (error) {
      return response.error(res, error);
    }
  },
  getConfig: async (req, res) => {
    try {
      return response.ok(res, {
        title: [
          // { type: "marriage_security", name: "Marrige Security Guard" },
          { type: "event_security", name: "Event Security" },
          { type: "body_guards", name: "Body Guards" },
          { type: "concierge_receptionist", name: "Concierge/Receptionist" },
          { type: "door_staff", name: "Door Staff" },
          { type: "club_security", name: "Club Security" },
          { type: "canine_dog_handlers", name: "Canine/Dog handlers" },
          { type: "retail_security", name: "Retail Security" },
          { type: "key_holdings", name: "Key Holdings" },
          { type: "carpark_security", name: "Carpark Security" },
          { type: "access_patrol", name: "Access patrol" },
          { type: "empty_property", name: "Empty Property" },
        ],
        jobType: [
          { type: "event", name: "Event type" },
          { type: "job", name: "Job type" },
          { type: "security", name: "Security type" },
          { type: "other", name: "Other type" },
        ],
        incidenceType: [
          { type: "thieft", name: "Thieft" },
          { type: "fight", name: "Fight" },
          { type: "fire", name: "Fire" },
          { type: "damage_to_property", name: "Damage To Property" },
          { type: "others", name: "Others" },
        ],
      });
    } catch (error) {
      return response.error(res, error);
    }
  },
  jobDetails: async (req, res) => {
    try {
      const job = await Job.findById(req.params["job_id"])
        .populate("applicant", "fullName profile username")
        .lean();
      const ids = job.applicant.map((a) => a._id);
      const reviews = await Review.find({
        for: { $in: ids },
        job: job._id,
      }).lean();
      const hash = {};
      reviews.map((r) => {
        hash[r.for] = r;
      });
      job.applicant.map((a) => {
        a.review = hash[a._id];
      });
      return response.ok(res, { job });
    } catch (error) {
      return response.error(res, error);
    }
  },
  availableJobs: async (req, res) => {
    try {
      let filter = req.params["filter"];
      const cond = {
        startDate: { $gt: new Date() },
        public: true,
        applicant: { $ne: req.user.id },
      };
      let jobs = [];
      if (filter == "ALL") {
        jobs = await Job.find(cond).populate("client").lean();
      } else {
        jobs = await Job.find(cond).limit(3).populate("client").lean();
      }
      jobs = jobs.map((j) => {
        if (j.applicant && j.applicant.indexOf(req.user.id) > -1) {
          j.applied = true;
        }
        return j;
      });
      return response.ok(res, { jobs });
    } catch (error) {
      return response.error(res, error);
    }
  },
  jobsNearMe: async (req, res) => {
    try {
      console.log("nearBy location", req.body.location);
      let user = await userHelper.find({ _id: req.user.id });
      let jobs = await Job.find({
        public: true,
        applicant: { $ne: req.user.id },
        location: {
          $near: {
            $maxDistance: 1609.34 * user.distance,
            $geometry: {
              type: "Point",
              coordinates: req.body.location, // [lang, lat]
            },
          },
        },
      }).lean();
      return response.ok(res, { jobs });
    } catch (error) {
      return response.error(res, error);
    }
  },
  upcommingJobs: async (req, res) => {
    try {
      console.log(req.user.id);
      let jobs = await Job.find({
        endDate: { $gte: new Date().getTime() },
        applicant: { $elemMatch: { $eq: req.user.id } },
      })
        .sort({ startDate: -1 })
        .lean();
      return response.ok(res, { jobs });
    } catch (error) {
      return response.error(res, error);
    }
  },
  apply: async (req, res) => {
    try {
      const n_p = req.query["notification_page"];
      const n_id = req.query["invite_id"];
      let jobInvite;
      if (n_p) {
        const cond = { job: req.params["job_id"], invited: req.user.id };
        if (n_id) cond._id = new mongoose.Types.ObjectId(n_id);
        jobInvite = await JobInvite.findOne(cond);
        if (jobInvite.job_status !== "ACTIVE") {
          return response.ok(res, {
            status: false,
            message: JobStatus[jobInvite.job_status],
          });
        }
      }
      let job = await Job.findById(req.params["job_id"]);
      if (!job)
        return response.notFound(res, { message: "Job does not exist." });
      let set = new Set(job.applicant.map((a) => a.toString()));
      if (set.has(req.user.id)) {
        return response.notFound(res, {
          message: "You already applied to this job!",
        });
      }
      // chetan's code
      // const invitedUsers = await JobInvite.find({ job: req.params["job_id"] });

      // let invitedUser = invitedUsers.filter(
      //   (f) => f.status === "ASSIGNED" || f.status === "ACCEPTED"
      // );
      if (set.size == job.person) {
        return response.notFound(res, { message: "Vacancy Full!" });
      }
      job.applicant.push(req.user.id);
      await job.save();
      if (n_p && jobInvite) {
        jobInvite.status = "ACCEPTED";
        await jobInvite.save();
      }
      notification.push(
        {
          to: job.posted_by,
          content: `${req.user.user} ${n_p
            ? "has accepted the below job."
            : "has been selected for the below job."
            }.`,
        },
        jobInvite ? jobInvite._id : null
      );

      // notification.push(job.posted_by, `${req.user.user} ${n_p ? "accepted" : "applied"} and selected on the job you ${n_p ? "invited" : "posted"}.`, jobInvite ? jobInvite._id : null);
      return response.ok(res, {
        message: n_p ? "Job Accepted" : "Job applied!",
      });
    } catch (error) {
      return response.error(res, error);
    }
  },

  assign: async (req, res) => {
    try {
      let job = await Job.findById(req.params["job_id"]);
      if (!job)
        return response.notFound(res, { message: "Job does not exist." });
      const set = new Set(job.applicant.map((a) => a.toString()));
      // let jobInvite = await JobInvite.find({ job: req.params["job_id"] });
      // let invitedUser = jobInvite.filter(
      //   (f) => f.status === "ASSIGNED" || f.status === "ACCEPTED"
      // );
      if (set.size == job.person) {
        return response.notFound(res, {
          code: "FULL",
          message: "Vacancy Full!",
        });
      }
      for (let usr of req.body.applicant) {
        if (!set.has(usr)) {
          job.applicant.push(usr);
        }
      }
      console.log(job.applicant.length, job.person)
      if (job.applicant.length > job.person) {
        return response.notFound(res, {
          code: "LIMITED",
          message: "Vacancy is limited",
        });
      }
      await job.save();
      for (let u of req.body.applicant) {
        let JobIn = await JobInvite.findOne({ job: job._id, invited: u });

        if (!JobIn) {
          JobIn = await JobInvite.create({
            invited: u,
            job: job._id,
            status: "ASSIGNED",
            by: req.user.id,
          });
        } else {
          JobIn.status = 'ASSIGNED',
            JobIn.job_status = 'ACTIVE',
            await JobIn.save()
        }

        notification.push(
          {
            to: u,
            from: req.user.id,
            content: "You have been assigned a job.",
          },
          JobIn._id
        );
      }
      return response.ok(res, { message: "Job assigned!" });
    } catch (error) {
      return response.error(res, error);
    }
  },

  historyProvider: async (req, res) => {
    try {
      let filter = req.params["filter"];
      let d = new Date();
      let de = new Date();
      let cond = { $lte: de.getTime() };
      if (filter == "1_WEEK") {
        cond = { $gte: d.setDate(d.getDate() - 7), $lt: de.getTime() };
      }
      if (filter == "2_WEEK") {
        cond = { $gte: d.setDate(d.getDate() - 14), $lt: de.getTime() };
      }
      if (filter == "1_MONTH") {
        cond = { $gte: d.setMonth(d.getMonth() - 1), $lt: de.getTime() };
      }
      if (filter == "1_YEAR") {
        cond = { $gte: d.setFullYear(d.getFullYear() - 1), $lt: de.getTime() };
      }
      const jobs = await Job.find({
        applicant: req.user.id,
        startDate: cond,
      }).lean();
      return response.ok(res, { jobs });
    } catch (error) {
      return response.error(res, error);
    }
  },

  historyProviderFilterByDate: async (req, res) => {
    try {
      let d = new Date(req.query.start);
      let de = new Date(req.query.end);
      let cond = { $gte: d, $lt: de };
      const jobs = await Job.find({
        applicant: req.user.id,
        startDate: cond,
      })
        .sort({ startDate: 1 })
        .lean();
      return response.ok(res, { jobs });
    } catch (error) {
      return response.error(res, error);
    }
  },

  // shown to USER(who posted jobs)
  history: async (req, res) => {
    try {
      let filter = req.params["filter"];
      let d = new Date();
      let de = new Date();
      let cond = { $lte: de.getTime() };
      if (filter == "1_WEEK") {
        cond = { $gte: d.setDate(d.getDate() - 7), $lt: de.getTime() };
      }
      if (filter == "2_WEEK") {
        cond = { $gte: d.setDate(d.getDate() - 14), $lt: de.getTime() };
      }
      if (filter == "1_MONTH") {
        cond = { $gte: d.setMonth(d.getMonth() - 1), $lt: de.getTime() };
      }
      if (filter == "1_YEAR") {
        cond = { $gte: d.setFullYear(d.getFullYear() - 1), $lt: de.getTime() };
      }
      // cond.posted_by = req.user.id;
      let jobs = await Job.find({
        applicant: req.user.id,
        startDate: cond,
      }).lean();
      return response.ok(res, { jobs });
    } catch (error) {
      return response.error(res, error);
    }
  },
  jobEvents: async (req, res) => {
    try {
      const job = Job.findById(req.body.job_id).lean();
      notification.push({
        to: job.posted_by,
        content: `${req.user.user} ${req.body.event.toLowerCase()} your job ${job.title
          }.`,
      });
      return response.ok(res, { event: req.body.event });
    } catch (error) {
      return response.error(res, error);
    }
  },
  // curl -d '{"startDate" : "2023/07/03", "endDate": "2023/07/10", "org_id":"63fc8de24aa0fa34e78ba390" }' -H "Content-Type: application/json" -X POST http://localhost:3007/v1/api/admin/jobs

  formatedJobs: async (req, res) => {
    try {
      let posted_by;
      if (req.user.type == "ADMIN") {
        posted_by = req.body.org_id;
      } else {
        posted_by = req.user.id;
      }
      let endDate = new Date(req.body.endDate);
      let cond = {
        posted_by,
        startDate: {
          $gte: new Date(req.body.startDate),
          $lt: new Date(endDate.setDate(endDate.getDate() + 1)),
        },
      };

      console.log(cond.startDate);

      const jobs = await Job.find(cond)
        .populate("posted_by", "username fullName")
        .populate("client", "fullName")
        .lean();
      let invites = await JobInvite.find({
        job: { $in: jobs.map((j) => j._id) }, job_status: "ACTIVE"
      })
        .populate("invited", "username fullName")
        .lean();

      let obj = {};
      invites.map((i) => {
        if (obj[i.job]) {
          obj[i.job].push(i);
        } else {
          obj[i.job] = [i];
        }
      });

      let formattedJobs = {};
      let count = 0;
      jobs.map((j) => {
        j.invites = obj[j._id];
        let cName = j.client ? j.client.fullName : `no client(${++count})`;
        if (formattedJobs[cName]) {
          formattedJobs[cName].push(j);
        } else {
          formattedJobs[cName] = [j];
        }
      });
      let jjobs = [];
      Object.keys(formattedJobs).map((u) => {
        let obj = {
          name: u,
          jobs: formattedJobs[u],
        };
        jjobs.push(obj);
      });

      return response.ok(res, { jobs: jjobs });
    } catch (error) {
      return response.error(res, error);
    }
  },
  rejectInvite: async (req, res) => {
    try {
      const jobInvite = await JobInvite.findOne({
        job: req.params["job_id"],
        invited: req.user.id,
      }).populate("job");
      console.log(jobInvite);
      if (jobInvite.job_status !== "ACTIVE") {
        return response.ok(res, {
          status: false,
          message: JobStatus[jobInvite.job_status],
        });
      }
      jobInvite.status = "REJECTED";
      console.log("Surya+++++", req.user.user);
      await notification.push(
        {
          to: jobInvite.job.posted_by,
          content: `${req.user.user} has rejected this job.`,
        },
        jobInvite._id
      );
      await jobInvite.save();
      return response.ok(res, { message: "Rejected Invite." });
    } catch (error) {
      return response.error(res, error);
    }
  },
  //////////Surya's code - Please be careful ///////
  historyUserSearch: async (req, res) => {
    try {
      const cond = {
        $or: [
          { title: { $regex: req.body.search } },
          { type: { $regex: req.body.search } },
        ],
      };
      cond.posted_by = req.user.id;
      let guards = await Job.find(cond).lean();
      return response.ok(res, { guards });
    } catch (error) {
      return response.error(res, error);
    }
  },

  addclientObject: async (req, res) => {
    console.log('called')
    try {
      let clients = await Client.find().lean()
      await Promise.all(
        clients.map(async c => {
          await Job.updateMany({ client: c._id, client_obj: { $exists: false } }, { client_obj: c }).lean()
        })
      )

      // let jobs = await Job.find()
      // await Promise.all(
      //   jobs.map(async c => {
      //     console.log(c)
      //     delete c._id
      //     await NewJob.create(c._doc)
      //   })
      // )

      return response.ok(res, { message: 'Client obj updated' });
    } catch (error) {
      return response.error(res, error);
    }
  },


  getJobByClient: async (req, res) => {
    try {
      let guards = await Job.find({ client: req.params.client_id, endDate: { $lt: new Date().getTime() }, applicant: { $exists: true, $ne: null } }, 'applicant').sort({ 'created_At': 1 }).limit(10).lean();
      console.log(guards)
      let aplicant = []

      await Promise.all(
        guards.map(async item => {
          let newaplicant = item.applicant.filter(f => !aplicant.includes(f))
          if (newaplicant.length > 0) {
            aplicant = aplicant.concat(newaplicant)
          }
        })
      )
      console.log(aplicant)

      const users = await User.find({ _id: { $in: aplicant } }, 'fullName')
      return response.ok(res, { users });
    } catch (error) {
      return response.error(res, error);
    }
  },
};
