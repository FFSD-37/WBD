import { useMemo, useState } from "react";
import {
  Archive,
  Eye,
  MessageSquare,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import "../styles/postManagement.css";

const COMMENTS_BATCH = 3;

const formatDate = (value) => {
  if (!value) return "Unknown date";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const resolveType = (post, fallbackType) => post.postType || fallbackType || "user";

const getActionBase = (post, fallbackType) =>
  resolveType(post, fallbackType) === "channel"
    ? `${import.meta.env.VITE_API_URL}/post/channel-post/${post.id}`
    : `${import.meta.env.VITE_API_URL}/post/${post.id}`;

const getCommentPath = (post, fallbackType) =>
  resolveType(post, fallbackType) === "channel"
    ? `${import.meta.env.VITE_API_URL}/post/channel-post/${post.id}/comments`
    : `${import.meta.env.VITE_API_URL}/post/${post.id}/comments`;

export default function PostCards({
  posts,
  postType,
  compact = false,
  emptyText = "No posts found.",
  onPostUpdated,
  onPostDeleted,
}) {
  const [commentsByPost, setCommentsByPost] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  const [actionLoading, setActionLoading] = useState({});

  const postList = useMemo(() => posts || [], [posts]);

  const toggleComments = async (post) => {
    const current = commentsByPost[post.id];
    if (current?.loaded) {
      setCommentsByPost((prev) => ({
        ...prev,
        [post.id]: { ...current, isOpen: !current.isOpen },
      }));
      return;
    }

    setLoadingComments((prev) => ({ ...prev, [post.id]: true }));

    try {
      const response = await fetch(getCommentPath(post, postType), {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch comments");
      }

      setCommentsByPost((prev) => ({
        ...prev,
        [post.id]: {
          loaded: true,
          isOpen: true,
          visibleCount: COMMENTS_BATCH,
          comments: data.comments || [],
        },
      }));
    } catch (error) {
      console.error("Error fetching comments:", error);
      alert("Unable to load comments for this post.");
    } finally {
      setLoadingComments((prev) => ({ ...prev, [post.id]: false }));
    }
  };

  const handlePostAction = async (post, action) => {
    const actionKey = `${post.id}-${action}`;
    setActionLoading((prev) => ({ ...prev, [actionKey]: true }));

    try {
      const endpoint =
        action === "delete"
          ? getActionBase(post, postType)
          : `${getActionBase(post, postType)}/${action}`;

      const response = await fetch(endpoint, {
        method: action === "delete" ? "DELETE" : "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Action failed");
      }

      if (action === "delete") {
        onPostDeleted?.(post.id);
        return;
      }

      const updatedPost = data.post || {
        ...post,
        isArchived: action === "archive",
      };
      onPostUpdated?.(updatedPost);
    } catch (error) {
      console.error(`Error running ${action}:`, error);
      alert(`Unable to ${action} this post right now.`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleLoadMoreComments = (postId) => {
    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        visibleCount: prev[postId].visibleCount + COMMENTS_BATCH,
      },
    }));
  };

  if (!postList.length) {
    return <div className="post-empty-state">{emptyText}</div>;
  }

  return (
    <div className={`post-cards-grid ${compact ? "compact" : ""}`}>
      {postList.map((post) => {
        const effectiveType = resolveType(post, postType);
        const commentState = commentsByPost[post.id];
        const visibleComments = commentState?.comments?.slice(
          0,
          commentState.visibleCount
        );
        const isVideo = post.type === "Reels";

        return (
          <article key={`${effectiveType}-${post.id}`} className="post-card">
            <div className="post-card-top">
              <div>
                <p className="post-author-line">
                  {effectiveType === "channel"
                    ? `Channel: ${post.channel}`
                    : `User: ${post.author}`}
                </p>
                <p className="post-date-line">{formatDate(post.createdAt)}</p>
              </div>
              {post.isArchived && <span className="post-status-chip">Archived</span>}
            </div>

            <div className="post-media-shell">
              {isVideo ? (
                <video className="post-media" src={post.url} controls preload="metadata" />
              ) : (
                <img className="post-media" src={post.url} alt={post.content || post.id} />
              )}
            </div>

            <div className="post-copy">
              <p>{post.content}</p>
            </div>

            <div className="post-meta-grid">
              <span>
                <ThumbsUp size={14} /> {post.likes || 0}
              </span>
              <span>
                <ThumbsDown size={14} /> {post.dislikes || 0}
              </span>
              <span>
                <MessageSquare size={14} /> {post.comments?.length || 0}
              </span>
              <span>
                <Eye size={14} /> {post.type}
              </span>
            </div>

            <div className="post-actions-row">
              {post.isArchived ? (
                <button
                  className="post-action-btn secondary"
                  onClick={() => handlePostAction(post, "restore")}
                  disabled={actionLoading[`${post.id}-restore`]}
                >
                  <RotateCcw size={15} />
                  Restore
                </button>
              ) : (
                <button
                  className="post-action-btn secondary"
                  onClick={() => handlePostAction(post, "archive")}
                  disabled={actionLoading[`${post.id}-archive`]}
                >
                  <Archive size={15} />
                  Archive
                </button>
              )}

              <button
                className="post-action-btn secondary"
                onClick={() => toggleComments(post)}
                disabled={loadingComments[post.id]}
              >
                <MessageSquare size={15} />
                {loadingComments[post.id]
                  ? "Loading..."
                  : commentState?.isOpen
                    ? "Hide Comments"
                    : "Show Comments"}
              </button>

              <button
                className="post-action-btn danger"
                onClick={() => handlePostAction(post, "delete")}
                disabled={actionLoading[`${post.id}-delete`]}
              >
                <Trash2 size={15} />
                Delete
              </button>
            </div>

            {commentState?.isOpen && (
              <div className="post-comments-panel">
                {visibleComments?.length ? (
                  visibleComments.map((comment) => (
                    <div key={comment._id} className="post-comment-card">
                      <div className="post-comment-head">
                        <strong>{comment.username || comment.name}</strong>
                        <span>{formatDate(comment.createdAt)}</span>
                      </div>
                      <p>{comment.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="post-comments-empty">No comments on this post yet.</p>
                )}

                {commentState.comments.length > commentState.visibleCount && (
                  <button
                    className="post-load-more-btn"
                    onClick={() => handleLoadMoreComments(post.id)}
                  >
                    Load more comments
                  </button>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
