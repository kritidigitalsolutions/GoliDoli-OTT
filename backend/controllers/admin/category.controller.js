const Category = require("../../models/category.model");
const Movie = require("../../models/movie.model");
const Series = require("../../models/series.model");
const TvShow = require("../../models/microdrama.model");

// ========================================
// ADD CATEGORY
// ========================================
const addCategory = async (req, res) => {
  try {
    const { name, priority, isActive } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }

    const inputPriority = priority !== undefined ? Number(priority) : 0;
    let finalPriority = 0;

    if (inputPriority > 0) {
      // Shift up priorities >= inputPriority
      await Category.updateMany({ priority: { $gte: inputPriority } }, { $inc: { priority: 1 } });
      finalPriority = inputPriority;
    } else {                                                                                                              
      // Auto-assign first available priority >= 1 to fill any gaps
      const existingPriorities = await Category.find().distinct("priority");
      finalPriority = 1;
      while (existingPriorities.includes(finalPriority)) {
        finalPriority++;
      }
    }

    const category = await Category.create({
      name,
      priority: finalPriority,
      isActive: isActive !== undefined ? isActive : true
    });

    return res.status(201).json({
      success: true,
      message: "Category added successfully",
      category
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ========================================
// GET ALL CATEGORIES (ADMIN)
// ========================================
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ priority: 1, createdAt: -1 });
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

// ========================================
// GET CATEGORY BY ID
// ========================================
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    return res.json({
      success: true,
      category
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ========================================
// UPDATE CATEGORY
// ========================================
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, priority, isActive } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    let nameChanged = false;
    let oldCategoryName = "";
    let newCategoryName = "";

    if (name !== undefined && name !== category.name) {
      oldCategoryName = category.name.toLowerCase();
      newCategoryName = name.toLowerCase();
      if (oldCategoryName !== newCategoryName) {
        nameChanged = true;
      }
      category.name = name;
    }

    if (nameChanged) {
      await Promise.all([
        Movie.updateMany(
          { category: oldCategoryName },
          { $set: { "category.$[elem]": newCategoryName } },
          { arrayFilters: [{ elem: oldCategoryName }] }
        ),
        TvShow.updateMany(
          { category: oldCategoryName },
          { $set: { "category.$[elem]": newCategoryName } },
          { arrayFilters: [{ elem: oldCategoryName }] }
        ),
        Series.updateMany(
          { category: oldCategoryName },
          { $set: { "category.$[elem]": newCategoryName } },
          { arrayFilters: [{ elem: oldCategoryName }] }
        )
      ]);
    }
    if (isActive !== undefined) category.isActive = isActive;

    if (priority !== undefined) {
      const newPriority = Number(priority) || 0;
      const oldPriority = category.priority || 0;

      if (newPriority !== oldPriority) {
        // Step 1: Remove category from its old slot by shifting down priorities above oldPriority
        if (oldPriority > 0) {
          await Category.updateMany(
            { _id: { $ne: category._id }, priority: { $gt: oldPriority } },
            { $inc: { priority: -1 } }
          );
        }

        // Step 2: Insert category into its new slot
        if (newPriority > 0) {
          await Category.updateMany(
            { _id: { $ne: category._id }, priority: { $gte: newPriority } },
            { $inc: { priority: 1 } }
          );
          category.priority = newPriority;
        } else {
          category.priority = 0;
        }
      }
    }

    await category.save();

    return res.json({
      success: true,
      message: "Category updated successfully",
      category
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ========================================
// DELETE CATEGORY
// ========================================
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    const targetPriority = category.priority || 0;

    await Category.findByIdAndDelete(req.params.id);

    // Shift down priorities of categories above deleted category
    if (targetPriority > 0) {
      await Category.updateMany(
        { priority: { $gt: targetPriority } },
        { $inc: { priority: -1 } }
      );
    }

    return res.json({
      success: true,
      message: "Category deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  addCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
};
