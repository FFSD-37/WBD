import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useUserData } from "../providers/userData.jsx";
import "../styles/channelDelete.css";

const ChannelDeletePage = () => {
  const navigate = useNavigate();
  const { userData } = useUserData();

  const [deactivatePassword, setDeactivatePassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loadingAction, setLoadingAction] = useState("");

  if (userData?.type !== "Channel") {
    return <Navigate to="/DeleteAccount" />;
  }

  const deactivateChannel = async () => {
    if (!deactivatePassword.trim()) {
      setMessage({ type: "error", text: "Enter channel password to deactivate." });
      return;
    }
    setLoadingAction("deactivate");
    setMessage({ type: "", text: "" });
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/channel/deactivate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: deactivatePassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to deactivate channel");
      }
      navigate("/login", { replace: true });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoadingAction("");
    }
  };

  const deleteChannel = async () => {
    if (!deletePassword.trim()) {
      setMessage({ type: "error", text: "Enter channel password to delete." });
      return;
    }
    if (confirmation.toUpperCase() !== "DELETE") {
      setMessage({ type: "error", text: 'Type "DELETE" to confirm permanent deletion.' });
      return;
    }
    setLoadingAction("delete");
    setMessage({ type: "", text: "" });
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/channel/delete-account`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: deletePassword, confirmation }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to delete channel");
      }
      navigate("/login", { replace: true });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoadingAction("");
    }
  };

  return (
    <div className="channel-delete-page">
      <div className="channel-delete-container">
        <h1>Channel Safety Controls</h1>
        <p className="channel-delete-subtitle">
          Deactivate temporarily or permanently delete your channel.
        </p>

        {message.text ? (
          <div className={`channel-alert ${message.type}`}>{message.text}</div>
        ) : null}

        <div className="channel-delete-grid">
          <div className="danger-card">
            <h2>Deactivate Channel</h2>
            <p>
              Temporarily disables your channel and logs out the session. You can
              reactivate later via support/admin flow.
            </p>
            <input
              type="password"
              placeholder="Channel password"
              value={deactivatePassword}
              onChange={(e) => setDeactivatePassword(e.target.value)}
            />
            <button
              onClick={deactivateChannel}
              disabled={loadingAction === "deactivate"}
            >
              {loadingAction === "deactivate" ? "Processing..." : "Deactivate Channel"}
            </button>
          </div>

          <div className="danger-card hard-delete">
            <h2>Delete Channel Permanently</h2>
            <p>
              This removes channel profile, channel posts, comments and related data.
              This action cannot be undone.
            </p>
            <input
              type="password"
              placeholder="Channel password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
            />
            <input
              type="text"
              placeholder='Type "DELETE"'
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
            <button onClick={deleteChannel} disabled={loadingAction === "delete"}>
              {loadingAction === "delete" ? "Deleting..." : "Delete Channel"}
            </button>
          </div>
        </div>

        <button className="back-btn" onClick={() => navigate("/settings")}>
          Back to Settings
        </button>
      </div>
    </div>
  );
};

export default ChannelDeletePage;
