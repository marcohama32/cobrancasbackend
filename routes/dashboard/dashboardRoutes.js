const express = require("express");
const router = express.Router();

const {
  getDashboardData,
  populateLineChart
} = require("../../controllers/dashboard/dashboardController");

router.get("/admindashboard", getDashboardData);
router.get("/analisyreport", populateLineChart);


module.exports = router;
