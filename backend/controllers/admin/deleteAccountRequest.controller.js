const mongoose = require("mongoose");
const DeleteAccountRequest = require("../../models/deleteAccountRequest.model");
const Admin = require("../../models/admin.model");
const { cascadeDeleteUser } = require("../../services/userDeletion.service");

// =====================================================
// GET ALL ACCOUNT DELETION REQUESTS (PAGINATED & FILTERED)
// =====================================================
exports.getAllDeleteRequests = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

    const search = (req.query.search || "").trim();
    const status = (req.query.status || "").trim();
    const dateFilter = (req.query.dateFilter || "all").trim();
    const reasonCategory = (req.query.reasonCategory || "all").trim();

    // 1. Build Query
    const query = {};

    // Status filter
    if (status && status !== "All") {
      query.status = status;
    }

    // Reason category filter
    if (reasonCategory && reasonCategory !== "all") {
      query.reasonCategory = reasonCategory;
    }

    // Date range filter
    if (dateFilter !== "all") {
      const now = new Date();
      if (dateFilter === "today") {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        query.createdAt = { $gte: startOfDay };
      } else if (dateFilter === "this_week") {
        const pastWeek = new Date();
        pastWeek.setDate(now.getDate() - 7);
        query.createdAt = { $gte: pastWeek };
      } else if (dateFilter === "this_month") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        query.createdAt = { $gte: startOfMonth };
      }
    }

    // Search filter across name, email, phone, userId, requestId
    if (search) {
      const searchRegex = new RegExp(search, "i");
      const orClauses = [
        { userName: searchRegex },
        { userEmail: searchRegex },
        { userPhone: searchRegex },
        { userId: searchRegex },
      ];

      if (mongoose.Types.ObjectId.isValid(search)) {
        orClauses.push({ _id: new mongoose.Types.ObjectId(search) });
      }

      query.$or = orClauses;
    }

    // 2. Fetch requests and calculate accurate database counts in parallel
    const [requests, totalFiltered, totalAll, pendingCount, approvedCount, rejectedCount] =
      await Promise.all([
        DeleteAccountRequest.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        DeleteAccountRequest.countDocuments(query),
        DeleteAccountRequest.countDocuments(),
        DeleteAccountRequest.countDocuments({ status: "Pending" }),
        DeleteAccountRequest.countDocuments({ status: "Approved" }),
        DeleteAccountRequest.countDocuments({ status: "Rejected" }),
      ]);

    const totalPages = Math.ceil(totalFiltered / limit) || 1;

    return res.status(200).json({
      success: true,
      counts: {
        total: totalAll,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
      },
      pagination: {
        page,
        limit,
        totalPages,
        totalCount: totalFiltered,
      },
      requests,
    });
  } catch (error) {
    console.error("Get All Delete Requests Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching account deletion requests",
    });
  }
};

// =====================================================
// GET SINGLE ACCOUNT DELETION REQUEST
// =====================================================
exports.getSingleDeleteRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid deletion request ID",
      });
    }

    const request = await DeleteAccountRequest.findById(id).lean();

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Account deletion request not found",
      });
    }

    return res.status(200).json({
      success: true,
      request,
    });
  } catch (error) {
    console.error("Get Single Delete Request Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching request details",
    });
  }
};

// =====================================================
// APPROVE ACCOUNT DELETION REQUEST (CASCADE DELETE USER)
// =====================================================
exports.approveDeleteRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid deletion request ID",
      });
    }

    // Determine reviewing admin identity
    let adminName = "Admin";
    if (req.user?.id) {
      const adminDoc = await Admin.findById(req.user.id).select("name");
      if (adminDoc?.name) {
        adminName = adminDoc.name;
      }
    }

    const adminRemarks =
      typeof req.body.adminRemarks === "string" && req.body.adminRemarks.trim()
        ? req.body.adminRemarks.trim()
        : "Approved by Admin";

    // 1. Atomic state transition: Ensure the request is currently "Pending"
    const updatedRequest = await DeleteAccountRequest.findOneAndUpdate(
      { _id: id, status: "Pending" },
      {
        $set: {
          status: "Approved",
          reviewedBy: req.user?.id || null,
          reviewedByName: adminName,
          reviewedAt: new Date(),
          adminRemarks,
        },
      },
      { new: true }
    );

    // If no document was modified, investigate reason (not found vs already reviewed)
    if (!updatedRequest) {
      const existing = await DeleteAccountRequest.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Account deletion request not found",
        });
      }

      return res.status(400).json({
        success: false,
        message: `This request has already been ${existing.status.toLowerCase()} and cannot be approved again.`,
        request: existing,
      });
    }

    // 2. Cascade delete the user's account and all associated platform data
    const targetUserId = updatedRequest.user || updatedRequest.userId;
    try {
      await cascadeDeleteUser(targetUserId);
    } catch (cascadeError) {
      console.error("Cascade deletion error during request approval:", cascadeError);
      // Even if cascade hit an issue, record is saved; return clear notice
      return res.status(500).json({
        success: false,
        message:
          "Request marked Approved, but an error occurred during account cascade deletion. Please check server logs.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Account deletion request approved and user account data deleted successfully.",
      request: updatedRequest,
    });
  } catch (error) {
    console.error("Approve Delete Request Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while approving account deletion request",
    });
  }
};

// =====================================================
// REJECT ACCOUNT DELETION REQUEST
// =====================================================
exports.rejectDeleteRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid deletion request ID",
      });
    }

    // Determine reviewing admin identity
    let adminName = "Admin";
    if (req.user?.id) {
      const adminDoc = await Admin.findById(req.user.id).select("name");
      if (adminDoc?.name) {
        adminName = adminDoc.name;
      }
    }

    const adminRemarks =
      typeof req.body.adminRemarks === "string" && req.body.adminRemarks.trim()
        ? req.body.adminRemarks.trim()
        : "Rejected by Admin";

    // 1. Atomic state transition: Ensure the request is currently "Pending"
    const updatedRequest = await DeleteAccountRequest.findOneAndUpdate(
      { _id: id, status: "Pending" },
      {
        $set: {
          status: "Rejected",
          reviewedBy: req.user?.id || null,
          reviewedByName: adminName,
          reviewedAt: new Date(),
          adminRemarks,
        },
      },
      { new: true }
    );

    // If no document was modified, check if not found or already reviewed
    if (!updatedRequest) {
      const existing = await DeleteAccountRequest.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Account deletion request not found",
        });
      }

      return res.status(400).json({
        success: false,
        message: `This request has already been ${existing.status.toLowerCase()} and cannot be rejected again.`,
        request: existing,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Account deletion request rejected successfully. User account remains active.",
      request: updatedRequest,
    });
  } catch (error) {
    console.error("Reject Delete Request Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while rejecting account deletion request",
    });
  }
};
