import PosterUploader from "../../content/uploads/PosterUploader";
import BannerUploader from "../../content/uploads/BannerUploader";
import { Images } from "lucide-react";

export default function AudioAssetsStep({
  form,
  ch,

  coverImageFile,
  coverImageInputRef,
  handleCoverImageFileChange,

  bannerImageFile,
  bannerImageInputRef,
  handleBannerImageFileChange,
}) {
  return (
    <div className="premium-card media-assets-card">
      <div className="media-card-header">
        <h3 className="section-title media-section-title">
          <span>
            <Images size={18} />
          </span>

          <div>
            Visual Assets & Artwork
            <small>
              Add the cover artwork and banner for this audio story.
            </small>
          </div>
        </h3>
      </div>

      <div className="form-grid-3 media-assets-grid">
        <PosterUploader
          file={coverImageFile}
          value={form.coverImage}
          onUrlChange={(e) => {
            // Fake an event for the form handler
            ch({ target: { name: "coverImage", value: e.target.value } });
          }}
          inputRef={coverImageInputRef}
          onFileChange={handleCoverImageFileChange}
        />

        <BannerUploader
          file={bannerImageFile}
          value={form.bannerImage}
          onUrlChange={(e) => {
            ch({ target: { name: "bannerImage", value: e.target.value } });
          }}
          inputRef={bannerImageInputRef}
          onFileChange={handleBannerImageFileChange}
        />
      </div>
    </div>
  );
}
