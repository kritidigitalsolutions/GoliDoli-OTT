const express = require("express");
const router = express.Router();
const { isAdmin, hasPermission } = require("../../middlewares/admin.middleware");
const {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  saveCuratedContent,
} = require("../../controllers/admin/category.controller");

// Admin Category Routes (All protected by isAdmin)
router.post("/", isAdmin, hasPermission("categories"), createCategory);
router.get("/", isAdmin, hasPermission("categories"), getAllCategories);
router.get("/:id", isAdmin, hasPermission("categories"), getCategoryById);
router.put("/:id", isAdmin, hasPermission("categories"), updateCategory);
router.delete("/:id", isAdmin, hasPermission("categories"), deleteCategory);
router.put("/:id/content", isAdmin, hasPermission("categories"), saveCuratedContent);

module.exports = router;
