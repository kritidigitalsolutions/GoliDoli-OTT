import { useState, useEffect } from "react";
import API from "../api/axios";
import { MapPin, Save, Loader, AlertCircle, CheckCircle } from "lucide-react";
import "./Dashboard.css";

export default function CompanyInfoPage() {
  const [form, setForm] = useState({
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    googleMapUrl: "",
    status: "draft"
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
        setForm({
          addressLine1: d.addressLine1 || "",
          addressLine2: d.addressLine2 || "",
          city: d.city || "",
          state: d.state || "",
          country: d.country || "",
          postalCode: d.postalCode || "",
          googleMapUrl: d.googleMapUrl || "",
          status: d.status || "draft"
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
          setForm({
            addressLine1: d.addressLine1 || "",
            addressLine2: d.addressLine2 || "",
            city: d.city || "",
            state: d.state || "",
            country: d.country || "",
            postalCode: d.postalCode || "",
            googleMapUrl: d.googleMapUrl || "",
            status: d.status || "draft"
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
          Company Information
        </h1>
        <p className="pg-sub">Manage physical address, contact details, and location metadata</p>
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
        <div className="form-card" style={{ maxWidth: "800px" }}>
          <h3>Address & Location Configuration</h3>

          <div className="form-2col">
            <div className="form-field form-full">
              <label className="form-label">Address Line 1</label>
              <input
                className="form-input-styled"
                name="addressLine1"
                placeholder="123 Main St, Suite 400"
                value={form.addressLine1}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field form-full">
              <label className="form-label">Address Line 2</label>
              <input
                className="form-input-styled"
                name="addressLine2"
                placeholder="Building Name, landmark (optional)"
                value={form.addressLine2}
                onChange={handleChange}
              />
            </div>

            <div className="form-field">
              <label className="form-label">City</label>
              <input
                className="form-input-styled"
                name="city"
                placeholder="City Name"
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
                placeholder="State Name"
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
                placeholder="Postal Code"
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
                placeholder="Country Name"
                value={form.country}
                onChange={handleChange}
                required
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

            <div className="form-field">
              <label className="form-label">Visibility Status</label>
              <select
                className="form-input-styled"
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option value="draft">Draft (Admin Only)</option>
                <option value="published">Published (Publicly Visible)</option>
              </select>
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
