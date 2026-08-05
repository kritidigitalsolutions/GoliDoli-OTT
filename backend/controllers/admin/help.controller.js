const Help = require("../../models/help.model");

// ➕ ADD Q&A
exports.addHelp = async (req, res) => {
  try {
    const { category, question, answer, supportNumber, supportEmail } = req.body;

    if (!category || !question || !answer) {
      return res.status(400).json({ message: "All fields required" });
    }

    const help = await Help.create({ category, question, answer, supportNumber, supportEmail });

    res.status(201).json({
      success: true,
      message: "Help added",
      help
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 📥 GET ALL (ADMIN)
exports.getAllHelp = async (req, res) => {
  try {
    const data = await Help.find().sort("-createdAt");

    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✏️ UPDATE
exports.updateHelp = async (req, res) => {
  try {
    const help = await Help.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: 'after' }
    );

    res.status(200).json({
      message: "Updated",
      help
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ❌ DELETE
exports.deleteHelp = async (req, res) => {
  try {
    await Help.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔁 TOGGLE VISIBILITY
exports.toggleHelp = async (req, res) => {
  try {
    const help = await Help.findById(req.params.id);

    help.isPublished = !help.isPublished;
    await help.save();

    res.status(200).json({
      message: "Toggled",
      help
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔍 GET SUPPORT DETAILS (ADMIN)
exports.getSupport = async (req, res) => {
  try {
    const support = await Help.findOne({ category: "contact-support" });
    if (!support) {
      return res.status(200).json({
        success: true,
        supportNumber: "",
        supportEmail: ""
      });
    }

    res.status(200).json({
      success: true,
      supportNumber: support.supportNumber || "",
      supportEmail: support.supportEmail || ""
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ➕ ADD SUPPORT DETAILS (ADMIN)
exports.addSupport = async (req, res) => {
  try {
    const { supportNumber, supportEmail } = req.body;

    // Check if support details already exist
    let support = await Help.findOne({ category: "contact-support" });
    if (support) {
      return res.status(400).json({
        success: false,
        message: "Support details already exist. Use update (PUT/PATCH) instead."
      });
    }

    support = await Help.create({
      category: "contact-support",
      question: "Contact Support",
      answer: `Support Number: ${supportNumber || "N/A"}, Email: ${supportEmail || "N/A"}`,
      supportNumber: supportNumber || "",
      supportEmail: supportEmail || "",
      isPublished: true
    });

    res.status(201).json({
      success: true,
      message: "Support details added successfully",
      support
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✏️ UPDATE SUPPORT DETAILS (ADMIN)
exports.updateSupport = async (req, res) => {
  try {
    const { supportNumber, supportEmail } = req.body;

    const support = await Help.findOneAndUpdate(
      { category: "contact-support" },
      {
        category: "contact-support",
        question: "Contact Support",
        answer: `Support Number: ${supportNumber || "N/A"}, Email: ${supportEmail || "N/A"}`,
        supportNumber: supportNumber !== undefined ? supportNumber : "",
        supportEmail: supportEmail !== undefined ? supportEmail : "",
        isPublished: true
      },
      { returnDocument: 'after', upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Support details updated successfully",
      support
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ❌ DELETE SUPPORT DETAILS (ADMIN)
exports.deleteSupport = async (req, res) => {
  try {
    await Help.deleteOne({ category: "contact-support" });

    res.status(200).json({
      success: true,
      message: "Support details deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔁 TOGGLE SUPPORT VISIBILITY (ADMIN)
exports.toggleSupport = async (req, res) => {
  try {
    const support = await Help.findOne({ category: "contact-support" });
    if (!support) {
      return res.status(404).json({
        success: false,
        message: "Support details not found."
      });
    }

    support.isPublished = !support.isPublished;
    await support.save();

    res.status(200).json({
      success: true,
      message: `Support details toggled to ${support.isPublished ? "active" : "inactive"}`,
      support
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};