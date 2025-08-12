"use strict";
const router = require("express").Router();
const user = require("../../app/controller/user");
const job = require("../../app/controller/job");
const admin = require("../../app/controller/admin");
const { upload } = require("./../../app/services/fileUpload");
const isAuthenticated = require("./../../middlewares/isAuthenticated");
const invoice = require("../../app/controller/PinPoint/invoice");

// auth routes
router.post("/login", user.login);
router.post("/loginwithidentity", user.loginwithidentity);
router.post("/signUp", user.signUp);

router.post("/login", user.login);
router.post("/sendOTP", user.sendOTP);
router.post("/verifyOTP", user.verifyOTP);
router.post("/changePassword", user.changePassword);

// send PDF to client
router.post(
  "/sendPdf",
  isAuthenticated(["USER", "ADMIN"]),
  admin.sendMailWithPdf
);

router.post(
  "/sendPdfforuserjob",
  isAuthenticated(["USER", "ADMIN"]),
  admin.sendMailWithPdfForUserJob
);

// listClient
router.get("/listClient", isAuthenticated(["USER", "ADMIN"]), admin.listClient);

router.get("/getclientuser/:client_id", isAuthenticated(["USER", "ADMIN"]), job.getJobByClient);
// Service User
router.post("/jobs", isAuthenticated(["USER", "ADMIN"]), job.createJob);
router.post(
  "/createtoassignjobs",
  isAuthenticated(["USER", "ADMIN"]),
  job.asignJob
);
router.get(
  "/user/jobs",
  isAuthenticated(["USER", "ADMIN"]),
  job.listProviderJobs
);
router.get(
  "/user/jobs/:job_id",
  isAuthenticated(["USER", "ADMIN"]),
  job.jobDetails
);
router.delete(
  "/jobs/:job_id",
  isAuthenticated(["USER", "ADMIN"]),
  job.deleteJob
);
router.put("/jobs/:job_id", isAuthenticated(["USER", "ADMIN"]), job.updateJob);
router.put(
  "/user/review/:review_id",
  isAuthenticated(["USER"]),
  job.addReview
);
router.get(
  "/user/history/:filter",
  isAuthenticated(["USER", "ADMIN"]),
  job.history
);
router.get("/user/config", job.getConfig);
router.post(
  "/settings",
  isAuthenticated(["USER", "PROVIDER", "ADMIN"]),
  user.updateSettings
);
router.get(
  "/settings",
  isAuthenticated(["USER", "PROVIDER", "ADMIN"]),
  user.getSettings
);
// Service Provider
router.post(
  "/provider/incident",
  isAuthenticated(["PROVIDER"]),
  upload.array("file", 10),
  job.addIncident
);
router.post(
  "/provider/getAllIncident",
  isAuthenticated(["USER", "ADMIN"]),
  job.getIncidents
);
router.post(
  "/provider/jobs/near",
  isAuthenticated(["PROVIDER"]),
  job.jobsNearMe
);
router.get(
  "/provider/jobs/available/:filter",
  isAuthenticated(["PROVIDER"]),
  job.availableJobs
);
router.get(
  "/provider/jobs/available",
  isAuthenticated(["PROVIDER"]),
  job.availableJobs
);
router.put(
  "/jobs/apply/:job_id",
  isAuthenticated(["PROVIDER", "ADMIN"]),
  job.apply
);
router.get(
  "/provider/myjobs",
  isAuthenticated(["PROVIDER"]),
  job.upcommingJobs
);
router.get(
  "/provider/history/:filter",
  isAuthenticated(["PROVIDER"]),
  job.historyProvider
);
router.get(
  "/provider/history",
  isAuthenticated(["PROVIDER"]),
  job.historyProviderFilterByDate
);

// router.get(
//   "/clientobj",
//   job.addclientObject                     //for client_obj update in jobs table
// );
// service provide + User
router.get(
  "/jobs/:job_id",
  isAuthenticated(["USER", "PROVIDER", "ADMIN"]),
  job.getJob
);
router.delete(
  "/jobs/reject/:job_id",
  isAuthenticated(["PROVIDER"]),
  job.rejectInvite
);
router.post(
  "/profile/changePassword",
  isAuthenticated(["USER", "PROVIDER"]),
  user.changePasswordProfile
);

router.get("/me", isAuthenticated(["USER", "PROVIDER"]), user.me);

router.post(
  "/profile/update",
  isAuthenticated(["USER", "PROVIDER", "ADMIN"]),
  user.updateUser
);

router.post(
  "/profile/file",
  isAuthenticated(["USER", "PROVIDER"]),
  upload.single("file"),
  user.fileUpload
);

router.get(
  "/notification",
  isAuthenticated(["USER", "PROVIDER"]),
  user.notification
);

router.post(
  "/notificationPage",
  isAuthenticated(["USER", "PROVIDER"]),
  user.notificationPage
);
router.delete(
  "/notification/:not_id",
  isAuthenticated(["USER", "PROVIDER"]),
  user.deleteNotification
);

router.post("/jobEvents", isAuthenticated(["PROVIDER"]), job.jobEvents);

router.post(
  "/admin/jobs",
  isAuthenticated(["ADMIN", "USER"]),
  job.formatedJobs
);
router.post(
  "/admin/jobs_test",
  function (req, res, next) {
    req.user = { id: "63fc8de24aa0fa34e78ba390" };
    next();
  },
  job.formatedJobs
);
router.post(
  "/admin/jobs/:job_id/assign",
  isAuthenticated(["ADMIN", "USER"]),
  job.assign
);

