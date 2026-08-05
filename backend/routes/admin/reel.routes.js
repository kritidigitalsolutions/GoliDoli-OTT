const express = require("express");
const router = express.Router();
const Reel = require("../../models/reel.model");
const { isAdmin } = require("../../middlewares/admin.middleware");

// Get all active reels for admin panel
router.get("/", isAdmin, async (req, res) => {
  try {
    const reels = await Reel.find({ status: { $ne: "DELETED" } })
      .populate("user", "name username profileImage")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: reels.length,
      reels,
    });
  } catch (error) {
    console.error("ADMIN GET REELS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// Admin moderate (soft delete) reel
router.delete("/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const reel = await Reel.findById(id);
    
    if (!reel || reel.status === "DELETED") {
      return res.status(404).json({
        success: false,
        message: "Reel not found",
      });
    }

    reel.status = "DELETED";
    await reel.save();

    return res.status(200).json({
      success: true,
      message: "Reel moderated/deleted successfully by admin",
    });
  } catch (error) {
    console.error("ADMIN DELETE REEL ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;
