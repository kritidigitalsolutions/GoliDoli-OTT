const jwt = require("jsonwebtoken");

const generateToken = (phone) => {
  return jwt.sign(
    {
      phone,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "30d",
    }
  );
};

module.exports = {
  generateToken,
};