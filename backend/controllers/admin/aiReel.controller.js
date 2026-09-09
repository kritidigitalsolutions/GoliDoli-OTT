const AIReel = require("../../models/aiReel.model");
const { getMediaUrl, deleteMedia } = require("../../utils/mediaUrl");

// ========================================
// CREATE AI REEL
// ========================================
const createAIReel = async (req, res) => {
  try {
    const { title, description, duration, isPublished, priority } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    const video = req.files?.video?.[0];
    const thumbnail = req.files?.thumbnail?.[0];

    if (!video && !req.body.videoUrl) {
      return res.status(400).json({
        success: false,
        message: "Video file or videoUrl is required",
      });
    }

    if (!thumbnail && !req.body.thumbnailUrl && !req.body.thumbnail) {
      return res.status(400).json({
        success: false,
        message: "Thumbnail file or thumbnailUrl is required",
      });
    }

    const videoUrl = getMediaUrl(video, req.body.videoUrl || "");
    const thumbnailUrl = getMediaUrl(thumbnail, req.body.thumbnailUrl || req.body.thumbnail || "");

    // PRIORITY ALGORITHM
    const inputPriority = priority !== undefined ? Number(priority) : 0;
    let finalPriority = 0;

    if (inputPriority > 0) {
      // Shift up existing reels with priority >= inputPriority
      await AIReel.updateMany(
        { priority: { $gte: inputPriority } },
        { $inc: { priority: 1 } }
      );
      finalPriority = inputPriority;
    } else {
      // Auto-assign: maxPriority + 1
      const maxReel = await AIReel.findOne().sort("-priority");
      finalPriority = maxReel && maxReel.priority ? maxReel.priority + 1 : 1;
    }

    const aiReel = await AIReel.create({
      title,
      description: description || "",
      duration: duration || "",
      thumbnail: thumbnailUrl,
      videoUrl,
      isPublished: isPublished === "true" || isPublished === true,
      priority: finalPriority,
    });

    return res.status(201).json({
      success: true,
      message: "AI Reel created successfully",
      data: aiReel,
    });
  } catch (error) {
    console.error("Create AI Reel Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ========================================
// GET ALL AI REELS (ADMIN)
// ========================================
const getAllAIReels = async (req, res) => {
  try {
    const aiReels = await AIReel.find()
      .sort({ priority: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "AI Reels fetched successfully",
      data: aiReels,
    });
  } catch (error) {
    console.error("Get All AI Reels Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ========================================
// GET AI REEL BY ID (ADMIN)
// ========================================
const getAIReelById = async (req, res) => {
  try {
    const { id } = req.params;
    const aiReel = await AIReel.findById(id).lean();
    if (!aiReel) {
      return res.status(404).json({
        success: false,
        message: "AI Reel not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "AI Reel fetched successfully",
      data: aiReel,
    });
  } catch (error) {
    console.error("Get AI Reel Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ========================================
// UPDATE AI REEL
// ========================================
const updateAIReel = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, duration, isPublished, priority } = req.body;

    const existing = await AIReel.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "AI Reel not found",
      });
    }

    const nextIsPublished =
      isPublished !== undefined
        ? isPublished === "true" || isPublished === true
        : existing.isPublished;

    const updates = {
      title: title !== undefined ? title : existing.title,
      description: description !== undefined ? description : existing.description,
      duration: duration !== undefined ? duration : existing.duration,
      isPublished: nextIsPublished,
      priority: priority !== undefined ? Number(priority) : existing.priority,
    };

    // If an admin publishes a previously unpublished reel, reset publishedAt
    // so the feed can treat it as newly available.
    if (nextIsPublished && !existing.isPublished) {
      updates.publishedAt = new Date();
    }

    const video = req.files?.video?.[0];
    const thumbnail = req.files?.thumbnail?.[0];

    if (video) {
      await deleteMedia(existing.videoUrl);
      updates.videoUrl = getMediaUrl(video);
    } else if (req.body.videoUrl) {
      updates.videoUrl = req.body.videoUrl;
    }

    if (thumbnail) {
      await deleteMedia(existing.thumbnail);
      updates.thumbnail = getMediaUrl(thumbnail);
    } else if (req.body.thumbnailUrl || req.body.thumbnail) {
      updates.thumbnail = req.body.thumbnailUrl || req.body.thumbnail;
    }

    // PRIORITY ALGORITHM FOR UPDATE
    if (priority !== undefined) {
      const newPriority = Number(priority) || 0;
      const oldPriority = existing.priority || 0;

      if (newPriority !== oldPriority) {
        // Step 1: Remove from old slot
        if (oldPriority > 0) {
          await AIReel.updateMany(
            { _id: { $ne: existing._id }, priority: { $gt: oldPriority } },
            { $inc: { priority: -1 } }
          );
        }

        // Step 2: Insert into new slot
        if (newPriority > 0) {
          await AIReel.updateMany(
            { _id: { $ne: existing._id }, priority: { $gte: newPriority } },
            { $inc: { priority: 1 } }
          );
          updates.priority = newPriority;
        } else {
          updates.priority = 0;
        }
      }
    }

    const updated = await AIReel.findByIdAndUpdate(id, updates, { new: true });

    return res.status(200).json({
      success: true,
      message: "AI Reel updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Update AI Reel Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ========================================
// DELETE AI REEL
// ========================================
const deleteAIReel = async (req, res) => {
  try {
    const { id } = req.params;
    const aiReel = await AIReel.findById(id);
    if (!aiReel) {
      return res.status(404).json({
        success: false,
        message: "AI Reel not found",
      });
    }

    // Delete media assets
    await deleteMedia(aiReel.videoUrl);
    await deleteMedia(aiReel.thumbnail);

    const targetPriority = aiReel.priority || 0;

    await AIReel.findByIdAndDelete(id);

    // Shift down priorities of all reels with priority > targetPriority
    if (targetPriority > 0) {
      await AIReel.updateMany(
        { priority: { $gt: targetPriority } },
        { $inc: { priority: -1 } }
      );
    }

    return res.status(200).json({
      success: true,
      message: "AI Reel deleted successfully",
      data: aiReel,
    });
  } catch (error) {
    console.error("Delete AI Reel Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createAIReel,
  getAllAIReels,
  getAIReelById,
  updateAIReel,
  deleteAIReel,
};