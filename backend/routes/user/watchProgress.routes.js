const express = require("express");
const router = express.Router();
const { isAuth } = require("../../middlewares/auth.middleware");
const {
  saveProgress,
  getContinueWatching,
  getProgressByContent,
  markAsCompleted,
  removeFromContinueWatching,
} = require("../../controllers/user/watchProgress.controller");

// All routes require authentication
router.use(isAuth);

// ➕ Save watch progress (upsert)
router.post("/", saveProgress);
router.post("/progress", saveProgress);

// 📄 Get user's continue watching list
router.get("/", getContinueWatching);

// 🔍 Get progress for specific content / episode
router.get("/progress/:contentId", getProgressByContent);

// ✅ Mark watch progress as completed
router.patch("/complete/:id", markAsCompleted);

// ❌ Delete item from continue watching list
router.delete("/:id", removeFromContinueWatching);

module.exports = router;
