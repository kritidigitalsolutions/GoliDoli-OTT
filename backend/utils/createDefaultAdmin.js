const bcrypt = require("bcryptjs");
const Admin = require("../models/admin.model");
const User = require("../models/user.model");

const createDefaultAdmin = async () => {
  try {
    // List of default/test admin accounts to maintain
    const defaultAdmins = [
      {
        email: (process.env.DEFAULT_ADMIN_EMAIL || "admin@gmail.com").trim().toLowerCase(),
        password: process.env.DEFAULT_ADMIN_PASSWORD || "123456",
        name: "Admin"
      },
      {
        email: "admin@golidoli.com",
        password: "Password123!",
        name: "Super Admin"
      }
    ];

    for (const adminData of defaultAdmins) {
      const existingAdmin = await Admin.findOne({
        email: adminData.email,
      });

      const hashedPassword = await bcrypt.hash(adminData.password, 10);

      if (!existingAdmin) {
        await Admin.create({
          name: adminData.name,
          email: adminData.email,
          password: hashedPassword,
          role: "ADMIN",
        });
        console.log(`✅ Default admin created: ${adminData.email}`);
      } else {
        // Ensure the password matches the intended credentials
        const passwordMatches = await bcrypt.compare(adminData.password, existingAdmin.password);
        if (!passwordMatches) {
          existingAdmin.password = hashedPassword;
          await existingAdmin.save();
          console.log(`✅ Password synced for default admin: ${adminData.email}`);
        }
      }
    }

    // Ensure Test User (+919999999999) is ready and fully active for immediate testing
    const testPhone = "+919999999999";
    const existingTestUser = await User.findOne({ phone: testPhone });

    if (!existingTestUser) {
      await User.create({
        phone: testPhone,
        name: "Test User",
        email: "testuser@gmail.com",
        profileComplete: true,
        role: "USER",
        status: "Active"
      });
      console.log(`✅ Test user ready: ${testPhone}`);
    } else if (!existingTestUser.profileComplete) {
      existingTestUser.name = existingTestUser.name || "Test User";
      existingTestUser.email = existingTestUser.email || "testuser@gmail.com";
      existingTestUser.profileComplete = true;
      existingTestUser.status = "Active";
      await existingTestUser.save();
      console.log(`✅ Test user profile updated to complete: ${testPhone}`);
    }

  } catch (error) {
    console.error(
      "❌ Create Default Admin/Test User Error:",
      error
    );
  }
};

module.exports = createDefaultAdmin;