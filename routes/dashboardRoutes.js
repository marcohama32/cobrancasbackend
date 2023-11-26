const express = require("express");
const router = express.Router();
const {
    dashboardData,
    dashboardDataFromLogedManager,
    TransactionsTotals,
    TransactionsTotalsFromLogedManager,
    calculateAverageApprovalTime
} = require("../controllers/DashboardController");
const { isAuthenticated, isAdmin, isCompanyManager,isManager } = require("../middleware/auth");

//@auth routes
// api/route
//admin
router.get(
  "/dashboard/getdata",
  isAuthenticated,
  isAdmin,
  dashboardData
);
//manager
router.get(
  "/dashboardmanager/getdatamanager",
  isAuthenticated,
  isManager,
  dashboardDataFromLogedManager
);

// admin
router.get(
  "/total/transactionsbystatus",
  isAuthenticated,
  isAdmin,
  TransactionsTotals
);
router.get(
  "/total/transactionsbystatusfrommanager",
  isAuthenticated,
  TransactionsTotalsFromLogedManager
);


router.get(
  "/get/averageapprovaltime",
  isAuthenticated,
  isAdmin,
  calculateAverageApprovalTime
);
module.exports = router;
