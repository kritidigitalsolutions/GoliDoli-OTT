import API from "../../api/axios";
import { uploadToBunny } from "./bunnyUpload";

export const createAudioStory = async ({
  form,
  coverImageFile,
  bannerImageFile,
  episodeVideoFiles,
  episodeThumbnailFiles,
  onCoverProgress,
  onBannerProgress,
  onEpisodeProgress,
}) => {
  // 1. Upload Cover Image directly to Bunny CDN
  let coverImageUrl = form.coverImage || "";
  if (coverImageFile) {
    if (onCoverProgress) onCoverProgress(50);
    coverImageUrl = await uploadToBunny(coverImageFile, "audiostories", "covers", (percent) => {
      if (onCoverProgress) onCoverProgress(50 + Math.round(percent / 2));
    });
  } else if (onCoverProgress) {
    onCoverProgress(100);
  }

  // 2. Upload Banner Image directly to Bunny CDN
  let bannerImageUrl = form.bannerImage || "";
  if (bannerImageFile) {
    if (onBannerProgress) onBannerProgress(50);
    bannerImageUrl = await uploadToBunny(bannerImageFile, "audiostories", "banners", (percent) => {
      if (onBannerProgress) onBannerProgress(50 + Math.round(percent / 2));
    });
  } else if (onBannerProgress) {
    onBannerProgress(100);
  }

  // 3. Build Text-only Request Data
  const endpoint = "/admin/audio-stories";
  const formData = new FormData();

  formData.append("title", form.title);
  formData.append("description", form.description);
  formData.append("author", form.author);
  formData.append("narrator", form.narrator);
  formData.append("isPremium", String(form.isPremium));
  formData.append("isPublished", String(form.isPublished !== false));
  formData.append("isComingSoon", String(form.isComingSoon));
  if (form.scheduleDate) formData.append("scheduleDate", form.scheduleDate);
  formData.append("priority", Number(form.priority) || 0);

  formData.append(
    "parsedCategories",
    JSON.stringify(Array.isArray(form.categories) ? form.categories : (form.categories ? [form.categories] : []))
  );

  // Send the Bunny CDN URLs directly as text inputs!
  formData.append("coverImage", coverImageUrl);
  formData.append("bannerImage", bannerImageUrl);

  console.log("POSTING AUDIO STORY DATA");
  console.log({
    coverImage: coverImageUrl,
    bannerImage: bannerImageUrl,
  });

  // Post meta to the backend (Express backend will save to DB instantly!)
  const response = await API.post(endpoint, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  console.log("AUDIO STORY CREATED");
  console.log(response.data);

  // 4. Upload individual episodes.
  if (form.episodes && form.episodes.length > 0) {
    const storyId = response.data.story._id;
    const totalEpisodes = form.episodes.length;
    let currentEpisodeNum = 1;

    for (const [ei, ep] of form.episodes.entries()) {
      let epAudioUrl = ep.audioUrl || "";
      let epThumbnailUrl = ep.thumbnailUrl || "";

      // Track episode uploading status
      const epNum = currentEpisodeNum++;

      // Direct upload episode audio file
      if (episodeVideoFiles[ei]) {
        epAudioUrl = await uploadToBunny(
          episodeVideoFiles[ei],
          "audiostories",
          "episodes",
          (percent) => {
            if (onEpisodeProgress) {
              // Audio takes up 80% of the upload progress
              const videoPct = Math.round(percent * 0.8);
              onEpisodeProgress(epNum, totalEpisodes, videoPct);
            }
          }
        );
      }

      // Direct upload episode thumbnail
      if (episodeThumbnailFiles[ei]) {
        epThumbnailUrl = await uploadToBunny(
          episodeThumbnailFiles[ei],
          "audiostories",
          "posters",
          (percent) => {
            if (onEpisodeProgress) {
              // Thumbnail takes up the remaining 20%
              const thumbPct = 80 + Math.round(percent * 0.2);
              onEpisodeProgress(epNum, totalEpisodes, thumbPct);
            }
          }
        );
      }

      // Build simple text data for episode additions
      const epFormData = new FormData();
      epFormData.append("storyId", storyId);
      epFormData.append("episodeNumber", ei + 1);
      epFormData.append("title", ep.title);
      epFormData.append("description", ep.description || "");
      epFormData.append("duration", ep.duration || 0);
      epFormData.append("audioUrl", epAudioUrl);
      epFormData.append("thumbnail", epThumbnailUrl);

      // Submit metadata to backend
      const epAddRoute = "/admin/audio-episodes";
      await API.post(epAddRoute, epFormData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Set to 100% complete for this episode
      if (onEpisodeProgress) {
        onEpisodeProgress(epNum, totalEpisodes, 100);
      }
    }
  }

  return response.data;
};
