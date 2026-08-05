const express = require("express");

const router = express.Router();

const {
  isAuth,
} = require("../../middlewares/auth.middleware");

const {
  addComment,
  getComments,
  deleteComment,
} = require("../../controllers/comment.controller");

// Add Comment
router.post(
  "/:reelId",
  isAuth,
  addComment
);

// Get Comments
router.get(
  "/:reelId",
  getComments
);

// Delete Comment
router.delete(
  "/:commentId",
  isAuth,
  deleteComment
);

module.exports = router;