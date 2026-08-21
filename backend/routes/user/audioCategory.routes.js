const express = require("express");
const router = express.Router();
const { getActiveCategories } = require("../../controllers/user/audioCategory.controller");

router.get("/", getActiveCategories);

module.exports = router;
