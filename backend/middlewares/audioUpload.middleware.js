const multer = require("multer");

const memoryStorage = multer.memoryStorage();

const audioFileFilter = (req, file, cb) => {
  const allowedImageTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/avif",
    "image/gif",
  ];
  const allowedAudioTypes = [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/ogg",
    "audio/aac",
    "audio/m4a",
    "audio/x-m4a",
  ];

  const field = file.fieldname;

  if (
    field === "coverImage" ||
    field === "bannerImage" ||
    field === "thumbnail"
  ) {
    if (allowedImageTypes.includes(file.mimetype)) {
      return cb(null, true);
    }
    return cb(
      new Error(
        `Invalid image file type for ${field}. Allowed: JPG, PNG, WEBP, AVIF, GIF`
      ),
      false
    );
  }

  if (field === "audio") {
    const extension = file.originalname.split(".").pop().toLowerCase();
    const hasAudioMime = allowedAudioTypes.includes(file.mimetype);
    const hasAudioExt = ["mp3", "wav", "ogg", "aac", "m4a"].includes(extension);

    if (hasAudioMime || hasAudioExt) {
      return cb(null, true);
    }
    return cb(
      new Error(
        "Invalid audio file type. Allowed formats: MP3, WAV, OGG, AAC, M4A"
      ),
      false
    );
  }

  // Allow other fields to pass filter
  cb(null, true);
};

const audioUpload = multer({
  storage: memoryStorage,
  fileFilter: audioFileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB limit for audio and image uploads
  },
});

module.exports = audioUpload;
