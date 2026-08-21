const User = require("../models/user.model");

const VALID_CATEGORIES = [
    "newEpisodes",
    "newMovies",
    "recommendations",
    "downloads",
    "continueWatching",
    "subscriptionAlerts",
    "promotionalOffers"
];

/**
 * Get notification settings for user
 * GET /api/notification-settings
 */
const getNotificationSettings = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select("notificationSettings").lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Schema defaults are set, but fallback just in case
        const settings = user.notificationSettings || {
            newEpisodes: true,
            newMovies: true,
            recommendations: true,
            downloads: true,
            continueWatching: false,
            subscriptionAlerts: true,
            promotionalOffers: true
        };

        res.status(200).json({
            success: true,
            notificationSettings: settings
        });
    } catch (error) {
        console.error("Get notification settings error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch notification settings",
            error: error.message
        });
    }
};

/**
 * Update notification settings for user
 * PUT /api/notification-settings
 */
const updateNotificationSettings = async (req, res) => {
    try {
        const userId = req.user.id;
        const updates = req.body;

        if (!updates || typeof updates !== "object") {
            return res.status(400).json({
                success: false,
                message: "Invalid request body"
            });
        }

        const updateFields = {};
        let hasValidKey = false;

        for (const key of Object.keys(updates)) {
            if (VALID_CATEGORIES.includes(key)) {
                if (typeof updates[key] !== "boolean") {
                    return res.status(400).json({
                        success: false,
                        message: `Value for field '${key}' must be a boolean`
                    });
                }
                updateFields[`notificationSettings.${key}`] = updates[key];
                hasValidKey = true;
            }
        }

        if (!hasValidKey) {
            return res.status(400).json({
                success: false,
                message: "At least one valid notification setting key must be provided"
            });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateFields },
            { returnDocument: "after", select: "notificationSettings" }
        ).lean();

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Notification settings updated successfully",
            notificationSettings: updatedUser.notificationSettings
        });
    } catch (error) {
        console.error("Update notification settings error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update notification settings",
            error: error.message
        });
    }
};

module.exports = {
    getNotificationSettings,
    updateNotificationSettings
};
