const fs = require("fs/promises");
const https = require("https");
const path = require("path");

const normalizeBaseUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/\/+$/, "");

const normalizeStorageHost = (value) => {
  if (!value) {
    return "storage.bunnycdn.com";
  }

  return String(value)
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
};

const getStorageHosts = (storageHost) => {
  return [
    ...new Set(
      [
        normalizeStorageHost(storageHost),
        "storage.bunnycdn.com",
      ].filter(Boolean)
    ),
  ];
};

const encodePathPart = (part) => {
  try {
    return encodeURIComponent(decodeURIComponent(part));
  } catch {
    return encodeURIComponent(part);
  }
};

const sanitizeRemotePath = (remotePath) => {
  const normalized = String(remotePath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  const parts = normalized.split("/").filter(Boolean);

  if (!parts.length) {
    throw new Error("Bunny remote path cannot be empty");
  }

  if (parts.some((part) => part === "." || part === "..")) {
    throw new Error("Invalid Bunny remote path");
  }

  return parts.map(encodePathPart).join("/");
};

/**
 * Get Bunny configuration.
 */
const getConfig = () => {
  const storageZone = String(
    process.env.BUNNY_STORAGE_ZONE || ""
  ).trim();

  const accessKey = String(
    process.env.BUNNY_ACCESS_KEY || ""
  ).trim();

  const storageHost = normalizeStorageHost(
    process.env.BUNNY_STORAGE_HOST
  );

  const cdnUrl = normalizeBaseUrl(
    process.env.BUNNY_CDN_URL
  );

  const missing = [];

  if (!storageZone) {
    missing.push("BUNNY_STORAGE_ZONE");
  }

  if (!accessKey) {
    missing.push("BUNNY_ACCESS_KEY");
  }

  if (!cdnUrl) {
    missing.push("BUNNY_CDN_URL");
  }

  if (missing.length) {
    throw new Error(
      `Missing Bunny environment variables: ${missing.join(", ")}`
    );
  }

  return {
    storageZone,
    accessKey,
    storageHost,
    storageHosts: getStorageHosts(storageHost),
    cdnUrl,
  };
};

/**
 * Build public CDN URL.
 */
const buildPublicUrl = (remotePath) => {
  const { cdnUrl } = getConfig();

  const safeRemotePath = sanitizeRemotePath(remotePath);

  return `${cdnUrl}/${safeRemotePath}`;
};

/**
 * Client-facing Bunny config, used by the admin panel
 * to upload files directly from the browser straight to
 * Bunny Storage (bypassing our own server for large files).
 *
 * NOTE: This intentionally exposes the storage AccessKey to
 * any authenticated admin. Only call this behind isAdmin.
 */
const getClientUploadConfig = () => {
  const {
    storageZone,
    accessKey,
    storageHosts,
    cdnUrl,
  } = getConfig();

  return {
    storageZone,
    accessKey,
    storageHosts,
    cdnUrl,
  };
};

/**
 * Upload stream using Node HTTPS.
 */
const uploadStreamRequest = ({
  stream,
  uploadUrl,
  headers,
  timeoutMs = 30 * 60 * 1000,
}) => {
  return new Promise((resolve, reject) => {
    const req = https.request(
      uploadUrl,
      {
        method: "PUT",
        headers,
        timeout: timeoutMs,
      },
      (res) => {
        let body = "";

        res.setEncoding("utf8");

        res.on("data", (chunk) => {
          body += chunk;
        });

        res.on("end", () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            statusText: res.statusMessage,
            body,
          });
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(
        new Error("Bunny upload timed out")
      );
    });

    req.on("error", reject);

    stream.on("error", reject);

    stream.pipe(req);
  });
};

/**
 * Upload stream to Bunny Storage.
 *
 * This is the main function used by multer.
 */
