import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../styles/ChannelPostOverlay.css';

/*
ISSUES/Improvements:

*/

const timeAgo = dateString => {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };
  for (const [unit, sec] of Object.entries(intervals)) {
    const count = Math.floor(seconds / sec);
    if (count >= 1) return `${count}${unit[0]}${count > 1 ? '' : ''} ago`;
  }
  return 'just now';
};

export default function ChannelPostOverlay({ id: propId, onClose }) {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const id = propId || routeId;

  const [post, setPost] = useState(null);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [replyPages, setReplyPages] = useState({});
  const [loadingReplies, setLoadingReplies] = useState({});
  const [hasMoreReplies, setHasMoreReplies] = useState({});

  const standalone = !onClose; // Detect full-page mode

  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src =
      'https://cdn.jsdelivr.net/npm/emoji-picker-element@^1/index.js';
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    const picker = document.querySelector('#channel-post-overlay-emoji-picker');
    if (picker) {
      picker.addEventListener('emoji-click', e => {
        setNewComment(prev => prev + e.detail.unicode);
      });
    }
  }, [showEmoji]);

  useEffect(() => {
    const handleEsc = e => {
      if (e.key !== 'Escape') return;

      // Close emoji picker first
      if (showEmoji) {
        setShowEmoji(false);
        e.stopPropagation();
        return;
      }

      // Close report modal next
      if (showReportModal) {
        setShowReportModal(false);
        e.stopPropagation();
        return;
      }

      // Finally close overlay (if modal)
      if (!standalone && onClose) onClose();
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [showEmoji, showReportModal, onClose, standalone]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${import.meta.env.VITE_SERVER_URL}/channelPost/${id}`, {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPost(data.post);
          setComments(data.comments);
          setLiked(data.post.userHasLiked || false);
          setSaved(data.post.userHasSaved || false);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleLike = async () => {
    const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/channel/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ postId: post._id }),
    });
    const data = await res.json();
    if (data.success) {
      setPost(prev => ({ ...prev, likes: data.likes }));
      setLiked(data.liked);
    }
  };

  const handleSave = async () => {
    const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/channel/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ postId: post._id }),
    });
    const data = await res.json();
    if (data.success) setSaved(data.saved);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    const res = await fetch(
      `${import.meta.env.VITE_SERVER_URL}/channel/comment`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          postId: post._id,
          text: newComment,
          parentCommentId: replyTo?._id || null,
        }),
      },
    );
    const data = await res.json();
    if (data.success) {
      if (replyTo) {
        setComments(prev =>
          prev.map(c =>
            c._id === replyTo._id
              ? { ...c, replies: [...(c.replies || []), data.comment] }
              : c,
          ),
        );
        setReplyTo(null);
      } else {
        setComments(prev => [data.comment, ...prev]);
      }
      setNewComment('');
    }
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddComment();
    }
  };

  const loadReplies = async commentId => {
    setLoadingReplies(prev => ({ ...prev, [commentId]: true }));

    const page = replyPages[commentId] || 1;

    const res = await fetch(
      `${import.meta.env.VITE_SERVER_URL}/channel/comment/replies/${commentId}?page=${page}`,
      { credentials: 'include' },
    );

    const data = await res.json();

    if (data.success) {
      // Merge replies
      setComments(prev =>
        prev.map(c =>
          c._id === commentId
            ? { ...c, replies: [...(c.replies || []), ...data.replies] }
            : c,
        ),
      );

      // Update page
      setReplyPages(prev => ({ ...prev, [commentId]: page + 1 }));
      setHasMoreReplies(prev => ({ ...prev, [commentId]: data.hasMore }));
    }

    setLoadingReplies(prev => ({ ...prev, [commentId]: false }));
  };

  const handleReport = () => {
    setShowReportModal(true);
    setShowOptions(false);
  };

  const handleCopy = () => {
    const link = `${window.location.origin}/channel/post/${post.id}`;
    navigator.clipboard.writeText(link);
    alert('Post link copied!');
    setShowOptions(false);
  };

  const handleShare = () => {
    const link = `${window.location.origin}/channel/post/${post.id}`;
    navigator.share
      ? navigator.share({ title: 'Feeds Post', url: link })
      : alert(`Copy this URL manually:\n${link}`);
    setShowOptions(false);
  };

  const handleCloseReport = () => setShowReportModal(false);

  const handleReasonSelect = async reason => {
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/report_post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason, post_id: post?.id || id }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Post reported - id: ${data.reportId}`);
      } else {
        alert(data.message || 'Failed to report post');
      }
    } catch (err) {
      console.error('Error reporting post:', err);
      alert('Failed to report post');
    } finally {
      setShowReportModal(false);
    }
  };

  if (loading)
    return (
      <div className="channel-post-overlay-container">
        <div className="channel-post-overlay-loader">Loading...</div>
      </div>
    );

  if (!post)
    return (
      <div className="channel-post-overlay-container">
        <div className="channel-post-overlay-content">
          <p>Post not found.</p>
          {!standalone && <button onClick={onClose}>Close</button>}
        </div>
      </div>
    );

  return (
    <>
      <div
        className={
          standalone
            ? 'channel-post-fullpage-container'
            : 'channel-post-overlay-container'
        }
        onClick={!standalone && !showReportModal ? onClose : undefined}
      >
        <div
          className="channel-post-overlay-wrapper"
          onClick={e => e.stopPropagation()}
        >
          {/* LEFT SIDE */}
          <div className="channel-post-overlay-left">
            <div className="channel-post-overlay-header">
              <span
                onClick={() => navigate(`/channel/${post.channel}`)}
                className="channel-post-overlay-channel"
              >
                @{post.channel}
              </span>

              <div className="channel-post-overlay-options">
                <button onClick={() => setShowOptions(p => !p)}>⋯</button>
                {showOptions && (
                  <div className="channel-post-overlay-dropdown">
                    <div onClick={handleReport}>Report</div>
                    <div onClick={handleShare}>Share to...</div>
                    <div onClick={handleCopy}>Copy link</div>
                    <div onClick={() => navigate(`/channel/${post.channel}`)}>
                      Go to channel
                    </div>
                    <div onClick={() => setShowOptions(false)}>Cancel</div>
                  </div>
                )}
              </div>
            </div>

            {post.type === 'Img' ? (
              <img
                src={post.url}
                alt="Post"
                className="channel-post-overlay-image"
              />
            ) : (
              <video
                src={post.url}
                className="channel-post-overlay-image"
                controls
                autoPlay
                loop
                playsInline
              />
            )}

            <div className="channel-post-overlay-actions">
              <button onClick={handleLike} className={liked ? 'liked' : ''}>
                <img
                  src={liked ? '/Images/liked.svg' : '/Images/unliked.svg'}
                  className="overlay-action-icon"
                />
                <span className="channel-post-overlay-likes">{post.likes}</span>
              </button>

              <button onClick={() => setShowEmoji(!showEmoji)}>
                <img
                  src="/Images/comment.svg"
                  className="overlay-action-icon"
                />
              </button>

              <button onClick={handleSave}>
                <img
                  src={saved ? '/Images/saved.svg' : '/Images/unsaved.svg'}
                  className="overlay-action-icon"
                />
              </button>

              <button onClick={handleShare}>
                <img src="/Images/share.svg" className="overlay-action-icon" />
              </button>
            </div>

            <div className="channel-post-overlay-caption">{post.content}</div>
          </div>

          {/* RIGHT SIDE */}
          <div className="channel-post-overlay-right">
            <div className="channel-post-overlay-comments">
              {comments.length === 0 ? (
                <p className="channel-post-overlay-empty">No comments yet</p>
              ) : (
                comments.map(c => (
                  <div key={c._id} className="channel-post-comment-block">
                    <img
                      src={c.avatarUrl}
                      alt="avatar"
                      className="channel-post-comment-avatar"
                      onClick={() =>
                        c.type === 'Channel'
                          ? navigate(`/channel/${c.name}`)
                          : navigate(`/profile/${c.name}`)
                      }
                    />
                    <div className="channel-post-comment-bubble">
                      <div className="channel-post-comment-header">
                        <strong
                          onClick={() =>
                            c.type === 'Channel'
                              ? navigate(`/channel/${c.name}`)
                              : navigate(`/profile/${c.name}`)
                          }
                        >
                          @{c.name}
                        </strong>
                        <span className="comment-time">
                          {timeAgo(c.createdAt)}
                        </span>
                      </div>
                      <p className="channel-post-comment-text">{c.text}</p>
                      <div className="channel-post-comment-footer">
                        <span
                          className="reply-btn"
                          onClick={() => {
                            setReplyTo(c);
                            document
                              .querySelector(
                                '.channel-post-overlay-comment-input',
                              )
                              ?.focus();
                          }}
                        >
                          Reply
                        </span>
                      </div>
                      {/* SHOW "VIEW REPLIES" only if replies exist in DB AND none loaded yet */}
                      {c.replyCount > 0 && c.replies.length === 0 && (
                        <span
                          className="view-replies-btn"
                          onClick={() => loadReplies(c._id)}
                        >
                          View replies ({c.replyCount})
                        </span>
                      )}

                      {/* SHOW "VIEW MORE REPLIES" only if some replies are loaded AND more exist */}
                      {c.replies.length > 0 && hasMoreReplies[c._id] && (
                        <span
                          className={`view-replies-btn ${loadingReplies[c._id] ? 'loading' : ''}`}
                          onClick={() => loadReplies(c._id)}
                        >
                          {loadingReplies[c._id]
                            ? 'Loading...'
                            : 'View more replies'}
                        </span>
                      )}

                      {/* RENDER LOADED REPLIES */}
                      {c.replies.length > 0 && (
                        <div className="channel-post-comment-replies">
                          {c.replies.map(r => (
                            <div key={r._id} className="reply-bubble">
                              <img src={r.avatarUrl} />
                              <div>
                                <strong>@{r.name}</strong>
                                <p>{r.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="channel-post-overlay-add-comment">
              {replyTo && (
                <div className="channel-post-overlay-replying-to">
                  Replying to @{replyTo.name}{' '}
                  <span onClick={() => setReplyTo(null)}>×</span>
                </div>
              )}
              <button
                id="channel-post-overlay-emoji-btn"
                onClick={() => setShowEmoji(prev => !prev)}
                className="channel-post-overlay-emoji-button"
              >
                😀
              </button>
              <input
                type="text"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a comment..."
                className="channel-post-overlay-comment-input"
              />
              <button
                onClick={handleAddComment}
                className="channel-post-overlay-post-button"
              >
                Post
              </button>
            </div>

            {showEmoji && (
              <emoji-picker
                id="channel-post-overlay-emoji-picker"
                style={{
                  position: 'absolute',
                  bottom: '70px',
                  right: '20px',
                  opacity: showEmoji ? '1' : '0',
                  transform: showEmoji ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'all 0.3s ease',
                  zIndex: 1000,
                }}
              ></emoji-picker>
            )}
          </div>
        </div>

        {/* ✅ Optional Back Button for standalone */}
        {standalone && (
          <button
            className="channel-post-fullpage-back-btn"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="channel-post-overlay-report-overlay">
          <div className="channel-post-overlay-report-modal">
            <div className="channel_home_modal_header">
              <span>Report</span>
              <button
                className="channel_home_close_btn"
                onClick={handleCloseReport}
              >
                ×
              </button>
            </div>
            <p className="channel_home_modal_title">
              Why are you reporting this post?
            </p>
            <ul className="channel_home_report_options">
              {[
                "I just don't like it",
                'Bullying or unwanted contact',
                'Suicide, self-injury or eating disorders',
                'Violence, hate or exploitation',
                'Selling or promoting restricted items',
                'Nudity or sexual activity',
                'Scam, fraud or spam',
                'False information',
              ].map(reason => (
                <li key={reason} onClick={() => handleReasonSelect(reason)}>
                  {reason} <span>›</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
