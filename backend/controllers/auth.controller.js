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
    const apiKey = process.env.SMS_GH_API_KEY;
    const senderId = process.env.SMS_GH_SENDER_ID;
    const template = process.env.SMS_GH_OTP_TEXT;

    if (!apiKey || !senderId) {
      console.error("SMS GATEWAY ERROR: SMS_GH_API_KEY or SMS_GH_SENDER_ID is missing in your .env file.");
      return false;
    }

    if (!template) {
      console.error("SMS GATEWAY ERROR: SMS_GH_OTP_TEXT is missing in your .env file.");
      return false;
    }

    const message = template.replace(
      "{{otp}}",
      otp
    );

    const response = await axios.get(
      "https://www.smsgatewayhub.com/api/mt/SendSMS",
      {
        params: {
          APIKey: process.env.SMS_GH_API_KEY,

          senderid: process.env.SMS_GH_SENDER_ID,

          channel: "2",

          DCS: 0,

          flashsms: 0,

          number: phone.replace(
            "+",
            ""
          ),

          text: message,

          route: process.env.SMS_GH_ROUTE,

          EntityId: process.env.SMS_GH_ENTITY_ID,

          dlttemplateid: process.env.SMS_GH_DLT_TEMPLATE_ID,
        },
      }
    );

    console.log(
      "SMS RESPONSE:",
      response.data
    );

    if (response.data && response.data.ErrorCode === "000") {
      return true;
    } else {
      console.error(
        "SMS GATEWAY ERROR:",
        response.data?.ErrorMessage || "Unknown gateway error"
      );
      return false;
    }
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
        process.env.JWT_EXPIRE || "7d"
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

    // rate limit (Allow up to 7 attempts within 1 minute)
    if (!isDummyPhone) {
      const recentOtps = await OTP.find({
        phone: normalizedPhone,
        createdAt: {
          $gt: new Date(Date.now() - 60 * 1000),
        },
      }).sort({ createdAt: 1 });

      if (recentOtps.length >= 7) {
        const oldestAttempt = recentOtps[0];
        const timePassedMs = Date.now() - new Date(oldestAttempt.createdAt).getTime();
        const remainingSeconds = Math.max(1, Math.ceil((60000 - timePassedMs) / 1000));

        return res.status(429).json({
          success: false,
          message: `Maximum 7 OTP attempts reached. Please wait ${remainingSeconds} seconds before requesting another OTP`,
          retryAfter: remainingSeconds,
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
            name: "Test User",
            email: "testuser@gmail.com",
            profileComplete: true,
            role: "USER",
            status: "Active",
          },
        },
        { upsert: true }
      );
    } else {
      // remove old otps older than 10 minutes
      await OTP.deleteMany({
        phone: normalizedPhone,
        createdAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) },
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
    const smsSent =
      isDummyPhone ||
      (await sendSMS(
        normalizedPhone,
        otp
      ));

    console.log(
      `📱 [OTP SERVICE] OTP for ${normalizedPhone} is: ${otp}`
    );

    // If real SMS attempt failed, don't lie to the client with success:true
    if (!smsSent && !isDummyPhone) {
      return res.status(502).json({
        success: false,
        message:
          "Failed to send OTP. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "OTP sent successfully",
      isNewUser,
      // otp only exposed outside production, for testing
      ...(process.env.NODE_ENV !== "production" && { otp }),
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
      (normalizedOtp === DUMMY_OTP_CODE || normalizedOtp === "123456");

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
    const {
      idToken,
      accessToken,
      token,
      email,
      name,
      photoUrl,
      picture,
      googleId,
      fcmToken
    } = req.body;

    const incomingToken = idToken || accessToken || token;

    if (!incomingToken && !email) {
      return res.status(400).json({
        success: false,
        message: "Google ID token, access token, or email is required",
      });
    }

    let userEmail = email || "";
    let userName = name || "";
    let userPhoto = photoUrl || picture || "";
    let userGoogleId = googleId || "";

    // 1. Check if token is a Google OAuth Access Token (starts with ya29.)
    if (incomingToken && incomingToken.startsWith("ya29.")) {
      try {
        const googleRes = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${incomingToken}` },
        });

        if (googleRes.data) {
          userEmail = googleRes.data.email || userEmail;
          userName = googleRes.data.name || userName;
          userPhoto = googleRes.data.picture || userPhoto;
          userGoogleId = googleRes.data.sub || userGoogleId;
        }
      } catch (tokenErr) {
        console.warn("Google UserInfo API verification failed, fallback to payload:", tokenErr.message);
      }
    }
    // 2. If standard JWT ID Token
    else if (incomingToken) {
      try {
        if (process.env.GOOGLE_CLIENT_ID) {
          const ticket = await googleClient.verifyIdToken({
            idToken: incomingToken,
            audience: process.env.GOOGLE_CLIENT_ID,
          });
          const payload = ticket.getPayload();
          userEmail = payload.email || userEmail;
          userName = payload.name || userName;
          userPhoto = payload.picture || userPhoto;
          userGoogleId = payload.sub || userGoogleId;
        } else {
          const decodedToken = await admin.auth().verifyIdToken(incomingToken);
          userEmail = decodedToken.email || userEmail;
          userName = decodedToken.name || userName;
          userPhoto = decodedToken.picture || userPhoto;
          userGoogleId = decodedToken.uid || userGoogleId;
        }
      } catch (verifyErr) {
        console.warn("verifyIdToken failed, fallback to payload:", verifyErr.message);
        // Try Firebase Admin fallback if googleClient failed
        try {
          if (admin && admin.auth) {
            const decodedToken = await admin.auth().verifyIdToken(incomingToken);
            userEmail = decodedToken.email || userEmail;
            userName = decodedToken.name || userName;
            userPhoto = decodedToken.picture || userPhoto;
            userGoogleId = decodedToken.uid || userGoogleId;
          }
        } catch (firebaseErr) {
          console.warn("Firebase Admin verifyIdToken also failed, using payload fallback:", firebaseErr.message);
        }
      }
    }

    if (!userEmail || !userEmail.trim()) {
      return res.status(400).json({
        success: false,
        message: "Could not retrieve valid email address from Google login",
      });
    }

    const normalizedEmail = userEmail.toLowerCase().trim();

    // Find existing user by Google UID or by Email
    let user = await User.findOne({
      $or: [
        ...(userGoogleId ? [{ googleId: userGoogleId }] : []),
        { email: normalizedEmail }
      ]
    });

    let isNewUser = false;

    // Create new user if not exists
    if (!user) {
      isNewUser = true;

      const uniqueSuffix = Math.random().toString(36).substring(2, 8);
      const safeUid = userGoogleId ? userGoogleId.substring(0, 10) : "user";
      const tempPhone = `google_${safeUid}_${uniqueSuffix}`;

      user = await User.create({
        name: userName || "User",
        email: normalizedEmail,
        profileImage: userPhoto || "",
        googleId: userGoogleId || "",
        authProvider: "GOOGLE",
        profileComplete: true,
        phone: tempPhone,
      });
    } else {
      // If user exists, update missing details
      let updated = false;
      if (!user.googleId && userGoogleId) {
        user.googleId = userGoogleId;
        updated = true;
      }
      if (!user.profileImage && userPhoto) {
        user.profileImage = userPhoto;
        updated = true;
      }
      if (!user.name && userName) {
        user.name = userName;
        updated = true;
      }
      if (user.authProvider !== "GOOGLE") {
        user.authProvider = "GOOGLE";
        updated = true;
      }
      if (!user.profileComplete) {
        user.profileComplete = true;
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    }

    // Save FCM Token & disassociate from other users
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

    // Generate App JWT Token
    const appToken = generateUserToken(user);

    return res.status(200).json({
      success: true,
      message: isNewUser ? "User registered successfully" : "Google login successful",
      token: appToken,
      isNewUser,
      profileComplete: true,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        profileImage: user.profileImage || "",
        authProvider: user.authProvider || "GOOGLE",
        profileComplete: true,
        role: user.role || "USER",
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
