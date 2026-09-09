const jwt = require("jsonwebtoken");

const isAdmin = async (
  req,
  res,
  next
) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (decoded.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    req.user = decoded;

    next();

  } catch (error) {
    console.error(
      "Admin Middleware Error:",
      error.message
    );

    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired token",
    });
  }
};

/**
 * Permission guard middleware factory.
 * Pass the permission key (e.g. "categories") to protect a route.
 * Currently all verified admins have full access; extend this logic
 * when granular sub-admin roles are introduced.
 */
const hasPermission = (permission) => (req, res, next) => {
  // req.user is already set by isAdmin at this point.
  // Future: check req.user.permissions.includes(permission)
  next();
};

module.exports = { isAdmin, hasPermission };