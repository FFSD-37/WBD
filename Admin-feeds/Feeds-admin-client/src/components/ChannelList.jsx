import { useContext, useEffect, useState } from "react";
import {
  Users,
  FileText,
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  Archive,
} from "lucide-react";
import "../styles/channelList.css";
import "../styles/dashboard.css";
import "../styles/postManagement.css";
import Sidebar from "./Sidebar";
import { AuthContext } from "../context/AuthContext";
import PostCards from "./PostCards";

const POSTS_PER_LOAD = 5;

const ChannelsPage = () => {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [showMenu, setShowMenu] = useState(null);
  const { user } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [channelPosts, setChannelPosts] = useState([]);
  const [channelPostsLoading, setChannelPostsLoading] = useState(false);
  const [channelPostsPagination, setChannelPostsPagination] = useState({
    page: 1,
    hasNextPage: false,
    total: 0,
  });

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/channel/list`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (data.success) {
          setChannels(data.allchannels);
        } else {
          alert("Error fetching channels");
        }
      } catch (error) {
        console.error("Error fetching channels:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, []);

  useEffect(() => {
    if (!selectedChannel?.channelName) {
      setChannelPosts([]);
      setChannelPostsPagination({ page: 1, hasNextPage: false, total: 0 });
      return;
    }

    fetchChannelPosts(selectedChannel.channelName, 1, false);
  }, [selectedChannel]);

  const fetchChannelPosts = async (channelName, page = 1, append = false) => {
    setChannelPostsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/post/channel/${channelName}?page=${page}&limit=${POSTS_PER_LOAD}`,
        {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await response.json();
      if (data.success) {
        setChannelPosts((current) =>
          append ? [...current, ...(data.posts || [])] : data.posts || []
        );
        setChannelPostsPagination(
          data.pagination || { page: 1, hasNextPage: false, total: 0 }
        );
      }
    } catch (error) {
      console.error("Error fetching channel posts:", error);
    } finally {
      setChannelPostsLoading(false);
    }
  };

  const formatDate = (dateObj) => {
    if (!dateObj) return "N/A";
    const date = dateObj.$date ? new Date(dateObj.$date) : new Date(dateObj);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleManage = (channel, action) => {
    setShowMenu(null);
    console.log(`${action} channel:`, channel.channelName);
  };

  const getCategoryColor = (category) => {
    const colors = {
      education: "#dbeafe",
      technology: "#e0e7ff",
      entertainment: "#fce7f3",
      news: "#fef3c7",
      sports: "#d1fae5",
      business: "#f3e8ff",
      lifestyle: "#fee2e2",
      gaming: "#ddd6fe",
    };
    return colors[category?.toLowerCase()] || "#f3f4f6";
  };

  const uniqueCategories = [
    ...new Set(channels.flatMap((channel) => channel.channelCategory || [])),
  ].sort();

  const categoryCounts = {
    all: channels.length,
    ...Object.fromEntries(
      uniqueCategories.map((category) => [
        category.toLowerCase(),
        channels.filter((channel) => channel.channelCategory?.includes(category)).length,
      ])
    ),
  };

  const handleClearSearch = () => setSearchQuery("");

  const filteredChannels = channels.filter((channel) => {
    if (filterCategory !== "all") {
      const categories = channel.channelCategory || [];
      if (!categories.some((value) => value.toLowerCase() === filterCategory.toLowerCase())) {
        return false;
      }
    }

    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (channel.channelName || "").toLowerCase().includes(query) ||
      (channel.channelDescription || "").toLowerCase().includes(query) ||
      (channel.channelCategory || []).some((value) => value.toLowerCase().includes(query))
    );
  });

  const handleChannelPostUpdate = (updatedPost) => {
    setChannelPosts((current) =>
      current.map((post) => (post.id === updatedPost.id ? { ...post, ...updatedPost } : post))
    );
  };

  const handleChannelPostDelete = (postId) => {
    setChannelPosts((current) => current.filter((post) => post.id !== postId));
    setChannelPostsPagination((current) => ({
      ...current,
      total: Math.max(0, (current.total || 0) - 1),
    }));
  };

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
          <div className="channels-header">
            <h2 className="channels-title">All Channels</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <input
                type="search"
                placeholder="Search channels, descriptions or categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  width: "280px",
                  maxWidth: "100%",
                  outline: "none",
                  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.03)",
                  fontSize: "14px",
                }}
                aria-label="Search channels"
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#6b7280",
                    fontSize: "14px",
                  }}
                  aria-label="Clear search"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", marginBottom: "2rem", flexWrap: "wrap", alignItems: "center" }}>
            <button
              onClick={() => setFilterCategory("all")}
              style={{
                padding: "8px 14px",
                borderRadius: "20px",
                border: filterCategory === "all" ? "2px solid #4f46e5" : "1px solid #e5e7eb",
                backgroundColor: filterCategory === "all" ? "#eef2ff" : "#ffffff",
                color: filterCategory === "all" ? "#4f46e5" : "#6b7280",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: filterCategory === "all" ? "600" : "500",
                transition: "all 0.2s ease",
              }}
            >
              All ({categoryCounts.all})
            </button>
            {uniqueCategories.map((category) => (
              <button
                key={category}
                onClick={() => setFilterCategory(category.toLowerCase())}
                style={{
                  padding: "8px 14px",
                  borderRadius: "20px",
                  border: filterCategory === category.toLowerCase() ? "2px solid #4f46e5" : "1px solid #e5e7eb",
                  backgroundColor: filterCategory === category.toLowerCase() ? getCategoryColor(category) : "#ffffff",
                  color: filterCategory === category.toLowerCase() ? "#1f2937" : "#6b7280",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: filterCategory === category.toLowerCase() ? "600" : "500",
                  transition: "all 0.2s ease",
                }}
              >
                {category} ({categoryCounts[category.toLowerCase()] || 0})
              </button>
            ))}
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner" />
              <p>Loading channels...</p>
            </div>
          ) : channels.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} color="#9ca3af" />
              <p className="empty-text">No channels found</p>
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} color="#9ca3af" />
              <p className="empty-text">No channels match your search</p>
            </div>
          ) : (
            <div className="channels-grid">
              {filteredChannels.map((channel) => (
                <div key={channel._id} className="channel-card">
                  <div className="card-header">
                    <img
                      src={channel.channelLogo || "https://via.placeholder.com/80"}
                      alt={channel.channelName}
                      className="channel-logo"
                    />
                    <button className="menu-button" onClick={() => setShowMenu(showMenu === channel._id ? null : channel._id)}>
                      <MoreVertical size={18} />
                    </button>
                    {showMenu === channel._id && (
                      <div className="dropdown-menu">
                        <button className="menu-item" onClick={() => handleManage(channel, "edit")}>
                          <Edit size={16} />
                          Edit
                        </button>
                        <button className="menu-item" onClick={() => handleManage(channel, "archive")}>
                          <Archive size={16} />
                          Archive
                        </button>
                        <button className="menu-item danger" onClick={() => handleManage(channel, "delete")}>
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="channel-name">{channel.channelName}</h3>
                  <p className="channel-description">
                    {channel.channelDescription?.length > 100
                      ? `${channel.channelDescription.substring(0, 100)}...`
                      : channel.channelDescription}
                  </p>

                  <div className="categories-container">
                    {channel.channelCategory?.map((category, index) => (
                      <span
                        key={`${channel._id}-${index}`}
                        className="category-badge"
                        style={{ backgroundColor: getCategoryColor(category) }}
                      >
                        {category}
                      </span>
                    ))}
                  </div>

                  <div className="channel-stats">
                    <div className="stat-item">
                      <Users size={16} />
                      <span>{channel.channelMembers?.length || 0} Members</span>
                    </div>
                    <div className="stat-item">
                      <FileText size={16} />
                      <span>{channel.postIds?.length || 0} Posts</span>
                    </div>
                  </div>

                  <div className="card-footer">
                    <div className="date-info">
                      <Calendar size={14} />
                      <span>{formatDate(channel.createdAt)}</span>
                    </div>
                    <button className="manage-button" onClick={() => setSelectedChannel(channel)}>
                      Manage
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedChannel && (
          <div className="modal-overlay" onClick={() => setSelectedChannel(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Channel Details</h3>
                <button className="close-button" onClick={() => setSelectedChannel(null)}>×</button>
              </div>
              <div className="modal-body">
                <div className="modal-logo-section">
                  <img src={selectedChannel.channelLogo} alt={selectedChannel.channelName} className="modal-logo" />
                </div>
                <div className="modal-row"><span className="modal-label">Channel Name:</span><span className="modal-value">{selectedChannel.channelName}</span></div>
                <div className="modal-row"><span className="modal-label">Description:</span><p className="modal-description">{selectedChannel.channelDescription}</p></div>
                <div className="modal-row">
                  <span className="modal-label">Categories:</span>
                  <div className="modal-categories">
                    {selectedChannel.channelCategory?.map((category, index) => (
                      <span
                        key={`${selectedChannel._id}-${index}`}
                        className="category-badge"
                        style={{ backgroundColor: getCategoryColor(category) }}
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="modal-row"><span className="modal-label">Members:</span><span className="modal-value">{selectedChannel.channelMembers?.length || 0}</span></div>
                <div className="modal-row"><span className="modal-label">Total Posts:</span><span className="modal-value">{selectedChannel.postIds?.length || 0}</span></div>
                <div className="modal-row"><span className="modal-label">Archived Posts:</span><span className="modal-value">{selectedChannel.archivedPostsIds?.length || 0}</span></div>
                <div className="modal-row"><span className="modal-label">Created:</span><span className="modal-value">{formatDate(selectedChannel.createdAt)}</span></div>
                <div className="modal-row"><span className="modal-label">Last Updated:</span><span className="modal-value">{formatDate(selectedChannel.updatedAt)}</span></div>

                <div className="embedded-posts-section">
                  <div className="embedded-posts-header">
                    <div>
                      <h4>Channel Posts</h4>
                      <p>{channelPostsPagination.total || 0} posts linked to this channel</p>
                    </div>
                  </div>
                  {channelPostsLoading && !channelPosts.length ? (
                    <div className="loading-container">
                      <div className="spinner" />
                      <p>Loading channel posts...</p>
                    </div>
                  ) : (
                    <>
                      <PostCards
                        posts={channelPosts}
                        postType="channel"
                        compact
                        emptyText="This channel has no posts to manage."
                        onPostUpdated={handleChannelPostUpdate}
                        onPostDeleted={handleChannelPostDelete}
                      />
                      {channelPostsPagination.hasNextPage && (
                        <button
                          className="post-load-more-posts-btn"
                          onClick={() => fetchChannelPosts(selectedChannel.channelName, (channelPostsPagination.page || 1) + 1, true)}
                        >
                          Load more posts
                        </button>
                      )}
                    </>
                  )}
                </div>

                <div className="modal-actions">
                  <button className="action-button edit"><Edit size={16} />Edit Channel</button>
                  <button className="action-button archive"><Archive size={16} />Archive</button>
                  <button className="action-button delete"><Trash2 size={16} />Delete</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChannelsPage;
