const User = require("../../models/user.model");
const Movie = require("../../models/movie.model");
const Series = require("../../models/series.model");
const Microdrama = require("../../models/microdrama.model");
const AudioStory = require("../../models/audioStory.model");
const Help = require("../../models/help.model");

exports.globalSearch = async (req, res) => {
  try {
    const query = req.query.q || "";
    if (!query) {
      return res.status(200).json({ success: true, data: [] });
    }

    const regex = new RegExp(query, "i");

    // Perform queries in parallel
    const [users, movies, series, microdramas, audioStories, helpItems] = await Promise.all([
      User.find({
        $or: [
          { name: regex },
          { email: regex },
          { phone: regex }
        ]
      }).limit(5),
      Movie.find({ title: regex }).limit(5),
      Series.find({ title: regex }).limit(5),
      Microdrama.find({ title: regex }).limit(5),
      AudioStory.find({
        $or: [
          { title: regex },
          { author: regex },
          { narrator: regex }
        ]
      }).limit(5),
      Help.find({
        $or: [
          { question: regex },
          { answer: regex }
        ]
      }).limit(5)
    ]);

    // Format results to match the structure Topbar expects:
    // { name: String, title: String (optional), type: String }
    const results = [];

    users.forEach((u) => {
      results.push({
        _id: u._id,
        name: u.name,
        type: "User"
      });
    });

    movies.forEach((m) => {
      results.push({
        _id: m._id,
        title: m.title,
        type: "Movie"
      });
    });

    series.forEach((s) => {
      results.push({
        _id: s._id,
        title: s.title,
        type: "Series"
      });
    });

    microdramas.forEach((md) => {
      results.push({
        _id: md._id,
        title: md.title,
        type: "Microdrama"
      });
    });

    audioStories.forEach((a) => {
      results.push({
        _id: a._id,
        title: a.title,
        type: "Audio Story"
      });
    });

    helpItems.forEach((h) => {
      results.push({
        _id: h._id,
        title: h.question,
        type: "Help"
      });
    });

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error("Global Search Error:", error);
    res.status(500).json({
      success: false,
      message: "Search failed",
      error: error.message
    });
  }
};
