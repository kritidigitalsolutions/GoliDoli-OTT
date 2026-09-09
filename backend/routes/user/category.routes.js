const express = require("express");
const router = express.Router();
const {
  getActiveCategories,
  getCategoryContent,
} = require("../../controllers/category.controller");

// User / Public Category Routes (Read-Only)
router.get("/", getActiveCategories);
router.get("/:slug", getCategoryContent);

module.exports = router;
