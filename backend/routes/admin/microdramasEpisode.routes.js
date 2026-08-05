const express = require("express");

const router = express.Router();

const upload = require(
  "../../middlewares/upload.middleware"
);

const {
  isAdmin,
} = require(
  "../../middlewares/admin.middleware"
);

const {
  addMicrodramaEpisode,
  getMicrodramaEpisodes,
  updateMicrodramaEpisode,
  deleteMicrodramaEpisode,
  searchMicrodramaEpisodes,
} = require(
  "../../controllers/admin/microdramaEpisode.controller"
);


// ========================================
// MULTER
// ========================================
const episodeUpload =
  upload.fields([
    {
      name: "video",
      maxCount: 1,
    },
    {
      name: "videoUrl",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
    {
      name: "thumbnailUrl",
      maxCount: 1,
    },
  ]);


// ========================================
// ADD EPISODE
// ========================================
router.post("/:microdramaId/add", isAdmin, episodeUpload, addMicrodramaEpisode);


// ========================================
// SEARCH EPISODES
// ========================================
router.get("/search", isAdmin, searchMicrodramaEpisodes);


// ========================================
// GET ALL EPISODES
// ========================================
router.get("/:microdramaId", isAdmin, getMicrodramaEpisodes);


// ========================================
// UPDATE EPISODE
// ========================================
router.patch("/:id", isAdmin, episodeUpload, updateMicrodramaEpisode);


// ========================================
// DELETE EPISODE
// ========================================
router.delete("/:id", isAdmin, deleteMicrodramaEpisode);


module.exports = router;
