const CompanyInfo = require("../../models/companyInfo.model");

const getCompanyInfo = async (req, res) => {
  try {
    const companyInfo = await CompanyInfo.findOne();

    return res.status(200).json({
      success: true,
      data: companyInfo,
    });
  } catch (error) {
    console.error("Get Company Info Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch company information.",
    });
  }
};

const saveCompanyInfo = async (req, res) => {
  try {
    const {
      companyName,
      tagline,
      supportEmail,
      supportPhone,
      address,
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      postalCode,
      latitude,
      longitude,
      googleMapUrl,
      copyrightText,
      poweredBy,
      socialLinks,
      status,
    } = req.body;

    let companyInfo = await CompanyInfo.findOne();

    const streetAddress = address !== undefined ? address : [addressLine1, addressLine2].filter(Boolean).join(", ");

    const fieldsToSave = {
      ...(companyName !== undefined && { companyName }),
      ...(tagline !== undefined && { tagline }),
      ...(supportEmail !== undefined && { supportEmail }),
      ...(supportPhone !== undefined && { supportPhone }),
      ...(streetAddress !== undefined && { address: streetAddress, addressLine1: streetAddress, addressLine2: "" }),
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(country !== undefined && { country }),
      ...(postalCode !== undefined && { postalCode }),
      ...(latitude !== undefined && { latitude: Number(latitude) || 0 }),
      ...(longitude !== undefined && { longitude: Number(longitude) || 0 }),
      ...(googleMapUrl !== undefined && { googleMapUrl }),
      ...(copyrightText !== undefined && { copyrightText }),
      ...(poweredBy !== undefined && { poweredBy }),
      ...(socialLinks !== undefined && { socialLinks }),
      status: status || "published",
      updatedBy: req.admin?._id,
    };

    if (!companyInfo) {
      companyInfo = await CompanyInfo.create({
        ...fieldsToSave,
        createdBy: req.admin?._id,
      });

      return res.status(201).json({
        success: true,
        message: "Company information created successfully.",
        data: companyInfo,
      });
    }

    Object.assign(companyInfo, fieldsToSave);
    await companyInfo.save();

    return res.status(200).json({
      success: true,
      message: "Company information updated successfully.",
      data: companyInfo,
    });
  } catch (error) {
    console.error("Save Company Info Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save company information.",
    });
  }
};

const updateCompanyInfoStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["draft", "published"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status.",
      });
    }

    const companyInfo = await CompanyInfo.findOne();

    if (!companyInfo) {
      return res.status(404).json({
        success: false,
        message: "Company information not found.",
      });
    }

    companyInfo.status = status;
    companyInfo.updatedBy = req.admin?._id;

    await companyInfo.save();

    return res.status(200).json({
      success: true,
      message: `Company information moved to ${status}.`,
      data: companyInfo,
    });
  } catch (error) {
    console.error("Update Company Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update company status.",
    });
  }
};

module.exports = {
  getCompanyInfo,
  saveCompanyInfo,
  updateCompanyInfoStatus,
};