const express = require("express");
const router = express.Router();
const { createServiceForPlan, singleService,getAllService, updatedService, deleteService } = require("../controllers/serviceController");
const { isAuthenticated, isAdmin } = require("../middleware/auth");

//@auth routes
// api/route
router.get("/allservices", getAllService);
router.put("/service/update/:id",isAuthenticated, isAdmin, updatedService); 
router.get("/service/:service_id", isAuthenticated, singleService);
router.delete("/service/delete/:id", isAuthenticated, isAdmin, deleteService);
router.post("/service/createservice", isAuthenticated, isAdmin, createServiceForPlan);

module.exports = router;
