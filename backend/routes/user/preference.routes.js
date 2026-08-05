const express = require("express");
const router = express.Router();
const { isAuth } = require("../../middlewares/auth.middleware");
const {
  getPreferences,
  updatePreferences,
  getPreferredContent,
} = require("../../controllers/preference.controller");

// ========================================
// GET   /api/preferences          → fetch saved preferences
// PUT   /api/preferences          → save / update preferences
// GET   /api/preferences/content  → filtered content feed
// ========================================

router.get("/", isAuth, getPreferences);

router.put("/", isAuth, updatePreferences);

router.get("/content", isAuth, getPreferredContent);

module.exports = router;
