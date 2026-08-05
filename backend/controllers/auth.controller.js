const jwt = require("jsonwebtoken");

const OTP = require("../models/user.otp.model");
const User = require("../models/user.model");

const { admin } = require("../config/firebase");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const axios = require("axios");

const DUMMY_OTP_PHONE = "+919999999999";
const DUMMY_OTP_CODE = "1234";

const isDummyOtpPhone = (phone) =>
  phone === DUMMY_OTP_PHONE;

// ========================================
// FORMAT INDIAN PHONE
// ========================================
const formatIndianPhone = (phone) => {
  const cleaned = String(phone).replace(
    /\D/g,
    ""
  );

  if (cleaned.length === 10) {
    return "+91" + cleaned;
  }

  if (
    cleaned.length === 12 &&
    cleaned.startsWith("91")
  ) {
    return "+" + cleaned;
  }

  return phone;
};
// ========================================
// SEND SMS
// ========================================
const sendSMS = async (phone, otp) => {
  try {
    const message =
      process.env.SMS_GH_OTP_TEXT.replace(
        "{{otp}}",
        otp
      );

    const response = await axios.get(
      "https://www.smsgatewayhub.com/api/mt/SendSMS",
      {
        params: {
          APIKey:
            process.env.SMS_GH_API_KEY,

          senderid:
            process.env.SMS_GH_SENDER_ID,

          channel: "2",

          DCS: 0,

          flashsms: 0,

          number: phone.replace(
            "+91",
            ""
          ),

          text: message,

          route:
            process.env.SMS_GH_ROUTE,

          EntityId:
            process.env.SMS_GH_ENTITY_ID,

          dlttemplateid:
            process.env.SMS_GH_DLT_TEMPLATE_ID,
        },
      }
    );

    console.log(
      "SMS RESPONSE:",
      response.data
    );

    return true;
  } catch (error) {
    console.error(
      "SMS ERROR:",
      error.response?.data ||
      error.message
    );

    return false;
  }
};

// ========================================
// GENERATE USER TOKEN
// ========================================
const generateUserToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn:
        process.env.JWT_EXPIRE || "7d",

      issuer: "roccoplay",
      audience: "roccoplay-app",
    }
  );
};

// ========================================
// SEND OTP
// ========================================
exports.sendOTP = async (req, res) => {
  try {
    const { phone } = { ...req.query, ...req.body };

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone is required",
      });
    }

    const normalizedPhone =
      formatIndianPhone(phone);

    // indian mobile validation
    const phoneRegex =
      /^\+91[6-9]\d{9}$/;

    if (
      !phoneRegex.test(normalizedPhone)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enter valid Indian mobile number",
      });
    }

    const isDummyPhone =
      isDummyOtpPhone(normalizedPhone);

    // rate limit
    if (!isDummyPhone) {
      const recentOtp =
        await OTP.findOne({
          phone: normalizedPhone,
          createdAt: {
            $gt: new Date(
              Date.now() - 60 * 1000
            ),
          },
        });

      if (recentOtp) {
        return res.status(429).json({
          success: false,
          message:
            "Please wait before requesting another OTP",
        });
      }
    }

    const otp = isDummyPhone
      ? DUMMY_OTP_CODE
      : Math.floor(
        1000 + Math.random() * 9000
      ).toString();

    if (isDummyPhone) {
      await User.updateOne(
        { phone: normalizedPhone },
        {
          $setOnInsert: {
            phone: normalizedPhone,
            role: "USER",
          },
        },
        { upsert: true }
      );
    } else {
      // remove old otp
      await OTP.deleteMany({
        phone: normalizedPhone,
      });

      // save new otp
      await OTP.create({
        phone: normalizedPhone,
        otp,
        expiresAt: new Date(
          Date.now() + 5 * 60 * 1000
        ),
      });
    }

    // check if user exists
    const user = await User.findOne({
      phone: normalizedPhone,
    });

    const isNewUser =
      !user || !user.profileComplete;

    // console/send otp
    // const smsSent =
    //   isDummyPhone ||
    //   (await sendSMS(
    //     normalizedPhone,
    //     otp
    //   ));

    // Even if SMS fails (e.g., API key is commented out in .env), we still succeed in dev mode
    console.log(
      `📱 [OTP SERVICE] OTP for ${normalizedPhone} is: ${otp}`
    );

    return res.status(200).json({
      success: true,
      message:
        "OTP sent successfully",
      isNewUser,
      otp, // return OTP in response for development and testing
    });

  } catch (error) {
    console.error(
      "SEND OTP ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to generate OTP",
    });
  }
};


