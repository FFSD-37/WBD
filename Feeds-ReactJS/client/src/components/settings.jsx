import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useUserData } from "../providers/userData.jsx";
import "../styles/settings.css";
import "../styles/KidsSettings.css";
import "../styles/alert.css";
import { useNavigate } from 'react-router-dom';

/*
ISSUES/Improvements:
1. Better Responsiveness for various screen sizes.
*/

const Modal = ({ children, onClose }) => {
    // ensure modal root exists
    const modalRootId = "modal-root";
    useEffect(() => {
        let root = document.getElementById(modalRootId);
        if (!root) {
            root = document.createElement("div");
            root.id = modalRootId;
            document.body.appendChild(root);
        }
        return () => {
            // don't remove root to avoid flicker if other modals used later
        };
    }, []);

    const root = document.getElementById(modalRootId) || document.body;

    // Inline styles (very defensive)
    const overlayStyle = {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        zIndex: 2147483647, // extremely large to outrank anything
        pointerEvents: "auto",
    };

    const contentStyle = {
        backgroundColor: "#ffffff",
        padding: 24,
        borderRadius: 12,
        maxWidth: 420,
        width: "min(92%, 420px)",
        boxShadow:
            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    };

    const portalContent = (
        <div
            className="modal-overlay"
            style={overlayStyle}
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
                // allow clicking outside to close
                if (e.target === e.currentTarget && typeof onClose === "function") {
                    onClose();
                }
            }}
        >
            <div className="modal-content" style={contentStyle}>
                {children}
            </div>
        </div>
    );

    return createPortal(portalContent, root);
};

