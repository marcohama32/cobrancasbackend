const express = require("express");
const router = express.Router();
const {
  createCustomerRequest,
  updateCustomerRequest,
  findCustomerRequestById,
  getAllCustomerRequests,
  getCustomerRequestsByUser,
  UpdateStatus,
  getLogedManagerRequests
} = require("../controllers/customerrequestController");
const { isAuthenticated, isAdmin, isPartner } = require("../middleware/auth");

const upload = require("../middleware/upload");

//@auth routes
// api/route
router.post(
  "/request/createnew",
  upload.array("files[]"),
  isAuthenticated,
  createCustomerRequest
);

// router.post(
//   "/hospitaltrasaction/create",
//   upload.array("multipleFiles[]"),
//   isAuthenticated,
//   isPartner,
//   createTransactionHospital
// );

router.put(
  "/request/update/:id",
  upload.single("files"),
  isAuthenticated,
  updateCustomerRequest
);

router.get("/request/get/:id", isAuthenticated, findCustomerRequestById);

router.get("/request/getall", isAuthenticated, getAllCustomerRequests);

router.get(
  "/request/get/logeduser/request",
  isAuthenticated,
  getCustomerRequestsByUser
);

router.put("/request/status/:id", isAuthenticated, UpdateStatus);

router.get("/request/getfromlogedmanager", isAuthenticated, getLogedManagerRequests);

module.exports = router;
