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
                },
              },
            ]);

          return (
            result[0]?.total || 0
          );
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
// 📋 GET ALL SUBSCRIPTIONS
// =====================================================
exports.getAllSubscriptions =
  async (req, res) => {
    try {

      // auto cleanup
      await expireOldSubscriptions();

      const subscriptions =
        await Subscription.find()
          .populate(
            "user",
            "name email phone profileImage"
          )
          .populate("plan")
          .sort({
            createdAt: -1,
          });

      res.status(200).json({
        success: true,
        subscriptions,
      });

    } catch (error) {

      console.error(
        "Get All Subscriptions Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message,
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