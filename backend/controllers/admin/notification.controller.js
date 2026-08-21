const Notification = require("../../models/notification.model");
const Movie = require("../../models/movie.model");
const Series = require("../../models/series.model");
const Plan = require("../../models/plan.model");
const { createAndDispatchNotification } = require("../../utils/notification.helper");

/* ─────────────────────────────────────────────────────────────
   POST /admin/notifications/send
───────────────────────────────────────────────────────────── */
exports.sendNotification = async (req, res) => {
  try {
    const {
      title,
      message,
      type,
      sendTo,
      targetUser,
      actionUrl,
      category,
      imageUrl,
      image,
      contentType,
      contentId,
      planId,
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required",
      });
    }

    let resolvedImageUrl = (imageUrl || image || "").trim() || null;
    let resolvedActionUrl = (actionUrl || "").trim() || null;
    let resolvedCategory = category || null;

    // Auto-resolve content or plan attachment if deep link / image not provided
    if (contentType === "movie" && contentId) {
      if (!resolvedCategory) resolvedCategory = "newMovies";
      if (!resolvedActionUrl) resolvedActionUrl = `golidoli://movies/id/${contentId}`;
      if (!resolvedImageUrl) {
        const movie = await Movie.findById(contentId).select("poster banner");
        if (movie) resolvedImageUrl = movie.poster || movie.banner || null;
      }
    } else if (contentType === "series" && contentId) {
      if (!resolvedCategory) resolvedCategory = "newEpisodes";
      if (!resolvedActionUrl) resolvedActionUrl = `golidoli://series/id/${contentId}`;
      if (!resolvedImageUrl) {
        const series = await Series.findById(contentId).select("poster banner");
        if (series) resolvedImageUrl = series.poster || series.banner || null;
      }
    } else if (contentType === "microdrama" && contentId) {
      if (!resolvedCategory) resolvedCategory = "recommendations";
      if (!resolvedActionUrl) resolvedActionUrl = `golidoli://microdramas/id/${contentId}`;
    } else if ((contentType === "plan" || planId) && (contentId || planId)) {
      if (!resolvedCategory) resolvedCategory = "subscriptionAlerts";
      const pId = planId || contentId;
      if (!resolvedActionUrl) resolvedActionUrl = `golidoli://plans/id/${pId}`;
    } else if (type === "PROMOTIONAL") {
      if (!resolvedCategory) resolvedCategory = "promotionalOffers";
    } else if (type === "SYSTEM") {
      if (!resolvedCategory) resolvedCategory = "subscriptionAlerts";
    }

    const result = await createAndDispatchNotification({
      title,
      message,
      type: type || "GENERAL",
      category: resolvedCategory,
      sendTo: sendTo || "ALL",
      targetUser: targetUser || null,
      imageUrl: resolvedImageUrl,
      actionUrl: resolvedActionUrl,
      contentId: contentId || null,
      contentType: contentType || null,
      planId: planId || null,
      createdBy: req.user?.id || null,
    });

    return res.status(201).json({
      success: true,
      message: "Notification sent successfully",
      data: result.notification,
      pushReport: result.pushReport,
    });
  } catch (error) {
    console.error("sendNotification error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send notification",
    });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /admin/notifications
───────────────────────────────────────────────────────────── */
exports.getNotifications = exports.getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .populate("targetUser", "name email phone")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    console.error("getAllNotifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /admin/notifications/unread-count
───────────────────────────────────────────────────────────── */
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ isRead: false });
    return res.status(200).json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    console.error("getUnreadCount error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get unread count",
    });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /admin/notifications/:id
───────────────────────────────────────────────────────────── */
exports.getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate("targetUser", "name email phone")
      .populate("createdBy", "name email");

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error("getNotificationById error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notification",
    });
  }
};

/* ─────────────────────────────────────────────────────────────
   PATCH /admin/notifications/:id/read
───────────────────────────────────────────────────────────── */
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { returnDocument: "after" }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    console.error("markAsRead error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update notification",
    });
  }
};

/* ─────────────────────────────────────────────────────────────
   PATCH /admin/notifications/mark-all-read
───────────────────────────────────────────────────────────── */
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("markAllAsRead error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update notifications",
    });
  }
};

/* ─────────────────────────────────────────────────────────────
   DELETE /admin/notifications/:id
───────────────────────────────────────────────────────────── */
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("deleteNotification error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete notification",
    });
  }
};
