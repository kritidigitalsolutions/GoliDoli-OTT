const express = require("express");
const router = express.Router();
const { isAdmin } = require("../../middlewares/admin.middleware");
const audioUpload = require("../../middlewares/audioUpload.middleware");
const { validateAudioStory } = require("../../validators/audio.validator");
const {
  addStory,
  getStories,
  getStoryById,
  updateStory,
  deleteStory,
} = require("../../controllers/admin/audioStory.controller");

router.use(isAdmin);

const storyFiles = audioUpload.fields([
  { name: "coverImage", maxCount: 1 },
  { name: "bannerImage", maxCount: 1 },
]);

router.post("/", storyFiles, validateAudioStory, addStory);
router.get("/", getStories);
router.get("/:id", getStoryById);
router.patch("/:id", storyFiles, validateAudioStory, updateStory);
router.delete("/:id", deleteStory);

module.exports = router;
