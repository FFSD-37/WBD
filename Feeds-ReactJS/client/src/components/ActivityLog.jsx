import React, { useEffect, useState } from "react";
import "./../styles/activityLog.css";

/*
ISSUES/Improvements:
1. All usernames text should start with @
*/

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  const totalLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/activityLog`,
        {
          method: "GET",
          credentials: "include"
        }
      );
      const data = await res.json();
      setLogs(data.logs || []);
      setError(null);
    } catch (err) {
      setError("Failed to load activity logs");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    totalLogs();
  }, []);

  const formatDate = (d) => {
    try {
      const date = typeof d === "string" || typeof d === "number" ? new Date(d) : d;
      if (Number.isNaN(date.getTime())) return String(d);
      
      const now = new Date();
      const diff = now - date;
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (seconds < 60) return "Just now";
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;
      
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } catch {
      return String(d);
    }
  };

  const formatFullDate = (d) => {
    try {
      const date = typeof d === "string" || typeof d === "number" ? new Date(d) : d;
      if (Number.isNaN(date.getTime())) return String(d);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return String(d);
    }
  };

  const filteredLogs = logs.filter(log => {
    const message = String(log.message || log.msg || "").toLowerCase();
    return message.includes(searchTerm.toLowerCase());
  });

  const getActivityIcon = (message) => {
    const msg = message.toLowerCase();
    if (msg.includes("login") || msg.includes("signed in")) return "🔐";
    if (msg.includes("logout") || msg.includes("signed out")) return "🚪";
    if (msg.includes("create") || msg.includes("add")) return "➕";
    if (msg.includes("delete") || msg.includes("remove")) return "🗑️";
    if (msg.includes("update") || msg.includes("edit")) return "✏️";
    if (msg.includes("upload")) return "📤";
    if (msg.includes("download")) return "📥";
    if (msg.includes("share")) return "🔗";
    if (msg.includes("comment")) return "💬";
    if (msg.includes("like")) return "❤️";
    return "📋";
  };

  return (
    <div className="activitylog-wrap">
      
  <div className="activitylog-header">
    <div className="activitylog-header-content">
      <div className="activitylog-header-title">
        <span className="activitylog-header-icon">📊</span>
        <h1>Activity Log</h1>
      </div>
      <button className="activitylog-refresh-btn" onClick={totalLogs}>
        <span>🔄</span>
        <span>Refresh</span>
      </button>
    </div>
  </div>

  {!loading && !error && logs.length > 0 && (
    <div className="activitylog-stats-grid">
      <div className="activitylog-stat-card">
        <div className="activitylog-stat-header">
          <span className="activitylog-stat-icon">📈</span>
          <span className="activitylog-stat-label">Total Activities</span>
        </div>
        <div className="activitylog-stat-value">{logs.length}</div>
        <div className="activitylog-stat-subtext">All time records</div>
      </div>
      
      <div className="activitylog-stat-card">
        <div className="activitylog-stat-header">
          <span className="activitylog-stat-icon">🕒</span>
          <span className="activitylog-stat-label">Latest Activity</span>
        </div>
        <div className="activitylog-stat-value" style={{ fontSize: '18px' }}>
          {formatDate(logs[0].createdAt)}
        </div>
        <div className="activitylog-stat-subtext">
          {formatFullDate(logs[0].createdAt)}
        </div>
      </div>
      
      <div className="activitylog-stat-card">
        <div className="activitylog-stat-header">
          <span className="activitylog-stat-icon">📅</span>
          <span className="activitylog-stat-label">Today</span>
        </div>
        <div className="activitylog-stat-value">
          {logs.filter(log => {
            const logDate = new Date(log.createdAt);
            const today = new Date();
            return logDate.toDateString() === today.toDateString();
          }).length}
        </div>
        <div className="activitylog-stat-subtext">Activities today</div>
      </div>
    </div>
  )}

  {!loading && !error && logs.length > 0 && (
    <div className="activitylog-controls-bar">
      <div className="activitylog-search-box">
        <span className="activitylog-search-icon">🔍</span>
        <input
          type="text"
          className="activitylog-search-input"
          placeholder="Search activities..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
    </div>
  )}

  <div className="activitylog-table-card">
    {loading ? (
      <div className="activitylog-loading-state">
        <div className="activitylog-loading-spinner"></div>
        <div className="activitylog-loading-text">Loading activity logs...</div>
      </div>
    ) : error ? (
      <div className="activitylog-error-state">
        <div className="activitylog-error-icon">⚠️</div>
        <div className="activitylog-error-text">{error}</div>
        <div className="activitylog-error-subtext">Please try refreshing the page</div>
      </div>
    ) : filteredLogs.length > 0 ? (
      <div className="activitylog-table-wrapper">
        <table className="activitylog-table">
          <thead className="activitylog-thead">
            <tr>
              <th style={{ width: '80px' }}>#</th>
              <th>Activity</th>
              <th style={{ width: '180px' }}>Time</th>
            </tr>
          </thead>
          <tbody className="activitylog-tbody">
            {filteredLogs.map((log, idx) => (
              <tr key={log._id || idx} className="activitylog-row">
                <td>
                  <span className="activitylog-index-badge">{idx + 1}</span>
                </td>
                <td>
                  <div className="activitylog-activity-row">
                    <span className="activitylog-activity-icon-cell">
                      {getActivityIcon(String(log.message || log.msg || ""))}
                    </span>
                    <div className="activitylog-activity-content">
                      <div className="activitylog-activity-message">
                        {String(log.message || log.msg || "")}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span
                    className="activitylog-time-badge"
                    title={formatFullDate(log.createdAt)}
                  >
                    {formatDate(log.createdAt)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : searchTerm ? (
      <div className="activitylog-empty-state">
        <div className="activitylog-empty-icon">🔍</div>
        <div className="activitylog-empty-title">No results found</div>
        <div className="activitylog-empty-text">Try different keywords</div>
      </div>
    ) : (
      <div className="activitylog-empty-state">
        <div className="activitylog-empty-icon">📝</div>
        <div className="activitylog-empty-title">No Activity Logs</div>
        <div className="activitylog-empty-text">
          Your activities will appear once you use the platform
        </div>
      </div>
    )}
  </div>
</div>
  );
}