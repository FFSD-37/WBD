import { useEffect, useState } from "react";
import { Map, Book, BarChart3, ShoppingCart, TrendingUp } from "lucide-react";
import "../styles/dashboard.css";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext.jsx";
import Sidebar from "./Sidebar.jsx";

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [channels, setChannel] = useState([]);
  const [revenue, setRevenue] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [reach, setReach] = useState(0);
  const [ordersData, setOrdersData] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [contentActivity, setContentActivity] = useState([]);
  const MAX_BAR_HEIGHT = 100;

  const fetchContentActivity = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/home/contentActivityToday`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    if (data.success) {
      setContentActivity(data.data);
    } else {
      alert("Error fetching reach");
    }
  }

  const fetchReportData = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/home/reportData`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    if (data.success) {
      setReportData(data.data);
    } else {
      alert("Error fetching reach");
    }
  };

  const fetchReach = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/home/getReach`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    if (data.success) {
      setOrdersData(data.data);
      setReach(data.count);
    } else {
      alert("Error fetching reach");
    }
  };

  const fetchUsers = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/home/getUsers`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    if (data.success) {
      setUsers(data.data);
    } else {
      alert("Error fetching users");
    }
  };

  const fetchChannels = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/home/getChannels`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    if (data.success) {
      setChannel(data.data);
    } else {
      alert("Error fetching users");
    }
  };

  const fetchRevenue = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/home/getRevenue`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    if (data.success) {
      setRevenue(data.rev);
    } else {
      alert("Error fetching users");
    }
  };

  const fetchUserCount = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/home/getUserCount`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    if (data.success) {
      setUserCount(data.count);
    } else {
      alert("Error fetching users");
    }
  };

  useEffect(() => {
    Promise.all([
      fetchUsers(),
      fetchChannels(),
      fetchRevenue(),
      fetchUserCount(),
      fetchReach(),
      fetchReportData(),
      fetchContentActivity(),
    ]).finally(() => setLoading(false));
  }, []);

  const maxCount = Math.max(...ordersData.map((item) => item.count), 1);

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        {loading && (
          <div className="loader-overlay" role="status" aria-live="polite">
            <div className="loader-panel">
              <div className="spinner" aria-hidden="true" />
              <div className="loader-text">Loading dashboard…</div>
              <div className="skeleton-grid" aria-hidden="true">
                <div className="skeleton-card skeleton-anim" />
                <div className="skeleton-card skeleton-anim" />
                <div className="skeleton-card skeleton-anim" />
              </div>
              <div className="skeleton-list" aria-hidden="true">
                <div className="skeleton-list-item skeleton-anim" />
                <div className="skeleton-list-item skeleton-anim" />
                <div className="skeleton-list-item skeleton-anim" />
              </div>
            </div>
          </div>
        )}
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
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-content">
                <div className="stat-info">
                  <h3 className="stat-title">Community Size</h3>
                  <div className="stat-value">{userCount}</div>
                </div>
                <div className="stat-icon">
                  <BarChart3 size={24} />
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-content">
                <div className="stat-info">
                  <h3 className="stat-title">Revenue</h3>
                  <div className="stat-value">₹{revenue}</div>
                </div>
                <div className="stat-icon">
                  <ShoppingCart size={24} />
                </div>
              </div>
            </div>
          </div>
          <div className="bottom-grid">
            <div className="page-visits-card">
              <div className="team-section">
                <div className="section-header">
                  <h3 className="section-title">Team members</h3>
                  <button
                    className="button-cyan"
                    onClick={() => navigate("/userList")}
                  >
                    See all
                  </button>
                </div>
                <div className="team-list">
                  {users.map((member, index) => (
                    <div
                      key={index}
                      className="team-member"
                      style={{ border: "1px solid black" }}
                    >
                      <div className="member-info">
                        <img
                          src={member.profilePicture}
                          alt={member.username}
                          className="member-avatar"
                        />
                        <div>
                          <div className="member-name">{member.username}</div>
                          <div className="member-status">
                            {member.isPremium ? "Premium" : "Non-premium"}
                          </div>
                        </div>
                      </div>
                      <button className="member-action" onClick={() => navigate("/userList")}>Manage</button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="team-section">
                <div className="section-header">
                  <h3 className="section-title">Channels</h3>
                  <button
                    className="button-cyan"
                    onClick={() => navigate("/channelList")}
                  >
                    See all
                  </button>
                </div>
                <div className="team-list">
                  {channels.map((member, index) => (
                    <div
                      key={index}
                      className="team-member"
                      style={{
                        border: "1px solid black",
                      }}
                    >
                      <div className="member-info">
                        <img
                          src={member.channelLogo}
                          alt={member.channelName}
                          className="member-avatar"
                        />
                        <div>
                          <div className="member-name">
                            {member.channelName}
                          </div>
                          <div className="member-status">
                            {member.channelDescription}
                          </div>
                        </div>
                      </div>
                      <button className="member-action" onClick={() => navigate("/channelList")}>Manage</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="right-column">
              <div className="orders-card">
                <h3 className="stat-title">Total Users Activity</h3>
                <div
                  className="stat-value"
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  {reach}
                  <TrendingUp size={20} color="#10b981" />
                </div>
                <div className="bar-chart">
                  {ordersData.map((item, index) => {
                    const monthLabel = new Date(
                      item._id.year,
                      item._id.month - 1,
                    ).toLocaleString("default", { month: "short" });
                    const normalizedHeight =
                      (item.count / maxCount) * MAX_BAR_HEIGHT;
                    return (
                      <div key={index} className="bar-column">
                        <div className="bar-stack">
                          <div
                            className="bar-cyan"
                            style={{ height: `${normalizedHeight}px` }}
                          ></div>
                        </div>
                        <span className="bar-label">
                          {monthLabel} {item._id.year}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="rankings-card">
                <div className="rank-item">
                  <div className="rank-info-container">
                    <div className="rank-icon-container">
                      <BarChart3 size={16} />
                    </div>
                    <div>
                      <div className="rank-title">Total Reports</div>
                      <div className="rank-subtitle">All time</div>
                    </div>
                  </div>
                  <div className="rank-value-container">
                    <span className="rank-value">{reportData.total}</span>
                  </div>
                </div>
                <div className="rank-item">
                  <div className="rank-info-container">
                    <div className="rank-icon-container">
                      <Map size={16} />
                    </div>
                    <div>
                      <div className="rank-title">Pending Reports</div>
                      <div className="rank-subtitle">Needs attention</div>
                    </div>
                  </div>
                  <div className="rank-value-container">
                    <span className="rank-value">{reportData.pending}</span>
                  </div>
                </div>
                <div className="rank-item">
                  <div className="rank-info-container">
                    <div className="rank-icon-container">
                      <Book size={16} />
                    </div>
                    <div>
                      <div className="rank-title">Resolved Today</div>
                      <div className="rank-subtitle">Last 24 hours</div>
                    </div>
                  </div>
                  <div className="rank-value-container">
                    <span className="rank-value">
                      {reportData.resolvedToday}
                    </span>
                    <span className="rank-arrow">✓</span>
                  </div>
                </div>
                <div className="section-header">
                  <button
                    className="button-cyan"
                    onClick={() => navigate("/reports")}
                  >
                    See all Reports
                  </button>
                </div>
              </div>
              <div className="acquisition-card">
                <h3 className="section-title">Content Activity (Today)</h3>
                <p className="acquisition-description">
                  Shows how much content was created on the platform today.
                </p>
                <div className="acquisition-stats">
                  <div>
                    <div className="acquisition-stat">
                      <BarChart3 size={16} />
                      <span className="acquisition-stat-label">Posts</span>
                    </div>
                    <div className="acquisition-stat-value" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {contentActivity.postsToday}
                      <TrendingUp size={20} color="#10b981" />
                    </div>
                  </div>
                  <div>
                    <div className="acquisition-stat">
                      <BarChart3 size={16} />
                      <span className="acquisition-stat-label">Reels</span>
                    </div>
                    <div className="acquisition-stat-value" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {contentActivity.reelsToday}
                      <TrendingUp size={20} color="#10b981" />
                    </div>
                  </div>
                  <div>
                    <div className="acquisition-stat">
                      <BarChart3 size={16} />
                      <span className="acquisition-stat-label">Stories</span>
                    </div>
                    <div className="acquisition-stat-value" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {contentActivity.storiesToday}
                      <TrendingUp size={20} color="#10b981" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
