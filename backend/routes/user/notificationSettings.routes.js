const express = require("express");
const router = express.Router();
const { isAuth } = require("../../middlewares/auth.middleware");
const {
    getNotificationSettings,
    updateNotificationSettings
} = require("../../controllers/notificationSettings.controller");

// GET /api/notification-settings   → returns user's notification settings
router.get("/", isAuth, getNotificationSettings);

// PUT /api/notification-settings   → updates user's notification settings
router.patch("/", isAuth, updateNotificationSettings);

module.exports = router;
