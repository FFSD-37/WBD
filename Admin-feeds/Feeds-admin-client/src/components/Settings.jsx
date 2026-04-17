import React, { useState } from "react";
import {
  User,
  Lock,
  Bell,
  Shield,
  Database,
  Mail,
  Globe,
  Save,
  RefreshCw,
} from "lucide-react";
import Sidebar from "./Sidebar";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const SettingsPage = () => {
  const [qrCode, setQrCode] = useState(null);
  const [otp, setOtp] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const { user } = useContext(AuthContext);

  // Profile Settings State
  const [profileData, setProfileData] = useState({
    name: user.username,
    email: user.email,
    role: "Super Admin",
  });

  // Security Settings State

  // Notification Settings State
  const [notificationData, setNotificationData] = useState({
    emailNotifications: true,
    reportAlerts: true,
    paymentAlerts: true,
    feedbackAlerts: false,
  });

  // System Settings State
  const [systemData, setSystemData] = useState({
    maintenanceMode: false,
    autoBackup: true,
    backupFrequency: "daily",
  });

  const verifyOtp = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/setting/verify-2fa`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ otp }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: "2FA enabled successfully" });
        setQrCode(null);
        setShowOtpInput(false);
        setOtp("");
      } else {
        setMessage({ type: "error", text: data.msg });
      }
    } catch {
      setMessage({ type: "error", text: "OTP verification failed" });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const res = await fetch(`${import.meta.env.VITE_API_URL}/setting/updateSettings`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tab: activeTab,
          data:
            activeTab === "profile"
              ? profileData
              : activeTab === "security"
                ? securityData
                : activeTab === "notifications"
                  ? notificationData
                  : systemData,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: data.msg });

        // 🔐 If backend sends QR code → start 2FA setup flow
        if (activeTab === "security" && data.qrCode) {
          setQrCode(data.qrCode);
          setShowOtpInput(true);
          return; // stop here, don't reset form yet
        }

        if (activeTab === "security") {
          setSecurityData({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
            twoFactorEnabled: securityData.twoFactorEnabled,
          });
        }
      } else {
        setMessage({ type: "error", text: data.msg });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error saving settings" });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const [securityData, setSecurityData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
  });

  const renderProfileSettings = () => (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>Profile Information</h3>
      <div style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Username</label>
          <input
            type="text"
            value={profileData.name}
            onChange={(e) =>
              setProfileData({ ...profileData, name: e.target.value })
            }
            style={styles.input}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Email Address</label>
          <input
            type="email"
            value={profileData.email}
            onChange={(e) =>
              setProfileData({ ...profileData, email: e.target.value })
            }
            style={styles.input}
          />
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>Security Settings</h3>
      <div style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Current Password</label>
          <input
            type="password"
            value={securityData.currentPassword}
            onChange={(e) =>
              setSecurityData({
                ...securityData,
                currentPassword: e.target.value,
              })
            }
            style={styles.input}
            placeholder="Enter current password"
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>New Password</label>
          <input
            type="password"
            value={securityData.newPassword}
            onChange={(e) =>
              setSecurityData({ ...securityData, newPassword: e.target.value })
            }
            style={styles.input}
            placeholder="Enter new password"
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Confirm New Password</label>
          <input
            type="password"
            value={securityData.confirmPassword}
            onChange={(e) =>
              setSecurityData({
                ...securityData,
                confirmPassword: e.target.value,
              })
            }
            style={styles.input}
            placeholder="Confirm new password"
          />
        </div>
        <div style={styles.toggleGroup}>
          <div>
            <div style={styles.toggleLabel}>Two-Factor Authentication</div>
            <div style={styles.toggleDescription}>
              Add an extra layer of security to your account
            </div>
          </div>
          <label style={styles.switch}>
            <input
              type="checkbox"
              checked={securityData.twoFactorEnabled}
              onChange={(e) =>
                setSecurityData({
                  ...securityData,
                  twoFactorEnabled: e.target.checked,
                })
              }
            />
            <span style={styles.slider}></span>
          </label>
        </div>
        {qrCode && (
          <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
            <h4 style={{ marginBottom: "0.5rem" }}>
              Scan this QR with Google Authenticator
            </h4>
            <img
              src={qrCode}
              alt="2FA QR Code"
              style={{ margin: "1rem auto" }}
            />

            {showOtpInput && (
              <div style={{ marginTop: "1rem" }}>
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  style={{
                    ...styles.input,
                    textAlign: "center",
                    letterSpacing: "4px",
                    width: "200px",
                    margin: "0 auto",
                  }}
                />

                <button
                  style={{ ...styles.saveButton, marginTop: "1rem" }}
                  onClick={verifyOtp}
                >
                  Verify OTP
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );



  console.log(user);

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <div className="header">
          <div className="header-right">
            <div className="user-info">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Bonnie"
                alt="User"
                className="user-avatar"
              />
              <span className="user-name">{user.username}</span>
            </div>
          </div>
        </div>
        <div className="content-area">
          <h2 style={styles.pageTitle}>Settings</h2>
          {message && (
            <div
              style={{
                ...styles.message,
                backgroundColor:
                  message.type === "success" ? "#d1fae5" : "#fee2e2",
                color: message.type === "success" ? "#065f46" : "#991b1b",
                border: `1px solid ${message.type === "success" ? "#10b981" : "#ef4444"}`,
              }}
            >
              {message.text}
            </div>
          )}

          <div style={styles.container}>
            <div style={styles.sidebar}>
              <button
                style={{
                  ...styles.tab,
                  ...(activeTab === "profile" ? styles.tabActive : {}),
                }}
                onClick={() => setActiveTab("profile")}
              >
                <User size={18} />
                Profile
              </button>
              <button
                style={{
                  ...styles.tab,
                  ...(activeTab === "security" ? styles.tabActive : {}),
                }}
                onClick={() => setActiveTab("security")}
              >
                <Lock size={18} />
                Security
              </button>
            </div>

            {/* Content Area */}
            <div style={styles.content}>
              {activeTab === "profile" && renderProfileSettings()}
              {activeTab === "security" && renderSecuritySettings()}

              {/* Save Button */}
              <div style={styles.saveSection}>
                <button
                  style={styles.saveButton}
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save size={18} />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  pageTitle: {
    fontSize: "1.75rem",
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: "1.5rem",
  },
  message: {
    padding: "0.875rem 1rem",
    borderRadius: "8px",
    marginBottom: "1.5rem",
    fontWeight: "500",
  },
  container: {
    display: "flex",
    gap: "2rem",
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "1.5rem",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },
  sidebar: {
    minWidth: "200px",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  tab: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.875rem 1rem",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "8px",
    fontSize: "0.95rem",
    fontWeight: "500",
    color: "#6b7280",
    cursor: "pointer",
    transition: "all 0.2s",
    textAlign: "left",
  },
  tabActive: {
    backgroundColor: "#ede9fe",
    color: "#6366f1",
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: "2rem",
  },
  sectionTitle: {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: "1rem",
    paddingBottom: "0.75rem",
    borderBottom: "2px solid #e5e7eb",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  label: {
    fontSize: "0.875rem",
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    padding: "0.75rem",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    fontSize: "0.95rem",
    outline: "none",
    transition: "border-color 0.2s",
  },
  toggleGroup: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem",
    backgroundColor: "#f9fafb",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
  },
  toggleLabel: {
    fontSize: "0.95rem",
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: "0.25rem",
  },
  toggleDescription: {
    fontSize: "0.8rem",
    color: "#6b7280",
  },
  switch: {
    position: "relative",
    display: "inline-block",
    width: "48px",
    height: "24px",
  },
  slider: {
    position: "absolute",
    cursor: "pointer",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#cbd5e1",
    transition: "0.4s",
    borderRadius: "24px",
  },
  actionButtons: {
    display: "flex",
    gap: "1rem",
    marginTop: "0.5rem",
  },
  actionButton: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.75rem 1.25rem",
    backgroundColor: "#6366f1",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "0.875rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  saveSection: {
    marginTop: "2rem",
    paddingTop: "1.5rem",
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "flex-end",
  },
  saveButton: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.875rem 2rem",
    backgroundColor: "#10b981",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
};

// Add CSS for the toggle switch
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  input[type="checkbox"] {
    opacity: 0;
    width: 0;
    height: 0;
  }

  input:checked + span {
    background-color: #10b981;
  }

  input:checked + span:before {
    transform: translateX(24px);
  }

  span:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
  }

  input:focus + span {
    box-shadow: 0 0 1px #10b981;
  }
`;
document.head.appendChild(styleSheet);

export default SettingsPage;
