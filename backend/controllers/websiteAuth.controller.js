const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/user.model");
const TokenBlacklist = require("../models/tokenBlacklist.model");
const COOKIE_NAME = "golidoli_website_session";

/**
 * Build secure cookie options
 */
const getCookieOptions = () => {
  const isProd = process.env.NODE_ENV === "production";
  const cookieDomain = process.env.COOKIE_DOMAIN ? process.env.COOKIE_DOMAIN.trim() : undefined;

  const options = {
    httpOnly: true,
    secure: isProd,
    sameSite: process.env.COOKIE_SAMESITE || (isProd ? "lax" : "lax"),
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  // Only bind domain in production and when it's not a localhost address
  if (isProd && cookieDomain && !cookieDomain.includes("localhost")) {
    options.domain = cookieDomain;
  }

  return options;
};

/**
 * Validate redirect URL to prevent Open Redirect vulnerabilities
 */
const getSafeRedirectUrl = (requestedRedirect) => {
  const rawFrontendUrls = (process.env.FRONTEND_URL || "https://golidoli.com").split(",");
  const defaultFrontend = rawFrontendUrls[0].trim().replace(/\/$/, "");

  if (!requestedRedirect || typeof requestedRedirect !== "string") {
    return `${defaultFrontend}/dashboard`;
  }

  const trimmed = requestedRedirect.trim();

  // Allow relative URLs starting with '/' but not protocol-relative '//'
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return `${defaultFrontend}${trimmed}`;
  }

  // Validate absolute URL against allowed frontend domains
  try {
    const parsed = new URL(trimmed);
    const allowedOrigins = rawFrontendUrls
      .map((u) => {
        try {
          return new URL(u.trim()).origin;
        } catch (e) {
          return "";
        }
      })
      .filter(Boolean);

    if (allowedOrigins.includes(parsed.origin)) {
      return trimmed;
    }
  } catch (err) {
    // Malformed URL, fall through to default
  }

  return `${defaultFrontend}/dashboard`;
};

/**
 * POST /api/auth/website-login
 * Single Sign-On (SSO): Validates mobile JWT, generates separate website session, sets HttpOnly cookie
 */
exports.websiteLogin = async (req, res) => {
  try {
    // 1. Extract Bearer token strictly from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization header with Bearer token is required",
      });
    }

    const mobileToken = authHeader.split(" ")[1]?.trim();
    if (!mobileToken) {
      return res.status(401).json({
        success: false,
        message: "Mobile JWT token is missing",
      });
    }

    // 2. Check if mobile token was blacklisted/logged out
    const isBlacklisted = await TokenBlacklist.findOne({ token: mobileToken });
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: "Mobile token has been revoked or logged out",
      });
    }

    // 3. Verify signature and expiration using existing mobile JWT secret
    let decoded;
    try {
      decoded = jwt.verify(mobileToken, process.env.JWT_SECRET);
    } catch (err) {
      const isExpired = err.name === "TokenExpiredError";
      return res.status(401).json({
        success: false,
        message: isExpired ? "Mobile token has expired" : "Invalid mobile JWT token signature",
        error: err.name,
      });
    }

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload: user identifier missing",
      });
    }

    // 4. Find user in MongoDB using existing User model (do NOT accept body userId)
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account associated with this token does not exist",
      });
    }

    // 5. Check user status
    if (user.status === "Blocked") {
      return res.status(403).json({
        success: false,
        message: "User account is blocked. Please contact support.",
      });
    }

    // 6. Generate a dedicated Website Session Token using WEBSITE_SESSION_SECRET
    const websiteSessionSecret =
      process.env.WEBSITE_SESSION_SECRET ||
      `${process.env.JWT_SECRET}_website_session_fallback`;

    const websiteSessionToken = jwt.sign(
      {
        id: user._id,
        role: user.role,
        type: "website_session",
        sessionId: crypto.randomBytes(16).toString("hex"),
      },
      websiteSessionSecret,
      {
        expiresIn: process.env.WEBSITE_SESSION_EXPIRES_IN || "7d",
      }
    );

    // 7. Set secure HttpOnly session cookie
    const cookieOptions = getCookieOptions();
    res.cookie(COOKIE_NAME, websiteSessionToken, cookieOptions);

    const targetRedirectUrl = getSafeRedirectUrl(req.body?.redirectUrl || req.query?.redirectUrl);

    // If client is a standard browser form POST or requested direct redirect
    const wantsRedirect =
      req.query?.redirect === "true" ||
      (req.headers.accept && req.headers.accept.includes("text/html") && !req.xhr);

    if (wantsRedirect) {
      return res.redirect(targetRedirectUrl);
    }

    // Standard JSON response for Web / SPA frontend
    return res.status(200).json({
      success: true,
      message: "Website SSO login successful",
      token: websiteSessionToken,
      redirectUrl: targetRedirectUrl,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage || "",
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("WEBSITE SSO LOGIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Website authentication failed: " + (error.message || "Internal server error"),
    });
  }
};

