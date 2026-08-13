const IntroScreen = require("../../models/introScreen.model");

/**
 * CREATE INTRO SCREEN
 * POST /api/admin/intro-screens
 */
exports.createIntroScreen = async (req, res) => {
  try {
    const { title, image, order } = req.body;

    // Validation
    if (!title || !image) {
      return res.status(400).json({
        success: false,
        message: "Title and Image URL are required",
      });
    }

    const introScreen = await IntroScreen.create({
      title,
      image,
      order: order !== undefined ? order : 0,
    });

    return res.status(201).json({
      success: true,
      message: "Intro screen created successfully",
      data: introScreen,
    });
  } catch (error) {
    console.error("Create intro screen error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create intro screen",
      error: error.message,
    });
  }
};


/**
 * GET ALL INTRO SCREENS
 * GET /api/admin/intro-screens
 */
exports.getAllIntroScreens = async (req, res) => {
  try {
    const introScreens = await IntroScreen.find()
      .sort({
        order: 1,
        createdAt: 1,
      });

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


/**
 * GET INTRO SCREEN BY ID
 * GET /api/admin/intro-screens/:id
 */
exports.getIntroScreenById = async (req, res) => {
  try {
    const { id } = req.params;

    const introScreen = await IntroScreen.findById(id);

    if (!introScreen) {
      return res.status(404).json({
        success: false,
        message: "Intro screen not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: introScreen,
    });
  } catch (error) {
    console.error("Get intro screen by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get intro screen",
      error: error.message,
    });
  }
};


/**
 * UPDATE INTRO SCREEN
 * PUT /api/admin/intro-screens/:id
 */
exports.updateIntroScreen = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, image, order } = req.body;

    const introScreen = await IntroScreen.findById(id);

    if (!introScreen) {
      return res.status(404).json({
        success: false,
        message: "Intro screen not found",
      });
    }

    if (title !== undefined) {
      introScreen.title = title;
    }

    if (image !== undefined) {
      introScreen.image = image;
    }

    if (order !== undefined) {
      introScreen.order = order;
    }

    await introScreen.save();

    return res.status(200).json({
      success: true,
      message: "Intro screen updated successfully",
      data: introScreen,
    });
  } catch (error) {
    console.error("Update intro screen error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update intro screen",
      error: error.message,
    });
  }
};


/**
 * DELETE INTRO SCREEN
 * DELETE /api/admin/intro-screens/:id
 */
exports.deleteIntroScreen = async (req, res) => {
  try {
    const { id } = req.params;

    const introScreen = await IntroScreen.findByIdAndDelete(id);

    if (!introScreen) {
      return res.status(404).json({
        success: false,
        message: "Intro screen not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Intro screen deleted successfully",
    });
  } catch (error) {
    console.error("Delete intro screen error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete intro screen",
      error: error.message,
    });
  }
};


/**
 * REORDER INTRO SCREENS
 * PATCH /api/admin/intro-screens/reorder
 */
exports.reorderIntroScreens = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: "items must be an array",
      });
    }

    for (const item of items) {
      if (!item.id || item.order === undefined) {
        return res.status(400).json({
          success: false,
          message: "Each item must contain id and order",
        });
      }
    }

    await Promise.all(
      items.map((item) =>
        IntroScreen.findByIdAndUpdate(
          item.id,
          {
            order: item.order,
          },
          {
            runValidators: true,
          }
        )
      )
    );

    return res.status(200).json({
      success: true,
      message: "Intro screen order updated successfully",
    });
  } catch (error) {
    console.error("Reorder intro screens error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reorder intro screens",
      error: error.message,
    });
  }
};