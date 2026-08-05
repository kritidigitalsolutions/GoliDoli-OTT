const express = require("express");

const router = express.Router();

const {
  isAuth,
} = require("../../middlewares/auth.middleware");

const {
  toggleLike,
  toggleDislike,
  toggleFollow,
  getContentInteractions,
  getFollowStats,
  toggleBookmark,
  getBookmarks,
} = require("../../controllers/interaction.controller");

// ========================================
// LIKE / DISLIKE (GENERIC)
// ========================================

router.post(
  "/toggle/like/:contentId",
  isAuth,
  toggleLike
);

router.post(
  "/toggle/dislike/:contentId",
  isAuth,
  toggleDislike
);

// Backward Compatibility for Explicit Content Type
router.post(
  "/toggle/like/:contentType/:contentId",
  isAuth,
  toggleLike
);

router.post(
  "/toggle/dislike/:contentType/:contentId",
  isAuth,
  toggleDislike
);

// Backward Compatibility for Reels
router.post(
  "/toggle/like/:reelId",
  isAuth,
  toggleLike
);

router.post(
  "/toggle/dislike/:reelId",
  isAuth,
  toggleDislike
);

// ========================================
// FOLLOW / UNFOLLOW
// ========================================

router.post(
  "/toggle/follow/:userId",
  isAuth,
  toggleFollow
);

// ========================================
// CONTENT STATS / DETAILS (GENERIC)
// ========================================

// New Simplified Generic Stats Route
router.get(
  "/stats/:contentId",
  getContentInteractions
);

// Backward Compatibility for Explicit Content Type
router.get(
  "/stats/:contentType/:contentId",
  getContentInteractions
);

// Backward Compatibility for Reels
router.get(
  "/reel/:reelId",
  getContentInteractions
);

// ========================================
// FOLLOW DETAILS
// ========================================

router.get(
  "/follow/:userId",
  getFollowStats
);

// ========================================
// BOOKMARKS
// ========================================

router.post(
  "/toggle/bookmark/:contentId",
  isAuth,
  toggleBookmark
);

router.post(
  "/toggle/bookmark/:contentType/:contentId",
  isAuth,
  toggleBookmark
);

router.get(
  "/bookmarks",
  isAuth,
  getBookmarks
);

module.exports = router;