// Kids-specific Modal component
const KidsModal = ({ title, onClose, children }) => {
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

// Alert Banner component
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

const Settings = () => {
    const { userData: Meuser } = useUserData();
    const navigate = useNavigate();

    const [blockedUsers, setBlockedUsers] = useState([]);
    const [isPublic, setIsPublic] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [basicDetails, setBasicDetails] = useState({});

    const fetchBlocked = async () => {
        const res = await fetch(
            `${import.meta.env.VITE_SERVER_URL}/block`,
            {
                method: "GET",
                credentials: "include"
            },
        );
        const data = await res.json();
        if (data.success){
            setBlockedUsers(data.list);
        }
    }

    const fetchBasic = async (username) => {
        // console.log(username);
        const res = await fetch(
            `${import.meta.env.VITE_SERVER_URL}/profile/getbasic/${username}`,
            {
                method: "GET",
                credentials: "include"
            },
        );
        const data = await res.json();
        if (data.success) {
            console.log(data.details);
            console.log(data.details);
            setBasicDetails(data.details);
        }
        else {
            console.log("ERROR");
        }
    }

    useEffect(() => {
        if (Meuser?.username) {
            fetchBasic(Meuser.username);
            fetchBlocked();
        }
    }, [Meuser]);


    // Load initial values
    useEffect(() => {
        if (basicDetails) {
            console.log(basicDetails["visibility"]);
            setIsPublic(basicDetails.visibility === "Private");
        }
    }, [basicDetails]);

    // Lock scroll when modal open
    useEffect(() => {
        if (showModal) {
            // save current overflow
            const prev = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = prev || "";
            };
        }
    }, [showModal]);

    const handleToggle = () => setShowModal(true);

    const confirmToggle = async () => {
        setShowModal(false);
        const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/togglePublicPrivate`, {
            method: "GET",
            credentials: "include"
        });

        const data = await res.json();
        if (data.success){
            setIsPublic(!isPublic);
        }
        else{
            console.log("Error happened")
        }
    };

    const cancelToggle = () => {
        setShowModal(false);
    };

    const unblockUser = (username) => {
        if (!window.confirm(`Are you sure you want to unblock ${username}?`)) return;

        fetch(`${import.meta.env.VITE_SERVER_URL}/block/${username}`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
        })
            .then((res) => res.json())
            .then((data) => {
                if (data) {
                    setBlockedUsers((prev) => prev.filter((u) => u !== username));
                }
            })
            .catch((err) => console.error(err));
    };

    const shareProfile = () => {
        const url = `http://localhost:5173/profile/${Meuser.username}`;

        if (navigator.share) {
            navigator.share({ title: "My Profile", url }).catch(console.error);
        } else {
            alert("Share this URL: " + url);
        }
    };

    const copyProfileUrl = () => {
        navigator.clipboard
            .writeText(window.location.href)
            .then(() => alert("Profile URL copied!"))
            .catch(console.error);
    };

    // Kids-specific state
    const [alert, setAlert] = useState({ type: "info", message: "" });
    const [showDeactivate, setShowDeactivate] = useState(false);
    const [deactivateForm, setDeactivateForm] = useState({
        password: "",
        reason: "",
        confirm: false,
    });
    const [deactivateErrors, setDeactivateErrors] = useState({});
    const [deactivateLoading, setDeactivateLoading] = useState(false);
    const [showTime, setShowTime] = useState(false);
    const [timeForm, setTimeForm] = useState({ hours: "", minutes: "" });
    const [timeErrors, setTimeErrors] = useState({});
    const [timeLoading, setTimeLoading] = useState(false);
    const [currentLimitText, setCurrentLimitText] = useState("Not set yet");
    const [showChangePwd, setShowChangePwd] = useState(false);
    const [pwdForm, setPwdForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [pwdErrors, setPwdErrors] = useState({});
    const [pwdLoading, setPwdLoading] = useState(false);
    const [showParentPwd, setShowParentPwd] = useState(false);
    const [parentForm, setParentForm] = useState({
        currentParentalPassword: "",
        newParentalPassword: "",
        confirmParentalPassword: "",
    });
    const [parentErrors, setParentErrors] = useState({});
    const [parentLoading, setParentLoading] = useState(false);

    // Fetch current time limit when modal opens
    useEffect(() => {
        // if (!showTime || Meuser?.type !== "Kids") return;

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
    }, [showTime, Meuser?.type]);

    // Kids-specific helper functions
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
                navigate('/login', { replace: true }); navigate('/login', { replace: true });
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

    if (!Meuser) return null;

    // Render Kids-specific settings
    if (Meuser?.type === "Kids") {
        return (
            <>
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

                            {/* Deactivate Account */}
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
                </div>

                {/* Deactivate Modal */}
                {showDeactivate && (
                    <KidsModal
                        title="Deactivate My Account"
                        onClose={() => {
                            if (!deactivateLoading) setShowDeactivate(false);
                        }}
                    >
                        <form onSubmit={submitDeactivate} className="kids-form" noValidate>
                            <div
                                className={`kids-form-group ${deactivateErrors.password ? "kids-form-error" : ""
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
                                className={`kids-form-group ${deactivateErrors.reason ? "kids-form-error" : ""
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
                                className={`kids-form-group kids-form-checkbox ${deactivateErrors.confirm ? "kids-form-error" : ""
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
                    </KidsModal>
                )}

                {/* Time Control Modal */}
                {showTime && (
                    <KidsModal
                        title="Set Daily Usage Limit"
                        onClose={() => {
                            if (!timeLoading) setShowTime(false);
                        }}
                    >
                        <form onSubmit={submitTime} className="kids-form" noValidate>
                            <div
                                className={`kids-form-inline ${timeErrors.hours ? "kids-form-error" : ""
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
                    </KidsModal>
                )}

                {/* Change Password Modal */}
                {showChangePwd && (
                    <KidsModal
                        title="Change Password"
                        onClose={() => {
                            if (!pwdLoading) setShowChangePwd(false);
                        }}
                    >
                        <form onSubmit={submitPwd} className="kids-form" noValidate>
                            <div
                                className={`kids-form-group ${pwdErrors.currentPassword ? "kids-form-error" : ""
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
                                className={`kids-form-group ${pwdErrors.newPassword ? "kids-form-error" : ""
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
                                className={`kids-form-group ${pwdErrors.confirmPassword ? "kids-form-error" : ""
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
                    </KidsModal>
                )}

                {/* Parental Password Modal */}
                {showParentPwd && (
                    <KidsModal
                        title="Change Parental Control Password"
                        onClose={() => {
                            if (!parentLoading) setShowParentPwd(false);
                        }}
                    >
                        <form onSubmit={submitParentPwd} className="kids-form" noValidate>
                            <div
                                className={`kids-form-group ${parentErrors.currentParentalPassword ? "kids-form-error" : ""
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
                                className={`kids-form-group ${parentErrors.newParentalPassword ? "kids-form-error" : ""
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
                                className={`kids-form-group ${parentErrors.confirmParentalPassword
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
                    </KidsModal>
                )}
            </>
        );
    }

    return (
        <>
            <div className="settings-page">
                <div className="settings-container">
                    {/* Header */}
                    <div className="settings-header">
                        <h1 className="settings-title">Settings</h1>
                        <p className="settings-subtitle">
                            Manage your account preferences and privacy settings
                        </p>
                    </div>

                    {/* Account Privacy Section */}
                    <div className="settings-section">
                        <div className="section-header">
                            <h2 className="section-title">
                                <svg
                                    className="section-icon"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                    />
                                </svg>
                                Account Privacy
                            </h2>
                        </div>

                        <div className="section-content">
                            <div className="privacy-toggle-wrapper">
                                <div className="privacy-info-text">
                                    <h3 className="privacy-title">Public Profile</h3>
                                    <p className="privacy-description">
                                        Allow others to view your profile and activity
                                    </p>
                                </div>

                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={!isPublic}
                                        onChange={handleToggle}
                                        className="toggle-input"
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Blocked Users Section */}
                    <div className="settings-section">
                        <div className="section-header">
                            <h2 className="section-title">
                                <svg
                                    className="section-icon"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                    />
                                </svg>
                                Blocked Users
                            </h2>
                        </div>

                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead className="table-header">
                                    <tr>
                                        <th className="table-th">Username</th>
                                        <th className="table-th table-th-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="table-body">
                                    {blockedUsers.length > 0 ? (
                                        blockedUsers.map((user, i) => (
                                            <tr key={i} className="table-row">
                                                <td className="table-td">
                                                    <span className="user-name">@{user}</span>
                                                </td>
                                                <td className="table-td table-td-right">
                                                    <button
                                                        onClick={() => unblockUser(user)}
                                                        className="btn-unblock"
                                                    >
                                                        <svg
                                                            className="btn-icon"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M6 18L18 6M6 6l12 12"
                                                            />
                                                        </svg>
                                                        Unblock
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="2" className="empty-state">
                                                <div className="empty-state-content">
                                                    <svg
                                                        className="empty-icon"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                                        />
                                                    </svg>
                                                    <p className="empty-text">No blocked users</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="settings-section">
                        <div className="section-header">
                            <h2 className="section-title">
                                <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                                Profile Sharing
                            </h2>
                        </div>
                        <div className="section-content">
                            <div className="button-group">
                                <button
                                    onClick={shareProfile}
                                    className="btn btn-primary"
                                >
                                    <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                    </svg>
                                    Share Profile
                                </button>

                                <button
                                    onClick={copyProfileUrl}
                                    className="btn btn-secondary"
                                >
                                    <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Copy Profile URL
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="settings-section">
                        <div className="section-header">
                            <h2 className="section-title">
                                <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Help & Support
                            </h2>
                        </div>
                        <div className="section-content">
                            <div className="button-group">
                                <a href="/help" className="btn btn-help">
                                    <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                    Get Help
                                </a>
                                <a href="/activityLog" className="btn btn-secondary">
                                    <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    Activity Log
                                </a>
                            </div>
                        </div>
                    </div>
                    <div className="settings-section">
                        <div className="section-header">
                            <h2 className="section-title">
                                <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Profile Information
                            </h2>
                        </div>

                        <div className="section-content">
                            <div className="profile-info-grid">

                                <div className="profile-info-card">
                                    <div className="profile-info-label">Username</div>
                                    <div className="profile-info-value">@{Meuser.username}</div>
                                </div>

                                <div className="profile-info-card">
                                    <div className="profile-info-label">Full Name</div>
                                    <div className="profile-info-value">{basicDetails.full_name}</div>
                                </div>

                                <div className="profile-info-card">
                                    <div className="profile-info-label">Email</div>
                                    <div className="profile-info-value">{Meuser.email}</div>
                                </div>

                                <div className="profile-info-card">
                                    <div className="profile-info-label">Member Since</div>
                                    <div className="profile-info-value">
                                        {new Date(basicDetails.createdAt).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </div>
                                </div>

                                <div className="profile-info-card">
                                    <div className="profile-info-label">Coins Balance</div>
                                    <div className="profile-info-value">{basicDetails.coins} coins</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ height: 40 }} /> {/* small spacer */}
                </div>
            </div>

            {showModal && (
                <Modal onClose={cancelToggle}>
                    <h3 className="modal-title">Change Profile Visibility</h3>
                    <p className="modal-description">
                        Are you sure you want to{" "}
                        {!isPublic ? "make your profile private" : "make your profile public"}?
                    </p>
                    <div className="modal-buttons">
                        <button
                            onClick={cancelToggle}
                            className="modal-btn modal-btn-cancel"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmToggle}
                            className="modal-btn modal-btn-confirm"
                        >
                            Confirm
                        </button>
                    </div>
                </Modal>
            )}
        </>
    );
};

export default Settings;
