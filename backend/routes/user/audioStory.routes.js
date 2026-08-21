const express = require("express");
const router = express.Router();
const {
  getStories,
  getHomeFeed,
  searchStories,
  getStoryById,
} = require("../../controllers/user/audioStory.controller");

router.get("/", getStories);
router.get("/home", getHomeFeed);
router.get("/search", searchStories);
router.get("/:id", getStoryById);

module.exports = router;
