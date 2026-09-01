const User = require("../models/user.model");
const jwt = require("jsonwebtoken");

const formatIndianPhone = (phone) => {
  const cleaned = String(phone).replace(/\D/g, "");
  if (cleaned.length === 10) return "+91" + cleaned;
  if (cleaned.length === 12 && cleaned.startsWith("91")) return "+" + cleaned;
  return phone;
};

const generateUserToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role || "USER",
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || "7d",
    }
  );
};


// ========================================
// GET PROFILE
// ========================================
exports.getProfile = async (
  req,
  res
) => {
  try {
    const user = await User.findById(
      req.user.id
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
      "Get Profile Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// ========================================
// COMPLETE PROFILE
// ========================================
exports.completeProfile = async (
  req,
  res
) => {
  try {
    const {
      name,
      email,
      phone,
      interests,
    } = { ...req.query, ...req.body };

    let user = null;

    // Try to retrieve token and verify user ID if token is provided
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        user = await User.findById(decoded.id);
      } catch (err) {
        // Invalid token
      }
    }

    // If no user by token, but phone is provided
    if (!user && phone) {
      const normalizedPhone = formatIndianPhone(phone);
      user = await User.findOne({ phone: normalizedPhone });
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found. Please verify OTP first.",
      });
    }

    // BLOCK SECOND TIME COMPLETION
    if (user.profileComplete) {
      return res.status(400).json({
        success: false,
        message: "Profile already completed. Use update-profile API.",
      });
    }

    // Validate name (must have at least 3 characters)
    if (!name || name.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Name must have at least 3 characters",
      });
    }

    // Validate email if provided
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email address",
        });
      }
      const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingEmail && existingEmail._id.toString() !== user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: "Email address is already in use",
        });
      }
      user.email = email.toLowerCase().trim();
    }

    // Handle interests (optional array)
    let interestsArray = [];
    if (interests) {
      if (Array.isArray(interests)) {
        interestsArray = interests;
      } else if (typeof interests === "string") {
        try {
          interestsArray = JSON.parse(interests);
        } catch {
          interestsArray = interests.split(",").map((i) => i.trim()).filter(Boolean);
        }
      }
      user.interests = interestsArray;
    }

  


    // Save user name
    user.name = name.trim();

    // handle profile image
    if (req.file) {
      user.profileImage = req.file.cdnUrl || req.file.path;
    } else {
      user.profileImage = user.profileImage || "";
    }

    user.profileComplete = true;

    await user.save();

    const appToken = generateUserToken(user);

    res.cookie("token", appToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({
      success: true,
      message: "Profile completed successfully",
      token: appToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        interests: user.interests,
        profileImage: user.profileImage,
        profileComplete: user.profileComplete,
        role: user.role || "USER",
      },
    });

  } catch (error) {
    console.error("Complete Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// UPDATE PROFILE
// ========================================
exports.updateProfile = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      interests,
    } = { ...req.query, ...req.body };

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ========================================
    // UPDATE NAME
    // ========================================
    if (name !== undefined) {
      if (!name || name.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: "Name must have at least 3 characters",
        });
      }

      user.name = name.trim();
    }

    // ========================================
    // UPDATE EMAIL
    // ========================================
    if (email !== undefined) {
      const trimmedEmail = email.trim();

      if (trimmedEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(trimmedEmail)) {
          return res.status(400).json({
            success: false,
            message: "Please enter a valid email address",
          });
        }

        const existingEmail = await User.findOne({
          email: trimmedEmail.toLowerCase(),
        });

        if (
          existingEmail &&
          existingEmail._id.toString() !== user._id.toString()
        ) {
          return res.status(400).json({
            success: false,
            message: "Email address is already in use",
          });
        }

        user.email = trimmedEmail.toLowerCase();
      } else {
        user.email = undefined;
      }
    }

    // ========================================
    // UPDATE PHONE
    // ========================================
    if (phone !== undefined) {
      const formattedPhone = formatIndianPhone(phone);

      const existingPhone = await User.findOne({
        phone: formattedPhone,
      });

      if (
        existingPhone &&
        existingPhone._id.toString() !== user._id.toString()
      ) {
        return res.status(400).json({
          success: false,
          message: "Phone number is already in use",
        });
      }

      user.phone = formattedPhone;
    }

    // ========================================
    // UPDATE INTERESTS
    // ========================================
    if (interests) {
      let interestsArray = interests;

      if (typeof interests === "string") {
        try {
          interestsArray = JSON.parse(interests);
        } catch {
          interestsArray = interests
            .split(",")
            .map((i) => i.trim())
            .filter(Boolean);
        }
      }

      if (Array.isArray(interestsArray)) {
        user.interests = interestsArray;
      }
    }

    // ========================================
    // UPDATE PROFILE IMAGE
    // ========================================
    if (req.file) {
      user.profileImage = req.file.cdnUrl || req.file.path;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        interests: user.interests,
        profileImage: user.profileImage,
        profileComplete: user.profileComplete,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("Update Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// SAVE FCM TOKEN
// ========================================
exports.saveFcmToken = async (req, res) => {
  try {
    const rawToken = req.body.fcmToken || req.body.token;
    const fcmToken =
      typeof rawToken === "string"
        ? rawToken.trim()
        : "";

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: "FCM token is required",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await User.updateMany(
      {
        _id: { $ne: user._id },
        fcmToken,
      },
      {
        $unset: {
          fcmToken: "",
          fcmTokenUpdatedAt: "",
        },
      }
    );

    user.fcmToken = fcmToken;
    user.fcmTokenUpdatedAt = new Date();

    await user.save();

    res.status(200).json({
      success: true,
      message: "FCM token connected to user successfully",
      userId: user._id,
      hasFcmToken: true,
    });
  } catch (error) {
    console.error("Save FCM Token Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// GET PROFILE STATS
// ========================================
exports.getProfileStats = async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid User ID",
      });
    }

    const User = require("../models/user.model");
    const Interaction = require("../models/interaction.model");

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }




    // 4. followers: follow interactions targetting this userId
    const followers = await Interaction.countDocuments({
      contentId: userId,
      contentType: "user",
      type: "follow",
    });

    // 5. following: follow interactions initiated by this userId
    const following = await Interaction.countDocuments({
      user: userId,
      contentType: "user",
      type: "follow",
    });

    return res.status(200).json({
      success: true,
      followers,
      following,
    });
  } catch (error) {
    console.error("Get Profile Stats Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
