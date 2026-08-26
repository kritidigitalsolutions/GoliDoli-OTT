const express = require("express");
const router = express.Router();
const { isAuth } = require("../../middlewares/auth.middleware");
const {
  getAllAIReels,
  getAIReelById,
  recordAIReelView,
  recordAIReelCompletion,
  setReplayPreference,
  recordAIReelShare,
} = require("../../controllers/aiReel.controller");

router.use(isAuth);

// Single AI Reels feed. The feed is shown under the Trending tab.
router.get("/", getAllAIReels);
router.post("/replay", setReplayPreference);
router.post("/:id/view", recordAIReelView);
router.post("/:id/complete", recordAIReelCompletion);
router.post("/:id/share", recordAIReelShare);
router.get("/:id", getAIReelById);

module.exports = router;
