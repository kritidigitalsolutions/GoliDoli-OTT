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
  websiteMe,
  websiteLogout,
} = require("../../controllers/websiteAuth.controller");

const {
  websiteLoginRateLimiter,
} = require("../../middlewares/websiteRateLimit.middleware");

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
// WEBSITE SSO (USING MOBILE JWT)
// ========================================
router.post("/website-login", websiteLoginRateLimiter, websiteLogin);
router.get("/website-me", websiteMe);
router.post("/website-logout", websiteLogout);

module.exports = router;