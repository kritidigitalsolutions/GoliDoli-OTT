const express = require("express");
const router = express.Router();
const {
  getLandingContent,
  getHomeContent,
  searchContent,
  getContentById,
} = require("../../controllers/content.controller");

router.get("/", getHomeContent);
router.get("/landing", getLandingContent);
router.get("/search", searchContent);
router.get("/:contentId", getContentById);

module.exports = router;
