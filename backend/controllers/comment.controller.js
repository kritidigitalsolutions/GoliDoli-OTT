const Comment = require("../models/comment.model");
const mongoose = require("mongoose");

// 1. 💬 ADD / POST COMMENT (USER)
exports.addComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contentId } = req.params;
    const { text, contentType } = req.body;

    const targetContentId = contentId || req.body.contentId;

    if (!targetContentId || !mongoose.Types.ObjectId.isValid(targetContentId)) {
      return res.status(400).json({
        success: false,
        message: "Valid content ID is required",
      });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment text cannot be empty",
      });
    }

    const comment = await Comment.create({
      user: userId,
      contentId: targetContentId,
      contentType: contentType || "movie",
      text: text.trim(),
    });

    const populatedComment = await Comment.findById(comment._id).populate(
      "user",
      "name email avatar"
    );

    res.status(201).json({
      success: true,
      message: "Comment posted successfully",
      comment: populatedComment,
    });
  } catch (error) {
    console.error("Add Comment Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error posting comment",
      error: error.message,
    });
  }
};

// 2. 💬 GET COMMENTS (PUBLIC / AUTH) - Supports optional contentId, pagination
exports.getCommentsByContent = async (req, res) => {
  try {
    const { contentId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const targetContentId = contentId || req.query.contentId;

    const query = {};
    if (targetContentId) {
      if (!mongoose.Types.ObjectId.isValid(targetContentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid content ID format",
        });
      }
      query.contentId = targetContentId;
    }

    const totalComments = await Comment.countDocuments(query);

    const comments = await Comment.find(query)
      .populate("user", "name email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      totalComments,
      currentPage: page,
      totalPages: Math.ceil(totalComments / limit) || 1,
      comments,
    });
  } catch (error) {
    console.error("Get Comments Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching comments",
      error: error.message,
    });
  }
};

// 3. 💬 UPDATE / EDIT COMMENT (AUTHOR ONLY)
exports.updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { text } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment ID",
      });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment text cannot be empty",
      });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    if (comment.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this comment",
      });
    }

    comment.text = text.trim();
    await comment.save();

    const updatedComment = await Comment.findById(comment._id).populate(
      "user",
      "name email avatar"
    );

    res.json({
      success: true,
      message: "Comment updated successfully",
      comment: updatedComment,
    });
  } catch (error) {
    console.error("Update Comment Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating comment",
      error: error.message,
    });
  }
};

// 4. 💬 DELETE COMMENT (AUTHOR OR ADMIN)
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment ID",
      });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    if (comment.user.toString() !== userId && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this comment",
      });
    }

    await Comment.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Delete Comment Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting comment",
      error: error.message,
    });
  }
};

// 5. 💬 GET USER'S OWN COMMENTS (AUTHENTICATED USER)
exports.getUserComments = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const totalComments = await Comment.countDocuments({ user: userId });

    const comments = await Comment.find({ user: userId })
      .populate("user", "name email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      totalComments,
      currentPage: page,
      totalPages: Math.ceil(totalComments / limit) || 1,
      comments,
    });
  } catch (error) {
    console.error("Get User Comments Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching user comments",
      error: error.message,
    });
  }
};
