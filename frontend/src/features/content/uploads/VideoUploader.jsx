import { useState } from "react";
import { Play, Upload, Trash2, Film, CheckCircle2, Link2 } from "lucide-react";

export default function VideoUploader({
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
    <div className="form-row media-uploader-box full-width-uploader">
      <div className="uploader-header-row">
        <label className="form-label">
          <Film size={14} style={{ marginRight: 6 }} />
          Full Movie Video Content *
        </label>

        <div className="uploader-mode-pills">
          <button
            type="button"
            className={`mode-pill ${inputMode === "file" ? "active" : ""}`}
            onClick={() => setInputMode("file")}
          >
            <Upload size={11} /> File
          </button>
          <button
            type="button"
            className={`mode-pill ${inputMode === "url" ? "active" : ""}`}
            onClick={() => setInputMode("url")}
          >
            <Link2 size={11} /> URL
          </button>
        </div>
      </div>

      {inputMode === "file" ? (
        <div
          className={`file-upload-box full-width-box ${file ? "has-file" : ""} ${
            isDragging ? "is-dragging" : ""
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !file && inputRef.current?.click()}
          style={{ position: "relative" }}
        >
          {file ? (
            <div className="upload-video-selected-card full-width-selected">
              <div className="video-icon-badge large">
                <Play size={28} color="var(--primary)" />
              </div>
              <div className="video-meta-info">
                <div className="video-title">
                  <CheckCircle2 size={16} color="#10B981" />
                  {file.name}
                </div>
                <span className="video-size">
                  File Size: {formatFileSize(file.size)} • Direct CDN Direct Pipe Ready
                </span>
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
                  Change File
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
                    <Trash2 size={14} /> Remove
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="upload-empty-state horizontal">
              <div className="upload-icon-circle">
                <Upload size={24} />
              </div>
              <div>
                <p className="upload-primary-text">Drag & drop full length movie file or <span>browse local storage</span></p>
                <p className="upload-sub-text">Supports MP4, MKV, MOV, WEBM (High-speed multi-part upload)</p>
              </div>
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
            name="videoUrl"
            placeholder="Paste direct video stream URL (https://cdn.example.com/movie.mp4)"
            onChange={onUrlChange}
            value={value}
          />
          {value && (
            <div className="upload-video-selected-card full-width-selected" style={{ marginTop: 10 }}>
              <Play size={24} color="var(--primary)" />
              <div className="video-meta-info">
                <div className="video-title"><CheckCircle2 size={16} color="#10B981" /> Direct Video Stream URL Configured</div>
                <span className="video-size">{value}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


