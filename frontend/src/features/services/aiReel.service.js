import API from "../../api/axios";
import { uploadToBunny, uploadToBunnyStream } from "./bunnyUpload";

export const getAIReels = async () => {
  const response = await API.get("/admin/ai-reels");
  return response.data;
};

export const createAIReel = async ({ form, videoFile, thumbnailFile, onProgress, onPhase }) => {
  // 1. Upload thumbnail to Bunny Storage
  let thumbnailUrl = form.thumbnail || form.thumbnailUrl || "";
  if (thumbnailFile) {
    if (onPhase) onPhase("thumbnail");
    thumbnailUrl = await uploadToBunny(thumbnailFile, "aireels", "posters");
  }

  // 2. Upload video to Bunny Stream
  let videoUrl = form.videoUrl || "";
  if (videoFile) {
    if (onPhase) onPhase("video");
    videoUrl = await uploadToBunnyStream(
      videoFile,
      form.title || "AI Reel",
      "aireels",
      onProgress
    );
  }

  if (onPhase) onPhase("saving");
  // 3. Post to backend
  const formData = new FormData();
  formData.append("title", form.title);
  formData.append("description", form.description || "");
  formData.append("duration", form.duration || "");
  formData.append("priority", Number(form.priority) || 0);
  formData.append("isPublished", String(form.isPublished !== false));
  formData.append("thumbnail", thumbnailUrl);
  formData.append("thumbnailUrl", thumbnailUrl);
  formData.append("videoUrl", videoUrl);

  const response = await API.post("/admin/ai-reels", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const updateAIReel = async (id, { form, videoFile, thumbnailFile, onProgress, onPhase }) => {
  // 1. Upload thumbnail to Bunny Storage if updated
  let thumbnailUrl = form.thumbnail || form.thumbnailUrl || "";
  if (thumbnailFile) {
    if (onPhase) onPhase("thumbnail");
    thumbnailUrl = await uploadToBunny(thumbnailFile, "aireels", "posters");
  }

  // 2. Upload video to Bunny Stream if updated
  let videoUrl = form.videoUrl || "";
  if (videoFile) {
    if (onPhase) onPhase("video");
    videoUrl = await uploadToBunnyStream(
      videoFile,
      form.title || "AI Reel",
      "aireels",
      onProgress
    );
  }

  if (onPhase) onPhase("saving");
  // 3. Patch to backend
  const formData = new FormData();
  formData.append("title", form.title);
  formData.append("description", form.description || "");
  formData.append("duration", form.duration || "");
  formData.append("priority", Number(form.priority) || 0);
  formData.append("isPublished", String(form.isPublished !== false));
  if (thumbnailUrl) {
    formData.append("thumbnail", thumbnailUrl);
    formData.append("thumbnailUrl", thumbnailUrl);
  }
  if (videoUrl) formData.append("videoUrl", videoUrl);

  const response = await API.patch(`/admin/ai-reels/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const deleteAIReel = async (id) => {
  const response = await API.delete(`/admin/ai-reels/${id}`);
  return response.data;
};
