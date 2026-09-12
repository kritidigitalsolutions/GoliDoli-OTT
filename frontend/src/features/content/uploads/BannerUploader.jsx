import { useState } from "react";
import { Upload, Palette, Trash2, CheckCircle2, Link2 } from "lucide-react";

export default function BannerUploader({
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
      if (droppedFile.type.startsWith("image/")) {
        const syntheticEvent = { target: { files: [droppedFile] } };
        onFileChange(syntheticEvent);
        setInputMode("file");
      }
    }
  };

  const previewSrc = file ? URL.createObjectURL(file) : value ? value : null;

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div className="form-row media-uploader-box">
      <div className="uploader-header-row">
        <label className="form-label">
          <Palette size={14} style={{ marginRight: 6 }} />
          Banner Artwork (16:9)
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
            <div className="upload-preview-container banner-aspect">
              <img src={previewSrc} alt="Banner Preview" className="upload-img-preview" />
              <div className="upload-preview-overlay">
                <span className="file-info-badge">
                  <CheckCircle2 size={14} color="#10B981" />
                  {file.name} <small>({formatFileSize(file.size)})</small>
                </span>
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
            </div>
          ) : (
            <div className="upload-empty-state">
              <div className="upload-icon-circle">
                <Upload size={20} />
              </div>
              <p className="upload-primary-text">Drag & drop banner artwork or <span>browse</span></p>
              <p className="upload-sub-text">PNG, JPG, WEBP (Recommended: 1920x1080px)</p>
            </div>
          )}

          <input
            type="file"
            ref={inputRef}
            hidden
            accept="image/*"
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
            name="banner"
            placeholder="Paste direct banner image URL (https://...)"
            onChange={onUrlChange}
            value={value}
          />
          {value && (
            <div className="upload-preview-container banner-aspect" style={{ marginTop: 10 }}>
              <img src={value} alt="Banner URL Preview" className="upload-img-preview" onError={(e) => e.currentTarget.style.display = 'none'} />
              <div className="upload-preview-overlay">
                <span className="file-info-badge">
                  <CheckCircle2 size={14} color="#10B981" /> Direct URL Active
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


