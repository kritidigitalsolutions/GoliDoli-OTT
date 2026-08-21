const {
  admin,
  firebaseInitialized,
} = require("../config/firebase");

/**
 * Sends a real or mock push notification using Firebase Cloud Messaging.
 * @param {Object} params
 * @param {string} params.token - Target FCM token
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body content
 * @param {string} [params.imageUrl] - Optional banner/poster image URL
 * @param {Object} [params.data] - Optional metadata (converted to key-value strings)
 */
const sendPushNotification = async ({ token, title, body, imageUrl, data }) => {
  try {
    if (!token) {
      return { success: false, error: "No token provided" };
    }

    if (!firebaseInitialized) {
      console.log("-----------------------------------------");
      console.log("PUSH NOTIFICATION SENT (MOCK/STUB MODE)");
      console.log("To:", token);
      console.log("Title:", title);
      console.log("Body:", body);
      if (imageUrl) console.log("Image URL:", imageUrl);
      console.log("Data:", data);
      console.log("-----------------------------------------");
      return { success: true, messageId: `mock-id-${Date.now()}` };
    }

    // Convert data fields to strings, as FCM data payload requires string values
    const stringifiedData = {};
    if (data) {
      Object.keys(data).forEach((key) => {
        stringifiedData[key] = String(data[key]);
      });
    }
    if (imageUrl && !stringifiedData.imageUrl) {
      stringifiedData.imageUrl = String(imageUrl);
    }
    // Standard data keys for background handlers
    stringifiedData.title = String(title || "");
    stringifiedData.body = String(body || "");
    stringifiedData.message = String(body || "");
    stringifiedData.click_action = "FLUTTER_NOTIFICATION_CLICK";

    const message = {
      token,
      notification: {
        title,
        body,
        ...(imageUrl ? { imageUrl } : {}),
      },
      data: stringifiedData,
      android: {
        priority: "high",
        notification: {
          title,
          body,
          sound: "default",
          channelId: "high_importance_channel",
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
          ...(imageUrl ? { imageUrl } : {}),
        },
      },
      apns: {
        headers: {
          "apns-priority": "10",
        },
        payload: {
          aps: {
            alert: {
              title,
              body,
            },
            sound: "default",
            badge: 1,
            "mutable-content": 1,
          },
        },
        ...(imageUrl
          ? {
              fcmOptions: {
                imageUrl,
              },
            }
          : {}),
      },
    };

    const response = await admin.messaging().send(message);
    console.log("Successfully sent FCM notification:", response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error("FCM Send Error:", error);
    return { success: false, error: error.message };
  }
};

const sendPushIfAllowed = async ({ userId, category, token, title, body, imageUrl, data }) => {
  try {
    if (!userId) {
      return sendPushNotification({ token, title, body, imageUrl, data });
    }

    const User = require("../models/user.model");
    const user = await User.findById(userId).select("notificationSettings").lean();

    if (!user) {
      console.log(`[FCM Gating] User ${userId} not found. Skipping push.`);
      return { success: false, error: "User not found" };
    }

    const settings = user.notificationSettings || {};

    // If category is provided and explicitly set to false, skip sending the push notification
    if (category && settings[category] === false) {
      console.log(`[FCM Gating] Skipping notification for user ${userId}. Category '${category}' is turned OFF.`);
      return { success: true, skipped: true, message: `Category '${category}' disabled by user` };
    }

    return sendPushNotification({ token, title, body, imageUrl, data });
  } catch (error) {
    console.error("[FCM Gating] Error checking preferences:", error);
    return sendPushNotification({ token, title, body, imageUrl, data });
  }
};

module.exports = {
  sendPushNotification,
  sendPushIfAllowed,
};
