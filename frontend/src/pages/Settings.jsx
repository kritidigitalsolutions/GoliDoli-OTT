import React, { useState, useEffect, useRef } from "react";
import API from "../api/axios";
import {
  Settings as SettingsIcon,
  Lock,
  Mail,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Send,
  RefreshCw,
  Clock,
  Sparkles,
  ArrowRight,
  X,
  Key,
  AtSign,
  ShieldAlert
} from "lucide-react";
import "./Settings.css";

const OtpInput = ({ value = "", onChange, length = 6, disabled = false, onEnter }) => {
  const inputsRef = useRef([]);

  // Create an array from the value string, padded with empty strings to match length
  const otpArray = Array(length).fill("").map((_, i) => value[i] || "");

  const handleChange = (e, index) => {
    const val = e.target.value;
    // Allow only digits
    if (val && !/^\d+$/.test(val)) return;

    // Get the last character entered
    const char = val.slice(-1);
    const newOtpArray = [...otpArray];
    newOtpArray[index] = char;

    const newOtpString = newOtpArray.join("");
    onChange(newOtpString);

    // Auto-focus next input
    if (char && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!otpArray[index] && index > 0) {
        // Focus previous input and clear it
        const newOtpArray = [...otpArray];
        newOtpArray[index - 1] = "";
        onChange(newOtpArray.join(""));
        inputsRef.current[index - 1]?.focus();
      } else {
        // Just clear current input
        const newOtpArray = [...otpArray];
        newOtpArray[index] = "";
        onChange(newOtpArray.join(""));
      }
    } else if (e.key === "Enter" && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (!/^\d+$/.test(pastedData)) return;

    const sliced = pastedData.slice(0, length);
    onChange(sliced);

    // Focus appropriate input
    const focusIndex = Math.min(sliced.length, length - 1);
    if (focusIndex >= 0) {
      inputsRef.current[focusIndex]?.focus();
    }
  };

  return (
    <div className="otp-blocks-container">
      {Array(length)
        .fill(0)
        .map((_, i) => (
          <input
            key={i}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={otpArray[i]}
            ref={(el) => (inputsRef.current[i] = el)}
            onChange={(e) => handleChange(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onPaste={handlePaste}
            disabled={disabled}
            className={`otp-block-input ${otpArray[i] ? "has-val" : ""}`}
            autoComplete="one-time-code"
          />
        ))}
    </div>
  );
};

const Settings = () => {
  const [form, setForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
    otp: "",
  });

  const [emailForm, setEmailForm] = useState({
    oldEmail: "",
    newEmail: "",
    otp: "",
  });

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [pwdOtpSent, setPwdOtpSent] = useState(false);
  const [pwdTimer, setPwdTimer] = useState(0);

  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);

  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Helper password strength score
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: "", color: "transparent", percent: 0 };
    if (pwd.length < 6) return { score: 1, label: "Too Short", color: "#ef4444", percent: 33 };
    const hasNumbers = /\d/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
    if (pwd.length >= 8 && (hasNumbers || hasSpecial)) {
      return { score: 3, label: "Strong", color: "#10b981", percent: 100 };
    }
    return { score: 2, label: "Good", color: "#f59e0b", percent: 66 };
  };

  const pwdStrength = getPasswordStrength(form.newPassword);
  const doPasswordsMatch =
    form.confirmPassword.length > 0 && form.newPassword === form.confirmPassword;

  // ================= PASSWORD =================
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleKeyDownPassword = (e) => {
    if (e.key === "Enter" && !pwdOtpSent) {
      e.preventDefault();
      handleSendPwdOtp();
    }
  };

  const handleSendPwdOtp = async () => {
    setMessage("");
    setError("");

    if (!form.oldPassword || !form.newPassword || !form.confirmPassword) {
      return setError("All fields are required to request OTP");
    }

    if (form.newPassword.length < 6) {
      return setError("Password must be at least 6 characters");
    }

    if (form.newPassword !== form.confirmPassword) {
      return setError("New password and confirm password do not match");
    }

    try {
      setLoading(true);
      const res = await API.post("/admin/auth/change-password/send-otp", {
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
      });

      setPwdOtpSent(true);
      setMessage(res.data.message || "Password change OTP sent successfully to your email 📩");
      setPwdTimer(30);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setMessage("");
    setError("");

    if (!form.otp) {
      return setError("Please enter the 6-digit OTP code");
    }

    try {
      setLoading(true);
      const res = await API.post("/admin/auth/change-password", {
        oldPassword: form.oldPassword,
        otp: form.otp,
        newPassword: form.newPassword,
      });

      setMessage(res.data.message || "Password updated successfully!");
      setForm({ oldPassword: "", newPassword: "", confirmPassword: "", otp: "" });
      setPwdOtpSent(false);
      setPwdTimer(0);
      setShowOldPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (err) {
      setError(err.response?.data?.message || "Error updating password");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPwdForm = () => {
    setPwdOtpSent(false);
    setForm({ ...form, otp: "" });
  };

  // ================= EMAIL =================
  const handleEmailChange = (e) => {
    setEmailForm({ ...emailForm, [e.target.name]: e.target.value });
  };

  const handleKeyDownEmail = (e) => {
    if (e.key === "Enter" && !otpSent) {
      e.preventDefault();
      handleSendOtp();
    }
  };

  const handleSendOtp = async () => {
    setMessage("");
    setError("");

    if (!emailForm.oldEmail || !emailForm.newEmail) {
      return setError("Both old and new email addresses are required");
    }

    try {
      setEmailLoading(true);
      const res = await API.post("/admin/auth/change-email/send-otp", {
        oldEmail: emailForm.oldEmail,
        newEmail: emailForm.newEmail,
      });

      setOtpSent(true);
      setMessage(res.data.message || "Verification OTP sent to your email 📩");
      setTimer(30);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleUpdateEmail = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setMessage("");
    setError("");

    if (!emailForm.otp) {
      return setError("Please enter the 6-digit OTP code");
    }

    try {
      setEmailLoading(true);
      const res = await API.post("/admin/auth/change-email", {
        oldEmail: emailForm.oldEmail,
        newEmail: emailForm.newEmail,
        otp: emailForm.otp,
      });

      setMessage(res.data.message || "Email address updated successfully!");
      setEmailForm({ oldEmail: "", newEmail: "", otp: "" });
      setOtpSent(false);
      setTimer(0);
    } catch (err) {
      setError(err.response?.data?.message || "Error updating email");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleResetEmailForm = () => {
    setOtpSent(false);
    setEmailForm({ ...emailForm, otp: "" });
  };

  // 🔥 TIMER LOGIC
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [timer]);

  useEffect(() => {
    if (pwdTimer > 0) {
      const interval = setInterval(() => {
        setPwdTimer((prev) => prev - 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [pwdTimer]);

  return (
    <div className="page-section settings-page">
      {/* Header */}
      <div className="pg-header settings-page-header">
        <h1 className="pg-title">
          <SettingsIcon size={26} className="pg-title-icon" /> Settings
        </h1>
      </div>

      {/* Alerts */}
      {message && (
        <div className="alert alert-success">
          <CheckCircle2 size={20} />
          <div className="alert-content">
            <span className="alert-title">Success</span>
            <span>{message}</span>
          </div>
          <button className="alert-close-btn" onClick={() => setMessage("")}>
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={20} />
          <div className="alert-content">
            <span className="alert-title">Action Required</span>
            <span>{error}</span>
          </div>
          <button className="alert-close-btn" onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* 🔥 BOTH CARDS CONTAINER */}
      <div className="form-card-container">
        {/* PASSWORD CARD */}
        <div className={`form-card ${pwdOtpSent ? "otp-active-card" : ""}`}>
          <div className="form-card-header">
            <div className="card-header-title">
              <div className="card-badge-icon">
                <Lock size={20} />
              </div>
              <div>
                <h3>Change Password</h3>
                <p className="card-header-sub">Update your login security credentials</p>
              </div>
            </div>
            <span className="step-pill">
              {pwdOtpSent ? "Step 2 of 2: OTP Verification" : "Step 1 of 2: Details"}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="settings-form">
            {!pwdOtpSent ? (
              <>
                <div className="form-field">
                  <label className="form-label">Old Password</label>
                  <div className="password-input-container">
                    <Key size={18} className="input-leading-icon" />
                    <input
                      type={showOldPassword ? "text" : "password"}
                      name="oldPassword"
                      placeholder="Enter current password"
                      value={form.oldPassword}
                      onChange={handleChange}
                      onKeyDown={handleKeyDownPassword}
                      className="form-input-styled with-icons"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      tabIndex="-1"
                      title={showOldPassword ? "Hide password" : "Show password"}
                    >
                      {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">New Password</label>
                  <div className="password-input-container">
                    <Lock size={18} className="input-leading-icon" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      name="newPassword"
                      placeholder="Enter new password (min 6 chars)"
                      value={form.newPassword}
                      onChange={handleChange}
                      onKeyDown={handleKeyDownPassword}
                      className="form-input-styled with-icons"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      tabIndex="-1"
                      title={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {form.newPassword && (
                    <div className="pwd-strength-container">
                      <div className="pwd-strength-bar">
                        <div
                          className="pwd-strength-fill"
                          style={{
                            width: `${pwdStrength.percent}%`,
                            backgroundColor: pwdStrength.color,
                          }}
                        />
                      </div>
                      <span className="pwd-strength-label" style={{ color: pwdStrength.color }}>
                        {pwdStrength.label}
                      </span>
                    </div>
                  )}
                </div>

                <div className="form-field">
                  <label className="form-label">Confirm New Password</label>
                  <div className="password-input-container">
                    <Lock size={18} className="input-leading-icon" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Re-enter new password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      onKeyDown={handleKeyDownPassword}
                      className={`form-input-styled with-icons ${
                        form.confirmPassword
                          ? doPasswordsMatch
                            ? "match-success"
                            : "match-error"
                          : ""
                      }`}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex="-1"
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {form.confirmPassword && (
                    <div className="match-feedback">
                      {doPasswordsMatch ? (
                        <span className="match-text success">
                          <CheckCircle2 size={14} /> Passwords match
                        </span>
                      ) : (
                        <span className="match-text error">
                          <ShieldAlert size={14} /> Passwords do not match
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSendPwdOtp}
                  className="btn btn-primary btn-lg settings-action-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <><RefreshCw size={16} className="spin-icon" /> Sending...</>
                  ) : (
                    <><Send size={15} /> Get Verification Code</>
                  )}
                </button>
              </>
            ) : (
              /* OTP PHASE */
              <div className="otp-verification-section">
                <div className="otp-info-banner">
                  <div className="otp-info-text">
                    <Sparkles size={16} className="sparkle-icon" />
                    <span>Enter 6-digit verification code sent to admin email</span>
                  </div>
                  <button type="button" className="btn-change-details" onClick={handleResetPwdForm}>
                    Edit Details
                  </button>
                </div>

                <div className="form-field">
                  <label className="form-label otp-centered-label">Enter 6-Digit OTP</label>
                  <OtpInput
                    value={form.otp}
                    onChange={(otpVal) => setForm({ ...form, otp: otpVal })}
                    disabled={loading}
                    onEnter={handleSubmit}
                  />
                </div>

                <div className="resend-row">
                  <button
                    type="button"
                    onClick={handleSendPwdOtp}
                    disabled={pwdTimer > 0 || loading}
                    className="resend-btn"
                  >
                    <Clock size={14} />
                    {pwdTimer > 0 ? `Resend OTP in ${pwdTimer}s` : "Resend OTP Code"}
                  </button>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg settings-action-btn"
                  disabled={loading || form.otp.length < 6}
                >
                  {loading ? (
                    <><RefreshCw size={16} className="spin-icon" /> Updating...</>
                  ) : (
                    <><ShieldCheck size={15} /> Update Password</>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* EMAIL CARD */}
        <div className={`form-card ${otpSent ? "otp-active-card" : ""}`}>
          <div className="form-card-header">
            <div className="card-header-title">
              <div className="card-badge-icon">
                <Mail size={20} />
              </div>
              <div>
                <h3>Change Email</h3>
                <p className="card-header-sub">Update registered admin email address</p>
              </div>
            </div>
            <span className="step-pill">
              {otpSent ? "Step 2 of 2: OTP Verification" : "Step 1 of 2: Details"}
            </span>
          </div>

          <form onSubmit={handleUpdateEmail} className="settings-form">
            {!otpSent ? (
              <>
                <div className="form-field">
                  <label className="form-label">Current Admin Email</label>
                  <div className="password-input-container">
                    <AtSign size={18} className="input-leading-icon" />
                    <input
                      type="email"
                      name="oldEmail"
                      placeholder="Enter current email address"
                      value={emailForm.oldEmail}
                      onChange={handleEmailChange}
                      onKeyDown={handleKeyDownEmail}
                      className="form-input-styled with-icons"
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">New Admin Email</label>
                  <div className="password-input-container">
                    <Mail size={18} className="input-leading-icon" />
                    <input
                      type="email"
                      name="newEmail"
                      placeholder="Enter new email address"
                      value={emailForm.newEmail}
                      onChange={handleEmailChange}
                      onKeyDown={handleKeyDownEmail}
                      className="form-input-styled with-icons"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="btn btn-primary btn-lg settings-action-btn"
                  disabled={emailLoading}
                >
                  {emailLoading ? (
                    <><RefreshCw size={16} className="spin-icon" /> Sending...</>
                  ) : (
                    <><Send size={15} /> Get Verification Code</>
                  )}
                </button>
              </>
            ) : (
              /* EMAIL OTP PHASE */
              <div className="otp-verification-section">
                <div className="otp-info-banner">
                  <div className="otp-info-text">
                    <Sparkles size={16} className="sparkle-icon" />
                    <span>Enter 6-digit code sent to {emailForm.oldEmail || "old email"}</span>
                  </div>
                  <button type="button" className="btn-change-details" onClick={handleResetEmailForm}>
                    Edit Details
                  </button>
                </div>

                <div className="form-field">
                  <label className="form-label otp-centered-label">Enter 6-Digit OTP</label>
                  <OtpInput
                    value={emailForm.otp}
                    onChange={(otpVal) => setEmailForm({ ...emailForm, otp: otpVal })}
                    disabled={emailLoading}
                    onEnter={handleUpdateEmail}
                  />
                </div>

                <div className="resend-row">
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={timer > 0 || emailLoading}
                    className="resend-btn"
                  >
                    <Clock size={14} />
                    {timer > 0 ? `Resend OTP in ${timer}s` : "Resend OTP Code"}
                  </button>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg settings-action-btn"
                  disabled={emailLoading || emailForm.otp.length < 6}
                >
                  {emailLoading ? (
                    <><RefreshCw size={16} className="spin-icon" /> Updating...</>
                  ) : (
                    <><ShieldCheck size={15} /> Update Email</>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;