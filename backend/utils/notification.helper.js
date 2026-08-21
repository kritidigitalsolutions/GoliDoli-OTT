const Notification = require("../models/notification.model");
const User = require("../models/user.model");
const Subscription = require("../models/subscription.model");
const { sendPushIfAllowed } = require("./fcm.service");

/* ─────────────────────────────────────────────────────────────
   Helper: resolve target users for a given sendTo / targetUserType
───────────────────────────────────────────────────────────── */
const resolveTargetUsers = async (sendTo, targetUser) => {
  const now = new Date();
  const tokenFilter = { fcmToken: { $exists: true, $ne: null, $ne: "" } };

  switch (sendTo) {
    case "SPECIFIC_USER": {
      const users = await User.find({
        _id: targetUser,
        ...tokenFilter,
      }).select("_id fcmToken");
      return { users, targetUserType: null, targetUserId: targetUser };
    }

    case "SUBSCRIBERS": {
      const subscribedUserIds = await Subscription.distinct("user", {
        status: "active",
        endDate: { $gte: now },
      });
      const users = await User.find({
        _id: { $in: subscribedUserIds },
        ...tokenFilter,
      }).select("_id fcmToken");
      return { users, targetUserType: "SUBSCRIBERS", targetUserId: null };
    }

    case "NON_SUBSCRIBERS": {
      const subscribedUserIds = await Subscription.distinct("user", {
        status: "active",
        endDate: { $gte: now },
      });
      const users = await User.find({
        _id: { $nin: subscribedUserIds },
        ...tokenFilter,
      }).select("_id fcmToken");
      return { users, targetUserType: "NON_SUBSCRIBERS", targetUserId: null };
    }

    case "EXPIRING_SOON": {
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const expiringSoonIds = await Subscription.distinct("user", {
        status: "active",
        endDate: { $gte: now, $lte: sevenDaysLater },
      });
      const users = await User.find({
        _id: { $in: expiringSoonIds },
        ...tokenFilter,
      }).select("_id fcmToken");
      return { users, targetUserType: "EXPIRING_SOON", targetUserId: null };
    }

    default: {
      // ALL
      const users = await User.find(tokenFilter).select("_id fcmToken");
      return { users, targetUserType: "ALL", targetUserId: null };
    }
  }
};

/* ─────────────────────────────────────────────────────────────
   Helper: send FCM pushes in parallel batches of 100
───────────────────────────────────────────────────────────── */
const sendPushBatch = async (users, title, message, type, actionUrl, notificationId, category, imageUrl, contentType) => {
  const BATCH_SIZE = 100;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map((user) =>
        sendPushIfAllowed({
          userId: user._id,
          category,
          token: user.fcmToken,
          title,
          body: message,
          imageUrl: imageUrl || null,
          data: {
            notificationId: notificationId ? notificationId.toString() : "",
            type: type || "GENERAL",
            actionUrl: actionUrl || "",
            imageUrl: imageUrl || "",
            contentType: contentType || "other",
          },
        })
      )
    );

    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value?.success && !r.value?.skipped) sent++;
      else failed++;
    });
  }

  return { sent, failed };
};

/* ─────────────────────────────────────────────────────────────
   Central function: Create Notification DB record & dispatch FCM pushes
───────────────────────────────────────────────────────────── */
const createAndDispatchNotification = async ({
  title,
  message,
  type = "GENERAL",
  category = null,
  sendTo = "ALL",
  targetUser = null,
  imageUrl = null,
  actionUrl = null,
  contentId = null,
  contentType = null,
  planId = null,
  createdBy = null,
}) => {
  try {
    const resolvedImageUrl = (imageUrl || "").trim() || null;
    const resolvedActionUrl = (actionUrl || "").trim() || null;

    // Resolve recipient users
    const { users, targetUserType, targetUserId } = await resolveTargetUsers(
      sendTo,
      targetUser
    );

    const notification = await Notification.create({
      title,
      message,
      type: type || "GENERAL",
      category: category || null,
      imageUrl: resolvedImageUrl,
      metadata: {
        actionUrl: resolvedActionUrl,
        contentId: contentId || undefined,
        contentType: contentType || undefined,
        planId: planId || undefined,
      },
      createdBy: createdBy || null,
      sentAt: new Date(),
      targetUser: targetUserId || null,
      targetUserType: targetUserType || "ALL",
    });

    console.log(`[Notification Dispatch] Starting dispatch: "${title}" | Audience: ${sendTo} (${targetUserType || "SPECIFIC_USER"}) | Category: ${category || "none"} | Target Users with Tokens: ${users.length}`);

    // Send FCM pushes in background / batches
    const { sent, failed } = await sendPushBatch(
      users,
      title,
      message,
      type,
      resolvedActionUrl,
      notification._id,
      category || null,
      resolvedImageUrl,
      contentType || "other"
    );

    console.log(`[Notification Dispatch] Completed: Sent ${sent}, Failed ${failed} out of ${users.length} users.`);

    return {
      success: true,
      notification,
      pushReport: {
        totalUsers: users.length,
        sent,
        failed,
        audience: targetUserType || "SPECIFIC_USER",
      },
    };
  } catch (error) {
    console.error("createAndDispatchNotification error:", error);
    throw error;
  }
};

module.exports = {
  createAndDispatchNotification,
  resolveTargetUsers,
  sendPushBatch,
};