// ========================================
// VERIFY OTP
// ========================================
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = { ...req.query, ...req.body };

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message:
          "Phone and OTP are required",
      });
    }

    const normalizedPhone =
      formatIndianPhone(phone);

    const normalizedOtp = String(
      otp
    ).trim();

    const isDummyOtp =
      isDummyOtpPhone(normalizedPhone) &&
      normalizedOtp === DUMMY_OTP_CODE;

    const otpRecord = isDummyOtp
      ? null
      : await OTP.findOne({
        phone: normalizedPhone,
        otp: normalizedOtp,
        expiresAt: {
          $gt: new Date(),
        },
      }).sort({
        createdAt: -1,
      });

    // wrong otp
    if (!isDummyOtp && !otpRecord) {
      const existing =
        await OTP.findOne({
          phone: normalizedPhone,
          expiresAt: {
            $gt: new Date(),
          },
        });

      if (existing) {
        existing.attempts =
          (existing.attempts || 0) + 1;

        await existing.save();

        if (existing.attempts >= 5) {
          await OTP.deleteOne({
            _id: existing._id,
          });

          return res.status(429).json({
            success: false,
            message:
              "Too many wrong attempts. Request new OTP.",
          });
        }
      }

      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired OTP",
      });
    }

    // delete otp after success
    if (otpRecord) {
      await OTP.deleteOne({
        _id: otpRecord._id,
      });
    }

    // check user
    let user = await User.findOne({
      phone: normalizedPhone,
    });

    // create user automatically
    if (!user) {
      user = await User.create({
        phone: normalizedPhone,
        role: "USER",
      });
    }

    const rawFcmToken =
      req.body.fcmToken || req.body.token;

    const normalizedFcmToken =
      typeof rawFcmToken === "string"
        ? rawFcmToken.trim()
        : "";

    if (normalizedFcmToken) {
      await User.updateMany(
        {
          _id: { $ne: user._id },
          fcmToken: normalizedFcmToken,
        },
        {
          $unset: {
            fcmToken: "",
            fcmTokenUpdatedAt: "",
          },
        }
      );

      user.fcmToken = normalizedFcmToken;
      user.fcmTokenUpdatedAt = new Date();

      await user.save();
    }

    const isNewUser = !user.profileComplete;

    if (isNewUser) {
      return res.status(200).json({
        success: true,
        message: "OTP verified. Please complete your profile.",
        isNewUser: true,
        phone: user.phone,
        user: {
          id: user._id,
          phone: user.phone,
          profileComplete: false,
          role: user.role,
        },
      });
    }

    // Existing user - generate token after verifying
    const token = generateUserToken(user);

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      token,
      isNewUser: false,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
        profileComplete: user.profileComplete,
        role: user.role,
      },
    });

  } catch (error) {
    console.error(
      "VERIFY OTP ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Verification failed",
    });
  }
};

// ========================================
// GOOGLE LOGIN
// ========================================
exports.googleLogin = async (req, res) => {
  try {
    const { idToken, token, fcmToken } = req.body;

    if (!idToken && !token) {
      return res.status(400).json({
        success: false,
        message: "Google ID token is required",
      });
    }

    let uid;
    let email;
    let name;
    let picture;

    if (idToken) {
      if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(500).json({
          success: false,
          message: "Google client ID is not configured",
        });
      }

      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      uid = payload.sub;
      email = payload.email;
      name = payload.name;
      picture = payload.picture;
    } else {
      // Backward compatibility for Firebase Auth clients.
      const decodedToken = await admin.auth().verifyIdToken(token);

      uid = decodedToken.uid;
      email = decodedToken.email;
      name = decodedToken.name;
      picture = decodedToken.picture;
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Google account email not found",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find existing user by Google UID or by Email
    let user = await User.findOne({
      $or: [
        { googleId: uid },
        { email: normalizedEmail }
      ]
    });

    let isNewUser = false;

    // Create new user if not exists
    if (!user) {
      isNewUser = true;

      // We generate a highly unique temporary/placeholder phone string using UID and random characters
      // to guarantee uniqueness and avoid duplicate key errors on the unique phone index.
      const uniqueSuffix = Math.random().toString(36).substring(2, 8);
      const tempPhone = `google_${uid.substring(0, 10)}_${uniqueSuffix}`;

      user = await User.create({
        name: name || "User",
        email: normalizedEmail,
        profileImage: picture || "",
        googleId: uid,
        authProvider: "GOOGLE",
        profileComplete: true,
        phone: tempPhone,
      });
    } else {
      // If the user exists but hasn't linked Google credentials yet, link them!
      let updated = false;
      if (!user.googleId) {
        user.googleId = uid;
        updated = true;
      }
      if (user.authProvider !== "GOOGLE") {
        user.authProvider = "GOOGLE";
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    }

    // Save FCM Token & disassociate it from any other users to prevent duplicate alerts
    if (fcmToken && typeof fcmToken === "string") {
      const normalizedFcmToken = fcmToken.trim();
      if (normalizedFcmToken) {
        await User.updateMany(
          {
            _id: { $ne: user._id },
            fcmToken: normalizedFcmToken,
          },
          {
            $unset: {
              fcmToken: "",
              fcmTokenUpdatedAt: "",
            },
          }
        );

        user.fcmToken = normalizedFcmToken;
        user.fcmTokenUpdatedAt = new Date();
        await user.save();
      }
    }

    // Generate JWT
    const appToken = generateUserToken(user);

    return res.status(200).json({
      success: true,
      message: "Google login successful",
      token: appToken,
      isNewUser,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("GOOGLE LOGIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Google login failed",
    });
  }
};

// ========================================
// LOGOUT (TOKEN INVALIDATION / EXPIRATION)
// ========================================
exports.logout = async (req, res) => {
  try {
    let token = null;

    // 1. Extract from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // 2. Extract from cookies if present
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // 3. Extract from body or query params
    if (!token) {
      token = req.body?.token || req.query?.token;
    }

    if (token) {
      const TokenBlacklist = require("../models/tokenBlacklist.model");
      try {
        const decoded = jwt.decode(token);
        const expiresAt = decoded && decoded.exp
          ? new Date(decoded.exp * 1000)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // default 7 days fallback

        // Save to database. Use findOneAndUpdate with upsert to prevent unique constraint duplicate error if called twice
        await TokenBlacklist.findOneAndUpdate(
          { token },
          { token, expiresAt },
          { upsert: true, returnDocument: 'after' }
        );
      } catch (err) {
        console.error("Token decoding or blacklist database insertion failed:", err);
      }
    }

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully. Token expired on server.",
    });
  } catch (error) {
    console.error("LOGOUT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};
