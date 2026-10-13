const mongoose = require("mongoose");

const deleteAccountRequestSchema = new mongoose.Schema(
  {
    // Reference to User (may become null/unpopulated once user account is cascade-deleted)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Permanent snapshots captured at the exact moment of request submission
    // to preserve a full audit trail even after the user account is purged
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userName: {
      type: String,
      default: "User",
      trim: true,
    },
    userEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    userPhone: {
      type: String,
      trim: true,
      default: "",
    },
    userAvatar: {
      type: String,
      default: "",
    },
    authProvider: {
      type: String,
      default: "PHONE",
    },
    plan: {
      type: String,
      default: "Free",
    },

    // Deletion reason details provided by user via mobile app
    reasonCategory: {
      type: String,
      enum: [
        "Privacy Concerns",
        "No Longer Using",
        "Too Expensive",
        "Found Alternative",
        "Security Concerns",
        "Accidental Submission",
        "App Performance",
        "Billing Dispute",
        "Other",
      ],
      default: "Other",
      index: true,
    },
    reasonDetails: {
      type: String,
      trim: true,
      default: "",
    },

    // Lifecycle status of the deletion request
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
      index: true,
    },

    // Admin review audit trail
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    reviewedByName: {
      type: String,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    adminRemarks: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast administrative querying, filtering, and reporting
deleteAccountRequestSchema.index({ status: 1, createdAt: -1 });
deleteAccountRequestSchema.index({ userId: 1, status: 1 });

module.exports =
  mongoose.models.DeleteAccountRequest ||
  mongoose.model("DeleteAccountRequest", deleteAccountRequestSchema);
