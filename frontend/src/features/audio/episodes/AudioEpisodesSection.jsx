import { useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, X, Image as ImageIcon, Mic, Upload, Music } from "lucide-react";
import "../../content/seasons/SeasonSection.css"; // Reuse existing css if applicable

const AudioEpisodeRow = ({
  episode,
  episodeIndex,
  removeEp,
  episodeVideoFiles,
  episodeThumbnailFiles,
  onEditClick,
}) => {
  const localAudio = episodeVideoFiles[episodeIndex];
  const localThumb = episodeThumbnailFiles[episodeIndex];

  return (
    <div className="episode-row">
      <div className="ep-info">
        <span className="ep-num">
          {String(episodeIndex + 1).padStart(2, "0")}
        </span>

        <div
          className="ep-thumbnail-preview"
          style={{
            width: 80,
            height: 45,
            background: "#222",
            borderRadius: 6,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
            flexShrink: 0,
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {localThumb ? (
            <img
              src={URL.createObjectURL(localThumb)}
              alt="Thumbnail"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : episode.thumbnailUrl ? (
            <img
              src={episode.thumbnailUrl}
              alt="Thumbnail"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <ImageIcon size={16} color="rgba(255,255,255,0.2)" />
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <span className="ep-title">{episode.title || "Untitled Episode"}</span>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {episode.duration && (
              <span className="ep-duration" style={{ fontSize: "0.75rem", color: "#aaa" }}>
                {episode.duration}
              </span>
            )}
            <span
              className="ep-status-pill"
              style={{
                fontSize: "10px",
                padding: "2px 6px",
                borderRadius: 4,
                background:
                  localAudio || episode.audioUrl
                    ? "rgba(16, 185, 129, 0.15)"
                    : "rgba(245, 158, 11, 0.15)",
                color:
                  localAudio || episode.audioUrl
                    ? "#10b981"
                    : "#f59e0b",
              }}
            >
              {localAudio || episode.audioUrl ? "Audio Added" : "No Audio"}
            </span>
          </div>
        </div>
      </div>

      <div className="ep-actions">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => onEditClick(episodeIndex)}
        >
          Edit
        </button>

        <button
          type="button"
          className="btn btn-ghost del-ep-btn"
          onClick={() => removeEp(episodeIndex)}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

export default function AudioEpisodesSection({
  form,
  setForm,
  addEp,
  removeEp,
  chEp,
  episodeVideoFiles,
  episodeThumbnailFiles,
  setEpisodeVideoFiles,
  setEpisodeThumbnailFiles,
}) {
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
  const [epDesc, setEpDesc] = useState("");
  const [epAudioFile, setEpAudioFile] = useState(null);
  const [epAudioUrl, setEpAudioUrl] = useState("");
  const [epThumbFile, setEpThumbFile] = useState(null);
  const [epThumbUrl, setEpThumbUrl] = useState("");

  const openAddModal = () => {
    setEditingEpisodeIndex(null);
    setEpTitle("");
    setEpDuration("");
    setEpDesc("");
    setEpAudioFile(null);
    setEpAudioUrl("");
    setEpThumbFile(null);
    setEpThumbUrl("");
    setIsModalOpen(true);
  };

  const openEditModal = (episodeIndex) => {
    const ep = form.episodes[episodeIndex];
    setEditingEpisodeIndex(episodeIndex);
    setEpTitle(ep.title || "");
    setEpDuration(ep.duration || "");
    setEpDesc(ep.description || "");

    const localAudio = episodeVideoFiles[episodeIndex];
    const localThumb = episodeThumbnailFiles[episodeIndex];

    setEpAudioFile(localAudio || null);
    setEpAudioUrl(localAudio ? "" : (ep.audioUrl || ""));

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
        episodes: f.episodes.map((ep, j) =>
          j === editingEpisodeIndex
            ? {
                ...ep,
                title: epTitle,
                duration: epDuration,
                description: epDesc,
                audioUrl: epAudioUrl || "",
                thumbnailUrl: epThumbUrl || "",
              }
            : ep
        ),
      }));

      // Update file pointers
      setEpisodeVideoFiles((prev) => {
        const next = { ...prev };
        if (epAudioFile) {
          next[editingEpisodeIndex] = epAudioFile;
        } else {
          delete next[editingEpisodeIndex];
        }
        return next;
      });

      setEpisodeThumbnailFiles((prev) => {
        const next = { ...prev };
        if (epThumbFile) {
          next[editingEpisodeIndex] = epThumbFile;
        } else {
          delete next[editingEpisodeIndex];
        }
        return next;
      });
    } else {
      // Add new
      const newIndex = form.episodes.length;

      setForm((f) => ({
        ...f,
        episodes: [
          ...f.episodes,
          {
            title: epTitle,
            duration: epDuration,
            description: epDesc,
            audioUrl: epAudioUrl || "",
            thumbnailUrl: epThumbUrl || "",
          },
        ],
      }));

      // Update file pointers
      if (epAudioFile) {
        setEpisodeVideoFiles((prev) => ({ ...prev, [newIndex]: epAudioFile }));
      }
      if (epThumbFile) {
        setEpisodeThumbnailFiles((prev) => ({ ...prev, [newIndex]: epThumbFile }));
      }
    }

    closeModal();
  };

  return (
    <div className="premium-card" style={{ animation: "pageIn 0.4s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h3 className="section-title" style={{ marginBottom: 0 }}>
          <span><Mic size={18} /></span> Episodes
        </h3>

        <button type="button" className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} /> Add Episode
        </button>
      </div>

      <div className="season-content" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {form.episodes.map((episode, episodeIndex) => (
          <AudioEpisodeRow
            key={episodeIndex}
            episode={episode}
            episodeIndex={episodeIndex}
            removeEp={removeEp}
            episodeVideoFiles={episodeVideoFiles}
            episodeThumbnailFiles={episodeThumbnailFiles}
            onEditClick={openEditModal}
          />
        ))}

        {form.episodes.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              background: "rgba(255,255,255,0.02)",
              borderRadius: "16px",
              border: "2px dashed rgba(255,255,255,0.05)",
            }}
          >
            <Mic size={48} style={{ color: "rgba(255,255,255,0.1)", marginBottom: 16 }} />
            <p style={{ color: "var(--text-muted)" }}>Click "Add Episode" to start building your audio story</p>
          </div>
        )}
      </div>

      {isModalOpen && createPortal(
        <div className="episode-modal-overlay" onClick={closeModal}>
          <div className="episode-modal" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
            <div className="episode-modal-header">
              <h3>{editingEpisodeIndex !== null ? "Edit Episode" : "Add Episode"}</h3>
              <button type="button" onClick={closeModal} className="episode-modal-close" aria-label="Close dialog">
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
                    placeholder="e.g. Chapter 1"
                  />
                </div>

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

              <div className="form-row" style={{ marginTop: 15 }}>
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  style={{ width: "100%", height: 80 }}
                  value={epDesc}
                  onChange={(e) => setEpDesc(e.target.value)}
                  placeholder="Episode description..."
                />
              </div>

              <div className="episode-media-grid" style={{ marginTop: 20 }}>
                <div className="episode-source-block">
                  <p className="episode-source-title"><Music size={15} /> Audio source</p>
                  <div className="file-input-wrapper">
                    <input
                      type="file"
                      accept="audio/*"
                      id="modal-ep-audio"
                      className="file-input"
                      onChange={(e) => {
                        setEpAudioFile(e.target.files[0]);
                        setEpAudioUrl("");
                      }}
                    />
                    <label htmlFor="modal-ep-audio" className="file-label">
                      {epAudioFile
                        ? <><Music size={14} style={{ flexShrink: 0 }} /> {epAudioFile.name.length > 28 ? epAudioFile.name.slice(0, 26) + "…" : epAudioFile.name}</>
                        : <><Upload size={14} style={{ flexShrink: 0 }} /> Choose Audio File</>}
                    </label>
                  </div>

                  <div className="episode-source-divider">OR</div>

                  <input
                    className="form-input"
                    style={{ width: "100%" }}
                    value={epAudioUrl}
                    onChange={(e) => {
                      setEpAudioUrl(e.target.value);
                      if (e.target.value) setEpAudioFile(null);
                    }}
                    placeholder="Paste audio stream URL"
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
              <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleSaveEpisode}>
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