/**
 * GET /api/auth/website-me
 * Verifies website session cookie and returns authenticated user profile
 */
exports.websiteMe = async (req, res) => {
  try {
    // 1. Extract session token from cookie (or Authorization Bearer fallback)
    let sessionToken = req.cookies?.[COOKIE_NAME];

    if (!sessionToken && req.headers.authorization?.startsWith("Bearer ")) {
      sessionToken = req.headers.authorization.split(" ")[1]?.trim();
    }

    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: "No active website session found. Please log in.",
      });
    }

    // 2. Check if website session token was blacklisted
    const isBlacklisted = await TokenBlacklist.findOne({ token: sessionToken });
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: "Website session has expired or was logged out",
      });
    }

    // 3. Verify session token using WEBSITE_SESSION_SECRET
    const websiteSessionSecret =
      process.env.WEBSITE_SESSION_SECRET ||
      `${process.env.JWT_SECRET}_website_session_fallback`;

    let decoded;
    try {
      decoded = jwt.verify(sessionToken, websiteSessionSecret);
    } catch (err) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: err.name === "TokenExpiredError" ? "Website session has expired" : "Invalid website session token",
        error: err.name,
      });
    }

    if (!decoded || decoded.type !== "website_session" || !decoded.id) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: "Invalid session token type",
      });
    }

    // 4. Find user in MongoDB
    const user = await User.findById(decoded.id).select("-__v");
    if (!user) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: "User account no longer exists",
      });
    }

    if (user.status === "Blocked") {
      return res.status(403).json({
        success: false,
        authenticated: false,
        message: "User account is blocked",
      });
    }

    return res.status(200).json({
      success: true,
      authenticated: true,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage || "",
        role: user.role,
        status: user.status,
        profileComplete: user.profileComplete,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("WEBSITE ME ERROR:", error);
    return res.status(500).json({
      success: false,
      authenticated: false,
      message: "Session verification error",
    });
  }
};

/**
 * POST /api/auth/website-logout
 * Clears the website session cookie and revokes the session token
 */
exports.websiteLogout = async (req, res) => {
  try {
    const sessionToken =
      req.cookies?.[COOKIE_NAME] ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]?.trim()
        : null);

    // Blacklist the session token if present
    if (sessionToken) {
      try {
        const decoded = jwt.decode(sessionToken);
        const expiresAt = decoded?.exp
          ? new Date(decoded.exp * 1000)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await TokenBlacklist.findOneAndUpdate(
          { token: sessionToken },
          { token: sessionToken, expiresAt },
          { upsert: true, returnDocument: "after" }
        );
      } catch (tokenErr) {
        console.warn("Failed to blacklist website session token:", tokenErr.message);
      }
    }

    // Clear cookie with exact matching options
    const cookieOptions = getCookieOptions();
    delete cookieOptions.maxAge; // Ensure immediate expiry
    res.clearCookie(COOKIE_NAME, cookieOptions);

    return res.status(200).json({
      success: true,
      message: "Website session logged out successfully",
    });
  } catch (error) {
    console.error("WEBSITE LOGOUT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};
