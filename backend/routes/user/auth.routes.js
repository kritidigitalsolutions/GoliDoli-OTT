const express = require("express");
const router = express.Router();

const {
  sendOTP,
  verifyOtp,
  googleLogin,
  logout,
} = require("../../controllers/auth.controller");

const {
  websiteLogin,
} = require("../../controllers/websiteAuth.controller");

// ========================================
// MOBILE AUTH (PHONE OTP)
// ========================================
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOtp);

// ========================================
// GOOGLE LOGIN
// ========================================
router.post("/google-login", googleLogin);

// ========================================
// USER LOGOUT
// ========================================
router.post("/logout", logout);
router.post("/log-out", logout);

// ========================================
// WEBSITE LOGIN (ONLY POST /website-login)
// ========================================
router.post("/website-login", websiteLogin);

module.exports = router;