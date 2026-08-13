const IntroScreen = require("../models/introScreen.model");

/**
 * GET ALL INTRO SCREENS FOR APP
 * GET /api/intro-screens
 */
exports.getActiveIntroScreens = async (req, res) => {
  try {
    const introScreens = await IntroScreen.find()
      .sort({
        order: 1,
        createdAt: 1,
      })
      .select("_id title image order");

    return res.status(200).json({
      success: true,
      count: introScreens.length,
      data: introScreens,
    });
  } catch (error) {
    console.error("Get intro screens error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get intro screens",
      error: error.message,
    });
  }
};