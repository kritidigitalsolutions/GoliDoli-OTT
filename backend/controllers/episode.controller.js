const Episode = require("../models/episode.model");

// ========================================
// GET EPISODES
// ========================================
const getEpisodes = async (req, res) => {
  try {
    const { seriesId, seasonNumber } = req.query;
    const query = {};
    if (seriesId) query.seriesId = seriesId;
    if (seasonNumber) query.seasonNumber = Number(seasonNumber);

    const episodes = await Episode.find(query)
      .sort({ seasonNumber: 1, episodeNumber: 1 })
      .lean();

    return res.json({
      success: true,
      episodes,
    });
  } catch (error) {
    console.error("Error fetching episodes:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch episodes",
    });
  }
};

// ========================================
// GET EPISODE BY ID
// ========================================
const getEpisodeById = async (req, res) => {
  try {
    const { id } = req.params;
    const episode = await Episode.findById(id).lean();

    if (!episode) {
      return res.status(404).json({
        success: false,
        message: "Episode not found",
      });
    }

    return res.json({
      success: true,
      episode,
    });
  } catch (error) {
    console.error("Error fetching episode by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch episode",
    });
  }
};

// ========================================
// SEARCH EPISODES
// ========================================
const searchEpisodes = async (req, res) => {
  try {
    const { q, seriesId } = req.query;
    const query = { title: { $regex: q || "", $options: "i" } };
    if (seriesId) query.seriesId = seriesId;

    const episodes = await Episode.find(query)
      .sort({ seasonNumber: 1, episodeNumber: 1 })
      .lean();

    return res.json({
      success: true,
      results: episodes,
    });
  } catch (error) {
    console.error("Error searching episodes:", error);
    return res.status(500).json({
      success: false,
      message: "Search failed",
    });
  }
};

module.exports = {
  getEpisodes,
  getEpisodeById,
  searchEpisodes,
};
