const express = require("express");
const router = express.Router();
const {
  createCustomers,
  editCustomers,
  findCustomerById,
  getAllCustomer,
  deleteCustomerById,
} = require("../../controllers/customer/customerController");
const {
  isAuthenticated,
  isAdmin,
  isTokenValid,
} = require("../../middleware/auth");

//@auth routes
// api/route
router.post("/user/create/customer", isAuthenticated, createCustomers);
router.put("/user/edit/customer/:id", isAuthenticated, editCustomers);
router.get("/user/getbyid/:id", isAuthenticated, findCustomerById);
router.get("/user/getall/customers", isAuthenticated, getAllCustomer);
router.delete("/user/delete/customer/:id", isAuthenticated, deleteCustomerById);

module.exports = router;
