import { useState, useEffect } from "react";
import API from "../api/axios";
import { MapPin, Save, Loader, AlertCircle, CheckCircle } from "lucide-react";
import "./Dashboard.css";

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
      <div className="page-section" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px" }}>
        <p>
          <Loader size={24} style={{ display: "inline-block", marginRight: 8 }} />
          Loading company info...
        </p>
      </div>
    );
  }

  return (
    <div className="add-content-page">
      {/* Header */}
      <div className="pg-header">
        <h1 className="pg-title">
          <MapPin size={28} style={{ display: "inline-block", marginRight: 8, verticalAlign: "middle" }} />
          Company & Contact Information
        </h1>
        <p className="pg-sub">Manage platform branding, contact info, office address, and map location coordinates</p>
      </div>

      {/* Alerts */}
      {message && (
        <div className="alert alert-success" style={{ marginBottom: 20 }}>
          <CheckCircle size={18} /> {message}
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="form-card" style={{ maxWidth: "800px", marginBottom: 24 }}>
          <h3>Company Branding & Contact Details</h3>
          <div className="form-2col">
            <div className="form-field">
              <label className="form-label">Company / Brand Name</label>
              <input
                className="form-input-styled"
                name="companyName"
                placeholder="GoliDoli OTT"
                value={form.companyName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label">Support Email</label>
              <input
                className="form-input-styled"
                name="supportEmail"
                type="email"
                placeholder="support@golidoliapp.in"
                value={form.supportEmail}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label">Support Phone Number</label>
              <input
                className="form-input-styled"
                name="supportPhone"
                placeholder="+91 99999 99999"
                value={form.supportPhone}
                onChange={handleChange}
              />
            </div>

            <div className="form-field">
              <label className="form-label">Visibility Status</label>
              <select
                className="form-input-styled"
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option value="published">Published (Visible on Web & App)</option>
                <option value="draft">Draft (Admin Only)</option>
              </select>
            </div>

            <div className="form-field form-full">
              <label className="form-label">Tagline / Brief Description</label>
              <textarea
                className="form-input-styled"
                name="tagline"
                rows={3}
                placeholder="The ultimate destination for premium entertainment..."
                value={form.tagline}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="form-card" style={{ maxWidth: "800px", marginBottom: 24 }}>
          <h3>Office Address & Map Location Coordinates</h3>

          <div className="form-2col">
            <div className="form-field form-full">
              <label className="form-label">Street Address</label>
              <input
                className="form-input-styled"
                name="address"
                placeholder="Floor No 12, 1202, Residences Tanaji Nagar, Tanaji Nagar Road No 1, Near Time of India off, W.E. Highway"
                value={form.address}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label">City</label>
              <input
                className="form-input-styled"
                name="city"
                placeholder="Malad East, Mumbai"
                value={form.city}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label">State / Province</label>
              <input
                className="form-input-styled"
                name="state"
                placeholder="Maharashtra"
                value={form.state}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label">Postal / ZIP Code</label>
              <input
                className="form-input-styled"
                name="postalCode"
                placeholder="400097"
                value={form.postalCode}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label">Country</label>
              <input
                className="form-input-styled"
                name="country"
                placeholder="India"
                value={form.country}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label">Latitude (for Map integration)</label>
              <input
                className="form-input-styled"
                name="latitude"
                type="number"
                step="any"
                placeholder="19.186"
                value={form.latitude}
                onChange={handleChange}
              />
            </div>

            <div className="form-field">
              <label className="form-label">Longitude (for Map integration)</label>
              <input
                className="form-input-styled"
                name="longitude"
                type="number"
                step="any"
                placeholder="72.855"
                value={form.longitude}
                onChange={handleChange}
              />
            </div>

            <div className="form-field form-full">
              <label className="form-label">Google Maps URL</label>
              <input
                className="form-input-styled"
                name="googleMapUrl"
                placeholder="https://maps.google.com/?q=..."
                value={form.googleMapUrl}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="form-card" style={{ maxWidth: "800px" }}>
          <h3>Footer Footer & Copyright Metadata</h3>
          <div className="form-2col">
            <div className="form-field">
              <label className="form-label">Copyright Notice</label>
              <input
                className="form-input-styled"
                name="copyrightText"
                placeholder="© 2026 GoliDoli OTT All Rights Reserved"
                value={form.copyrightText}
                onChange={handleChange}
              />
            </div>

            <div className="form-field">
              <label className="form-label">Powered By Text</label>
              <input
                className="form-input-styled"
                name="poweredBy"
                placeholder="POWERED BY KRITI DIGITAL SOLUTIONS"
                value={form.poweredBy}
                onChange={handleChange}
              />
            </div>
          </div>

          <button
            className="btn-lg"
            type="submit"
            style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader size={18} />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Information
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
