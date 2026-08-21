const audioCategoryService = require("../../services/audioCategory.service");

const getActiveCategories = async (req, res) => {
  try {
    const categories = await audioCategoryService.getCategories({ isActive: true });
    return res.json({
      success: true,
      categories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message,
    });
  }
};

module.exports = {
  getActiveCategories,
};
