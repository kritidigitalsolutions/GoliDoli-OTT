const CompanyInfo = require("../models/companyInfo.model");
const Help = require("../models/help.model");

const getCompanyInfo = async (req, res) => {
  try {
    let companyInfo = await CompanyInfo.findOne({
      status: "published",
    }).select("-createdBy -updatedBy");

    // If no published info exists yet, try to find any existing draft or create default
    if (!companyInfo) {
      companyInfo = await CompanyInfo.findOne().select("-createdBy -updatedBy");
    }

    if (!companyInfo) {
      companyInfo = await CompanyInfo.create({
        status: "published",
      });
    }

    // Convert doc to object so virtuals and computed fields are present
    const dataObj = companyInfo.toObject ? companyInfo.toObject({ virtuals: true }) : { ...companyInfo };

    // Fallback support email / phone from Help model if empty in CompanyInfo
    if (!dataObj.supportEmail || !dataObj.supportPhone) {
      try {
        const helpSupportDoc = await Help.findOne({
          category: "contact-support",
          isPublished: true,
        });

        if (helpSupportDoc) {
          if (!dataObj.supportEmail && helpSupportDoc.supportEmail) {
            dataObj.supportEmail = helpSupportDoc.supportEmail;
          }
          if (!dataObj.supportPhone && helpSupportDoc.supportNumber) {
            dataObj.supportPhone = helpSupportDoc.supportNumber;
          }
        }
      } catch (err) {
        console.warn("Help fallback fetch error:", err);
      }
    }

    // Ensure address & formattedAddress are populated
    if (!dataObj.address) {
      dataObj.address = [dataObj.addressLine1, dataObj.addressLine2].filter(Boolean).join(", ");
    }

    const parts = [
      dataObj.address,
      dataObj.city,
      dataObj.state,
      dataObj.country && dataObj.postalCode ? `${dataObj.country} - ${dataObj.postalCode}` : (dataObj.country || dataObj.postalCode),
    ].filter(Boolean);
    dataObj.formattedAddress = parts.join(", ");

    return res.status(200).json({
      success: true,
      data: dataObj,
    });
  } catch (error) {
    console.error("Get Company Info Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch company information.",
    });
  }
};

module.exports = {
  getCompanyInfo,
};