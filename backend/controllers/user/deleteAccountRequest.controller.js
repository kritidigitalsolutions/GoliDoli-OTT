const User = require("../../models/user.model");
const Subscription = require("../../models/subscription.model");
const DeleteAccountRequest = require("../../models/deleteAccountRequest.model");

const VALID_REASON_CATEGORIES = [
  "Privacy Concerns",
  "No Longer Using",
  "Too Expensive",
  "Found Alternative",
  "Security Concerns",
  "Accidental Submission",
  "App Performance",
  "Billing Dispute",
  "Other",
];

/**
 * Mobile App Endpoint: Submit an account deletion request
 * POST /api/user/delete-account-request
 * Authentication: Bearer JWT (isAuth middleware)
 */
exports.submitDeleteAccountRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found",
      });
    }

    // 1. Check for existing pending request to prevent duplicates
    const existingPending = await DeleteAccountRequest.findOne({
      user: userId,
      status: "Pending",
    });

    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: "You already have a pending account deletion request under review.",
        request: existingPending,
      });
    }

    // 2. Snapshot current subscription tier
    const activeSub = await Subscription.findOne({
      user: userId,
      status: "active",
    }).populate("plan");
    const planName = activeSub?.plan?.name || "Free";

    // 3. Normalize reason category
    let rawCategory = req.body.reasonCategory || req.body.reason || "Other";
    let reasonCategory = VALID_REASON_CATEGORIES.includes(rawCategory)
      ? rawCategory
      : "Other";

    const reasonDetails =
      typeof req.body.reasonDetails === "string"
        ? req.body.reasonDetails.trim()
        : typeof req.body.details === "string"
        ? req.body.details.trim()
        : "";

    // 4. Create immutable request snapshot
    const request = await DeleteAccountRequest.create({
      user: user._id,
      userId: user._id.toString(),
      userName: user.name || "User",
      userEmail: user.email || "",
      userPhone: user.phone || "",
      userAvatar: user.profileImage || "",
      authProvider: user.authProvider || "PHONE",
      plan: planName,
      reasonCategory,
      reasonDetails,
      status: "Pending",
    });

    return res.status(201).json({
      success: true,
      message:
        "Account deletion request submitted successfully. It will be reviewed by our team.",
      request,
    });
  } catch (error) {
    console.error("Submit Account Deletion Request Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while submitting account deletion request",
    });
  }
};

/**
 * Mobile App Endpoint: Check current deletion request status
 * GET /api/user/delete-account-request
 * Authentication: Bearer JWT (isAuth middleware)
 */
exports.getMyDeletionRequestStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    // Retrieve most recent deletion request
    const request = await DeleteAccountRequest.findOne({ user: userId }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      hasRequest: Boolean(request),
      request: request || null,
    });
  } catch (error) {
    console.error("Get Deletion Request Status Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching deletion request status",
    });
  }
};

/**
 * Mobile App Endpoint: Cancel a pending deletion request
 * DELETE /api/user/delete-account-request
 * Authentication: Bearer JWT (isAuth middleware)
 */
exports.cancelMyDeletionRequest = async (req, res) => {
  try {
    const userId = req.user.id;

    const request = await DeleteAccountRequest.findOneAndDelete({
      user: userId,
      status: "Pending",
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "No pending account deletion request found to cancel",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Pending account deletion request has been cancelled.",
    });
  } catch (error) {
    console.error("Cancel Deletion Request Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while cancelling deletion request",
    });
  }
};
