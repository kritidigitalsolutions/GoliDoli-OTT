const express = require("express");
const multer = require("multer");
const path = require("path");

const router = express.Router();

const { isAdmin } = require("../../middlewares/admin.middleware");
const {
  getClientUploadConfig,
  uploadStreamToBunny,
  createBunnyStreamVideo,
  uploadStreamToBunnyVideo,
  getStreamConfig,
  getBunnyStreamPlayUrls,
  deleteFromBunnyStream,
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
  "video/x-matroska",
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
    fileSize: Number(process.env.MAX_UPLOAD_SIZE) || 5368709120,
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

// ==========================================
// BUNNY STREAM DIRECT VIDEO UPLOAD HANDLING
// ==========================================
const allowedVideoMimeTypes = new Set([
  "video/mp4",
  "video/mkv",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
]);

const bunnyStreamStorage = {
  _handleFile: async (req, file, cb) => {
    try {
      if (!allowedVideoMimeTypes.has(file.mimetype)) {
        return cb(
          new Error(
            "Invalid video file type. Supported formats: MP4, MKV, MOV, WEBM"
          )
        );
      }

      const videoGuid = String(req.body.videoGuid || "").trim();
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (!uuidRegex.test(videoGuid)) {
        return cb(new Error("Invalid or missing videoGuid"));
      }

      const result = await uploadStreamToBunnyVideo({
        stream: file.stream,
        videoGuid,
        contentType: file.mimetype,
      });

      cb(null, {
        videoGuid,
        hlsUrl: result.hlsUrl,
        thumbnailUrl: result.thumbnailUrl,
        previewUrl: result.previewUrl,
        embedUrl: result.embedUrl,
      });
    } catch (err) {
      if (req.body.videoGuid) {
        await deleteFromBunnyStream(req.body.videoGuid).catch(() => {});
      }
      cb(err);
    }
  },

  _removeFile: (req, file, cb) => {
    cb(null);
  },
};

const bunnyStreamUpload = multer({
  storage: bunnyStreamStorage,
  limits: {
    fileSize: Number(process.env.MAX_UPLOAD_SIZE) || 5368709120,
  },
});

const handleBunnyStreamUpload = (req, res, next) => {
  bunnyStreamUpload.single("file")(req, res, async (err) => {
    if (!err) {
      return next();
    }

    if (req.body?.videoGuid) {
      await deleteFromBunnyStream(req.body.videoGuid).catch(() => {});
    }

    const isClientError =
      err instanceof multer.MulterError ||
      err.message.includes("Invalid video file type") ||
      err.message.includes("Invalid or missing videoGuid");

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

// ==========================================
// BUNNY STREAM ENDPOINTS (Protected)
// ==========================================
router.post(
  "/bunny-stream-init",
  isAdmin,
  async (req, res) => {
    try {
      const { title, contentType } = req.body;
      const normalizedType = String(contentType || "").trim().toLowerCase();

      let targetKey = "";
      if (normalizedType === "movies" || normalizedType === "movie") {
        targetKey = "movies";
      } else if (normalizedType === "series") {
        targetKey = "series";
      } else if (
        normalizedType === "microdramas" ||
        normalizedType === "microdrama" ||
        normalizedType === "shortdramas" ||
        normalizedType === "shortdrama" ||
        normalizedType === "drama" ||
        normalizedType === "dramaepisodes"
      ) {
        targetKey = "microdramas";
      } else if (
        normalizedType === "aireels" ||
        normalizedType === "aireel" ||
        normalizedType === "reels" ||
        normalizedType === "reel" ||
        normalizedType === "ai-reels"
      ) {
        targetKey = "aireels";
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid contentType. Allowed types: movies, series, microdramas, aireels",
        });
      }

      const { collections, libraryId } = getStreamConfig();
      const collectionId = collections[targetKey] || "";

      const videoData = await createBunnyStreamVideo(
        title || `Video-${Date.now()}`,
        collectionId
      );

      const playUrls = getBunnyStreamPlayUrls(videoData.guid);

      return res.status(201).json({
        success: true,
        videoGuid: videoData.guid,
        libraryId,
        hlsUrl: playUrls?.hlsUrl || "",
        thumbnailUrl: playUrls?.thumbnailUrl || "",
        previewUrl: playUrls?.previewUrl || "",
      });
    } catch (err) {
      console.error("Bunny Stream Init Error:", err.message);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to initialize Bunny Stream video",
      });
    }
  }
);

router.post(
  "/bunny-stream-upload",
  isAdmin,
  handleBunnyStreamUpload,
  async (req, res) => {
    try {
      if (!req.file?.hlsUrl) {
        if (req.body.videoGuid) {
          await deleteFromBunnyStream(req.body.videoGuid).catch(() => {});
        }
        return res.status(400).json({
          success: false,
          message: "Video file is required",
        });
      }

      return res.status(201).json({
        success: true,
        url: req.file.hlsUrl,
        videoUrl: req.file.hlsUrl,
        videoGuid: req.file.videoGuid,
        thumbnailUrl: req.file.thumbnailUrl,
        previewUrl: req.file.previewUrl,
      });
    } catch (err) {
      if (req.body.videoGuid) {
        await deleteFromBunnyStream(req.body.videoGuid).catch(() => {});
      }
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
