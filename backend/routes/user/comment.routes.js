const express = require("express");
const router = express.Router();

const {
  addComment,
  getCommentsByContent,
  updateComment,
  deleteComment,
  getUserComments,
} = require("../../controllers/comment.controller");

const { isAuth } = require("../../middlewares/auth.middleware");

// 1. 💬 GET USER'S OWN COMMENTS
router.get("/user/me", isAuth, getUserComments);

// 2. 💬 GET COMMENTS (PUBLIC / OPTIONAL AUTH)
router.get("/:contentId", getCommentsByContent);
router.get("/", getCommentsByContent);

// 3. 💬 ADD / POST COMMENT (AUTH REQUIRED)
router.post("/:contentId", isAuth, addComment);
router.post("/", isAuth, addComment);

// 4. 💬 UPDATE / EDIT COMMENT (AUTH REQUIRED)
router.put("/:id", isAuth, updateComment);
router.patch("/:id", isAuth, updateComment);

// 5. 💬 DELETE COMMENT (AUTH REQUIRED)
router.delete("/:id", isAuth, deleteComment);

module.exports = router;
