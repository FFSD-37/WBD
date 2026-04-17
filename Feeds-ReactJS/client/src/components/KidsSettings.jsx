import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useUserData } from "../providers/userData.jsx";
import "../styles/KidsSettings.css";
import "../styles/alert.css";

/*
ISSUES/Improvements:
1. Deactivate my account not implemented on server side yet.
2. Time control could use more granular options (e.g., different limits for weekdays/weekends).
3. Not deactivating account after time limit reached.
*/

const Modal = ({ title, onClose, children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      className="kids-modal-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && typeof onClose === "function") {
          onClose();
        }
      }}
    >
      <div className="kids-modal-content">
        <div className="kids-modal-header">
          <h2>{title}</h2>
          <button
            type="button"
            className="kids-modal-close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="kids-modal-body">{children}</div>
      </div>
    </div>
  );
};

// Simple inline alert banner
const AlertBanner = ({ type = "info", message, onClose }) => {
  if (!message) return null;
  return (
    <div className={`alert kids-alert kids-alert-${type}`}>
      <span>{message}</span>
      <button
        type="button"
        className="close-btn"
        onClick={onClose}
        aria-label="Close alert"
      >
        ×
      </button>
    </div>
  );
};

const KidsSettings = () => {
  const { userData } = useUserData();

  // Global alert
  const [alert, setAlert] = useState({ type: "info", message: "" });

  // Deactivate account modal state
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [deactivateForm, setDeactivateForm] = useState({
    password: "",
    reason: "",
    confirm: false,
  });
  const [deactivateErrors, setDeactivateErrors] = useState({});
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  // Time control modal state
  const [showTime, setShowTime] = useState(false);
  const [timeForm, setTimeForm] = useState({ hours: "", minutes: "" });
  const [timeErrors, setTimeErrors] = useState({});
  const [timeLoading, setTimeLoading] = useState(false);
  const [currentLimitText, setCurrentLimitText] = useState("Not set yet");

  // Change password modal state
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwdErrors, setPwdErrors] = useState({});
  const [pwdLoading, setPwdLoading] = useState(false);

  // Parental password modal
  const [showParentPwd, setShowParentPwd] = useState(false);
  const [parentForm, setParentForm] = useState({
    currentParentalPassword: "",
    newParentalPassword: "",
    confirmParentalPassword: "",
  });
  const [parentErrors, setParentErrors] = useState({});
  const [parentLoading, setParentLoading] = useState(false);

  // Fetch current time limit on open
  useEffect(() => {
    // if (!showTime) return;

    const fetchLimit = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/kids/time-control`,
          {
            method: "GET",
            credentials: "include",
          }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data && typeof data.dailyLimitMinutes === "number") {
          const mins = data.dailyLimitMinutes;
          const h = Math.floor(mins / 60);
          const m = mins % 60;
          setTimeForm({
            hours: h ? String(h) : "",
            minutes: String(m),
          });
          setCurrentLimitText(
            mins === 0
              ? "No daily limit"
              : `${h ? `${h}h ` : ""}${m ? `${m}m` : ""}`.trim()
          );
        }
      } catch (err) {
        console.error("Failed to load current time limit", err);
      }
    };

    fetchLimit();
  }, []);

  if (userData?.type !== "Kids") {
    return <Navigate to="/home" />;
  }

  // Helpers
  const showAlert = (type, message) => setAlert({ type, message });

  const handleDeactivateChange = (e) => {
    const { name, value, type, checked } = e.target;
    setDeactivateForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setDeactivateErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateDeactivate = () => {
    const errors = {};
    if (!deactivateForm.password.trim()) {
      errors.password = "Password is required";
    }
    if (!deactivateForm.reason.trim() || deactivateForm.reason.length < 10) {
      errors.reason = "Please provide a brief reason (at least 10 characters)";
    }
    if (!deactivateForm.confirm) {
      errors.confirm = "You must confirm that you understand this action";
    }
    setDeactivateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitDeactivate = async (e) => {
    e.preventDefault();
    if (!validateDeactivate()) return;

    setDeactivateLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/kids/deactivate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            password: deactivateForm.password,
            reason: deactivateForm.reason,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showAlert(
          "success",
          data.message || "Your account has been deactivated successfully."
        );
        setShowDeactivate(false);
        setDeactivateForm({ password: "", reason: "", confirm: false });
      } else {
        showAlert(
          "error",
          data.message || "Failed to deactivate account. Please try again."
        );
      }
    } catch (err) {
      console.error("Deactivate error", err);
      showAlert(
        "error",
        "Network error. Please check your connection and try again."
      );
    } finally {
      setDeactivateLoading(false);
    }
  };

  const handleTimeChange = (e) => {
    const { name, value } = e.target;
    // Only allow numeric input
    if (value === "" || /^[0-9\b]+$/.test(value)) {
      setTimeForm((prev) => ({ ...prev, [name]: value }));
      setTimeErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateTime = () => {
    const errors = {};
    const h = Number(timeForm.hours || 0);
    const m = Number(timeForm.minutes || 0);
    const total = h * 60 + m;

    if (Number.isNaN(h) || Number.isNaN(m)) {
      errors.hours = "Please enter a valid time";
    } else if (total <= 0) {
      errors.hours = "Daily limit must be greater than 0 minutes";
    } else if (total > 12 * 60) {
      errors.hours = "Daily limit cannot exceed 12 hours";
    }

    setTimeErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitTime = async (e) => {
    e.preventDefault();
    if (!validateTime()) return;

    const h = Number(timeForm.hours || 0);
    const m = Number(timeForm.minutes || 0);
    const totalMinutes = h * 60 + m;

    setTimeLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/kids/time-control`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ dailyLimitMinutes: totalMinutes }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showAlert(
          "success",
          data.message || "Daily usage limit updated successfully."
        );
        const hText = Math.floor(totalMinutes / 60);
        const mText = totalMinutes % 60;
        setCurrentLimitText(
          `${hText ? `${hText}h ` : ""}${mText ? `${mText}m` : ""}`.trim()
        );
        setShowTime(false);
      } else {
        showAlert(
          "error",
          data.message ||
            "Failed to update daily usage limit. Please try again later."
        );
      }
    } catch (err) {
      console.error("Time control error", err);
      showAlert(
        "error",
        "Network error. Please check your connection and try again."
      );
    } finally {
      setTimeLoading(false);
    }
  };

  const handlePwdChange = (e) => {
    const { name, value } = e.target;
    setPwdForm((prev) => ({ ...prev, [name]: value }));
    setPwdErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validatePasswordStrength = (pwd) => {
    if (pwd.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/[A-Z]/.test(pwd) || !/[a-z]/.test(pwd)) {
      return "Password must contain both uppercase and lowercase letters";
    }
    if (!/[0-9]/.test(pwd)) {
      return "Password must contain at least one number";
    }
    return "";
  };

  const validatePwd = () => {
    const errors = {};
    if (!pwdForm.currentPassword.trim()) {
      errors.currentPassword = "Current password is required";
    }

    const strengthError = validatePasswordStrength(pwdForm.newPassword || "");
    if (strengthError) {
      errors.newPassword = strengthError;
    }

    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setPwdErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitPwd = async (e) => {
    e.preventDefault();
    if (!validatePwd()) return;

    setPwdLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/kids/change-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            currentPassword: pwdForm.currentPassword,
            newPassword: pwdForm.newPassword,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showAlert(
          "success",
          data.message || "Password changed successfully."
        );
        setShowChangePwd(false);
        setPwdForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        showAlert(
          "error",
          data.message || "Failed to change password. Please try again."
        );
      }
    } catch (err) {
      console.error("Change password error", err);
      showAlert(
        "error",
        "Network error. Please check your connection and try again."
      );
    } finally {
      setPwdLoading(false);
    }
  };

  const handleParentChange = (e) => {
    const { name, value } = e.target;
    setParentForm((prev) => ({ ...prev, [name]: value }));
    setParentErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateParentPwd = () => {
    const errors = {};
    if (!parentForm.currentParentalPassword.trim()) {
      errors.currentParentalPassword = "Current parental password is required";
    }

    const strengthError = validatePasswordStrength(
      parentForm.newParentalPassword || ""
    );
    if (strengthError) {
      errors.newParentalPassword = strengthError;
    }

    if (
      parentForm.newParentalPassword !== parentForm.confirmParentalPassword
    ) {
      errors.confirmParentalPassword = "Passwords do not match";
    }

    setParentErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitParentPwd = async (e) => {
    e.preventDefault();
    if (!validateParentPwd()) return;

    setParentLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/kids/change-parental-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            currentParentalPassword: parentForm.currentParentalPassword,
            newParentalPassword: parentForm.newParentalPassword,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showAlert(
          "success",
          data.message || "Parental control password changed successfully."
        );
        setShowParentPwd(false);
        setParentForm({
          currentParentalPassword: "",
          newParentalPassword: "",
          confirmParentalPassword: "",
        });
      } else {
        showAlert(
          "error",
          data.message ||
            "Failed to change parental control password. Please try again."
        );
      }
    } catch (err) {
      console.error("Change parental password error", err);
      showAlert(
        "error",
        "Network error. Please check your connection and try again."
      );
    } finally {
      setParentLoading(false);
    }
  };

  return (
    <div className="kids-settings-page">
      <div className="kids-settings-container">
        <div className="kids-settings-header">
          <h1>Kids Settings</h1>
          <p>Manage your account safely with parental controls.</p>
        </div>

        <AlertBanner
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ type: "info", message: "" })}
        />

        <div className="kids-settings-grid">
          {/* Activity Log */}
          <div className="kids-card">
            <div className="kids-card-icon">📊</div>
            <div className="kids-card-content">
              <h2>Activity Log</h2>
              <p>View your recent actions and sign-in history.</p>
            </div>
            <a href="/activityLog" className="kids-card-button">
              Open Activity Log
            </a>
          </div>

          {/* Deactivate Account (Kids only) */}
          <div className="kids-card kids-card-danger">
            <div className="kids-card-icon">⏸️</div>
            <div className="kids-card-content">
              <h2>Deactivate My Account</h2>
              <p>
                Temporarily deactivate your account. You can reactivate it
                later.
              </p>
            </div>
            <button
              type="button"
              className="kids-card-button kids-card-button-outline"
              onClick={() => setShowDeactivate(true)}
            >
              Deactivate Account
            </button>
          </div>

          {/* Time Control */}
          <div className="kids-card">
            <div className="kids-card-icon">⏱️</div>
            <div className="kids-card-content">
              <h2>Time Control</h2>
              <p>
                Set a daily time limit for using Feeds. Current:{" "}
                <strong>{currentLimitText}</strong>
              </p>
            </div>
            <button
              type="button"
              className="kids-card-button"
              onClick={() => setShowTime(true)}
            >
              Set Daily Limit
            </button>
          </div>

          {/* Change Password */}
          <div className="kids-card">
            <div className="kids-card-icon">🔒</div>
            <div className="kids-card-content">
              <h2>Change Password</h2>
              <p>Update the password used to sign in to your account.</p>
            </div>
            <button
              type="button"
              className="kids-card-button"
              onClick={() => setShowChangePwd(true)}
            >
              Change Password
            </button>
          </div>

          {/* Parental Control Password */}
          <div className="kids-card">
            <div className="kids-card-icon">👨‍👩‍👧</div>
            <div className="kids-card-content">
              <h2>Parental Control Password</h2>
              <p>Change the password that protects sensitive settings.</p>
            </div>
            <button
              type="button"
              className="kids-card-button"
              onClick={() => setShowParentPwd(true)}
            >
              Change Parental Password
            </button>
          </div>
        </div>
      </div>

      {/* Deactivate Modal */}
      {showDeactivate && (
        <Modal
          title="Deactivate My Account"
          onClose={() => {
            if (!deactivateLoading) setShowDeactivate(false);
          }}
        >
          <form onSubmit={submitDeactivate} className="kids-form" noValidate>
            <div
              className={`kids-form-group ${
                deactivateErrors.password ? "kids-form-error" : ""
              }`}
            >
              <label htmlFor="deactivate-password">
                Password <span className="kids-required">*</span>
              </label>
              <input
                id="deactivate-password"
                type="password"
                name="password"
                value={deactivateForm.password}
                onChange={handleDeactivateChange}
                disabled={deactivateLoading}
                placeholder="Enter your password"
              />
              {deactivateErrors.password && (
                <p className="kids-error-text">{deactivateErrors.password}</p>
              )}
            </div>

            <div
              className={`kids-form-group ${
                deactivateErrors.reason ? "kids-form-error" : ""
              }`}
            >
              <label htmlFor="deactivate-reason">
                Reason <span className="kids-required">*</span>
              </label>
              <textarea
                id="deactivate-reason"
                name="reason"
                rows="3"
                value={deactivateForm.reason}
                onChange={handleDeactivateChange}
                disabled={deactivateLoading}
                placeholder="Tell us why you want to deactivate your account"
              />
              {deactivateErrors.reason && (
                <p className="kids-error-text">{deactivateErrors.reason}</p>
              )}
            </div>

            <div
              className={`kids-form-group kids-form-checkbox ${
                deactivateErrors.confirm ? "kids-form-error" : ""
              }`}
            >
              <label>
                <input
                  type="checkbox"
                  name="confirm"
                  checked={deactivateForm.confirm}
                  onChange={handleDeactivateChange}
                  disabled={deactivateLoading}
                />
                <span>
                  I understand that my account will be deactivated until I
                  reactivate it.
                </span>
              </label>
              {deactivateErrors.confirm && (
                <p className="kids-error-text">{deactivateErrors.confirm}</p>
              )}
            </div>

            <div className="kids-form-actions">
              <button
                type="button"
                className="kids-btn kids-btn-ghost"
                onClick={() => setShowDeactivate(false)}
                disabled={deactivateLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="kids-btn kids-btn-danger"
                disabled={deactivateLoading}
              >
                {deactivateLoading ? "Deactivating..." : "Deactivate"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Time Control Modal */}
      {showTime && (
        <Modal
          title="Set Daily Usage Limit"
          onClose={() => {
            if (!timeLoading) setShowTime(false);
          }}
        >
          <form onSubmit={submitTime} className="kids-form" noValidate>
            <div
              className={`kids-form-inline ${
                timeErrors.hours ? "kids-form-error" : ""
              }`}
            >
              <div className="kids-form-group">
                <label htmlFor="time-hours">Hours</label>
                <input
                  id="time-hours"
                  type="text"
                  name="hours"
                  value={timeForm.hours}
                  onChange={handleTimeChange}
                  disabled={timeLoading}
                  placeholder="0"
                  inputMode="numeric"
                />
              </div>
              <div className="kids-form-group">
                <label htmlFor="time-minutes">
                  Minutes <span className="kids-required">*</span>
                </label>
                <input
                  id="time-minutes"
                  type="text"
                  name="minutes"
                  value={timeForm.minutes}
                  onChange={handleTimeChange}
                  disabled={timeLoading}
                  placeholder="30"
                  inputMode="numeric"
                />
              </div>
            </div>
            {timeErrors.hours && (
              <p className="kids-error-text">{timeErrors.hours}</p>
            )}

            <div className="kids-form-hint">
              Limit must be between 10 minutes and 12 hours per day.
            </div>

            <div className="kids-form-actions">
              <button
                type="button"
                className="kids-btn kids-btn-ghost"
                onClick={() => setShowTime(false)}
                disabled={timeLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="kids-btn kids-btn-primary"
                disabled={timeLoading}
              >
                {timeLoading ? "Saving..." : "Save Limit"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Change Password Modal */}
      {showChangePwd && (
        <Modal
          title="Change Password"
          onClose={() => {
            if (!pwdLoading) setShowChangePwd(false);
          }}
        >
          <form onSubmit={submitPwd} className="kids-form" noValidate>
            <div
              className={`kids-form-group ${
                pwdErrors.currentPassword ? "kids-form-error" : ""
              }`}
            >
              <label htmlFor="currentPassword">
                Current Password <span className="kids-required">*</span>
              </label>
              <input
                id="currentPassword"
                type="password"
                name="currentPassword"
                value={pwdForm.currentPassword}
                onChange={handlePwdChange}
                disabled={pwdLoading}
                placeholder="Enter current password"
              />
              {pwdErrors.currentPassword && (
                <p className="kids-error-text">{pwdErrors.currentPassword}</p>
              )}
            </div>

            <div
              className={`kids-form-group ${
                pwdErrors.newPassword ? "kids-form-error" : ""
              }`}
            >
              <label htmlFor="newPassword">
                New Password <span className="kids-required">*</span>
              </label>
              <input
                id="newPassword"
                type="password"
                name="newPassword"
                value={pwdForm.newPassword}
                onChange={handlePwdChange}
                disabled={pwdLoading}
                placeholder="At least 8 characters, with letters & numbers"
              />
              {pwdErrors.newPassword && (
                <p className="kids-error-text">{pwdErrors.newPassword}</p>
              )}
            </div>

            <div
              className={`kids-form-group ${
                pwdErrors.confirmPassword ? "kids-form-error" : ""
              }`}
            >
              <label htmlFor="confirmPassword">
                Confirm New Password <span className="kids-required">*</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                value={pwdForm.confirmPassword}
                onChange={handlePwdChange}
                disabled={pwdLoading}
                placeholder="Re-enter new password"
              />
              {pwdErrors.confirmPassword && (
                <p className="kids-error-text">{pwdErrors.confirmPassword}</p>
              )}
            </div>

            <div className="kids-form-actions">
              <button
                type="button"
                className="kids-btn kids-btn-ghost"
                onClick={() => setShowChangePwd(false)}
                disabled={pwdLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="kids-btn kids-btn-primary"
                disabled={pwdLoading}
              >
                {pwdLoading ? "Saving..." : "Change Password"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Parental Password Modal */}
      {showParentPwd && (
        <Modal
          title="Change Parental Control Password"
          onClose={() => {
            if (!parentLoading) setShowParentPwd(false);
          }}
        >
          <form onSubmit={submitParentPwd} className="kids-form" noValidate>
            <div
              className={`kids-form-group ${
                parentErrors.currentParentalPassword ? "kids-form-error" : ""
              }`}
            >
              <label htmlFor="currentParentalPassword">
                Current Parental Password{" "}
                <span className="kids-required">*</span>
              </label>
              <input
                id="currentParentalPassword"
                type="password"
                name="currentParentalPassword"
                value={parentForm.currentParentalPassword}
                onChange={handleParentChange}
                disabled={parentLoading}
                placeholder="Enter current parental password"
              />
              {parentErrors.currentParentalPassword && (
                <p className="kids-error-text">
                  {parentErrors.currentParentalPassword}
                </p>
              )}
            </div>

            <div
              className={`kids-form-group ${
                parentErrors.newParentalPassword ? "kids-form-error" : ""
              }`}
            >
              <label htmlFor="newParentalPassword">
                New Parental Password{" "}
                <span className="kids-required">*</span>
              </label>
              <input
                id="newParentalPassword"
                type="password"
                name="newParentalPassword"
                value={parentForm.newParentalPassword}
                onChange={handleParentChange}
                disabled={parentLoading}
                placeholder="At least 8 characters, with letters & numbers"
              />
              {parentErrors.newParentalPassword && (
                <p className="kids-error-text">
                  {parentErrors.newParentalPassword}
                </p>
              )}
            </div>

            <div
              className={`kids-form-group ${
                parentErrors.confirmParentalPassword
                  ? "kids-form-error"
                  : ""
              }`}
            >
              <label htmlFor="confirmParentalPassword">
                Confirm New Parental Password{" "}
                <span className="kids-required">*</span>
              </label>
              <input
                id="confirmParentalPassword"
                type="password"
                name="confirmParentalPassword"
                value={parentForm.confirmParentalPassword}
                onChange={handleParentChange}
                disabled={parentLoading}
                placeholder="Re-enter new parental password"
              />
              {parentErrors.confirmParentalPassword && (
                <p className="kids-error-text">
                  {parentErrors.confirmParentalPassword}
                </p>
              )}
            </div>

            <div className="kids-form-actions">
              <button
                type="button"
                className="kids-btn kids-btn-ghost"
                onClick={() => setShowParentPwd(false)}
                disabled={parentLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="kids-btn kids-btn-primary"
                disabled={parentLoading}
              >
                {parentLoading ? "Saving..." : "Change Password"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default KidsSettings;