const express = require("express");
const router = express.Router();
const {
  getActiveCategories,
  getCategoryBySlug,
  getContentByCategory,
} = require("../../controllers/user/category.controller");

// User / Public Category Routes (Read-Only)
router.get("/", getActiveCategories);
router.get("/slug/:slug", getCategoryBySlug);
router.get("/:id", getContentByCategory);

module.exports = router;