router.get("/organizations", isAuthenticated(["ADMIN"]), user.allOrganization);

router.post(
  "/user/guardList",
  isAuthenticated(["USER", "ADMIN"]),
  user.guardListWithIdentity
);

router.get(
  "/user/guard/:id/:type",
  isAuthenticated(["USER", "ADMIN"]),
  user.updateGuardCommission
);


router.post(
  "/user/guardListSearch",
  isAuthenticated(["USER", "ADMIN"]),
  user.guardListSearch
);

// ADMIN routes
router.post(
  "/admin/invoice/note/:invoice_id",
  isAuthenticated(["USER", "ADMIN"]),
  admin.addNote
);

// Statistics
router.get(
  "/admin/stats/2/:org_id/:view",
  isAuthenticated(["USER", "ADMIN"]),
  admin.getStatsOfResources
);
router.get(
  "/admin/stats/4/:org_id/:view",
  isAuthenticated(["USER", "ADMIN"]),
  admin.getStatsOfClients
);
router.get(
  "/admin/stats/4/:org_id",
  isAuthenticated(["USER", "ADMIN"]),
  admin.getStatsOfClients
);
router.get(
  "/admin/stats/1/:org_id/:view",
  isAuthenticated(["USER", "ADMIN"]),
  admin.getStatsOfNetIncome
);
router.get(
  "/admin/stats/3/:org_id/:view",
  isAuthenticated(["USER", "ADMIN"]),
  admin.getStatsOfIncome
);
// DashBoard stats
router.get(
  "/admin/dashboard/stats",
  isAuthenticated(["USER", "ADMIN"]),
  admin.dashboardStats
);
// RepeatJob API
router.post(
  "/admin/repeatJob/:job_id",
  isAuthenticated(["USER", "ADMIN"]),
  admin.repeatJob
);

router.get(
  "/admin/gaurdPay",
  isAuthenticated(["USER", "ADMIN"]),
  admin.gaurdPay
);

router.get(
  "/admin/gaurdJobHistory/:gaurd",
  isAuthenticated(["USER", "ADMIN"]),
  admin.gaurdJobHistory
);

router.post(
  "/admin/invoice",
  isAuthenticated(["USER", "ADMIN"]),
  admin.generateInvoice
);

router.get(
  "/admin/updareinvoice/:id",
  isAuthenticated(["USER", "ADMIN"]),
  admin.updateInvoice
);

router.get(
  "/admin/invoice/:invoice_id",
  isAuthenticated(["USER", "ADMIN"]),
  admin.getInvoice
);

router.get(
  "/admin/invoice",
  isAuthenticated(["USER", "ADMIN"]),
  admin.getInvoice
);

router.get(
  "/admin/archiveinvoice/:invoice_id",
  isAuthenticated(["USER", "ADMIN"]),
  admin.getArchiveInvoice
);


router.patch(
  "/admin/invoice/:invoice_id/status",
  isAuthenticated(["USER", "ADMIN"]),
  admin.updateStatus
);
router.delete(
  "/admin/invoice/:invoice_id",
  isAuthenticated(["USER", "ADMIN"]),
  admin.deleteInvoice
);

router.delete(
  "/admin/removeinvoice/:invoice_id",
  isAuthenticated(["USER", "ADMIN"]),
  admin.removeInvoice
);

router.delete(
  "/admin/removeinvoice",
  isAuthenticated(["USER", "ADMIN"]),
  admin.removeAllInvoice
);



//Surya's code
//test commeit

router.post(
  "/user/verifyGuard",
  isAuthenticated(["USER", "ADMIN"]),
  user.verifyGuard
);
router.post(
  "/jobs/historyUserSearch",
  isAuthenticated(["USER", "ADMIN"]),
  job.historyUserSearch
);
router.post(
  "/user/getStaff",
  isAuthenticated(["USER", "ADMIN"]),
  user.getStaffList
);

router.post(
  "/provider/regClient",
  isAuthenticated(["USER", "ADMIN"]),
  user.regNewClient
);
router.get(
  "/provider/client/:client_id",
  isAuthenticated(["USER", "ADMIN"]),
  user.getAllClients
);
router.get(
  "/provider/client",
  isAuthenticated(["USER", "ADMIN"]),
  user.getAllClients
);
router.delete(
  "/provider/client/:client_id",
  isAuthenticated(["USER", "ADMIN"]),
  user.deleteClient
);
router.put(
  "/provider/client/:client_id",
  isAuthenticated(["USER", "ADMIN"]),
  user.updateClient
);

// festa event
router.post("/festa/create-event", admin.createEvent);
router.post("/festa/delete-event", admin.deleteEvent);
router.get("/festa/get-event", admin.getevent);

/// pinpoint
router.post("/pinpoint/sendOTP", invoice.sendOTP);
router.post("/pinpoint/verifyOTP", invoice.verifyOTP);
router.post("/pinpoint/changePassword", invoice.changePassword);

router.post("/pinpoint/create-bill", invoice.generateBill);
router.get("/pinpoint/get-bill", invoice.getBill);
router.get("/pinpoint/get-bill/:id", invoice.getBillById);
router.delete("/pinpoint/get-bill/:id", invoice.deleteBillById);
router.post(
  "/pinpoint/sendPdf",
  // isAuthenticated(["USER", "ADMIN"]),
  invoice.sendMailWithPdfPinPoint
);
router.post(
  "/pinpoint/update-pdf",
  // isAuthenticated(["USER", "ADMIN"]),
  invoice.updateBill
);

router.post("/payrollverify", isAuthenticated(["ADMIN", "USER"]), user.verifyPayroll);

module.exports = router;
