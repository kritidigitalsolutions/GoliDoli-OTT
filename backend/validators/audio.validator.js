const mongoose = require("mongoose");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const validateAudioCategory = (req, res, next) => {
  const { name } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: "Category name is required and must be a valid string",
    });
  }

  next();
};

const validateAudioStory = (req, res, next) => {
  const { title, categories, status, isPremium, priority } = req.body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({
      success: false,
      message: "Story title is required and must be a valid string",
    });
  }

  if (categories) {
    let cats = categories;
    if (typeof categories === "string") {
      try {
        cats = JSON.parse(categories);
      } catch {
        cats = categories.split(",").map((c) => c.trim());
      }
    }

    if (!Array.isArray(cats)) {
      return res.status(400).json({
        success: false,
        message: "Categories must be an array of ObjectIds",
      });
    }

    for (const catId of cats) {
      if (!isValidObjectId(catId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid category ID: ${catId}`,
        });
      }
    }
    req.body.parsedCategories = cats;
  }

  if (status && !["Draft", "Published", "Archived"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status value. Must be 'Draft', 'Published', or 'Archived'",
    });
  }

  if (isPremium !== undefined) {
    req.body.isPremium = isPremium === "true" || isPremium === true;
  }

  if (priority !== undefined) {
    const prio = Number(priority);
    if (isNaN(prio)) {
      return res.status(400).json({
        success: false,
        message: "Priority must be a number",
      });
    }
    req.body.priority = prio;
  }

  next();
};

const validateAudioEpisode = (req, res, next) => {
  const { title, storyId, episodeNumber, duration, status, isPremium } = req.body;

  // For POST (add), these are required
  if (req.method === "POST") {
    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Episode title is required and must be a valid string",
      });
    }

    if (!storyId || !isValidObjectId(storyId)) {
      return res.status(400).json({
        success: false,
        message: "A valid storyId is required",
      });
    }

    if (episodeNumber === undefined || isNaN(Number(episodeNumber)) || Number(episodeNumber) < 1) {
      return res.status(400).json({
        success: false,
        message: "Episode number is required and must be a positive integer",
      });
    }

    if (duration === undefined || isNaN(Number(duration)) || Number(duration) < 0) {
      return res.status(400).json({
        success: false,
        message: "Duration (in seconds) is required and must be a positive number",
      });
    }
  } else {
    // For PATCH (update)
    if (storyId && !isValidObjectId(storyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid storyId",
      });
    }

    if (episodeNumber !== undefined && (isNaN(Number(episodeNumber)) || Number(episodeNumber) < 1)) {
      return res.status(400).json({
        success: false,
        message: "Episode number must be a positive integer",
      });
    }

    if (duration !== undefined && (isNaN(Number(duration)) || Number(duration) < 0)) {
      return res.status(400).json({
        success: false,
        message: "Duration must be a positive number",
      });
    }
  }

  if (status && !["Draft", "Published", "Archived"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status value. Must be 'Draft', 'Published', or 'Archived'",
    });
  }

  if (isPremium !== undefined) {
    req.body.isPremium = isPremium === "true" || isPremium === true;
  }

  next();
};

const validateAudioProgress = (req, res, next) => {
  const { episodeId, progressSeconds, durationSeconds } = req.body;

  if (!episodeId || !isValidObjectId(episodeId)) {
    return res.status(400).json({
      success: false,
      message: "A valid episodeId is required",
    });
  }

  if (progressSeconds === undefined || isNaN(Number(progressSeconds)) || Number(progressSeconds) < 0) {
    return res.status(400).json({
      success: false,
      message: "progressSeconds is required and must be a non-negative number",
    });
  }

  if (!durationSeconds || isNaN(Number(durationSeconds)) || Number(durationSeconds) <= 0) {
    return res.status(400).json({
      success: false,
      message: "durationSeconds is required and must be a positive number",
    });
  }

  if (Number(progressSeconds) > Number(durationSeconds)) {
    return res.status(400).json({
      success: false,
      message: "progressSeconds cannot exceed durationSeconds",
    });
  }

  next();
};

module.exports = {
  validateAudioCategory,
  validateAudioStory,
  validateAudioEpisode,
  validateAudioProgress,
};
