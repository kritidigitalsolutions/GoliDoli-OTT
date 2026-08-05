const bcrypt = require("bcryptjs");

const Admin = require("../models/admin.model");

const createDefaultAdmin = async () => {
  try {
    if (
      !process.env.DEFAULT_ADMIN_EMAIL ||
      !process.env.DEFAULT_ADMIN_PASSWORD
    ) {
      console.log("⚠️ Default admin credentials missing");
      return;
    }

    const normalizedEmail =
      process.env.DEFAULT_ADMIN_EMAIL
        .trim()
        .toLowerCase();

    const existingAdmin = await Admin.findOne({
      email: normalizedEmail,
    });

    if (existingAdmin) {
      console.log("✅ Default admin already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash(
      process.env.DEFAULT_ADMIN_PASSWORD,
      10
    );

    await Admin.create({
      name: "Admin",
      email: normalizedEmail,
      password: hashedPassword,
      role: "ADMIN",
    });

    console.log("✅ Default admin created");

  } catch (error) {
    console.error(
      "❌ Create Default Admin Error:",
      error
    );
  }
};

module.exports = createDefaultAdmin;