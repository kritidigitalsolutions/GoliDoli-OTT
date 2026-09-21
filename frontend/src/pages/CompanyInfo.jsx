import { useState, useEffect } from "react";
import API from "../api/axios";
import {
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Compass,
  Navigation,
  ExternalLink,
  Copyright,
  Sparkles,
  Save,
  Loader,
  AlertCircle,
  CheckCircle2,
  FileText,
  Hash,
  Map,
  Building
} from "lucide-react";
import "./Dashboard.css";
import "./CompanyInfo.css";

export default function CompanyInfoPage() {
  const [form, setForm] = useState({
    companyName: "GoliDoli OTT",
    tagline: "The ultimate destination for premium entertainment. Watch the latest web series, movies, and originals anytime, anywhere.",
    supportEmail: "support@golidoliapp.in",
    supportPhone: "",
    address: "Floor No 12, 1202, Residences Tanaji Nagar, Tanaji Nagar Road No 1, Near Time of India off, W.E. Highway",
    city: "Malad East, Mumbai",
    state: "Maharashtra",
    country: "India",
    postalCode: "400097",
    latitude: "19.186",
    longitude: "72.855",
    googleMapUrl: "https://maps.google.com/?q=Malad+East+Mumbai",
    copyrightText: "© 2026 GoliDoli OTT All Rights Reserved",
    poweredBy: "POWERED BY KRITI DIGITAL SOLUTIONS",
    status: "published"
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchCompanyInfo = async () => {
    try {
      const res = await API.get("/admin/companyInfo");
      if (res.data.success && res.data.data) {
        const d = res.data.data;
        const streetAddr = d.address || [d.addressLine1, d.addressLine2].filter(Boolean).join(", ");
        setForm({
          companyName: d.companyName || "GoliDoli OTT",
          tagline: d.tagline || "",
          supportEmail: d.supportEmail || "",
          supportPhone: d.supportPhone || "",
          address: streetAddr || "Floor No 12, 1202, Residences Tanaji Nagar, Tanaji Nagar Road No 1, Near Time of India off, W.E. Highway",
          city: d.city || "",
          state: d.state || "",
          country: d.country || "",
          postalCode: d.postalCode || "",
          latitude: d.latitude !== undefined && d.latitude !== null ? d.latitude : "",
          longitude: d.longitude !== undefined && d.longitude !== null ? d.longitude : "",
          googleMapUrl: d.googleMapUrl || "",
          copyrightText: d.copyrightText || "© 2026 GoliDoli OTT All Rights Reserved",
          poweredBy: d.poweredBy || "POWERED BY KRITI DIGITAL SOLUTIONS",
          status: d.status || "published"
        });
      }
    } catch (err) {
      console.error("Error fetching company info:", err);
      setError("Failed to load company information.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await API.patch("/admin/companyInfo", form);
      if (res.data.success) {
        setMessage(res.data.message || "Company information saved successfully.");
        if (res.data.data) {
          const d = res.data.data;
          const streetAddr = d.address || [d.addressLine1, d.addressLine2].filter(Boolean).join(", ");
          setForm({
            companyName: d.companyName || "GoliDoli OTT",
            tagline: d.tagline || "",
            supportEmail: d.supportEmail || "",
            supportPhone: d.supportPhone || "",
            address: streetAddr || "",
            city: d.city || "",
            state: d.state || "",
            country: d.country || "",
            postalCode: d.postalCode || "",
            latitude: d.latitude !== undefined && d.latitude !== null ? d.latitude : "",
            longitude: d.longitude !== undefined && d.longitude !== null ? d.longitude : "",
            googleMapUrl: d.googleMapUrl || "",
            copyrightText: d.copyrightText || "© 2026 GoliDoli OTT All Rights Reserved",
            poweredBy: d.poweredBy || "POWERED BY KRITI DIGITAL SOLUTIONS",
            status: d.status || "published"
          });
        }
      }
    } catch (err) {
      console.error("Error saving company info:", err);
      setError(err.response?.data?.message || "Failed to save company information.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="company-info-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <div style={{ textAlign: "center", color: "#94a3b8" }}>
          <Loader size={32} className="spin-icon" style={{ marginBottom: 12, color: "#ff7a1a" }} />
          <p style={{ margin: 0, fontSize: "0.95rem" }}>Loading company information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="company-info-container">
      {/* ── Page Header ── */}
      <div className="ci-header">
        <div className="ci-header-main">
          <div className="ci-header-icon">
            <Building2 size={26} />
          </div>
          <div className="ci-title-group">
            <h1>Company & Contact Information</h1>
            <p>Manage platform branding, contact info, office address, and map location coordinates</p>
          </div>
        </div>

        <div className={`ci-status-badge ${form.status === "published" ? "published" : "draft"}`}>
          <span className="ci-status-dot"></span>
          <span>{form.status === "published" ? "Published Live" : "Draft Mode"}</span>
        </div>
      </div>

      {/* ── Status Alerts ── */}
      {message && (
        <div className="ci-alert ci-alert-success">
          <CheckCircle2 size={20} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="ci-alert ci-alert-error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Main Form ── */}
      <form onSubmit={handleSubmit}>
        <div className="ci-form-grid">
          {/* Card 1: Branding & Contact Details */}
          <div className="ci-card">
            <div className="ci-card-header">
              <div className="ci-card-badge orange">
                <Building2 size={18} />
              </div>
              <div>
                <h3 className="ci-card-title">Company Branding & Contact Details</h3>
                <p className="ci-card-subtitle">General platform metadata and support contact channels</p>
              </div>
            </div>

            <div className="ci-fields-2col">
              <div className="ci-field-group">
                <label className="ci-label">
                  <span>Company / Brand Name <span className="ci-label-required">*</span></span>
                </label>
                <div className="ci-input-wrapper">
                  <input
                    className="ci-input-styled"
                    name="companyName"
                    placeholder="GoliDoli OTT"
                    value={form.companyName}
                    onChange={handleChange}
                    required
                  />
                  <Building size={16} className="ci-input-icon" />
                </div>
              </div>

              <div className="ci-field-group">
                <label className="ci-label">
                  <span>Support Email <span className="ci-label-required">*</span></span>
                </label>
                <div className="ci-input-wrapper">
                  <input
                    className="ci-input-styled"
                    name="supportEmail"
                    type="email"
                    placeholder="support@golidoliapp.in"
                    value={form.supportEmail}
                    onChange={handleChange}
                    required
                  />
                  <Mail size={16} className="ci-input-icon" />
                </div>
              </div>

              <div className="ci-field-group">
                <label className="ci-label">
                  <span>Support Phone Number</span>
                </label>
                <div className="ci-input-wrapper">
                  <input
                    className="ci-input-styled"
                    name="supportPhone"
                    placeholder="+91 99999 99999"
                    value={form.supportPhone}
                    onChange={handleChange}
                  />
                  <Phone size={16} className="ci-input-icon" />
                </div>
              </div>

              <div className="ci-field-group">
                <label className="ci-label">
                  <span>Visibility Status</span>
                </label>
                <div className="ci-input-wrapper">
                  <select
                    className="ci-input-styled"
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="published">Published (Visible on Web & App)</option>
                    <option value="draft">Draft (Admin Only)</option>
                  </select>
                  <Globe size={16} className="ci-input-icon" />
                </div>
              </div>

              <div className="ci-field-group ci-field-full">
                <label className="ci-label">
                  <span>Tagline / Brief Description</span>
                  <span className="ci-hint">{form.tagline?.length || 0} characters</span>
                </label>
                <div className="ci-input-wrapper">
                  <textarea
                    className="ci-input-styled"
                    name="tagline"
                    rows={3}
                    placeholder="The ultimate destination for premium entertainment..."
                    value={form.tagline}
                    onChange={handleChange}
                  />
                  <FileText size={16} className="ci-input-icon" style={{ top: 14 }} />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Office Address & Maps */}
          <div className="ci-card">
            <div className="ci-card-header">
              <div className="ci-card-badge blue">
                <MapPin size={18} />
              </div>
              <div>
                <h3 className="ci-card-title">Office Address & Map Location Coordinates</h3>
                <p className="ci-card-subtitle">Headquarters physical location and map coordinates</p>
              </div>
            </div>

            <div className="ci-fields-2col">
              <div className="ci-field-group ci-field-full">
                <label className="ci-label">
                  <span>Street Address <span className="ci-label-required">*</span></span>
                </label>
                <div className="ci-input-wrapper">
                  <input
                    className="ci-input-styled"
                    name="address"
                    placeholder="Floor No 12, 1202, Residences Tanaji Nagar, Tanaji Nagar Road No 1..."
                    value={form.address}
                    onChange={handleChange}
                    required
                  />
                  <MapPin size={16} className="ci-input-icon" />
                </div>
              </div>

              <div className="ci-field-group">
                <label className="ci-label">
                  <span>City <span className="ci-label-required">*</span></span>
                </label>
                <div className="ci-input-wrapper">
                  <input
                    className="ci-input-styled"
                    name="city"
                    placeholder="Malad East, Mumbai"
                    value={form.city}
                    onChange={handleChange}
                    required
                  />
                  <Building size={16} className="ci-input-icon" />
                </div>
              </div>

              <div className="ci-field-group">
                <label className="ci-label">
                  <span>State / Province <span className="ci-label-required">*</span></span>
                </label>
                <div className="ci-input-wrapper">
                  <input
                    className="ci-input-styled"
                    name="state"
                    placeholder="Maharashtra"
                    value={form.state}
                    onChange={handleChange}
                    required
                  />
                  <Map size={16} className="ci-input-icon" />
                </div>
              </div>

              <div className="ci-field-group">
                <label className="ci-label">
                  <span>Postal / ZIP Code <span className="ci-label-required">*</span></span>
                </label>
                <div className="ci-input-wrapper">
                  <input
                    className="ci-input-styled"
                    name="postalCode"
                    placeholder="400097"
                    value={form.postalCode}
                    onChange={handleChange}
                    required
                  />
                  <Hash size={16} className="ci-input-icon" />
                </div>
              </div>

              <div className="ci-field-group">
                <label className="ci-label">
                  <span>Country <span className="ci-label-required">*</span></span>
                </label>
                <div className="ci-input-wrapper">
                  <input
                    className="ci-input-styled"
                    name="country"
                    placeholder="India"
                    value={form.country}
                    onChange={handleChange}
                    required
                  />
                  <Globe size={16} className="ci-input-icon" />
                </div>
              </div>

              <div className="ci-field-group">
                <label className="ci-label">
                  <span>Latitude</span>
                </label>
                <div className="ci-input-wrapper">
                  <input
                    className="ci-input-styled"
                    name="latitude"
                    type="number"
                    step="any"
                    placeholder="19.186"
                    value={form.latitude}
                    onChange={handleChange}
                  />
                  <Compass size={16} className="ci-input-icon" />
                </div>
              </div>

              <div className="ci-field-group">
                <label className="ci-label">
                  <span>Longitude</span>
                </label>
                <div className="ci-input-wrapper">
                  <input
                    className="ci-input-styled"
                    name="longitude"
                    type="number"
                    step="any"
                    placeholder="72.855"
                    value={form.longitude}
                    onChange={handleChange}
                  />
                  <Navigation size={16} className="ci-input-icon" />
                </div>
              </div>

              <div className="ci-field-group ci-field-full">
                <label className="ci-label">
                  <span>Google Maps URL</span>
                </label>
                <div className="ci-input-action-wrapper">
                  <div className="ci-input-wrapper" style={{ flex: 1 }}>
                    <input
                      className="ci-input-styled"
                      name="googleMapUrl"
                      placeholder="https://maps.google.com/?q=..."
                      value={form.googleMapUrl}
                      onChange={handleChange}
                    />
                    <ExternalLink size={16} className="ci-input-icon" />
                  </div>
                  {form.googleMapUrl && (
                    <a
                      href={form.googleMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ci-btn-map-preview"
                      title="Open Google Maps link"
                    >
                      <ExternalLink size={14} />
                      Test Link
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Footer & Copyright Metadata */}
          <div className="ci-card">
            <div className="ci-card-header">
              <div className="ci-card-badge purple">
                <Copyright size={18} />
              </div>
              <div>
                <h3 className="ci-card-title">Footer & Copyright Metadata</h3>
                <p className="ci-card-subtitle">Legal text, copyright notices, and powered-by attribution</p>
              </div>
            </div>

            <div className="ci-fields-2col">
              <div className="ci-field-group">
                <label className="ci-label">
                  <span>Copyright Notice</span>
                </label>
                <div className="ci-input-wrapper">
                  <input
                    className="ci-input-styled"
                    name="copyrightText"
                    placeholder="© 2026 GoliDoli OTT All Rights Reserved"
                    value={form.copyrightText}
                    onChange={handleChange}
                  />
                  <Copyright size={16} className="ci-input-icon" />
                </div>
              </div>

              <div className="ci-field-group">
                <label className="ci-label">
                  <span>Powered By Text</span>
                </label>
                <div className="ci-input-wrapper">
                  <input
                    className="ci-input-styled"
                    name="poweredBy"
                    placeholder="POWERED BY KRITI DIGITAL SOLUTIONS"
                    value={form.poweredBy}
                    onChange={handleChange}
                  />
                  <Sparkles size={16} className="ci-input-icon" />
                </div>
              </div>
            </div>

            {/* Form Actions Footer */}
            <div className="ci-actions-bar">
              <button
                className="ci-btn-save"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader size={18} className="spin-icon" />
                    <span>Saving Information...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>Save Information</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
