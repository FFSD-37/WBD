import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useUserData } from "../providers/userData.jsx";
import "../styles/channelSettings.css";

const initialData = {
  profileSharing: { enabled: true, profileUrl: "" },
  channelInformation: {
    channelName: "",
    channelDescription: "",
    channelCategory: [],
    channelLogo: "/Images/default_user.jpeg",
    links: [],
    membersCount: 0,
    createdAt: null,
    adminUsername: "",
    supportEmail: "",
    supportPhone: "",
    supportUrl: "",
  },
  dashboard: {
    overview: {
      totalPosts: 0,
      archivedPosts: 0,
      membersCount: 0,
      totalLikesReceived: 0,
      totalSavesReceived: 0,
      totalCommentsReceived: 0,
    },
    dailyUsage: [],
    userActivity: {
      topActiveUsers: [],
      interactionTypeCounts: {
        follows: 0,
        unfollows: 0,
        likes: 0,
        comments: 0,
        others: 0,
      },
    },
    topPosts: {
      byLikes: [],
      bySaves: [],
    },
  },
  activityLog: { total: 0, entries: [] },
};

const ChannelSettings = () => {
  const navigate = useNavigate();
  const { userData } = useUserData();

  const [settings, setSettings] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/channel/settings`, {
        method: "GET",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Unable to load channel settings");
      }
      setSettings({ ...initialData, ...data.settings });
    } catch (err) {
      setError(err.message || "Unable to load channel settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData?.type === "Channel") fetchSettings();
  }, [userData?.type]);

  const copyProfileLink = async () => {
    try {
      await navigator.clipboard.writeText(settings.profileSharing.profileUrl);
      alert("Channel profile URL copied.");
    } catch {
      alert("Unable to copy profile URL.");
    }
  };

  const topEngagement = useMemo(() => {
    const map = new Map();

    settings.dashboard.topPosts.byLikes.forEach((post) => {
      map.set(post.id, {
        ...post,
        likes: Number(post.likes || 0),
        saves: Number(post.saves || 0),
      });
    });

    settings.dashboard.topPosts.bySaves.forEach((post) => {
      const existing = map.get(post.id);
      map.set(post.id, {
        ...(existing || post),
        likes: Number(existing?.likes || post.likes || 0),
        saves: Number(existing?.saves || post.saves || 0),
      });
    });

    return [...map.values()]
      .map((post) => ({ ...post, engagement: post.likes + post.saves }))
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 6);
  }, [settings.dashboard.topPosts.byLikes, settings.dashboard.topPosts.bySaves]);

  if (userData?.type !== "Channel") {
    return <Navigate to="/home" />;
  }

  if (loading) {
    return <div className="channel-settings-page">Loading channel settings...</div>;
  }

  return (
    <div className="channel-settings-page">
      <div className="channel-settings-container">
        <div className="channel-settings-header">
          <div className="channel-avatar-wrap">
            <img
              src={settings.channelInformation.channelLogo || "/Images/default_user.jpeg"}
              alt={settings.channelInformation.channelName}
              className="channel-avatar"
            />
            <div>
              <h1>Channel Settings</h1>
              <p>@{settings.channelInformation.channelName}</p>
            </div>
          </div>
        </div>

        {error ? <p className="channel-settings-error">{error}</p> : null}

        <section className="channel-settings-section">
          <h2>1. Channel Dashboard</h2>
          <div className="channel-overview-grid">
            <div className="stat-card"><span>Total Posts</span><strong>{settings.dashboard.overview.totalPosts}</strong></div>
            <div className="stat-card"><span>Archived</span><strong>{settings.dashboard.overview.archivedPosts}</strong></div>
            <div className="stat-card"><span>Total Likes</span><strong>{settings.dashboard.overview.totalLikesReceived}</strong></div>
            <div className="stat-card"><span>Total Saves</span><strong>{settings.dashboard.overview.totalSavesReceived}</strong></div>
            <div className="stat-card"><span>Total Comments</span><strong>{settings.dashboard.overview.totalCommentsReceived}</strong></div>
            <div className="stat-card"><span>Members</span><strong>{settings.dashboard.overview.membersCount}</strong></div>
          </div>

          <div className="channel-settings-grid">
            <div className="channel-settings-card">
              <h3>Daily Usage (7 Days)</h3>
              {settings.dashboard.dailyUsage.length ? (
                settings.dashboard.dailyUsage.map((day) => (
                  <div className="channel-row" key={day.date}>
                    <span>{day.date}</span>
                    <span>
                      {day.postsCreated} posts | {day.interactions} interactions
                    </span>
                  </div>
                ))
              ) : (
                <p>No recent usage data.</p>
              )}
            </div>

            <div className="channel-settings-card">
              <h3>User Activity</h3>
              <div className="activity-pills">
                <span>Likes: {settings.dashboard.userActivity.interactionTypeCounts.likes}</span>
                <span>Comments: {settings.dashboard.userActivity.interactionTypeCounts.comments}</span>
                <span>Follows: {settings.dashboard.userActivity.interactionTypeCounts.follows}</span>
                <span>Unfollows: {settings.dashboard.userActivity.interactionTypeCounts.unfollows}</span>
              </div>
              <h4>Most Active Users</h4>
              {settings.dashboard.userActivity.topActiveUsers.length ? (
                settings.dashboard.userActivity.topActiveUsers.map((u) => (
                  <div className="channel-row" key={u.username}>
                    <span>@{u.username}</span>
                    <span>{u.interactions} actions</span>
                  </div>
                ))
              ) : (
                <p>No user activity yet.</p>
              )}
            </div>
          </div>

          <div className="channel-settings-card top-post-card">
            <h3>Top Liked/Saved Posts</h3>
            {topEngagement.length ? (
              <div className="post-mini-grid">
                {topEngagement.map((post) => (
                  <div className="mini-post" key={post.id}>
                    <div className="mini-media">
                      {post.type === "Img" ? (
                        <img src={post.url} alt={post.id} />
                      ) : (
                        <video src={post.url} muted />
                      )}
                    </div>
                    <div className="mini-meta">
                      <div className="mini-post-id">Post ID: {post.id}</div>
                      <div className="mini-counts">
                        <span>{post.likes} likes</span>
                        <span>{post.saves} saves</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No post engagement data yet.</p>
            )}
          </div>
        </section>

        <section className="channel-settings-section">
          <h2>2. Profile Sharing Option</h2>
          <div className="channel-settings-card">
            <p>Profile sharing is always enabled for channels.</p>
            <div className="channel-btn-row">
              <button onClick={copyProfileLink}>Copy Profile Link</button>
              <button onClick={() => window.open(settings.profileSharing.profileUrl, "_blank")}>
                Open Channel
              </button>
            </div>
          </div>
        </section>

        <section className="channel-settings-section">
          <h2>3. Help and Support</h2>
          <div className="channel-btn-row">
            <button onClick={() => navigate("/help")}>Help Center</button>
            <button onClick={() => navigate("/contact")}>Contact Support</button>
          </div>
          {settings.channelInformation.supportEmail ? <p>Support Email: {settings.channelInformation.supportEmail}</p> : null}
          {settings.channelInformation.supportPhone ? <p>Support Phone: {settings.channelInformation.supportPhone}</p> : null}
          {settings.channelInformation.supportUrl ? (
            <p>
              Support URL:{" "}
              <a href={settings.channelInformation.supportUrl}>
                {settings.channelInformation.supportUrl}
              </a>
            </p>
          ) : null}
        </section>

        <section className="channel-settings-section">
          <h2>4. Activity Log</h2>
          <div className="channel-btn-row">
            <button onClick={() => navigate("/activityLog")}>Open Full Activity Log</button>
          </div>
          <div className="channel-settings-card">
            {settings.activityLog.entries.length ? (
              settings.activityLog.entries.slice(0, 8).map((entry) => (
                <div className="channel-row" key={entry._id}>
                  <span>{entry.message}</span>
                  <span>{new Date(entry.createdAt).toLocaleString()}</span>
                </div>
              ))
            ) : (
              <p>No activity log entries yet.</p>
            )}
          </div>
        </section>

        <section className="channel-settings-section">
          <h2>5. Channel Information</h2>
          <div className="channel-settings-card channel-info-grid">
            <p><strong>Channel Name:</strong> @{settings.channelInformation.channelName}</p>
            <p><strong>Description:</strong> {settings.channelInformation.channelDescription}</p>
            <p><strong>Admin:</strong> @{settings.channelInformation.adminUsername}</p>
            <p><strong>Members:</strong> {settings.channelInformation.membersCount}</p>
            <p><strong>Categories:</strong> {(settings.channelInformation.channelCategory || []).join(", ") || "N/A"}</p>
            <p>
              <strong>Created At:</strong>{" "}
              {settings.channelInformation.createdAt
                ? new Date(settings.channelInformation.createdAt).toLocaleDateString()
                : "N/A"}
            </p>
            <p>
              <strong>Links:</strong>{" "}
              {settings.channelInformation.links?.length
                ? settings.channelInformation.links.join(" | ")
                : "No links"}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ChannelSettings;
