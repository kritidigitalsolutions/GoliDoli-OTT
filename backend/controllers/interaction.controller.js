const mongoose = require("mongoose");
const Interaction = require("../models/interaction.model");

// ========================================
// ========================================
// TOGGLE LIKE
// ========================================
exports.toggleLike = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;
    const contentId = req.params.contentId || req.params.reelId;

    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid content ID",
      });
    }

    // Dynamic detection of contentType
    
    const Movie = require("../models/movie.model");
    const Series = require("../models/series.model");
    const Microdrama = require("../models/microdrama.model");
    const Episode = require("../models/episode.model");
    const MicrodramaEpisode = require("../models/microdramaEpisode.model");
    const AIReel = require("../models/aiReel.model");

    const [movie, series, microdrama, episode, microdramaEpisode, aiReel] = await Promise.all([
      Movie.findById(contentId),
      Series.findById(contentId),
      Microdrama.findById(contentId),
      Episode.findById(contentId),
      MicrodramaEpisode.findById(contentId),
      AIReel.findById(contentId)
    ]);

    let contentType = req.params.contentType || null;

    if (!contentType) {
      if (movie && movie.status !== "DELETED") {
        contentType = "movie";
      } else if (series && series.status !== "DELETED") {
        contentType = "series";
      } else if (microdrama) {
        contentType = "microdrama";
      } else if (episode) {
        contentType = "episode";
      } else if (microdramaEpisode) {
        contentType = "microdramaEpisode";
      } else if (aiReel) {
        contentType = "aiReel";
      }
    }

    if (!contentType) {
      return res.status(404).json({
        success: false,
        message: "Content not found",
      });
    }

    // Check existing interaction
    const existing =
      await Interaction.findOne({
        user: userId,
        contentId,
        contentType,
      });

    let message = "";

    if (existing) {
      if (existing.type === "like") {
        // Remove like
        await Interaction.deleteOne({
          _id: existing._id,
        });
        message = "Like removed";
      } else if (existing.type === "dislike") {
        // Change from dislike to like
        existing.type = "like";
        await existing.save();
        message = "Changed to like";
      }
    } else {
      // Create new like interaction
      await Interaction.create({
        user: userId,
        contentId,
        contentType,
        type: "like",
      });
      message = "Like added";
    }

    // Calculate counts directly from Interaction collection
    const totalLikes = await Interaction.countDocuments({
      contentId,
      contentType,
      type: "like",
    });
    const totalDislikes = await Interaction.countDocuments({
      contentId,
      contentType,
      type: "dislike",
    });

    const updateModel = contentType === "movie" ? Movie 
                      : contentType === "series" ? Series 
                      : contentType === "microdrama" ? Microdrama 
                      : contentType === "episode" ? Episode
                      : contentType === "microdramaEpisode" ? MicrodramaEpisode
                      : contentType === "aiReel" ? AIReel
                      : null;
    if (updateModel) {
      if (contentType === "aiReel") {
        await updateModel.findByIdAndUpdate(contentId, {
          like: totalLikes,
        });
      } else {
        await updateModel.findByIdAndUpdate(contentId, {
          likes: totalLikes,
          dislikes: totalDislikes
        });
      }
    }

    return res.status(200).json({
      success: true,
      message,
      totalLikes,
      totalDislikes,
      contentType,
    });
  } catch (error) {
    console.error("Toggle Like Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ========================================
// TOGGLE DISLIKE
// ========================================
exports.toggleDislike = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;
    const contentId = req.params.contentId || req.params.reelId;

    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid content ID",
      });
    }

    // Dynamic detection of contentType
    
    const Movie = require("../models/movie.model");
    const Series = require("../models/series.model");
    const Microdrama = require("../models/microdrama.model");
    const Episode = require("../models/episode.model");
    const MicrodramaEpisode = require("../models/microdramaEpisode.model");
    const AIReel = require("../models/aiReel.model");

    const [movie, series, microdrama, episode, microdramaEpisode, aiReel] = await Promise.all([
      Movie.findById(contentId),
      Series.findById(contentId),
      Microdrama.findById(contentId),
      Episode.findById(contentId),
      MicrodramaEpisode.findById(contentId),
      AIReel.findById(contentId)
    ]);

    let contentType = req.params.contentType || null;

    if (!contentType) {
      if (movie && movie.status !== "DELETED") {
        contentType = "movie";
      } else if (series && series.status !== "DELETED") {
        contentType = "series";
      } else if (microdrama) {
        contentType = "microdrama";
      } else if (episode) {
        contentType = "episode";
      } else if (microdramaEpisode) {
        contentType = "microdramaEpisode";
      } else if (aiReel) {
        contentType = "aiReel";
      }
    }

    if (contentType === "aiReel") {
      return res.status(400).json({
        success: false,
        message: "Disliking AI Reels is not supported",
      });
    }

    if (!contentType) {
      return res.status(404).json({
        success: false,
        message: "Content not found",
      });
    }

    // Check existing interaction
    const existing =
      await Interaction.findOne({
        user: userId,
        contentId,
        contentType,
      });

    let message = "";

    if (existing) {
      if (existing.type === "dislike") {
        // Remove dislike
        await Interaction.deleteOne({
          _id: existing._id,
        });
        message = "Dislike removed";
      } else if (existing.type === "like") {
        // Change from like to dislike
        existing.type = "dislike";
        await existing.save();
        message = "Changed to dislike";
      }
    } else {
      // Create new dislike interaction
      await Interaction.create({
        user: userId,
        contentId,
        contentType,
        type: "dislike",
      });
      message = "Dislike added";
    }

    // Calculate counts directly from Interaction collection
    const totalLikes = await Interaction.countDocuments({
      contentId,
      contentType,
      type: "like",
    });
    const totalDislikes = await Interaction.countDocuments({
      contentId,
      contentType,
      type: "dislike",
    });

    const updateModel = contentType === "movie" ? Movie 
                      : contentType === "series" ? Series 
                      : contentType === "microdrama" ? Microdrama 
                      : contentType === "episode" ? Episode
                      : contentType === "microdramaEpisode" ? MicrodramaEpisode
                      : null;
    if (updateModel) {
      await updateModel.findByIdAndUpdate(contentId, {
        likes: totalLikes,
        dislikes: totalDislikes
      });
    }

    return res.status(200).json({
      success: true,
      message,
      totalLikes,
      totalDislikes,
      contentType,
    });
  } catch (error) {
    console.error("Toggle Dislike Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ========================================
// TOGGLE FOLLOW
// ========================================
exports.toggleFollow = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;
    const targetUserId =
      req.params.userId;

    if (userId === targetUserId) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot follow yourself",
      });
    }

    const existing =
      await Interaction.findOne({
        user: userId,
        contentId: targetUserId,
        contentType: "user",
        type: "follow",
      });

    if (existing) {
      await Interaction.deleteOne({
        _id: existing._id,
      });

      return res.status(200).json({
        success: true,
        message: "Unfollowed",
      });
    }

    await Interaction.create({
      user: userId,
      contentId: targetUserId,
      contentType: "user",
      type: "follow",
    });

    return res.status(200).json({
      success: true,
      message: "Followed",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ========================================
// GET CONTENT INTERACTIONS (STATS)
// ========================================
exports.getContentInteractions = async (req, res) => {
  try {
    const contentId = req.params.contentId || req.params.reelId;

    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid content ID",
      });
    }

    // Dynamic detection of contentType
    
    const Movie = require("../models/movie.model");
    const Series = require("../models/series.model");
    const Microdrama = require("../models/microdrama.model");
    const Episode = require("../models/episode.model");
    const MicrodramaEpisode = require("../models/microdramaEpisode.model");
    const AIReel = require("../models/aiReel.model");

    const [movie, series, microdrama, episode, microdramaEpisode, aiReel] = await Promise.all([
      Movie.findById(contentId),
      Series.findById(contentId),
      Microdrama.findById(contentId),
      Episode.findById(contentId),
      MicrodramaEpisode.findById(contentId),
      AIReel.findById(contentId)
    ]);

    let contentType = req.params.contentType || null;

    if (!contentType) {
      if (movie && movie.status !== "DELETED") {
        contentType = "movie";
      } else if (series && series.status !== "DELETED") {
        contentType = "series";
      } else if (microdrama) {
        contentType = "microdrama";
      } else if (episode) {
        contentType = "episode";
      } else if (microdramaEpisode) {
        contentType = "microdramaEpisode";
      } else if (aiReel) {
        contentType = "aiReel";
      }
    }

    if (!contentType) {
      return res.status(404).json({
        success: false,
        message: "Content not found",
      });
    }

    const type = req.query.type || "like";
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const users = await Interaction.find({
      contentId,
      contentType,
      type,
    })
      .populate("user", "_id name username profileImage")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const count = await Interaction.countDocuments({
      contentId,
      contentType,
      type,
    });

    const likes = await Interaction.countDocuments({
      contentId,
      contentType,
      type: "like",
    });

    const dislikes = await Interaction.countDocuments({
      contentId,
      contentType,
      type: "dislike",
    });

    // Optional user interaction lookup
    let userInteraction = null;
    let isBookmarked = false;
    const jwt = require("jsonwebtoken");
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded) {
          const [likeDislikeInt, bookmarkInt] = await Promise.all([
            Interaction.findOne({
              user: decoded.id,
              contentId,
              contentType,
              type: { $in: ["like", "dislike"] }
            }),
            Interaction.findOne({
              user: decoded.id,
              contentId,
              contentType,
              type: "bookmark"
            })
          ]);
          if (likeDislikeInt) {
            userInteraction = likeDislikeInt.type;
          }
          if (bookmarkInt) {
            isBookmarked = true;
          }
        }
      } catch (err) {
        // Suppress auth error since stats are public
      }
    }

    return res.status(200).json({
      success: true,
      likes,
      dislikes,
      userInteraction,
      isBookmarked,
      contentType,
      page,
      limit,
      total: count,
      users,
    });
  } catch (error) {
    console.error("Get Content Interactions Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getReelInteractions = exports.getContentInteractions;

// ========================================
// GET FOLLOW DETAILS
// ========================================
exports.getFollowStats =
  async (req, res) => {
    try {
      const userId =
        req.params.userId;

      const type =
        req.query.type ||
        "followers";

      const page =
        Number(req.query.page) || 1;

      const limit =
        Number(req.query.limit) || 20;

      const skip =
        (page - 1) * limit;

      let users = [];
      let total = 0;

      if (type === "followers") {
        users =
          await Interaction.find({
            contentId: userId,
            contentType: "user",
            type: "follow",
          })
            .populate(
              "user",
              "_id name username profileImage"
            )
            .skip(skip)
            .limit(limit)
            .sort({
              createdAt: -1,
            });

        total =
          await Interaction.countDocuments(
            {
              contentId: userId,
              contentType: "user",
              type: "follow",
            }
          );
      } else {
        users =
          await Interaction.find({
            user: userId,
            contentType: "user",
            type: "follow",
          })
            .skip(skip)
            .limit(limit)
            .sort({
              createdAt: -1,
            });

        total =
          await Interaction.countDocuments(
            {
              user: userId,
              contentType: "user",
              type: "follow",
            }
          );
      }

      const followersCount =
        await Interaction.countDocuments(
          {
            contentId: userId,
            contentType: "user",
            type: "follow",
          }
        );

      const followingCount =
        await Interaction.countDocuments(
          {
            user: userId,
            contentType: "user",
            type: "follow",
          }
        );

      return res.status(200).json({
        success: true,
        followersCount,
        followingCount,
        page,
        limit,
        total,
        users,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

// ========================================
// TOGGLE BOOKMARK
// ========================================
exports.toggleBookmark = async (req, res) => {
  try {
    const userId = req.user.id;
    const contentId = req.params.contentId;

    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid content ID",
      });
    }

    // Determine contentType: either explicitly passed or dynamically detected
// Determine contentType
// If route is /toggle/bookmark/:contentType/:contentId
// use provided contentType.
// Otherwise auto-detect from contentId.
let contentType = req.params.contentType || null;

console.log("Bookmark Params:", req.params);
console.log("Bookmark Body:", req.body);
    
    const Movie = require("../models/movie.model");
    const Series = require("../models/series.model");
    const Microdrama = require("../models/microdrama.model");
    const MicrodramaEpisode = require("../models/microdramaEpisode.model");
    const Episode = require("../models/episode.model");
    const User = require("../models/user.model");

    if (!contentType) {
      // Parallel execution to find the document in any valid model
      const [movie, series, microdrama, microdramaEpisode, episode, user] = await Promise.all([
        Movie.findById(contentId),
        Series.findById(contentId),
        Microdrama.findById(contentId),
        MicrodramaEpisode.findById(contentId),
        Episode.findById(contentId),
        User.findById(contentId)
      ]);

      if (movie && movie.status !== "DELETED") {
        contentType = "movie";
      } else if (series && series.status !== "DELETED") {
        contentType = "series";
      } else if (microdrama) {
        contentType = "microdrama";
      } else if (microdramaEpisode) {
        contentType = "microdramaEpisode";
      } else if (episode) {
        contentType = "episode";
      } else if (user) {
        contentType = "user";
      }
    } else {
      // Validate content type is allowed
      const allowedContentTypes = ["movie", "series", "user", "microdrama", "microdramaEpisode", "episode"];
      if (!allowedContentTypes.includes(contentType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid content type. Allowed types are: ${allowedContentTypes.join(", ")}`,
        });
      }

      // Check if document exists for the given contentType
      let exists = false;
      if (contentType === "movie") {
        const doc = await Movie.findById(contentId);
        exists = doc && doc.status !== "DELETED";
      } else if (contentType === "series") {
        const doc = await Series.findById(contentId);
        exists = doc && doc.status !== "DELETED";
      } else if (contentType === "microdrama") {
        exists = await Microdrama.exists({ _id: contentId });
      } else if (contentType === "microdramaEpisode") {
        exists = await MicrodramaEpisode.exists({ _id: contentId });
      } else if (contentType === "episode") {
        exists = await Episode.exists({ _id: contentId });
      } else if (contentType === "user") {
        exists = await User.exists({ _id: contentId });
      }

      if (!exists) {
        contentType = null;
      }
    }

    if (!contentType) {
      return res.status(404).json({
        success: false,
        message: "Content not found or invalid content ID",
      });
    }

    // Toggle bookmark
    const existing = await Interaction.findOne({
      user: userId,
      contentId,
      contentType,
      type: "bookmark",
    });

    if (existing) {
      await Interaction.deleteOne({ _id: existing._id });
      return res.status(200).json({
        success: true,
        bookmarked: false,
        message: "Bookmark removed",
      });
    } else {
      await Interaction.create({
        user: userId,
        contentId,
        contentType,
        type: "bookmark",
      });
      return res.status(200).json({
        success: true,
        bookmarked: true,
        message: "Bookmark added",
      });
    }
  } catch (error) {
    console.error("Toggle Bookmark Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ========================================
// GET MY BOOKMARKS
// ========================================
exports.getBookmarks = async (req, res) => {
  try {
    const userId = req.user.id;
    const contentType = req.query.contentType;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {
      user: userId,
      type: "bookmark",
    };

    if (contentType) {
      filter.contentType = contentType;
    }

    const bookmarks = await Interaction.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const total = await Interaction.countDocuments(filter);

    // Group bookmarks by contentType for efficient batch population
    const grouped = {};
    for (const item of bookmarks) {
      if (!grouped[item.contentType]) {
        grouped[item.contentType] = [];
      }
      grouped[item.contentType].push(item);
    }

    // Models dictionary
    
    const Movie = require("../models/movie.model");
    const Series = require("../models/series.model");
    const Microdrama = require("../models/microdrama.model");
    const MicrodramaEpisode = require("../models/microdramaEpisode.model");
    const Episode = require("../models/episode.model");
    const User = require("../models/user.model");

    const models = {
      movie: Movie,
      series: Series,
      microdrama: Microdrama,
      microdramaEpisode: MicrodramaEpisode,
      episode: Episode,
      user: User,
    };

    // Perform batched query for each content type
    await Promise.all(
      Object.keys(grouped).map(async (type) => {
        const model = models[type];
        if (model) {
          const ids = grouped[type].map((item) => item.contentId);
          const docs = await model.find({ _id: { $in: ids } }).lean();
          const docsMap = docs.reduce((map, doc) => {
            map[doc._id.toString()] = doc;
            return map;
          }, {});

          for (const item of grouped[type]) {
            item.contentDetails = docsMap[item.contentId.toString()] || null;
          }
        }
      })
    );

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      bookmarks,
    });
  } catch (error) {
    console.error("Get Bookmarks Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
