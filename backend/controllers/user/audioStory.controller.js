const audioStoryService = require("../../services/audioStory.service");
const jwt = require("jsonwebtoken");

/**
 * Extracts userId from the Authorization header if present and valid.
 * Does not throw or block request if token is missing or invalid (allows public access).
 */
const getUserIdFromHeader = (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded.id;
    }
  } catch (error) {
    // Return null in case of validation failures
  }
  return null;
};

const getStories = async (req, res) => {
  try {
    const userId = getUserIdFromHeader(req);
    const filter = {
      ...req.query,
      status: "Published",
      isPublished: true,
    };

    const stories = await audioStoryService.getStories(filter, userId);

    return res.json({
      success: true,
      stories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch stories",
      error: error.message,
    });
  }
};

const getHomeFeed = async (req, res) => {
  try {
    const userId = getUserIdFromHeader(req);
    const feed = await audioStoryService.getHomeFeed(userId);

    return res.json({
      success: true,
      feed,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch home feed",
      error: error.message,
    });
  }
};

const searchStories = async (req, res) => {
  try {
    const userId = getUserIdFromHeader(req);
    const query = req.query.search || req.query.q || "";

    if (!query.trim()) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const stories = await audioStoryService.getStories(
      {
        search: query,
        status: "Published",
        isPublished: true,
      },
      userId
    );

    return res.json({
      success: true,
      results: stories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Search failed",
      error: error.message,
    });
  }
};

const getStoryById = async (req, res) => {
  try {
    const userId = getUserIdFromHeader(req);
    const { id } = req.params;

    const story = await audioStoryService.getStoryById(id, userId);
    if (!story || story.status !== "Published" || !story.isPublished) {
      return res.status(404).json({
        success: false,
        message: "Audio story not found",
      });
    }

    return res.json({
      success: true,
      story,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch story details",
      error: error.message,
    });
  }
};

module.exports = {
  getStories,
  getHomeFeed,
  searchStories,
  getStoryById,
};
