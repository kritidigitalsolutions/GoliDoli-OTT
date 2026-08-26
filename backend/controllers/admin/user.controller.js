const User = require("../../models/user.model");
const Subscription = require("../../models/subscription.model");
const Watchlist = require("../../models/watchlist.model");
const SupportTicket = require("../../models/supportTicket.model");
const SupportMessage = require("../../models/supportMessage.model");
const Rating = require("../../models/rating.model");

const Interaction = require("../../models/interaction.model");
const Notification = require("../../models/notification.model");
const Voucher = require("../../models/voucher.model");


// ========================================
// GET ALL USERS
// ========================================
exports.getAllUsers = async (
    req,
    res
) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search || "";
        const subFilter = req.query.subFilter || "";

        // Build database query filter
        let dbQuery = {};
        if (search) {
            const searchRegex = new RegExp(search, "i");
            dbQuery = {
                $or: [
                    { name: searchRegex },
                    { email: searchRegex },
                    { phone: searchRegex }
                ]
            };
        }

        if (subFilter) {
            const activeSubscriptions = await Subscription.find({ status: "active" }).select("user").lean();
            const subscribedUserIds = activeSubscriptions.filter(s => s.user).map(s => s.user.toString());
            if (subFilter === "subscribed") {
                dbQuery._id = { $in: subscribedUserIds };
            } else if (subFilter === "unsubscribed") {
                dbQuery._id = { $nin: subscribedUserIds };
            }
        }

        const totalUsers = await User.countDocuments(dbQuery);
        const totalActive = await User.countDocuments({ status: { $ne: "Blocked" } });
        const totalBlocked = await User.countDocuments({ status: "Blocked" });

        const users = await User.find(dbQuery)
            .select("-__v")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const userIds = users.map(user => user._id);
        const subscriptions = await Subscription.find({
            user: { $in: userIds },
            status: "active"
        }).populate("plan");

        const usersWithPlans = users.map(user => {
            const activeSub = subscriptions.find(sub => sub.user.toString() === user._id.toString());
            return {
                ...user.toObject(),
                plan: activeSub && activeSub.plan ? activeSub.plan.name : "Free"
            };
        });

        res.status(200).json({
            success: true,
            total: totalUsers,
            active: totalActive,
            blocked: totalBlocked,
            page,
            limit,
            pages: Math.ceil(totalUsers / limit),
            count: usersWithPlans.length,
            users: usersWithPlans,
        });

    } catch (error) {
        console.error(
            "Get Users Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ========================================
// GET SINGLE USER
// ========================================
exports.getSingleUser = async (
    req,
    res
) => {
    try {
        const user = await User.findById(
            req.params.id
        ).select("-__v");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        res.status(200).json({
            success: true,
            user,
        });

    } catch (error) {
        console.error(
            "Get Single User Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ========================================
// DELETE USER
// ========================================
exports.deleteUser = async (
    req,
    res
) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // 1. Delete user from User collection
        await User.findByIdAndDelete(userId);

        // 2. Cascade delete related collections:

        // Subscription
        await Subscription.deleteMany({ user: userId });

        // Watchlist
        await Watchlist.deleteMany({ user: userId });

        // Support tickets and messages
        const supportTickets = await SupportTicket.find({ user: userId });
        const ticketIds = supportTickets.map(t => t._id);
        await SupportMessage.deleteMany({ ticket: { $in: ticketIds } });
        await SupportTicket.deleteMany({ user: userId });

        // Ratings
        await Rating.deleteMany({ user: userId });



        // Interactions (likes, dislikes, follows, bookmarks)
        await Interaction.deleteMany({ user: userId });



        // Notifications
        await Notification.deleteMany({ targetUser: userId });
        await Notification.updateMany(
            {},
            {
                $pull: {
                    readBy: { user: userId },
                    deletedBy: { user: userId }
                }
            }
        );

        // Unlink/Reset Voucher usedBy field
        await Voucher.updateMany(
            { usedBy: userId },
            { $set: { usedBy: null, isUsed: false } }
        );

        res.status(200).json({
            success: true,
            message: "User and all related data deleted successfully",
        });

    } catch (error) {
        console.error(
            "Delete User Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error during cascade deletion",
        });
    }
};

exports.getRegistrationStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const [todayCount, yesterdayCount, totalCount] = await Promise.all([
            User.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
            User.countDocuments({ createdAt: { $gte: yesterday, $lt: today } }),
            User.countDocuments({}),
        ]);

        res.status(200).json({
            success: true,
            data: {
                todayRegistration: todayCount,
                yesterdayRegistration: yesterdayCount,
                totalRegistration: totalCount,
            },
        });
    } catch (error) {
        console.error("Get Registration Stats Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

exports.getUserGrowth = async (req, res) => {
    try {
        const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const growthData = [];

        // Loop for the last 7 days
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);

            const nextD = new Date(d);
            nextD.setDate(nextD.getDate() + 1);

            const count = await User.countDocuments({
                createdAt: { $gte: d, $lt: nextD },
            });

            growthData.push({
                day: daysOfWeek[d.getDay()],
                users: count,
            });
        }

        res.status(200).json({
            success: true,
            data: growthData,
        });
    } catch (error) {
        console.error("Get User Growth Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// ========================================
// TOGGLE BLOCK USER STATUS
// ========================================
exports.toggleBlockUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        user.status = user.status === "Blocked" ? "Active" : "Blocked";
        await user.save();

        res.status(200).json({
            success: true,
            message: `User ${user.status === "Blocked" ? "blocked" : "unblocked"} successfully`,
            user,
        });
    } catch (error) {
        console.error("Toggle Block User Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};
