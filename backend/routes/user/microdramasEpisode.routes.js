const express = require("express");

const router = express.Router();

const {
  getMicrodramaEpisodes,
  searchMicrodramaEpisodes,
} = require(
  "../../controllers/microdramaEpisode.controller"
);

// ========================================
// SEARCH EPISODES
// ========================================
router.get("/search", searchMicrodramaEpisodes);


// ========================================
// GET ALL EPISODES
// ========================================
router.get("/:microdramaId", getMicrodramaEpisodes);


module.exports = router;
