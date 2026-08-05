const Category = require("../models/category.model");

// ========================================
// GET ACTIVE CATEGORIES (USER)
// ========================================
const getActiveCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ priority: 1, createdAt: -1 });
    return res.json({
      success: true,
      categories
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getActiveCategories
};
