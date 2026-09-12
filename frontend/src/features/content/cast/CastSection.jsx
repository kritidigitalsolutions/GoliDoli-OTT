import { Plus, Users } from "lucide-react";
import CastMemberCard from "./CastMemberCard";

export default function CastSection({
  cast,
  castFiles,
  addCast,
  removeCast,
  chCast,
  handleCastFileChange,
  getFullUrl,
}) {
  return (
    <div className="form-card">
      <div className="card-header-styled">
        <h3 className="section-title">
          <span className="title-icon-wrap">
            <Users size={18} />
          </span>
          <div>
            Cast & Crew Members
            <small>Add actors, directors, and key contributors for this title</small>
          </div>
        </h3>

        <button
          type="button"
          className="btn btn-secondary-styled"
          onClick={addCast}
        >
          <Plus size={16} />
          Add Actor / Cast
        </button>
      </div>

      <div className="cast-grid">
        {cast.map((member, index) => (
          <CastMemberCard
            key={index}
            cast={member}
            index={index}
            castFile={castFiles[index]}
            removeCast={removeCast}
            chCast={chCast}
            handleCastFileChange={handleCastFileChange}
            getFullUrl={getFullUrl}
          />
        ))}
      </div>

      {cast.length === 0 && (
        <div className="cast-empty-state">
          <Users size={32} opacity={0.3} />
          <p>No cast members added yet. Click "Add Actor / Cast" to credit actors.</p>
        </div>
      )}
    </div>
  );
}

