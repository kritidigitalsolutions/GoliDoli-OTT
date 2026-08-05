const express = require("express");

const router = express.Router();

const {
  isAuth,
} = require("../../middlewares/auth.middleware");

const upload = require("../../middlewares/upload.middleware");

const {
  uploadReel,
  getReelsFeed,
  getSingleReel,
  deleteReel,
  incrementViews,
  incrementShares,
  getMyReels,
  getUserReels,
} = require("../../controllers/reel.controller");

// Upload Reel
router.post(
  "/upload",
  isAuth,
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  uploadReel
);

// Feed
router.get(
  "/feed",
  getReelsFeed
);

// My Reels
router.get(
  "/my-reels",
  isAuth,
  getMyReels
);

// User Reels
router.get(
  "/user/:userId",
  getUserReels
);

// Single Reel
router.get(
  "/:id",
  getSingleReel
);

// Delete Reel
router.delete(
  "/:id",
  isAuth,
  deleteReel
);

// Increment view count
router.post(
  "/:id/view",
  incrementViews
);

// Increment share count
router.post(
  "/:id/share",
  incrementShares
);

module.exports = router;