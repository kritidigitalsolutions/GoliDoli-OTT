const mongoose = require("mongoose");

const Comment = require("../models/comment.model");
const Reel = require("../models/reel.model");

// ========================================
// ADD COMMENT
// ========================================
exports.addComment = async (req, res) => {
  try {
    const { reelId } = req.params;
    const { text } = req.body;

    if (!mongoose.Types.ObjectId.isValid(reelId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Reel ID",
      });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment text is required",
      });
    }

    const reel = await Reel.findById(reelId);

    if (!reel || reel.status === "DELETED") {
      return res.status(404).json({
        success: false,
        message: "Reel not found",
      });
    }

    const comment = await Comment.create({
      reel: reelId,
      user: req.user.id,
      text: text.trim(),
    });

    await Reel.findByIdAndUpdate(
      reelId,
      {
        $inc: {
          commentsCount: 1,
        },
      }
    );

    const populatedComment =
      await Comment.findById(comment._id)
        .populate(
          "user",
          "_id name username profileImage"
        );

    return res.status(201).json({
      success: true,
      message: "Comment added successfully",
      comment: populatedComment,
    });
  } catch (error) {
    console.error("ADD COMMENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// GET COMMENTS
// ========================================
exports.getComments = async (req, res) => {
  try {
    const { reelId } = req.params;

    const page =
      Number(req.query.page) || 1;

    const limit =
      Number(req.query.limit) || 10;

    const skip =
      (page - 1) * limit;

    const total =
      await Comment.countDocuments({
        reel: reelId,
      });

    const comments =
      await Comment.find({
        reel: reelId,
      })
        .populate(
          "user",
          "_id name username profileImage"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit);

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      comments,
    });
  } catch (error) {
    console.error("GET COMMENTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// DELETE COMMENT
// ========================================
exports.deleteComment = async (
  req,
  res
) => {
  try {
    const { commentId } = req.params;

    const comment =
      await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    if (
      comment.user.toString() !==
      req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You can delete only your comments",
      });
    }

    await Comment.findByIdAndDelete(
      commentId
    );

    await Reel.findByIdAndUpdate(
      comment.reel,
      {
        $inc: {
          commentsCount: -1,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "Comment deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE COMMENT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};