const Notification = require("../../models/notification.model");
const User = require("../../models/user.model");
const Subscription = require("../../models/subscription.model");
const { sendPushNotification } = require("../../utils/fcm.service");

/* ─────────────────────────────────────────────────────────────
   Helper: resolve target users for a given sendTo value
───────────────────────────────────────────────────────────── */
const resolveTargetUsers = async (sendTo, targetUser) => {
  const now = new Date();

  switch (sendTo) {
    case "SPECIFIC_USER": {
      const users = await User.find({
        _id: targetUser,
        fcmToken: { $type: "string", $ne: "" },
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
        fcmToken: { $type: "string", $ne: "" },
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
        fcmToken: { $type: "string", $ne: "" },
      }).select("_id fcmToken");
      return { users, targetUserType: "NON_SUBSCRIBERS", targetUserId: null };
    }

    case "EXPIRING_SOON": {
      // Users whose subscription expires within the next 7 days
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const expiringSoonIds = await Subscription.distinct("user", {
        status: "active",
        endDate: { $gte: now, $lte: sevenDaysLater },
      });
      const users = await User.find({
        _id: { $in: expiringSoonIds },
        fcmToken: { $type: "string", $ne: "" },
      }).select("_id fcmToken");
      return { users, targetUserType: "EXPIRING_SOON", targetUserId: null };
    }

    default: {
      // ALL
      const users = await User.find({
        fcmToken: { $type: "string", $ne: "" },
      }).select("_id fcmToken");
      return { users, targetUserType: "ALL", targetUserId: null };
    }
  }
};

/* ─────────────────────────────────────────────────────────────
   Helper: send FCM pushes in parallel batches of 100
───────────────────────────────────────────────────────────── */
const sendPushBatch = async (users, title, message, type, actionUrl, notificationId) => {
  const BATCH_SIZE = 100;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map((user) =>
        sendPushNotification({
          token: user.fcmToken,
          title,
          body: message,
          data: {
            notificationId: notificationId.toString(),
            type: type || "GENERAL",
            actionUrl: actionUrl || "",
          },
        })
      )
    );

    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value?.success) sent++;
      else failed++;
    });
  }

  return { sent, failed };
};

/* ─────────────────────────────────────────────────────────────
   POST /admin/notifications/send
───────────────────────────────────────────────────────────── */
exports.sendNotification = async (req, res) => {
  try {
    const { title, message, type, sendTo, targetUser, actionUrl } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required",
      });
    }

    // Resolve users + payload targeting fields
    const { users, targetUserType, targetUserId } = await resolveTargetUsers(
      sendTo,
      targetUser
    );

    const notification = await Notification.create({
      title,
      message,
      type: type || "GENERAL",
      metadata: { actionUrl },
      createdBy: req.user.id,
      sentAt: new Date(),
      targetUser: targetUserId || null,
      targetUserType: targetUserType || "ALL",
    });

    // Send FCM pushes in parallel batches
    const { sent, failed } = await sendPushBatch(
      users,
      title,
      message,
      type,
      actionUrl,
      notification._id
    );

    return res.status(201).json({
      success: true,
      message: "Notification sent successfully",
      data: notification,
      pushReport: {
        totalUsers: users.length,
        sent,
        failed,
        audience: targetUserType || "SPECIFIC_USER",
      },
    });
  } catch (error) {
    console.error("sendNotification error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /admin/notifications
───────────────────────────────────────────────────────────── */
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = "" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { isActive: true };
    if (search) {
      query.$or = [
        { title:   { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
      ];
    }

    const [data, total] = await Promise.all([
      Notification.find(query)
        .populate("targetUser", "name email phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Notification.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        currentPage: parseInt(page),
        totalPages:  Math.ceil(total / parseInt(limit)),
        total,
      },
    });
  } catch (error) {
    console.error("getNotifications error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   DELETE /admin/notifications/:id
   Soft-deletes by setting isActive = false
───────────────────────────────────────────────────────────── */
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { returnDocument: 'after' }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification archived successfully",
    });
  } catch (error) {
    console.error("deleteNotification error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   PATCH /admin/notifications/:id/read
───────────────────────────────────────────────────────────── */
exports.markAsRead = async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(
      req.params.id,
      {
        isRead: true,
        readAt: new Date(),
        $addToSet: {
          readBy: { user: req.user.id, readAt: new Date() },
        },
      },
      { returnDocument: 'after' }
    );

    if (!notif) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    return res.status(200).json({ success: true, data: notif });
  } catch (error) {
    console.error("markAsRead error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /admin/notifications/unread-count

   For admin panel: counts personal (targetUser != null) notifications
   that haven't been marked read. Broadcast isRead is always false
   so we exclude them to avoid inflated counts.
───────────────────────────────────────────────────────────── */
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      isActive: true,
      isRead: false,
      targetUser: { $ne: null }, // Only personal notifications — broadcast isRead is meaningless
    });

    // Also count total active notifications (useful for the badge)
    const total = await Notification.countDocuments({ isActive: true });

    return res.status(200).json({ success: true, count, total });
  } catch (error) {
    console.error("getUnreadCount error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
