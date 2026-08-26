import API from "../../api/axios";
import { uploadToBunny } from "./bunnyUpload";

export const getAIReels = async () => {
  const response = await API.get("/admin/ai-reels");
  return response.data;
};

export const createAIReel = async ({ form, videoFile, thumbnailFile, onProgress }) => {
  // 1. Upload thumbnail
  let thumbnailUrl = form.thumbnail || "";
  if (thumbnailFile) {
    thumbnailUrl = await uploadToBunny(thumbnailFile, "aireels", "posters");
  }

  // 2. Upload video
  let videoUrl = form.videoUrl || "";
  if (videoFile) {
    videoUrl = await uploadToBunny(videoFile, "aireels", "videos", onProgress);
  }

  // 3. Post to backend
  const formData = new FormData();
  formData.append("title", form.title);
  formData.append("description", form.description || "");
  formData.append("duration", form.duration || "");
  formData.append("priority", Number(form.priority) || 0);
  formData.append("isPublished", String(form.isPublished !== false));
  formData.append("thumbnail", thumbnailUrl);
  formData.append("videoUrl", videoUrl);

  const response = await API.post("/admin/ai-reels", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const updateAIReel = async (id, { form, videoFile, thumbnailFile, onProgress }) => {
  // 1. Upload thumbnail if updated
  let thumbnailUrl = form.thumbnail || "";
  if (thumbnailFile) {
    thumbnailUrl = await uploadToBunny(thumbnailFile, "aireels", "posters");
  }

  // 2. Upload video if updated
  let videoUrl = form.videoUrl || "";
  if (videoFile) {
    videoUrl = await uploadToBunny(videoFile, "aireels", "videos", onProgress);
  }

  // 3. Patch to backend
  const formData = new FormData();
  formData.append("title", form.title);
  formData.append("description", form.description || "");
  formData.append("duration", form.duration || "");
  formData.append("priority", Number(form.priority) || 0);
  formData.append("isPublished", String(form.isPublished !== false));
  if (thumbnailUrl) formData.append("thumbnail", thumbnailUrl);
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
