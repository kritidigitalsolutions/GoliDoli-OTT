import PosterUploader from "../uploads/PosterUploader";
import BannerUploader from "../uploads/BannerUploader";
import TrailerUploader from "../uploads/TrailerUploader";
import VideoUploader from "../uploads/VideoUploader";
import { Images, Film } from "lucide-react";

export default function MediaAssetsStep({
  form,
  ch,

  posterFile,
  posterInputRef,
  handlePosterFileChange,
  onRemovePosterFile,

  bannerFile,
  bannerInputRef,
  handleBannerFileChange,
  onRemoveBannerFile,

  trailerFile,
  trailerInputRef,
  handleTrailerFileChange,
  onRemoveTrailerFile,

  videoFile,
  videoInputRef,
  handleVideoFileChange,
  onRemoveVideoFile,

  type,
  isComingSoon,
}) {
  return (
    <div className="form-card media-assets-card">
      <div className="card-header-styled">
        <h3 className="section-title">
          <span className="title-icon-wrap">
            <Images size={20} />
          </span>

          <div>
            Visual Assets & CDN Media Streams
            <small>
              Attach high-resolution poster artwork, landscape banners, video trailers, and master movie streams.
            </small>
          </div>
        </h3>
      </div>

      {/* Graphics Assets Row (2-Column Grid) */}
      <div className="media-graphics-grid">
        <PosterUploader
          file={posterFile}
          value={form.poster}
          onUrlChange={ch}
          inputRef={posterInputRef}
          onFileChange={handlePosterFileChange}
          onRemoveFile={onRemovePosterFile}
        />

        <BannerUploader
          file={bannerFile}
          value={form.banner}
          onUrlChange={ch}
          inputRef={bannerInputRef}
          onFileChange={handleBannerFileChange}
          onRemoveFile={onRemoveBannerFile}
        />
      </div>

      {/* Video Streams Row */}
      <div className="media-streams-section" style={{ marginTop: 20 }}>
        {type !== "microdrama" && (
          <TrailerUploader
            file={trailerFile}
            value={form.trailerUrl}
            onUrlChange={ch}
            inputRef={trailerInputRef}
            onFileChange={handleTrailerFileChange}
            onRemoveFile={onRemoveTrailerFile}
          />
        )}

        {type === "movie" && !isComingSoon && (
          <VideoUploader
            file={videoFile}
            value={form.videoUrl}
            onUrlChange={ch}
            inputRef={videoInputRef}
            onFileChange={handleVideoFileChange}
            onRemoveFile={onRemoveVideoFile}
          />
        )}
      </div>
    </div>
  );
}


