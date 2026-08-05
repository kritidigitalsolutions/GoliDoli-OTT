const express = require("express");

const router = express.Router();

const {
  isAuth,
} = require("../../middlewares/auth.middleware");

const upload = require("../../middlewares/upload.middleware");

const {
  getProfile,
  completeProfile,
  updateProfile,
  saveFcmToken,
  getProfileStats,
} = require("../../controllers/user.controller");

// ========================================
// GET USER PROFILE
// ========================================
router.get(
  "/",
  isAuth,
  getProfile
);

router.get(
  "/profile",
  isAuth,
  getProfile
);

// ========================================
// COMPLETE PROFILE
// ========================================
router.post(
  "/complete-profile",
  upload.single("profileImage"),
  completeProfile
);

// ========================================
// UPDATE PROFILE
// ========================================
router.patch(
  "/update-profile",
  isAuth,
  upload.single("profileImage"),
  updateProfile
);

// ========================================
// CONNECT FCM TOKEN TO USER
// ========================================
router.patch(
  "/fcm-token",
  isAuth,
  saveFcmToken
);

// ========================================
// GET PROFILE STATS
// ========================================
router.get(
  "/profile-stats/:userId",
  isAuth,
  getProfileStats
);

module.exports = router;