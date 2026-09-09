const Category = require("../../models/category.model");

// ========================================
// CREATE CATEGORY
// ========================================
exports.createCategory = async (req, res) => {
  try {
    const { name, priority, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }

    const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
    if (existing) {
      return res.status(409).json({ success: false, message: "Category with this name already exists" });
    }

    let newPriority = parseInt(priority, 10);
    const maxCat = await Category.findOne().sort({ priority: -1 });
    const maxPriority = maxCat && maxCat.priority ? maxCat.priority : 0;

    if (isNaN(newPriority) || newPriority < 1) {
      newPriority = maxPriority + 1;
    } else if (newPriority <= maxPriority) {
      await Category.updateMany(
        { priority: { $gte: newPriority } },
        { $inc: { priority: 1 } }
      );
    } else if (newPriority > maxPriority + 1) {
      newPriority = maxPriority + 1;
    }

    const categoryData = { name, priority: newPriority };
    if (isActive !== undefined) categoryData.isActive = isActive === true || isActive === "true";
    
    const category = await Category.create(categoryData);

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        priority: category.priority,
        isActive: category.isActive,
        createdAt: category.createdAt
      }
    });
  } catch (error) {
    console.error("CREATE CATEGORY ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================
// GET ALL CATEGORIES (Admin)
// ========================================
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().select("_id name slug priority isActive createdAt curatedContent").sort({ priority: 1, name: 1 });

    return res.status(200).json({
      success: true,
      count: categories.length,
      total: categories.length,
      data: categories,
      categories: categories
    });
  } catch (error) {
    console.error("GET ALL CATEGORIES ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================
// GET CATEGORY BY ID (Admin)
// ========================================
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    return res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error("GET CATEGORY BY ID ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================
// UPDATE CATEGORY
// ========================================
exports.updateCategory = async (req, res) => {
  try {
    const { name, isActive, priority } = req.body;

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    if (name) category.name = name;
    if (isActive !== undefined) category.isActive = isActive === true || isActive === "true";

    if (priority !== undefined) {
      let newPriority = parseInt(priority, 10);
      let oldPriority = category.priority;
      if (!isNaN(newPriority) && newPriority !== oldPriority && newPriority > 0) {
        const maxCat = await Category.findOne().sort({ priority: -1 });
        const maxPriority = maxCat && maxCat.priority ? maxCat.priority : 0;
        if (newPriority > maxPriority) newPriority = maxPriority;

        if (newPriority < oldPriority) {
          await Category.updateMany(
            { priority: { $gte: newPriority, $lt: oldPriority } },
            { $inc: { priority: 1 } }
          );
        } else if (newPriority > oldPriority) {
          await Category.updateMany(
            { priority: { $gt: oldPriority, $lte: newPriority } },
            { $inc: { priority: -1 } }
          );
        }
        category.priority = newPriority;
      }
    }
    if (isActive !== undefined) category.isActive = isActive === true || isActive === "true";

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        priority: category.priority,
        isActive: category.isActive,
        createdAt: category.createdAt
      }
    });
  } catch (error) {
    console.error("UPDATE CATEGORY ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================
// DELETE CATEGORY
// ========================================
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    const deletedPriority = category.priority;
    await Category.findByIdAndDelete(req.params.id);

    if (deletedPriority) {
      await Category.updateMany(
        { priority: { $gt: deletedPriority } },
        { $inc: { priority: -1 } }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully"
    });
  } catch (error) {
    console.error("DELETE CATEGORY ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================
// SAVE CURATED CONTENT FOR CATEGORY
// ========================================
exports.saveCuratedContent = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    const { items } = req.body; // [{ contentType: "Movie"|"Series", contentId: "..." }]
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, message: "items must be an array" });
    }

    category.curatedContent = items.map((i, index) => ({
      contentType: i.contentType,
      contentId: i.contentId,
      position: index + 1
    }));

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Curated content saved successfully",
      count: category.curatedContent.length
    });
  } catch (error) {
    console.error("SAVE CURATED CONTENT ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
