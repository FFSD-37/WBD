import { useContext, useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import PostCards from "./PostCards";
import { AuthContext } from "../context/AuthContext";
import "../styles/dashboard.css";
import "../styles/postManagement.css";

const POSTS_PER_PAGE = 8;

export default function PostsPage() {
  const { user } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    hasNextPage: false,
    total: 0,
  });

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(POSTS_PER_PAGE),
          type: typeFilter,
        });

        if (searchQuery.trim()) {
          params.set("search", searchQuery.trim());
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/post/list?${params.toString()}`,
          {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }
        );
        const data = await response.json();

        if (data.success) {
          setPosts(data.posts || []);
          setPagination(data.pagination || {});
        }
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [page, searchQuery, typeFilter]);

  const updatePostLocally = (updatedPost) => {
    setPosts((current) =>
      current.map((post) => (post.id === updatedPost.id ? { ...post, ...updatedPost } : post))
    );
  };

  const removePostLocally = (postId) => {
    setPosts((current) => current.filter((post) => post.id !== postId));
    setPagination((current) => ({
      ...current,
      total: Math.max(0, (current.total || 0) - 1),
    }));
  };

  const handleSearchChange = (event) => {
    setPage(1);
    setSearchQuery(event.target.value);
  };

  const handleTypeChange = (type) => {
    setPage(1);
    setTypeFilter(type);
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
              <span className="user-name">{user?.username}</span>
            </div>
          </div>
        </div>

        <div className="content-area">
          <div className="posts-page-header">
            <div>
              <h2 className="posts-page-title">Post Management</h2>
              <p className="posts-page-subtitle">
                Review user and channel posts, moderate them, and inspect comments.
              </p>
            </div>

            <div className="posts-toolbar">
              <input
                type="search"
                className="posts-search-input"
                placeholder="Search post id, content, author, channel..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
              <div className="posts-filter-row">
                <button
                  className={`posts-filter-btn ${typeFilter === "all" ? "active" : ""}`}
                  onClick={() => handleTypeChange("all")}
                >
                  All
                </button>
                <button
                  className={`posts-filter-btn ${typeFilter === "user" ? "active" : ""}`}
                  onClick={() => handleTypeChange("user")}
                >
                  Users
                </button>
                <button
                  className={`posts-filter-btn ${typeFilter === "channel" ? "active" : ""}`}
                  onClick={() => handleTypeChange("channel")}
                >
                  Channels
                </button>
              </div>
            </div>
          </div>

          <div className="posts-summary-strip">
            <span>Total posts: {pagination.total || 0}</span>
            <span>
              Page {pagination.page || 1} of {pagination.totalPages || 1}
            </span>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner" />
              <p>Loading posts...</p>
            </div>
          ) : (
            <>
              <PostCards
                posts={posts}
                emptyText="No posts matched the current filters."
                onPostUpdated={updatePostLocally}
                onPostDeleted={removePostLocally}
              />

              <div className="posts-pagination-row">
                <button
                  className="posts-pagination-btn"
                  disabled={(pagination.page || 1) <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </button>
                <button
                  className="posts-pagination-btn"
                  disabled={!pagination.hasNextPage}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
