const Subscription = require(
  "../../models/subscription.model"
);

const User = require(
  "../../models/user.model"
);


// =====================================================
// AUTO EXPIRE OLD SUBSCRIPTIONS
// =====================================================
const expireOldSubscriptions =
  async () => {

    await Subscription.updateMany(
      {
        status: "active",
        endDate: {
          $lt: new Date(),
        },
      },
      {
        $set: {
          status: "expired",
        },
      }
    );
  };


// =====================================================
// 💰 GET TOTAL REVENUE
// =====================================================
exports.getRevenue = async (
  req,
  res
) => {
  try {

    // auto cleanup
    await expireOldSubscriptions();

    const subscriptions =
      await Subscription.find();

    // count paid subscriptions only
    const validSubs =
      subscriptions.filter(
        (sub) =>
          (sub.amount || 0) > 0
      );

    const totalRevenue =
      validSubs.reduce(
        (sum, sub) => {
          return (
            sum +
            (sub.amount || 0)
          );
        },
        0
      );

    res.status(200).json({
      success: true,
      revenue: totalRevenue,
    });

  } catch (err) {

    console.error(
      "Get Revenue Error:",
      err
    );

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// =====================================================
// 📊 GET SUBSCRIPTION STATS
// =====================================================
exports.getSubscriptionStats =
  async (req, res) => {
    try {

      // auto cleanup
      await expireOldSubscriptions();

      const now = new Date();

      const [
        totalUsers,
        activeSubscriptionUsers,
        expiredSubscriptionCount,
      ] = await Promise.all([
        User.countDocuments(),

        Subscription.distinct(
          "user",
          {
            status: "active",
            endDate: {
              $gte: now,
            },
          }
        ),

        Subscription.countDocuments({
          status: "expired",
        }),
      ]);

      const totalSubscribedUsers =
        activeSubscriptionUsers.length;

      const totalNotSubscribedUsers =
        Math.max(
          totalUsers -
            totalSubscribedUsers,
          0
        );

      res.status(200).json({
        success: true,

        data: {
          totalSubscribedUsers,

          totalNotSubscribedUsers,

          expirySubscriptionCount:
            expiredSubscriptionCount,
        },
      });

    } catch (err) {

      console.error(
        "Subscription Stats Error:",
        err
      );

      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };


// =====================================================
// 💵 GET INCOME STATS
// =====================================================
exports.getIncomeStats =
  async (req, res) => {
    try {

      // auto cleanup
      await expireOldSubscriptions();

      const now = new Date();

      const startOfToday =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );

      const startOfTomorrow =
        new Date(startOfToday);

      startOfTomorrow.setDate(
        startOfTomorrow.getDate() + 1
      );

      const startOfYesterday =
        new Date(startOfToday);

      startOfYesterday.setDate(
        startOfYesterday.getDate() -
          1
      );

      const startOfWeek =
        new Date(startOfToday);

      const dayOfWeek =
        startOfToday.getDay();

      startOfWeek.setDate(
        startOfWeek.getDate() -
          dayOfWeek
      );

      const startOfMonth =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        );

      const startOfYear =
        new Date(
          now.getFullYear(),
          0,
          1
        );

      const sumAmount =
        async (match) => {

          const result =
            await Subscription.aggregate([
              {
                $match: match,
              },

              {
                $group: {
                  _id: null,

                  total: {
                    $sum: {
                      $ifNull: [
                        "$amount",
                        0,
                      ],
                    },
                  },
                  subsCount: { $sum: 1 },
                  users: { $addToSet: "$user" }
                },
              },
            ]);

          return {
            total: result[0]?.total || 0,
            subsCount: result[0]?.subsCount || 0,
            usersCount: result[0]?.users?.length || 0
          };
        };

      const baseMatch = {
        amount: { $gt: 0 },
      };

      const [
        todayIncome,
        yesterdayIncome,
        weeklyIncome,
        monthlyIncome,
        yearlyIncome,
        totalIncome,
      ] = await Promise.all([
        sumAmount({
          ...baseMatch,

          createdAt: {
            $gte: startOfToday,
            $lt: startOfTomorrow,
          },
        }),

        sumAmount({
          ...baseMatch,

          createdAt: {
            $gte:
              startOfYesterday,
            $lt: startOfToday,
          },
        }),

        sumAmount({
          ...baseMatch,

          createdAt: {
            $gte: startOfWeek,
            $lt: startOfTomorrow,
          },
        }),

        sumAmount({
          ...baseMatch,

          createdAt: {
            $gte: startOfMonth,
            $lt: startOfTomorrow,
          },
        }),

        sumAmount({
          ...baseMatch,

          createdAt: {
            $gte: startOfYear,
            $lt: startOfTomorrow,
          },
        }),

        sumAmount(baseMatch),
      ]);

      res.status(200).json({
        success: true,

        data: {
          todayIncome,
          yesterdayIncome,
          weeklyIncome,
          monthlyIncome,
          yearlyIncome,
          totalIncome,
        },
      });

    } catch (err) {

      console.error(
        "Income Stats Error:",
        err
      );

      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };


// =====================================================
// 📋 GET ALL SUBSCRIPTIONS & PAYMENT TRANSACTIONS
// =====================================================
exports.getAllSubscriptions = async (req, res) => {
  try {
    // auto cleanup
    await expireOldSubscriptions();

    const Payment = require("../../models/payment.model");

    // 1. Fetch all Payment records populated with user, plan, and linked subscription
    const payments = await Payment.find()
      .populate("user", "name email phone profileImage")
      .populate("plan")
      .populate("subscription")
      .sort({ createdAt: -1 });

    // 2. Fetch all legacy Subscription records
    const subscriptions = await Subscription.find()
      .populate("user", "name email phone profileImage")
      .populate("plan")
      .sort({ createdAt: -1 });

    const seenTxnIds = new Set();
    const formattedList = [];

    // Map all Payment records
    for (const p of payments) {
      if (p.clientTxnId) seenTxnIds.add(String(p.clientTxnId));
      if (p.paymentId) seenTxnIds.add(String(p.paymentId));

      const linkedSub = p.subscription;
      let displayStatus = p.status;
      if (p.status === "success") {
        displayStatus = linkedSub ? linkedSub.status : "active";
      }

      formattedList.push({
        _id: p._id,
        user: p.user,
        plan: p.plan,
        amount: p.amount,
        currency: p.currency || "INR",
        paymentGateway: p.paymentGateway || "SabPaisa",
        status: displayStatus,
        rawPaymentStatus: p.status,
        subscriptionId: p.clientTxnId,
        paymentId: p.paymentId || p.clientTxnId,
        clientTxnId: p.clientTxnId,
        merchantTxnId: p.merchantTxnId,
        startDate: linkedSub?.startDate || p.paidAt || p.createdAt,
        endDate: linkedSub?.endDate || null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        isPaymentRecord: true,
      });
    }

    // Add legacy subscriptions that don't have a matching payment record
    for (const s of subscriptions) {
      const txn = s.subscriptionId || s.paymentId;
      if (!txn || !seenTxnIds.has(String(txn))) {
        formattedList.push({
          _id: s._id,
          user: s.user,
          plan: s.plan,
          amount: s.amount,
          currency: s.currency || "INR",
          paymentGateway: "SabPaisa",
          status: s.status,
          rawPaymentStatus: s.status === "active" ? "success" : s.status,
          subscriptionId: s.subscriptionId || s.paymentId,
          paymentId: s.paymentId || s.subscriptionId,
          clientTxnId: s.subscriptionId,
          merchantTxnId: s.subscriptionId,
          startDate: s.startDate,
          endDate: s.endDate,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          isPaymentRecord: false,
        });
      }
    }

    // Sort newest first
    formattedList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      subscriptions: formattedList,
      total: formattedList.length,
    });
  } catch (error) {
    console.error("Get All Subscriptions Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// 💳 GET ALL PURE PAYMENT RECORDS (ADMIN)
// =====================================================
exports.getAllPayments = async (req, res) => {
  try {
    const Payment = require("../../models/payment.model");
    const payments = await Payment.find()
      .populate("user", "name email phone profileImage")
      .populate("plan")
      .populate("subscription")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      payments,
      total: payments.length,
    });
  } catch (err) {
    console.error("Get All Payments Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================================
// ⏳ EXTEND SUBSCRIPTION (ADMIN)
// =====================================================
exports.extendSubscription = async (req, res) => {
  try {
    const { days } = req.body;
    if (!days || isNaN(days) || Number(days) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid days to extend is required",
      });
    }

    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    const currentEndDate = new Date(subscription.endDate);
    const baseDate = currentEndDate > new Date() ? currentEndDate : new Date();
    baseDate.setDate(baseDate.getDate() + Number(days));

    subscription.endDate = baseDate;
    subscription.status = "active";
    await subscription.save();

    res.status(200).json({
      success: true,
      message: "Subscription extended successfully",
      subscription,
    });
  } catch (error) {
    console.error("Extend Subscription Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// 🔁 CANCEL SUBSCRIPTION (ADMIN)
// =====================================================
exports.cancelSubscriptionAdmin = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    subscription.status = "cancelled";
    await subscription.save();

    res.status(200).json({
      success: true,
      message: "Subscription cancelled successfully",
      subscription,
    });
  } catch (error) {
    console.error("Cancel Subscription Admin Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// ❌ DELETE SUBSCRIPTION (ADMIN)
// =====================================================
exports.deleteSubscriptionAdmin = async (req, res) => {
  try {
    const subscription = await Subscription.findByIdAndDelete(req.params.id);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Subscription deleted successfully",
    });
  } catch (error) {
    console.error("Delete Subscription Admin Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};