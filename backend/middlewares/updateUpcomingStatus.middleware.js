const Movie = require("../models/movie.model");
const Series = require("../models/series.model");
const AudioStory = require("../models/audioStory.model");

const updateUpcomingStatus = async (req, res, next) => {
  try {
    const now = new Date();
    await Promise.all([
      Movie.updateMany(
        { isComingSoon: true, releaseDate: { $lte: now } },
        { $set: { isComingSoon: false } }
      ),
      Series.updateMany(
        { isComingSoon: true, releaseDate: { $lte: now } },
        { $set: { isComingSoon: false } }
      ),
      // Auto-publish Scheduled Drafts or Coming Soon Stories when scheduleDate is reached
      AudioStory.updateMany(
        { scheduleDate: { $lte: now } },
        { $set: { isPublished: true, isComingSoon: false }, $unset: { scheduleDate: "" } }
      )
    ]);
    next();
  } catch (error) {
    console.error("Error updating upcoming content status:", error);
    next();
  }
};

module.exports = updateUpcomingStatus;
