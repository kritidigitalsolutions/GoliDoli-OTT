import { useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, X, Image as ImageIcon, Video, Upload, FileVideo } from "lucide-react";
import EpisodeRow from "./EpisodeRow";
import "./SeasonSection.css";

export default function SeasonSection({
  season,
  seasonIndex,
  addEp,
  removeSeason,

  chEp,
  removeEp,

  episodeVideoFiles,
  episodeThumbnailFiles,

  handleEpisodeVideoChange,
  handleEpisodeThumbnailChange,

  setEpisodeVideoFiles,
  setEpisodeThumbnailFiles,
  form,
  setForm,
}) {
  // Prevent Enter key from submitting form when typing inside input fields
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT") {
      e.preventDefault();
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEpisodeIndex, setEditingEpisodeIndex] = useState(null);

  // Form states
  const [epTitle, setEpTitle] = useState("");
  const [epDuration, setEpDuration] = useState("");
  const [epVideoFile, setEpVideoFile] = useState(null);
  const [epVideoUrl, setEpVideoUrl] = useState("");
  const [epThumbFile, setEpThumbFile] = useState(null);
  const [epThumbUrl, setEpThumbUrl] = useState("");

  const openAddModal = () => {
    setEditingEpisodeIndex(null);
    setEpTitle("");
    setEpDuration("");
    setEpVideoFile(null);
    setEpVideoUrl("");
    setEpThumbFile(null);
    setEpThumbUrl("");
    setIsModalOpen(true);
  };

  const openEditModal = (episodeIndex) => {
    const ep = season.episodes[episodeIndex];
    setEditingEpisodeIndex(episodeIndex);
    setEpTitle(ep.title || "");
    setEpDuration(ep.duration || "");

    const key = `${seasonIndex}_${episodeIndex}`;
    const localVideo = episodeVideoFiles[key];
    const localThumb = episodeThumbnailFiles[key];

    setEpVideoFile(localVideo || null);
    setEpVideoUrl(localVideo ? "" : (ep.videoUrl || ""));

    setEpThumbFile(localThumb || null);
    setEpThumbUrl(localThumb ? "" : (ep.thumbnailUrl || ""));

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSaveEpisode = () => {
    if (!epTitle) {
      alert("Episode title is required");
      return;
    }

    if (editingEpisodeIndex !== null) {
      // Edit existing
      setForm((f) => ({
        ...f,
        seasons: f.seasons.map((s, i) =>
          i === seasonIndex
            ? {
                ...s,
                episodes: s.episodes.map((ep, j) =>
                  j === editingEpisodeIndex
                    ? {
                        ...ep,
                        title: epTitle,
                        duration: epDuration,
                        videoUrl: epVideoUrl || "",
                        thumbnailUrl: epThumbUrl || "",
                      }
                    : ep
                ),
              }
            : s
        ),
      }));

      // Update file pointers
      const key = `${seasonIndex}_${editingEpisodeIndex}`;
      setEpisodeVideoFiles((prev) => {
        const next = { ...prev };
        if (epVideoFile) {
          next[key] = epVideoFile;
        } else {
          delete next[key];
        }
        return next;
      });

      setEpisodeThumbnailFiles((prev) => {
        const next = { ...prev };
        if (epThumbFile) {
          next[key] = epThumbFile;
        } else {
          delete next[key];
        }
        return next;
      });

    } else {
      // Add new
      const newIndex = season.episodes.length;
      
      setForm((f) => ({
        ...f,
        seasons: f.seasons.map((s, i) =>
          i === seasonIndex
            ? {
                ...s,
                episodes: [
                  ...s.episodes,
                  {
                    title: epTitle,
                    duration: epDuration,
                    videoUrl: epVideoUrl || "",
                    thumbnailUrl: epThumbUrl || "",
                  },
                ],
              }
            : s
        ),
      }));

      // Update file pointers
      const key = `${seasonIndex}_${newIndex}`;
      if (epVideoFile) {
        setEpisodeVideoFiles((prev) => ({ ...prev, [key]: epVideoFile }));
      }
      if (epThumbFile) {
        setEpisodeThumbnailFiles((prev) => ({ ...prev, [key]: epThumbFile }));
      }
    }

    closeModal();
  };

  return (
    <div
      className="season-block"
      style={{ marginBottom: 18 }}
    >
      <div
        className="season-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <strong>
            {form?.type === "microdrama" ? "All Episodes" : `Season ${season.seasonNumber}`}
          </strong>

          <span className="season-count">
            {season.episodes.length} episodes
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
          }}
        >
          <button
            type="button"
            className="btn btn-primary"
            onClick={openAddModal}
          >
            <Plus size={16} />
            Add Episode
          </button>

          {form?.type !== "microdrama" && (
            <button
              type="button"
              className="btn btn-ghost del-season-btn"
              onClick={() => removeSeason(seasonIndex)}
              aria-label={`Remove season ${season.seasonNumber}`}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div
        className="season-content"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {season.episodes.map(
          (episode, episodeIndex) => (
            <EpisodeRow
              key={episodeIndex}
              episode={episode}
              seasonIndex={seasonIndex}
              episodeIndex={episodeIndex}
              removeEp={removeEp}
              episodeVideoFiles={episodeVideoFiles}
              episodeThumbnailFiles={episodeThumbnailFiles}
              onEditClick={openEditModal}
            />
          )
        )}
      </div>

      {/* Blocking Form Modal */}
      {isModalOpen && createPortal(
        <div
          className="episode-modal-overlay"
          onClick={closeModal}
        >
          <div
            className="episode-modal"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            <div className="episode-modal-header">
              <h3>
                {editingEpisodeIndex !== null ? "Edit Episode" : form?.type === "microdrama" ? "Add Episode" : "Add Episode"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="episode-modal-close"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="episode-modal-body">
              <div className="episode-details-grid">
              <div className="form-row">
                <label className="form-label">Episode Title *</label>
                <input
                  className="form-input"
                  style={{ width: "100%" }}
                  value={epTitle}
                  onChange={(e) => setEpTitle(e.target.value)}
                  placeholder="e.g. The Beginning"
                />
              </div>

              {/* Duration */}
              <div className="form-row">
                <label className="form-label">Duration</label>
                <input
                  className="form-input"
                  style={{ width: "100%" }}
                  value={epDuration}
                  onChange={(e) => setEpDuration(e.target.value)}
                  placeholder="e.g. 45m"
                />
              </div>
              </div>

              <div className="episode-media-grid">
              <div className="episode-source-block">
                <p className="episode-source-title"><Video size={15} /> Video source</p>
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    accept="video/*"
                    id="modal-ep-video"
                    className="file-input"
                    onChange={(e) => {
                      setEpVideoFile(e.target.files[0]);
                      setEpVideoUrl("");
                    }}
                  />
                  <label htmlFor="modal-ep-video" className="file-label">
                    {epVideoFile
                      ? <><FileVideo size={14} style={{ flexShrink: 0 }} /> {epVideoFile.name.length > 28 ? epVideoFile.name.slice(0, 26) + "…" : epVideoFile.name}</>
                      : <><Upload size={14} style={{ flexShrink: 0 }} /> Choose Video File</>}
                  </label>
                </div>

                <div className="episode-source-divider">OR</div>

                <input
                  className="form-input"
                  style={{ width: "100%" }}
                  value={epVideoUrl}
                  onChange={(e) => {
                    setEpVideoUrl(e.target.value);
                    if (e.target.value) setEpVideoFile(null);
                  }}
                  placeholder="Paste video stream URL"
                />
              </div>
              <div className="episode-source-block">
                <p className="episode-source-title"><ImageIcon size={15} /> Thumbnail source</p>
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    accept="image/*"
                    id="modal-ep-thumb"
                    className="file-input"
                    onChange={(e) => {
                      setEpThumbFile(e.target.files[0]);
                      setEpThumbUrl("");
                    }}
                  />
                  <label htmlFor="modal-ep-thumb" className="file-label">
                    {epThumbFile
                      ? <><ImageIcon size={14} style={{ flexShrink: 0 }} /> {epThumbFile.name.length > 28 ? epThumbFile.name.slice(0, 26) + "…" : epThumbFile.name}</>
                      : <><Upload size={14} style={{ flexShrink: 0 }} /> Choose Thumbnail File</>}
                  </label>
                </div>

                <div className="episode-source-divider">OR</div>

                <input
                  className="form-input"
                  style={{ width: "100%" }}
                  value={epThumbUrl}
                  onChange={(e) => {
                    setEpThumbUrl(e.target.value);
                    if (e.target.value) setEpThumbFile(null);
                  }}
                  placeholder="Paste thumbnail image URL"
                />
              </div>
              </div>
            </div>

            <div className="episode-modal-footer">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveEpisode}
              >
                {editingEpisodeIndex !== null ? "Save Changes" : "Add Episode"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
