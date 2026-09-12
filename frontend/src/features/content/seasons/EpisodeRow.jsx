import { Film, Image as ImageIcon, Edit2, Trash2, CheckCircle2 } from "lucide-react";

export default function EpisodeRow({
  episode,
  seasonIndex,
  episodeIndex,
  removeEp,
  episodeVideoFiles,
  episodeThumbnailFiles,
  onEditClick,
}) {
  const localVideo = episodeVideoFiles[`${seasonIndex}_${episodeIndex}`];
  const hasLocalVideo = !!localVideo;
  const hasVideoUrl = !!episode.videoUrl;

  const localThumb = episodeThumbnailFiles[`${seasonIndex}_${episodeIndex}`];
  const hasLocalThumb = !!localThumb;
  const hasThumbUrl = !!episode.thumbnailUrl;

  const thumbSrc = hasLocalThumb
    ? URL.createObjectURL(localThumb)
    : hasThumbUrl
    ? episode.thumbnailUrl
    : null;

  return (
    <div className="ep-row-card">
      <div className="ep-row-left">
        {/* Episode Index Circle or Thumbnail */}
        <div className="ep-thumb-preview">
          {thumbSrc ? (
            <img src={thumbSrc} alt={`Ep ${episodeIndex + 1}`} className="ep-thumb-img" />
          ) : (
            <div className="ep-index-badge">{episodeIndex + 1}</div>
          )}
        </div>

        {/* Title & Duration */}
        <div className="ep-title-block">
          <div className="ep-title-text">
            Ep {episodeIndex + 1}: {episode.title || "Untitled Episode"}
          </div>
          <div className="ep-duration-text">
            Duration: {episode.duration || "N/A"}
          </div>
        </div>
      </div>

      {/* Status Badges */}
      <div className="ep-badges-container">
        {hasLocalVideo && (
          <span className="badge-status local-badge">
            <CheckCircle2 size={12} /> Video File
          </span>
        )}
        {hasVideoUrl && !hasLocalVideo && (
          <span className="badge-status url-badge">
            <Film size={12} /> Video Stream URL
          </span>
        )}
        {!hasLocalVideo && !hasVideoUrl && (
          <span className="badge-status missing-badge">
            <Film size={12} /> No Video
          </span>
        )}

        {hasLocalThumb && (
          <span className="badge-status local-badge">
            <CheckCircle2 size={12} /> Thumb File
          </span>
        )}
        {hasThumbUrl && !hasLocalThumb && (
          <span className="badge-status url-badge">
            <ImageIcon size={12} /> Thumb URL
          </span>
        )}
        {!hasLocalThumb && !hasThumbUrl && (
          <span className="badge-status missing-badge">
            <ImageIcon size={12} /> No Thumb
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="ep-actions-block">
        <button
          type="button"
          className="ep-action-btn edit-btn"
          onClick={() => onEditClick(episodeIndex)}
          title="Edit Episode"
        >
          <Edit2 size={14} />
        </button>
        <button
          type="button"
          className="ep-action-btn delete-btn"
          onClick={() => removeEp(seasonIndex, episodeIndex)}
          title="Delete Episode"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

