import { Users, Upload, Trash2, CheckCircle2 } from "lucide-react";

export default function CastMemberCard({
  cast,
  index,
  castFile,
  getFullUrl,
  removeCast,
  chCast,
  handleCastFileChange,
}) {
  const photoSrc = castFile
    ? URL.createObjectURL(castFile)
    : cast.image
    ? getFullUrl(cast.image)
    : null;

  return (
    <div className="cast-member-card">
      <button
        type="button"
        className="remove-cast-btn"
        onClick={() => removeCast(index)}
        title="Remove Cast Member"
      >
        <Trash2 size={14} />
      </button>

      <div
        className="cast-avatar-uploader"
        onClick={() => document.getElementById(`cast-file-${index}`).click()}
      >
        {photoSrc ? (
          <img src={photoSrc} alt={cast.name || "Cast Member"} className="cast-avatar-img" />
        ) : (
          <div className="cast-avatar-placeholder">
            <Users size={24} />
            <span>Add Photo</span>
          </div>
        )}
        <div className="avatar-hover-overlay">
          <Upload size={16} />
          <span>Upload</span>
        </div>
      </div>

      <input
        id={`cast-file-${index}`}
        type="file"
        hidden
        accept="image/*"
        onChange={(e) => handleCastFileChange(index, e)}
      />

      <div className="cast-inputs-block">
        <div className="form-row">
          <input
            className="form-input-styled cast-name-input"
            placeholder="Actor Name *"
            value={cast.name || ""}
            onChange={(e) => chCast(index, "name", e.target.value)}
          />
        </div>

        <div className="form-row">
          <input
            className="form-input-styled cast-role-input"
            placeholder="Character / Role (e.g. Lead)"
            value={cast.role || ""}
            onChange={(e) => chCast(index, "role", e.target.value)}
          />
        </div>

        {!castFile && (
          <input
            className="form-input-styled url-fallback-input"
            placeholder="Or Photo Image URL"
            value={cast.image || ""}
            onChange={(e) => chCast(index, "image", e.target.value)}
          />
        )}
        {castFile && (
          <span className="file-loaded-pill">
            <CheckCircle2 size={12} color="#10B981" /> {castFile.name.slice(0, 18)}...
          </span>
        )}
      </div>
    </div>
  );
}

