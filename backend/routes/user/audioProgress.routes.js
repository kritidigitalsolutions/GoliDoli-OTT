const express = require("express");
const router = express.Router();
const { isAuth } = require("../../middlewares/auth.middleware");
const { validateAudioProgress } = require("../../validators/audio.validator");
const {
  saveProgress,
  getContinueListening,
  completeEpisode,
  getEpisodeProgress,
} = require("../../controllers/user/audioProgress.controller");

router.use(isAuth);

router.post("/", validateAudioProgress, saveProgress);
router.get("/continue", getContinueListening);
router.post("/:episodeId/complete", completeEpisode);
router.get("/:episodeId", getEpisodeProgress);

module.exports = router;
