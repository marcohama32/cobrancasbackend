const express = require("express");
const router = express.Router();

const {
  createCharge,
  editCharge,
  findChargeById,
  getAllCharges,
  deleteChargeById,
  c2bPayment,
  revokeCharge,
} = require("../../controllers/charges/chargeController");
const {
  isAuthenticated,
  isAdmin,
  isTokenValid,
} = require("../../middleware/auth");

const {
  generateInvoicePDF,
  generateInvoiceForThermalPrinter,
} = require("../../controllers/invoice/invoiceController");

//@auth routes
// api/route
router.post("/c2bPayment", c2bPayment);
router.post("/charge/create", createCharge);
router.put("/charge/edit/:id", isAuthenticated, editCharge);
router.put("/charge/revoke/:id", isAuthenticated, revokeCharge);
router.get("/charge/getbyid/:id", isAuthenticated, findChargeById);
router.get("/charges/getall", isAuthenticated, getAllCharges);
router.delete("/charge/delete/:id", isAuthenticated, deleteChargeById);


// invoice
;
router.get("/charge/invoice/:id",isAuthenticated, generateInvoicePDF);
router.get("/charge/invoiceforthermal/:id",isAuthenticated, generateInvoiceForThermalPrinter);


module.exports = router;

