const jwt = require("jsonwebtoken");

const isAuth = async (
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
    // console.log("Incoming Token:", token);

    const TokenBlacklist = require("../models/tokenBlacklist.model");
    const isBlacklisted = await TokenBlacklist.findOne({ token });
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: "Token has expired or logged out",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (decoded.role !== "USER") {
      return res.status(403).json({
        success: false,
        message: "User access only",
      });
    }

    req.user = decoded;

    next();

  } catch (error) {

  console.log("========== JWT ERROR ==========");
  console.log("Name:", error.name);
  console.log("Message:", error.message);
  console.log("Authorization:", req.headers.authorization);
  console.log("Time:", new Date().toISOString());
  console.log("===============================");

  return res.status(401).json({
    success: false,
    message: error.message,
    error: error.name,
  });
}
};

module.exports = { isAuth };