const express = require("express");
const router = express.Router();
const { isAuth } = require("../../middlewares/auth.middleware");
const { playEpisode } = require("../../controllers/user/audioEpisode.controller");

router.get("/:id/play", isAuth, playEpisode);

module.exports = router;
