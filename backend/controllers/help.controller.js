const Help = require("../models/help.model");

//get all 
exports.getAllHelp = async (req, res) => {
  try {
    const data = await Help.find().sort("-createdAt");
    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 👀 GET BY CATEGORY (ONLY PUBLISHED)
exports.getHelpByCategory = async (req, res) => {
  try {
    const data = await Help.find({
      category: req.params.category,
      isPublished: true
    });

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// ========================================
// GET ALL PUBLISHED HELP DATA
// ========================================
exports.getPublishedHelp =
  async (req, res) => {
    try {
      const helpData =
        await Help.find({
          isPublished: true,
        }).sort("-createdAt");

      res.status(200).json({
        success: true,
        count: helpData.length,
        helpData,
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

// 📞 GET SUPPORT NUMBER
exports.getSupportNumber = async (req, res) => {
  try {
    // 1. Try to find a document with category: "contact-support"
    let helpDoc = await Help.findOne({
      category: "contact-support",
      isPublished: true,
      supportNumber: { $ne: "" }
    });

    if (!helpDoc) {
      return res.status(404).json({
        success: false,
        message: "Support contact number not found."
      });
    }

    return res.status(200).json({
      success: true,
      contactNumber: helpDoc.supportNumber
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ✉️ GET SUPPORT EMAIL
exports.getSupportEmail = async (req, res) => {
  try {
    // 1. Try to find a document with category: "contact-support"
    let helpDoc = await Help.findOne({
      category: "contact-support",
      isPublished: true,
      supportEmail: { $ne: "" }
    });

    if (!helpDoc) {
      return res.status(404).json({
        success: false,
        message: "Support email not found."
      });
    }

    return res.status(200).json({
      success: true,
      email: helpDoc.supportEmail
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};