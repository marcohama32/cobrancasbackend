const express = require("express");
const router = express.Router();
const {
  signup,
  getAllUsers,
  signin,
  logout,
  userProfile,
  userServices,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const {
  isAuthenticated,
  isAdmin,
  isTokenValid,
} = require("../middleware/auth");

//@auth routes
// api/route
router.post("/user/signup", signup);
router.get("/user/getall", getAllUsers);
router.post("/signin", signin);


router.get("/logout", logout);
router.get("/me", isAuthenticated, userProfile);
router.get("/getmyservices",isAuthenticated,userServices)

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/check/verify-token/", isTokenValid);

module.exports = router;
