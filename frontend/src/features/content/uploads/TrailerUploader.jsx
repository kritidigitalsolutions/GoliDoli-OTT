import { useState } from "react";
import { Video, Upload, Trash2, Film, CheckCircle2, Link2 } from "lucide-react";

export default function TrailerUploader({
  file,
  value,
  onUrlChange,
  inputRef,
  onFileChange,
  onRemoveFile,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [inputMode, setInputMode] = useState(file ? "file" : value ? "url" : "file");

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith("video/")) {
        const syntheticEvent = { target: { files: [droppedFile] } };
        onFileChange(syntheticEvent);
        setInputMode("file");
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    const mb = bytes / (1024 * 1024);
    return mb >= 1000 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="form-row media-uploader-box">
      <div className="uploader-header-row">
        <label className="form-label">
          <Film size={14} style={{ marginRight: 6 }} />
          Trailer Video
        </label>

        <div className="uploader-mode-pills">
          <button
            type="button"
            className={`mode-pill ${inputMode === "file" ? "active" : ""}`}
            onClick={() => setInputMode("file")}
          >
            <Upload size={12} /> File
          </button>
          <button
            type="button"
            className={`mode-pill ${inputMode === "url" ? "active" : ""}`}
            onClick={() => setInputMode("url")}
          >
            <Link2 size={12} /> URL
          </button>
        </div>
      </div>

      {inputMode === "file" ? (
        <div
          className={`file-upload-box ${file ? "has-file" : ""} ${
            isDragging ? "is-dragging" : ""
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !file && inputRef.current?.click()}
          style={{ position: "relative", minHeight: "160px" }}
        >
          {file ? (
            <div className="upload-video-selected-card">
              <div className="video-icon-badge">
                <Video size={24} color="var(--primary)" />
              </div>
              <div className="video-meta-info">
                <div className="video-title">
                  <CheckCircle2 size={14} color="#10B981" />
                  {file.name}
                </div>
                <span className="video-size">{formatFileSize(file.size)}</span>
              </div>
              <div className="preview-actions">
                <button
                  type="button"
                  className="preview-btn change-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    inputRef.current?.click();
                  }}
                >
                  Change
                </button>
                {onRemoveFile && (
                  <button
                    type="button"
                    className="preview-btn remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFile();
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="upload-empty-state">
              <div className="upload-icon-circle">
                <Upload size={20} />
              </div>
              <p className="upload-primary-text">Drag & drop trailer video or <span>browse</span></p>
              <p className="upload-sub-text">MP4, MOV, MKV (High Resolution)</p>
            </div>
          )}

          <input
            type="file"
            ref={inputRef}
            hidden
            accept="video/*"
            onChange={(e) => {
              onFileChange(e);
              setInputMode("file");
            }}
          />
        </div>
      ) : (
        <div className="url-input-block">
          <input
            className="form-input-styled"
            name="trailerUrl"
            placeholder="Paste direct video stream URL (https://...)"
            onChange={onUrlChange}
            value={value}
          />
          {value && (
            <div className="upload-video-selected-card" style={{ marginTop: 10 }}>
              <Video size={20} color="var(--primary)" />
              <span className="video-title"><CheckCircle2 size={14} color="#10B981" /> Stream URL Configured</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


