const express = require("express");
const router = express.Router();
const {
  getEpisodes,
  getEpisodeById,
  searchEpisodes,
} = require("../../controllers/episode.controller");

// ========================================
// ROUTES
// ========================================

// GET ALL / FILTERED BY seriesId / seasonNumber
router.get("/", getEpisodes);

// SEARCH EPISODES
router.get("/search", searchEpisodes);

// GET SINGLE BY ID
router.get("/:id", getEpisodeById);

module.exports = router;
