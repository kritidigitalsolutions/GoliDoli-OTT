const express = require("express");
const router = express.Router();

const { createVideo } = require("../../services/bunnyStream.service");

router.get("/test-stream", async (req, res) => {
  try {
    const video = await createVideo("Test Movie");

    return res.json({
      success: true,
      video,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;