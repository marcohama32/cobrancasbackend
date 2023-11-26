const express = require("express");
const router = express.Router();
const { createCompany, singleCompany,getAllCompany, updatedCompany, deleteCompany, getAllManagerCompany } = require("../controllers/companyController");
const { isAuthenticated, isAdmin } = require("../middleware/auth");
const upload = require('../middleware/upload')

//@auth routes
// api/route    
router.get("/allcompany", getAllCompany);
router.get("/allmanagercompany",isAuthenticated, getAllManagerCompany);
router.put("/company/update/:id",upload.single('avatar'),isAuthenticated, isAdmin, updatedCompany); 
router.get("/company/:company_id", isAuthenticated, singleCompany);
router.delete("/company/delete/:id", isAuthenticated, isAdmin, deleteCompany);
router.post("/company/create",upload.single('avatar'), isAuthenticated, isAdmin, createCompany);

module.exports = router;
