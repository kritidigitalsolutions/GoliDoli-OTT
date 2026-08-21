const express = require("express");
const router = express.Router();
const { isAdmin } = require("../../middlewares/admin.middleware");
const audioUpload = require("../../middlewares/audioUpload.middleware");
const { validateAudioEpisode } = require("../../validators/audio.validator");
const {
  addEpisode,
  getEpisodes,
  updateEpisode,
  deleteEpisode,
  getUploadConfig,
} = require("../../controllers/admin/audioEpisode.controller");

router.use(isAdmin);

const episodeFiles = audioUpload.fields([
  { name: "audio", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

router.get("/upload-config", getUploadConfig);
router.post("/", episodeFiles, validateAudioEpisode, addEpisode);
router.get("/", getEpisodes);
router.patch("/:id", episodeFiles, validateAudioEpisode, updateEpisode);
router.delete("/:id", deleteEpisode);

module.exports = router;
