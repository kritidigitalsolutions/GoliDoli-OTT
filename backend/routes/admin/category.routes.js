const express = require("express");
const router = express.Router();
const { isAdmin } = require("../../middlewares/admin.middleware");

const {
  addCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
} = require("../../controllers/admin/category.controller");

router.post("/", isAdmin, addCategory);
router.get("/", isAdmin, getAllCategories);
router.get("/:id", isAdmin, getCategoryById);
router.patch("/:id", isAdmin, updateCategory);
router.delete("/:id", isAdmin, deleteCategory);

module.exports = router;