const uploadStreamToBunny = async ({
  stream,
  remotePath,
  contentType = "application/octet-stream",
  contentLength,
}) => {
  if (!stream) {
    throw new Error("Bunny upload stream is required");
  }

  const {
    storageZone,
    accessKey,
    storageHosts,
  } = getConfig();

  const safeRemotePath =
    sanitizeRemotePath(remotePath);

  const headers = {
    AccessKey: accessKey,
    "Content-Type": contentType,
  };

  if (contentLength) {
    headers["Content-Length"] =
      String(contentLength);
  }

  let lastError = null;

  for (const host of storageHosts) {
    const uploadUrl =
      `https://${host}/${storageZone}/${safeRemotePath}`;

    try {
      console.log(
        `Uploading to Bunny: ${uploadUrl}`
      );

      const response =
        await uploadStreamRequest({
          stream,
          uploadUrl,
          headers,
        });

      if (response.ok) {
        return {
          path: safeRemotePath,
          url: buildPublicUrl(safeRemotePath),
        };
      }

      const errorMessage =
        response.body ||
        response.statusText ||
        `HTTP ${response.status}`;

      lastError = new Error(
        `Bunny upload failed (${response.status}): ${errorMessage}`
      );

      if (response.status !== 401) {
        throw lastError;
      }
    } catch (error) {
      lastError = error;
      throw lastError;
    }
  }

  throw (
    lastError ||
    new Error("Bunny upload failed")
  );
};

/**
 * Upload Buffer.
 */
const uploadBufferToBunny = async ({
  buffer,
  remotePath,
  contentType = "application/octet-stream",
}) => {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error(
      "Bunny upload buffer is required"
    );
  }

  const {
    storageZone,
    accessKey,
    storageHosts,
  } = getConfig();

  const safeRemotePath =
    sanitizeRemotePath(remotePath);

  const uploadUrl =
    `https://${storageHosts[0]}/${storageZone}/${safeRemotePath}`;

  const response = await fetch(uploadUrl, {
    method: "PUT",

    headers: {
      AccessKey: accessKey,
      "Content-Type": contentType,
      "Content-Length": String(buffer.length),
    },

    body: buffer,
  });

  if (!response.ok) {
    const message =
      await response.text().catch(() => "");

    throw new Error(
      `Bunny upload failed (${response.status}): ${
        message || response.statusText
      }`
    );
  }

  return {
    path: safeRemotePath,
    url: buildPublicUrl(safeRemotePath),
  };
};

/**
 * Upload existing local file to Bunny.
 */
const uploadFileToBunny = async ({
  filePath,
  remotePath,
  contentType,
}) => {
  const buffer =
    await fs.readFile(filePath);

  return uploadBufferToBunny({
    buffer,
    remotePath,
    contentType,
  });
};

/**
 * Upload multer file to Bunny.
 */
const uploadMulterFileToBunny = async (
  file,
  remoteFolder = ""
) => {
  if (!file) {
    return null;
  }

  const fileName =
    file.filename ||
    `${Date.now()}-${file.originalname}`;

  const remotePath = path.posix.join(
    String(remoteFolder || "")
      .replace(/\\/g, "/"),
    fileName
  );

  if (file.buffer) {
    return uploadBufferToBunny({
      buffer: file.buffer,
      remotePath,
      contentType: file.mimetype,
    });
  }

  return uploadFileToBunny({
    filePath: file.path,
    remotePath,
    contentType: file.mimetype,
  });
};

/**
 * Delete file from Bunny.
 */
const deleteFromBunny = async (
  remotePathOrUrl
) => {
  const {
    storageZone,
    accessKey,
    storageHosts,
    cdnUrl,
  } = getConfig();

  let remotePath =
    String(remotePathOrUrl || "");

  if (remotePath.startsWith(cdnUrl)) {
    remotePath =
      remotePath.slice(cdnUrl.length);
  }

  const safeRemotePath =
    sanitizeRemotePath(remotePath);

  const deleteUrl =
    `https://${storageHosts[0]}/${storageZone}/${safeRemotePath}`;

  const response = await fetch(deleteUrl, {
    method: "DELETE",

    headers: {
      AccessKey: accessKey,
    },
  });

  if (
    !response.ok &&
    response.status !== 404
  ) {
    const message =
      await response.text().catch(() => "");

    throw new Error(
      `Bunny delete failed (${response.status}): ${
        message || response.statusText
      }`
    );
  }

  return true;
};

module.exports = {
  buildPublicUrl,
  deleteFromBunny,
  getClientUploadConfig,
  uploadBufferToBunny,
  uploadFileToBunny,
  uploadMulterFileToBunny,
  uploadStreamToBunny,
};