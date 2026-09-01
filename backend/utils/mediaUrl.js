const { deleteFromBunny } = require("../cdn/bunnyCDN");

/**
 * Returns the CDN URL for a multer-processed file, or the fallback value.
 *
 * @param {Object|null} file - Multer file object (may have cdnUrl, path)
 * @param {string} fallback - Fallback value (e.g. req.body.poster which may already be a CDN URL)
 * @returns {string} The CDN URL or fallback
 */
const getMediaUrl = (file, fallback = "") => {
  if (!file) return fallback;
  // cdnUrl is set by our custom multer storage engine (upload.middleware.js)
  return file.cdnUrl || file.path || fallback;
};

/**
 * Deletes a media file from BunnyCDN.
 *
 * @param {string} filePath - CDN URL to delete
 */
const deleteMedia = async (filePath) => {
  if (!filePath) return;

  if (typeof filePath === "string" && filePath.startsWith("http")) {
    try {
      await deleteFromBunny(filePath);
    } catch (err) {
      console.error("BunnyCDN delete error:", err.message);
    }
    return;
  }

  // Non-HTTP paths are ignored — all new media uses CDN URLs
  console.warn("[SKIP] Non-CDN path encountered, skipping delete:", filePath);
};

/**
 * Deletes multiple media files in parallel.
 *
 * @param  {...string} files - URLs to delete
 */
const deleteMediaFiles = async (...files) => {
  await Promise.all(
    files
      .filter(Boolean)
      .map((file) => deleteMedia(file))
  );
};

module.exports = {
  getMediaUrl,
  deleteMedia,
  deleteMediaFiles,
};

