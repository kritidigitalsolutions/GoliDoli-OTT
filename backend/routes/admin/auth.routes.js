const express = require("express");
const multer = require("multer");
const path = require("path");

const router = express.Router();

const { isAdmin } = require("../../middlewares/admin.middleware");
const {
  getClientUploadConfig,
  uploadStreamToBunny,
} = require("../../cdn/bunnyCDN");

const {
  loginAdmin,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetForgotPassword,
  getAdminProfile,
} = require("../../controllers/admin_auth/admin.auth.controller");

const {
  sendPasswordOtp,
  changePassword,
  sendEmailOtp,
  changeEmail,
} = require("../../controllers/admin_auth/admin.settings.controller");

const allowedUploadFolders = {
  movies: new Set(["posters", "banners", "trailers", "videos", "cast"]),
  series: new Set(["posters", "banners", "trailers", "cast"]),
  episodes: new Set(["posters", "videos"]),
  shortdramas: new Set(["posters", "banners", "trailers", "cast"]),
  dramaepisodes: new Set(["posters", "videos"]),
  profile: new Set(["others", "avatars"]),
};

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/mkv",
  "video/webm",
  "video/quicktime",
]);

const safeExtension = (file) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  return ext && /^[a-z0-9.]+$/.test(ext) ? ext : "";
};

const validateUploadTarget = (type, subfolder) => {
  const normalizedType = String(type || "").trim().toLowerCase();
  const normalizedSubfolder = String(subfolder || "").trim().toLowerCase();

  if (!allowedUploadFolders[normalizedType]?.has(normalizedSubfolder)) {
    return null;
  }

  return {
    type: normalizedType,
    subfolder: normalizedSubfolder,
  };
};

const bunnyStorage = {
  _handleFile: async (req, file, cb) => {
    try {
      if (!allowedMimeTypes.has(file.mimetype)) {
        return cb(new Error("Invalid file type"));
      }

      const target = validateUploadTarget(req.body.type, req.body.subfolder);
      if (!target) {
        return cb(new Error("Invalid Bunny upload target"));
      }

      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExtension(file)}`;
      const result = await uploadStreamToBunny({
        stream: file.stream,
        remotePath: `${target.type}/${target.subfolder}/${filename}`,
        contentType: file.mimetype,
      });

      cb(null, {
        filename,
        path: result.url,
        cdnUrl: result.url,
        remotePath: result.path,
      });
    } catch (err) {
      cb(err);
    }
  },

  _removeFile: (req, file, cb) => {
    cb(null);
  },
};

const bunnyUpload = multer({
  storage: bunnyStorage,
  limits: {
    fileSize: Number(process.env.MAX_UPLOAD_SIZE),
  },
});

const handleBunnyUpload = (req, res, next) => {
  bunnyUpload.single("file")(req, res, (err) => {
    if (!err) {
      return next();
    }

    const isClientError =
      err instanceof multer.MulterError ||
      err.message === "Invalid file type" ||
      err.message === "Invalid Bunny upload target";

    return res.status(isClientError ? 400 : 500).json({
      success: false,
      message: err.message,
    });
  });
};


// Admin Login
router.post(
  "/login",
  loginAdmin
);

// Get own profile
router.get(
  "/profile",
  isAdmin,
  getAdminProfile
);

router.get(
  "/bunny-config",
  isAdmin,
  async (req, res) => {
    try {
      const config = await getClientUploadConfig();

      res.json({
        success: true,
        ...config,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

router.post(
  "/bunny-upload",
  isAdmin,
  handleBunnyUpload,
  async (req, res) => {
    try {
      if (!req.file?.cdnUrl) {
        return res.status(400).json({
          success: false,
          message: "Upload file is required",
        });
      }

      return res.status(201).json({
        success: true,
        url: req.file.cdnUrl,
        path: req.file.remotePath,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
);

//OTP
router.post(
  "/send-otp",
  sendForgotPasswordOtp
);

router.post(
  "/verify-otp",
  verifyForgotPasswordOtp
);

router.post(
  "/reset-password",
  resetForgotPassword
);

// --- CHANGE PASSWORD FLOW (Authenticated) ---
router.post(
  "/change-password/send-otp",
  isAdmin,
  sendPasswordOtp
);

router.post(
  "/change-password",
  isAdmin,
  changePassword
);

// --- CHANGE EMAIL FLOW (Authenticated) ---
router.post(
  "/change-email/send-otp",
  isAdmin,
  sendEmailOtp
);

router.post(
  "/change-email",
  isAdmin,
  changeEmail
);



module.exports = router;
