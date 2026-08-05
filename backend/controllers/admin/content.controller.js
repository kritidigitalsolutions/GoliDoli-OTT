const Movie = require("../../models/movie.model");
const Series = require("../../models/series.model");
// Preserve the existing collection while exposing the product name used by the app.
const Microdrama = require("../../models/microdrama.model");

const getContentStats = async (req, res) => {
  try {
    const [movies, series, microdramas] = await Promise.all([
      Movie.countDocuments(),
      Series.countDocuments(),
      Microdrama.countDocuments(),
    ]);

    return res.json({
      success: true,
      stats: {
        movies,
        series,
        microdramas,
        total: movies + series + microdramas,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getAllContent = async (req, res) => {
  try {
    const [movies, series, microdramas] = await Promise.all([
      Movie.find().sort({ createdAt: -1 }).lean(),
      Series.find().sort({ createdAt: -1 }).lean(),
      Microdrama.find().sort({ createdAt: -1 }).lean(),
    ]);

    const content = [
      ...movies.map((item) => ({ ...item, contentType: "movie" })),
      ...series.map((item) => ({ ...item, contentType: "series" })),
      ...microdramas.map((item) => ({ ...item, contentType: "microdrama" })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({ success: true, content });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getContentStats, getAllContent };
