const mongoose = require("mongoose");
const User = require("../models/user.model");
const Subscription = require("../models/subscription.model");
const Watchlist = require("../models/watchlist.model");
const SupportTicket = require("../models/supportTicket.model");
const SupportMessage = require("../models/supportMessage.model");
const Rating = require("../models/rating.model");
const Interaction = require("../models/interaction.model");
const Notification = require("../models/notification.model");
const Voucher = require("../models/voucher.model");
const OTP = require("../models/user.otp.model");
const WatchProgress = require("../models/watchProgress.model");
const AudioProgress = require("../models/audioProgress.model");
const Comment = require("../models/comment.model");
const AIReelWatch = require("../models/aiReelWatch.model");
const AIReelUserState = require("../models/aiReelUserState.model");
const AIReelFeedSession = require("../models/aiReelFeedSession.model");

/**
 * Reusable cascade deletion service for user accounts and all associated data.
 * Extracted from admin user.controller.js to guarantee consistent, safe, and
 * idempotent deletion across both direct admin deletion and approved deletion requests.
 *
 * @param {string|mongoose.Types.ObjectId} userId - The user ID to delete
 * @returns {Promise<{ success: boolean, notFound?: boolean, message?: string }>}
 */
async function cascadeDeleteUser(userId) {
  try {
    if (!userId) {
      return { success: false, message: "User ID is required for deletion" };
    }

    const user = await User.findById(userId);

    // If user is already removed from User collection, perform safety cleanup on relations
    if (!user) {
      // Clean up orphaned relations if any exist
      await Promise.allSettled([
        Subscription.deleteMany({ user: userId }),
        Watchlist.deleteMany({ user: userId }),
        Rating.deleteMany({ user: userId }),
        Interaction.deleteMany({ user: userId }),
        Notification.deleteMany({ targetUser: userId }),
        WatchProgress.deleteMany({ user: userId }),
        AudioProgress.deleteMany({ user: userId }),
        Comment.deleteMany({ user: userId }),
        AIReelWatch.deleteMany({ user: userId }),
        AIReelUserState.deleteMany({ user: userId }),
        AIReelFeedSession.deleteMany({ user: userId }),
      ]);

      return {
        success: true,
        alreadyDeleted: true,
        message: "User was already removed; orphaned relations cleaned up.",
      };
    }

    // 1. Delete user from User collection
    await User.findByIdAndDelete(userId);

    // 2. Cascade delete related collections safely
    const cleanupTasks = [
      // Subscriptions
      Subscription.deleteMany({ user: userId }),

      // Watchlist
      Watchlist.deleteMany({ user: userId }),

      // Ratings
      Rating.deleteMany({ user: userId }),

      // Interactions (likes, bookmarks, follows)
      Interaction.deleteMany({ user: userId }),

      // Direct notifications
      Notification.deleteMany({ targetUser: userId }),

      // Broadcast notifications read/deleted markers
      Notification.updateMany(
        {},
        {
          $pull: {
            readBy: { user: userId },
            deletedBy: { user: userId },
          },
        }
      ),

      // Video watch progress
      WatchProgress.deleteMany({ user: userId }),

      // Audio story progress
      AudioProgress.deleteMany({ user: userId }),

      // Comments
      Comment.deleteMany({ user: userId }),

      // AI Reels watch history & state
      AIReelWatch.deleteMany({ user: userId }),
      AIReelUserState.deleteMany({ user: userId }),
      AIReelFeedSession.deleteMany({ user: userId }),

      // Unlink vouchers used by this user
      Voucher.updateMany(
        { usedBy: userId },
        { $set: { usedBy: null, isUsed: false } }
      ),
    ];

    // Support tickets and nested messages
    const supportTickets = await SupportTicket.find({ user: userId }).select("_id");
    const ticketIds = supportTickets.map((t) => t._id);
    if (ticketIds.length > 0) {
      cleanupTasks.push(SupportMessage.deleteMany({ ticket: { $in: ticketIds } }));
      cleanupTasks.push(SupportTicket.deleteMany({ user: userId }));
    }

    // OTP records
    if (user.phone) {
      cleanupTasks.push(OTP.deleteMany({ phone: user.phone }));
    }

    await Promise.all(cleanupTasks);

    return {
      success: true,
      message: "User and all related data deleted successfully",
    };
  } catch (error) {
    console.error("Cascade Delete User Error:", error);
    throw error;
  }
}

module.exports = {
  cascadeDeleteUser,
};
