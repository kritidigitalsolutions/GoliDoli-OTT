const multer = require("multer");
const path = require("path");

const {
  uploadStreamToBunny,
} = require("../cdn/bunnyCDN");

/**
 * Decide Bunny folder based on API route + field name.
 */
const getUploadInfo = (req, file) => {
  const url = String(req.originalUrl || "").toLowerCase();

  let type = "movies";

  if (url.includes("/series")) {
    type = "series";
  } else if (
    url.includes("/drama-episodes")
  ) {
    type = "dramaepisodes";
  } else if (
    url.includes("/shortdramas")
  ) {
    type = "shortdramas";
  } else if (
    url.includes("/audio-episodes")
  ) {
    type = "audiostories";
  } else if (
    url.includes("/audio-stories")
  ) {
    type = "audiostories";
  } else if (
    url.includes("/ai-reels")
  ) {
    type = "aireels";
  } else if (
    url.includes("/episodes")
  ) {
    type = "episodes";
  } else if (
    url.includes("/user")
  ) {
    type = "profile";
  } else if (
    url.includes("/support")
  ) {
    type = "support";
  }

  let subfolder = "others";

  const fieldName = String(
    file.fieldname || ""
  );

  if (
    fieldName === "poster" ||
    fieldName === "posterUrl" ||
    fieldName === "thumbnail" ||
    fieldName === "thumbnailUrl"
  ) {
    subfolder = "posters";
  } else if (
    fieldName === "banner" ||
    fieldName === "bannerUrl" ||
    fieldName === "bannerImage"
  ) {
    subfolder = "banners";
  } else if (
    fieldName === "video" ||
    fieldName === "videoUrl"
  ) {
    subfolder = "videos";
  } else if (
    fieldName === "trailer" ||
    fieldName === "trailerUrl"
  ) {
    subfolder = "trailers";
  } else if (
    fieldName === "coverImage"
  ) {
    subfolder = "covers";
  } else if (
    fieldName === "audio"
  ) {
    subfolder = "episodes";
  } else if (
    fieldName.startsWith("castImage_")
  ) {
    subfolder = "cast";
  } else if (
    fieldName === "attachments"
  ) {
    subfolder = "attachments";
  }

  return {
    type,
    subfolder,
    remoteFolder: `${type}/${subfolder}`,
  };
};

/**
 * Custom multer storage.
 *
 * IMPORTANT:
 * Nothing is saved to local /uploads.
 * The incoming stream goes directly to Bunny Storage.
 */
const storage = {
  _handleFile: async (req, file, cb) => {
    try {
      const uploadInfo =
        getUploadInfo(req, file);

      /**
       * Keep the original extension.
       *
       * Example:
       * movie.mp4 -> 172...-839....mp4
       */
      const ext =
        path.extname(
          file.originalname || ""
        ).toLowerCase();

      const uniqueName =
        `${Date.now()}-${Math.round(
          Math.random() * 1e9
        )}`;

      const filename =
        `${uniqueName}${ext}`;

      const remotePath =
        `${uploadInfo.remoteFolder}/${filename}`;

      console.log(
        "========================================"
      );

      console.log("BUNNY UPLOAD START");
      console.log(
        "FIELD:",
        file.fieldname
      );
      console.log(
        "ORIGINAL NAME:",
        file.originalname
      );
      console.log(
        "MIME TYPE:",
        file.mimetype
      );
      console.log(
        "REMOTE PATH:",
        remotePath
      );

      /**
       * Upload directly from multer stream.
       */
      const result =
        await uploadStreamToBunny({
          stream: file.stream,
          remotePath,
          contentType: file.mimetype,
        });

      console.log(
        "BUNNY UPLOAD SUCCESS"
      );

      console.log(
        "CDN URL:",
        result.url
      );

      console.log(
        "========================================"
      );

      /**
       * Multer file object.
       *
       * Controllers can use:
       *
       * req.file.path
       * req.file.cdnUrl
       * req.file.remotePath
       */
      cb(null, {
        filename,
        destination:
          uploadInfo.remoteFolder,

        path: result.url,

        cdnUrl: result.url,

        remotePath: result.path,

        size: file.size,
      });
    } catch (error) {
      console.error(
        "========================================"
      );

      console.error(
        "BUNNY UPLOAD ERROR"
      );

      console.error(
        error
      );

      console.error(
        error.message
      );

      console.error(
        "========================================"
      );

      cb(error);
    }
  },

  /**
   * Nothing to delete locally because
   * we don't create a local file.
   */
  _removeFile: (req, file, cb) => {
    cb(null);
  },
};

/**
 * Allowed normal upload MIME types.
 */
const allowedMimeTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",

  "video/mp4",
  "video/mkv",
  "video/webm",
  "video/quicktime",

  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/aac",
  "audio/m4a",
  "audio/x-m4a",
];

/**
 * Support-ticket attachments.
 */
const allowedSupportTypes = [
  "application/pdf",

  "application/msword",

  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  "application/vnd.ms-excel",

  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  "text/plain",

  "application/zip",

  "application/x-zip-compressed",

  "application/octet-stream",
];

const fileFilter = (req, file, cb) => {
  const url = String(
    req.originalUrl || ""
  ).toLowerCase();

  const isSupportRoute =
    url.includes("/support");

  if (
    allowedMimeTypes.includes(
      file.mimetype
    )
  ) {
    return cb(null, true);
  }

  if (
    isSupportRoute &&
    allowedSupportTypes.includes(
      file.mimetype
    )
  ) {
    return cb(null, true);
  }

  return cb(
    new Error(
      `Invalid file type: ${file.mimetype}`
    ),
    false
  );
};

/**
 * Upload limit MUST come from .env.
 */
const MAX_UPLOAD_SIZE = Number(
  process.env.MAX_UPLOAD_SIZE
);

if (
  !Number.isFinite(MAX_UPLOAD_SIZE) ||
  MAX_UPLOAD_SIZE <= 0
) {
  throw new Error(
    "MAX_UPLOAD_SIZE env variable is not set or invalid"
  );
}

/**
 * Multer configuration.
 */
const upload = multer({
  storage,

  fileFilter,

  limits: {
    fileSize: MAX_UPLOAD_SIZE,
  },
});

module.exports = upload;