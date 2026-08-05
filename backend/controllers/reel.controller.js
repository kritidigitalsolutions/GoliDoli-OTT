const mongoose = require("mongoose");
const Reel = require("../models/reel.model");
const User = require("../models/user.model");
const Interaction = require("../models/interaction.model");

// ========================================
// UPLOAD REEL
// ========================================
exports.uploadReel = async (req, res) => {
  try {
    const { caption, hashtags } = req.body;

    const videoFile = req.files?.video?.[0];
    const thumbnailFile = req.files?.thumbnail?.[0];

    if (!videoFile) {
      return res.status(400).json({
        success: false,
        message: "Video file is required",
      });
    }

    let hashtagsArray = [];

    if (hashtags) {
      try {
        hashtagsArray =
          typeof hashtags === "string"
            ? JSON.parse(hashtags)
            : hashtags;
      } catch {
        hashtagsArray = hashtags
          .split(",")
          .map((tag) => tag.trim());
      }
    }

    const reel = await Reel.create({
      user: req.user.id,
      videoUrl: videoFile.path.replace(/\\/g, "/"),
      thumbnail: thumbnailFile ? thumbnailFile.path.replace(/\\/g, "/") : "",
      caption,
      hashtags: hashtagsArray,
    });

    return res.status(201).json({
      success: true,
      message: "Reel uploaded successfully",
      reel,
    });
  } catch (error) {
    console.error("UPLOAD REEL ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// GET REELS FEED
// ========================================
exports.getReelsFeed = async (req, res) => {
  try {
    const reels = await Reel.find({
      status: "ACTIVE",
    })
      .populate(
        "user",
        "name username profileImage"
      )
      .sort({ createdAt: -1 })
      .lean();

    // Check if user is logged in (optional auth)
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const jwt = require("jsonwebtoken");
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        // Ignored
      }
    }

    if (reels.length > 0) {
      const reelIds = reels.map(r => r._id);
      
      // Calculate total likes for all active reels in one aggregation query
      const likesCounts = await Interaction.aggregate([
        {
          $match: {
            contentId: { $in: reelIds },
            contentType: "reel",
            type: "like",
          },
        },
        {
          $group: {
            _id: "$contentId",
            count: { $sum: 1 },
          },
        },
      ]);

      const likesMap = {};
      likesCounts.forEach(item => {
        likesMap[item._id.toString()] = item.count;
      });

      // Map user interaction if user is logged in
      let interactionMap = {};
      if (userId) {
        const interactions = await Interaction.find({
          user: userId,
          contentId: { $in: reelIds },
          contentType: "reel"
        });
        interactions.forEach(int => {
          interactionMap[int.contentId.toString()] = int.type;
        });
      }

      reels.forEach(r => {
        r.likesCount = likesMap[r._id.toString()] || 0;
        r.userInteraction = interactionMap[r._id.toString()] || null;
      });
    }

    return res.status(200).json({
      success: true,
      count: reels.length,
      reels,
    });
  } catch (error) {
    console.error("GET FEED ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// GET SINGLE REEL
// ========================================
exports.getSingleReel = async (
  req,
  res
) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Reel ID",
      });
    }

    const reel = await Reel.findById(
      req.params.id
    )
      .populate(
        "user",
        "name username profileImage"
      )
      .lean();

    if (!reel || reel.status === "DELETED") {
      return res.status(404).json({
        success: false,
        message: "Reel not found",
      });
    }

    // Check if user is logged in (optional auth)
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const jwt = require("jsonwebtoken");
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        // Ignored
      }
    }

    // Count likes dynamically from Interaction collection
    reel.likesCount = await Interaction.countDocuments({
      contentId: reel._id,
      contentType: "reel",
      type: "like",
    });

    reel.userInteraction = null;
    if (userId) {
      const interaction = await Interaction.findOne({
        user: userId,
        contentId: reel._id,
        contentType: "reel",
      });
      if (interaction) {
        reel.userInteraction = interaction.type;
      }
    }

    return res.status(200).json({
      success: true,
      reel,
    });
  } catch (error) {
    console.error(
      "GET SINGLE REEL ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// DELETE REEL
// ========================================
exports.deleteReel = async (
  req,
  res
) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Reel ID",
      });
    }

    const reel = await Reel.findById(
      req.params.id
    );

    if (!reel || reel.status === "DELETED") {
      return res.status(404).json({
        success: false,
        message: "Reel not found",
      });
    }

    const reelUserId = reel.user._id ? reel.user._id.toString() : reel.user.toString();
    if (reelUserId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can delete only your reels",
      });
    }

    reel.status = "DELETED";

    await reel.save();

    return res.status(200).json({
      success: true,
      message: "Reel deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE REEL ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// INCREMENT VIEWS COUNT
// ========================================
exports.incrementViews = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Reel ID" });
    }

    const reel = await Reel.findByIdAndUpdate(
      id,
      { $inc: { viewsCount: 1 } },
      { returnDocument: 'after' }
    );

    if (!reel || reel.status === "DELETED") {
      return res.status(404).json({ success: false, message: "Reel not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Views count incremented",
      viewsCount: reel.viewsCount,
    });
  } catch (error) {
    console.error("INCREMENT VIEWS ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// INCREMENT SHARES COUNT
// ========================================
exports.incrementShares = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Reel ID" });
    }

    const reel = await Reel.findByIdAndUpdate(
      id,
      { $inc: { sharesCount: 1 } },
      { returnDocument: 'after' }
    );

    if (!reel || reel.status === "DELETED") {
      return res.status(404).json({ success: false, message: "Reel not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Shares count incremented",
      sharesCount: reel.sharesCount,
    });
  } catch (error) {
    console.error("INCREMENT SHARES ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// GET MY REELS
// ========================================
exports.getMyReels = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {
      user: userId,
      status: "ACTIVE",
    };

    const reels = await Reel.find(filter)
      .populate("user", "name username profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Reel.countDocuments(filter);

    if (reels.length > 0) {
      const reelIds = reels.map(r => r._id);
      
      const likesCounts = await Interaction.aggregate([
        {
          $match: {
            contentId: { $in: reelIds },
            contentType: "reel",
            type: "like",
          },
        },
        {
          $group: {
            _id: "$contentId",
            count: { $sum: 1 },
          },
        },
      ]);

      const likesMap = {};
      likesCounts.forEach(item => {
        likesMap[item._id.toString()] = item.count;
      });

      const interactions = await Interaction.find({
        user: userId,
        contentId: { $in: reelIds },
        contentType: "reel"
      });
      
      const interactionMap = {};
      interactions.forEach(int => {
        interactionMap[int.contentId.toString()] = int.type;
      });

      reels.forEach(r => {
        r.likesCount = likesMap[r._id.toString()] || 0;
        r.userInteraction = interactionMap[r._id.toString()] || null;
      });
    }

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      reels,
    });
  } catch (error) {
    console.error("GET MY REELS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// GET USER REELS
// ========================================
exports.getUserReels = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid User ID",
      });
    }

    const filter = {
      user: targetUserId,
      status: "ACTIVE",
    };

    const reels = await Reel.find(filter)
      .populate("user", "name username profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Reel.countDocuments(filter);

    let requesterId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const jwt = require("jsonwebtoken");
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        requesterId = decoded.id;
      } catch (err) {
        // Ignored
      }
    }

    if (reels.length > 0) {
      const reelIds = reels.map(r => r._id);
      
      const likesCounts = await Interaction.aggregate([
        {
          $match: {
            contentId: { $in: reelIds },
            contentType: "reel",
            type: "like",
          },
        },
        {
          $group: {
            _id: "$contentId",
            count: { $sum: 1 },
          },
        },
      ]);

      const likesMap = {};
      likesCounts.forEach(item => {
        likesMap[item._id.toString()] = item.count;
      });

      let interactionMap = {};
      if (requesterId) {
        const interactions = await Interaction.find({
          user: requesterId,
          contentId: { $in: reelIds },
          contentType: "reel"
        });
        interactions.forEach(int => {
          interactionMap[int.contentId.toString()] = int.type;
        });
      }

      reels.forEach(r => {
        r.likesCount = likesMap[r._id.toString()] || 0;
        r.userInteraction = interactionMap[r._id.toString()] || null;
      });
    }

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      reels,
    });
  } catch (error) {
    console.error("GET USER REELS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};