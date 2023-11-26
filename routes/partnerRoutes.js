const express = require("express");
const router = express.Router();
const { createPartner, singlePartner,getAllPartner, updatedPartner, deletePartner } = require("../controllers/partnerController");
const { isAuthenticated, isAdmin } = require("../middleware/auth");
const upload = require('../middleware/upload')

//@auth routes
// api/route
//get all
router.get("/allpartner", getAllPartner);
//update
router.put("/partner/update/:id",upload.single('avatar'),isAuthenticated, isAdmin, updatedPartner); 
//get by id
router.get("/partner/:partner_id", isAuthenticated, singlePartner);
//delete
router.delete("/partner/delete/:id", isAuthenticated, isAdmin, deletePartner);
//create
router.post("/partner/create",upload.single('avatar'), isAuthenticated, isAdmin, createPartner);

module.exports = router;
