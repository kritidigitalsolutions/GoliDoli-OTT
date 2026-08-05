const Series = require("../models/series.model");
const Episode = require("../models/episode.model");

const getSearchFilter = (search) => {
  const term = String(search || "").trim();
  return term
    ? { title: { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }
    : {};
};

// ========================================
// GET ALL SERIES
// ========================================
const getAllSeries = async (req, res) => {
  try {
    const filter = { isPublished: true, ...getSearchFilter(req.query.search) };
    const series = await Series.find(filter).sort({ priority: 1, createdAt: -1 }).lean();

    // Fetch all episodes for these series
    const seriesIds = series.map(s => s._id);
    const allEpisodes = await Episode.find({ seriesId: { $in: seriesIds } }).sort({ seasonNumber: 1, episodeNumber: 1 }).lean();

    const formattedSeries = series.map(s => {
      const episodes = allEpisodes.filter(ep => ep.seriesId.toString() === s._id.toString());
      const seasons = [];
      episodes.forEach(ep => {
        let season = seasons.find(se => se.seasonNumber === ep.seasonNumber);
        if (!season) {
          season = { seasonNumber: ep.seasonNumber, episodes: [] };
          seasons.push(season);
        }
        season.episodes.push(ep);
      });

      const seriesObj = { ...s, seasons };
      return seriesObj;

    });

    return res.json({
      success: true,
      series: formattedSeries,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch series",
    });
  }
};

// ========================================
// GET SERIES BY SLUG
// ========================================
const getSeriesBySlug = async (req, res) => {
  try {
    const series = await Series.findOne({ slug: req.params.slug, isPublished: true });

    if (!series) {
      return res.status(404).json({
        success: false,
        message: "Series not found",
      });
    }

    const episodes = await Episode.find({ seriesId: series._id }).sort({ seasonNumber: 1, episodeNumber: 1 });

    const seasons = [];
    episodes.forEach(ep => {
      let season = seasons.find(s => s.seasonNumber === ep.seasonNumber);
      if (!season) {
        season = { seasonNumber: ep.seasonNumber, episodes: [] };
        seasons.push(season);
      }
      season.episodes.push(ep);
    });

    const seriesObj = series.toObject();

    return res.json({
      success: true,
      series: { ...seriesObj, seasons }
    });




  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch series",
    });
  }
};

// ========================================
// GET SERIES BY ID
// ========================================
const getSeriesById = async (req, res) => {
  try {
    const series = await Series.findOne({ _id: req.params.id, isPublished: true });

    if (!series) {
      return res.status(404).json({
        success: false,
        message: "Series not found",
      });
    }

    const episodes = await Episode.find({ seriesId: series._id }).sort({ seasonNumber: 1, episodeNumber: 1 });

    const seasons = [];
    episodes.forEach(ep => {
      let season = seasons.find(s => s.seasonNumber === ep.seasonNumber);
      if (!season) {
        season = { seasonNumber: ep.seasonNumber, episodes: [] };
        seasons.push(season);
      }
      season.episodes.push(ep);
    });

    const seriesObj = series.toObject();

    return res.json({
      success: true,
      series: { ...seriesObj, seasons }
    });




  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch series",
    });
  }
};


// ========================================
// GET EPISODES BY SERIES
// ========================================
const getEpisodesBySeries = async (req, res) => {
  try {
    const episodes = await Episode.find({ seriesId: req.params.seriesId })
      .sort({ seasonNumber: 1, episodeNumber: 1 });

    return res.json({
      success: true,
      episodes,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch episodes",
    });
  }
};

module.exports = {
  getAllSeries,
  getSeriesBySlug,
  getSeriesById,
  getEpisodesBySeries,
};


