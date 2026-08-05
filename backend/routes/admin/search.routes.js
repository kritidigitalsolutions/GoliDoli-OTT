const express = require("express");
const router = express.Router();
const { globalSearch } = require("../../controllers/admin/search.controller");
const { isAdmin } = require("../../middlewares/admin.middleware");

router.get("/", isAdmin, globalSearch);

module.exports = router;