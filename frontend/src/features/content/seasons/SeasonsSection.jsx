import { useEffect } from "react";
import { Plus, Tv } from "lucide-react";
import SeasonSection from "./SeasonSection";

export default function SeasonsSection({
  form,
  setForm,

  addSeason,
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
}) {
  const isMicrodrama = form.type === "microdrama";

  useEffect(() => {
    if (isMicrodrama && form.seasons.length === 0) {
      setForm((f) => ({
        ...f,
        seasons: [{ seasonNumber: 1, episodes: [] }],
      }));
    }
  }, [isMicrodrama]); // eslint-disable-line react-hooks/exhaustive-deps

  if (
    (form.type !== "series" && form.type !== "microdrama") ||
    form.isComingSoon
  ) {
    return null;
  }

  return (
    <div className="form-card seasons-section-card">
      <div className="card-header-styled">
        <h3 className="section-title">
          <span className="title-icon-wrap">
            <Tv size={18} />
          </span>

          <div>
            {isMicrodrama ? "Microdrama Episodes" : "Seasons & Episode Management"}
            <small>Configure episodes, upload video streams, and set thumbnails</small>
          </div>
        </h3>

        {!isMicrodrama && (
          <button
            type="button"
            className="btn btn-secondary-styled"
            onClick={addSeason}
          >
            <Plus size={16} />
            Add Season
          </button>
        )}
      </div>

      <div className="seasons-container">
        {form.seasons.map((season, seasonIndex) => (
          <SeasonSection
            key={seasonIndex}
            season={season}
            seasonIndex={seasonIndex}

            form={form}
            setForm={setForm}

            addEp={addEp}
            removeSeason={removeSeason}

            chEp={chEp}
            removeEp={removeEp}

            episodeVideoFiles={episodeVideoFiles}
            episodeThumbnailFiles={episodeThumbnailFiles}

            handleEpisodeVideoChange={handleEpisodeVideoChange}
            handleEpisodeThumbnailChange={handleEpisodeThumbnailChange}

            setEpisodeVideoFiles={setEpisodeVideoFiles}
            setEpisodeThumbnailFiles={setEpisodeThumbnailFiles}
          />
        ))}
      </div>

      {form.seasons.length === 0 && !isMicrodrama && (
        <div className="seasons-empty-state">
          <Tv size={40} className="empty-icon" />
          <p className="empty-title">No Seasons Created</p>
          <p className="empty-sub">Click "Add Season" to begin organizing episodes for this web series.</p>
        </div>
      )}
    </div>
  );
}

