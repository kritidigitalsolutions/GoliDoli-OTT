import { Star, Images, Users, Tv, Film, Rocket, Edit2, CheckCircle2, AlertTriangle, Layers, Globe, Calendar, Clock } from "lucide-react";

export default function ReviewStep({
  form,
  posterFile,
  bannerFile,
  trailerFile,
  videoFile,
  castFiles,
  episodeVideoFiles,
  episodeThumbnailFiles,
  onGoToStep,
}) {
  const isMovie = form.type === "movie";
  const isComingSoon = form.isComingSoon;

  const posterSrc = posterFile
    ? URL.createObjectURL(posterFile)
    : form.poster || null;

  const bannerSrc = bannerFile
    ? URL.createObjectURL(bannerFile)
    : form.banner || null;

  let totalEpisodes = 0;
  (form.seasons || []).forEach((s) => {
    totalEpisodes += (s.episodes || []).length;
  });

  const categoriesList = Array.isArray(form.category)
    ? form.category
    : form.category
    ? [form.category]
    : [];

  const genreList = form.genre
    ? form.genre.split(",").map((g) => g.trim()).filter(Boolean)
    : [];

  return (
    <div className="form-card review-step-card">
      <div className="card-header-styled">
        <h3 className="section-title">
          <span className="title-icon-wrap">
            <Rocket size={20} />
          </span>
          <div>
            Final Review & Publish Summary
            <small>Verify all metadata and media assets before publishing live to the platform.</small>
          </div>
        </h3>
      </div>

      <div className="review-main-grid">
        {/* Left: Poster Preview & Quick Stats */}
        <div className="review-poster-col">
          <div className="review-poster-card">
            {posterSrc ? (
              <img src={posterSrc} alt="Poster" className="review-poster-img" />
            ) : (
              <div className="review-poster-placeholder">
                <Film size={40} opacity={0.3} />
                <span>No Poster</span>
              </div>
            )}
            <div className="review-type-badge">
              {form.type.toUpperCase()}
            </div>
          </div>

          <div className="review-quick-flags">
            {form.isPremium && <span className="flag-pill premium"><Star size={12} /> Premium</span>}
            {form.isComingSoon && <span className="flag-pill coming"><Rocket size={12} /> Coming Soon</span>}
            {form.isPopular && <span className="flag-pill popular"><FlameIcon size={12} /> Popular</span>}
            {form.isPublished !== false && <span className="flag-pill published"><CheckCircle2 size={12} /> Published</span>}
          </div>
        </div>

        {/* Right: Detailed Metadata & Readiness Checklist */}
        <div className="review-details-col">
          <div className="review-title-header">
            <div>
              <h2 className="review-content-title">
                {form.title || "Untitled Title"}
              </h2>
              <p className="review-synopsis">
                {form.description || "No description provided."}
              </p>
            </div>
            <button
              type="button"
              className="btn-edit-step"
              onClick={() => onGoToStep(1)}
              title="Edit Basic Info"
            >
              <Edit2 size={14} /> Edit Info
            </button>
          </div>

          <div className="review-meta-pills">
            {form.language && (
              <span className="meta-pill"><Globe size={13} /> {form.language}</span>
            )}
            {form.releaseYear && (
              <span className="meta-pill"><Calendar size={13} /> {form.releaseYear}</span>
            )}
            {form.duration && (
              <span className="meta-pill"><Clock size={13} /> {form.duration}</span>
            )}
            {form.rating && (
              <span className="meta-pill rating"><Star size={13} fill="#ffd11a" color="#ffd11a" /> IMDb {form.rating}</span>
            )}
          </div>

          {/* Genres & Categories */}
          <div className="review-tags-block">
            {genreList.length > 0 && (
              <div className="review-tags-group">
                <span className="group-label">Genres:</span>
                {genreList.map((g, i) => (
                  <span key={i} className="tag-chip genre">{g}</span>
                ))}
              </div>
            )}
            {categoriesList.length > 0 && (
              <div className="review-tags-group">
                <span className="group-label"><Layers size={12} /> Categories:</span>
                {categoriesList.map((c, i) => (
                  <span key={i} className="tag-chip cat">{c}</span>
                ))}
              </div>
            )}
          </div>

          {/* Asset Readiness Checklist */}
          <div className="review-checklist-section">
            <h4 className="checklist-heading">Media Assets Readiness</h4>

            <div className="checklist-grid">
              {/* Poster Item */}
              <div className={`checklist-item ${posterFile || form.poster ? "ready" : "warning"}`}>
                <div className="chk-left">
                  {posterFile || form.poster ? (
                    <CheckCircle2 size={16} className="icon-ready" />
                  ) : (
                    <AlertTriangle size={16} className="icon-warn" />
                  )}
                  <span>Poster Image</span>
                </div>
                <span className="chk-status">
                  {posterFile ? `File: ${posterFile.name.slice(0, 18)}...` : form.poster ? "URL Configured" : "Missing"}
                </span>
                <button type="button" className="btn-mini-edit" onClick={() => onGoToStep(2)}>
                  <Edit2 size={12} />
                </button>
              </div>

              {/* Banner Item */}
              <div className={`checklist-item ${bannerFile || form.banner ? "ready" : "warning"}`}>
                <div className="chk-left">
                  {bannerFile || form.banner ? (
                    <CheckCircle2 size={16} className="icon-ready" />
                  ) : (
                    <AlertTriangle size={16} className="icon-warn" />
                  )}
                  <span>Banner Artwork</span>
                </div>
                <span className="chk-status">
                  {bannerFile ? `File: ${bannerFile.name.slice(0, 18)}...` : form.banner ? "URL Configured" : "Optional"}
                </span>
                <button type="button" className="btn-mini-edit" onClick={() => onGoToStep(2)}>
                  <Edit2 size={12} />
                </button>
              </div>

              {/* Trailer Item */}
              {form.type !== "microdrama" && (
                <div className={`checklist-item ${trailerFile || form.trailerUrl ? "ready" : "optional"}`}>
                  <div className="chk-left">
                    <CheckCircle2 size={16} className={trailerFile || form.trailerUrl ? "icon-ready" : "icon-opt"} />
                    <span>Trailer Video</span>
                  </div>
                  <span className="chk-status">
                    {trailerFile ? `File: ${trailerFile.name.slice(0, 18)}...` : form.trailerUrl ? "URL Configured" : "Optional"}
                  </span>
                  <button type="button" className="btn-mini-edit" onClick={() => onGoToStep(2)}>
                    <Edit2 size={12} />
                  </button>
                </div>
              )}

              {/* Movie Main Content */}
              {isMovie && !isComingSoon && (
                <div className={`checklist-item ${videoFile || form.videoUrl ? "ready" : "warning"}`}>
                  <div className="chk-left">
                    {videoFile || form.videoUrl ? (
                      <CheckCircle2 size={16} className="icon-ready" />
                    ) : (
                      <AlertTriangle size={16} className="icon-warn" />
                    )}
                    <span>Full Movie Video</span>
                  </div>
                  <span className="chk-status">
                    {videoFile ? `File Attached` : form.videoUrl ? "Stream URL Set" : "Missing Video File"}
                  </span>
                  <button type="button" className="btn-mini-edit" onClick={() => onGoToStep(2)}>
                    <Edit2 size={12} />
                  </button>
                </div>
              )}

              {/* Cast Item */}
              <div className={`checklist-item ${form.cast.length > 0 ? "ready" : "optional"}`}>
                <div className="chk-left">
                  <CheckCircle2 size={16} className={form.cast.length > 0 ? "icon-ready" : "icon-opt"} />
                  <span>Cast & Crew</span>
                </div>
                <span className="chk-status">
                  {form.cast.length} Actors Credited
                </span>
                <button type="button" className="btn-mini-edit" onClick={() => onGoToStep(3)}>
                  <Edit2 size={12} />
                </button>
              </div>

              {/* Episodes Item (for Series & Microdramas) */}
              {!isMovie && !isComingSoon && (
                <div className={`checklist-item ${totalEpisodes > 0 ? "ready" : "warning"}`}>
                  <div className="chk-left">
                    {totalEpisodes > 0 ? (
                      <CheckCircle2 size={16} className="icon-ready" />
                    ) : (
                      <AlertTriangle size={16} className="icon-warn" />
                    )}
                    <span>Episodes</span>
                  </div>
                  <span className="chk-status">
                    {totalEpisodes} Episodes Configured
                  </span>
                  <button type="button" className="btn-mini-edit" onClick={() => onGoToStep(4)}>
                    <Edit2 size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FlameIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size || 16} height={props.size || 16} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3.5z"/>
    </svg>
  );
}
