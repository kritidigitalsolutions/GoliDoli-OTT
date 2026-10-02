const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

/**
 * POST /api/auth/website-login
 * Authenticates website user using mobile app JWT passed in Authorization header.
 *
 * Headers:
 *   Authorization: Bearer <MOBILE_AUTH_TOKEN>
 *
 * Response:
 *   {
 *     "success": true,
 *     "message": "Website login successful",
 *     "token": "...",
 *     "user": {
 *       "id": "...",
 *       "name": "...",
 *       "email": "...",
 *       "phone": "...",
 *       "profileImage": "...",
 *       "role": "USER"
 *     }
 *   }
 */
exports.websiteLogin = async (req, res) => {
  try {
    // 1. Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    const token = authHeader.split(" ")[1]?.trim();
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    // 2. Verify token using existing JWT secret
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token has expired",
        });
      }
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    // 3. Find user in MongoDB User collection
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 4. Generate website authentication JWT using existing JWT configuration
    const websiteToken = jwt.sign(
      {
        id: user._id,
        role: user.role || "USER",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRE || "7d",
      }
    );

    // 5. Return exact expected JSON structure
    return res.status(200).json({
      success: true,
      message: "Website login successful",
      token: websiteToken,
      user: {
        id: user._id.toString(),
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        profileImage: user.profileImage || "",
        role: user.role || "USER",
      },
    });
  } catch (error) {
    console.error("Website login error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
