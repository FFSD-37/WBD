import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserData } from './../providers/userData.jsx';
import ChannelPostOverlay from './ChannelPostOverlay.jsx';
import './../styles/channelHome.css';

/*
ISSUES/Improvements:
1. Close the menu trigger when clicking outside or escape key is pressed.
2. Close the report modal when clicking outside or escape key is pressed.
3. Make the posts smaller.
*/

const graphqlRequest = async (query, variables = {}) => {
  const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (data.errors?.length) {
    throw new Error(data.errors[0].message || 'GraphQL request failed');
  }
  return data.data;
};

function ChannelHome() {
  useUserData();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [dropdownPost, setDropdownPost] = useState(null);
  const [reportPostId, setReportPostId] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState(null);
  const [activePostId, setActivePostId] = useState(null);

  const observerRef = useRef();
  const dropdownRef = useRef();
  const modalRef = useRef();

  const fetchPosts = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const data = await graphqlRequest(
        `
          query ChannelHomeFeed($skip: Int, $limit: Int) {
            channelHomeFeed(skip: $skip, limit: $limit) {
              posts {
                _id
                id
                type
                url
                content
                channel
                likes
                liked
                saved
                commentCount
                createdAt
              }
              totalCount
              hasMore
            }
          }
        `,
        { skip, limit: 5 },
      );

      const feed = data?.channelHomeFeed;

      if (feed?.posts?.length > 0) {
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newPosts = feed.posts.filter(p => !existingIds.has(p.id));
          return [...prev, ...newPosts];
        });

        setSkip(prev => prev + feed.posts.length);
        setHasMore(Boolean(feed.hasMore));
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error fetching channel home feed:', err);
    } finally {
      setLoading(false);
    }
  }, [skip, hasMore, loading]);

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (loading || !hasMore) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchPosts();
        }
      },
      { threshold: 0.9 },
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [fetchPosts, loading, hasMore]);

  const timeAgo = dateString => {
    const date = new Date(dateString);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    const intervals = {
      year: 31536000,
      mon: 2592000,
      w: 604800,
      d: 86400,
      h: 3600,
      m: 60,
    };
    for (const [unit, sec] of Object.entries(intervals)) {
      const count = Math.floor(seconds / sec);
      if (count >= 1) return `${count} ${unit}${count > 1 ? 's' : ''} ago`;
    }
    return 'just now';
  };

  const handleDropdownToggle = id =>
    setDropdownPost(p => (p === id ? null : id));

  const handleReportClick = id => {
    setReportPostId(id);
    setDropdownPost(null);
    setShowReportModal(true);
  };

  const handleShare = post => {
    const url = `${window.location.origin}/channel/post/${post.id}`;
    if (navigator.share) {
      navigator
        .share({ title: 'Feeds Post', url })
        .catch(() => console.log('Share cancelled'));
    } else {
      alert('Share this URL: ' + url);
    }
    setDropdownPost(null);
  };

  const handleCopyLink = post => {
    navigator.clipboard.writeText(
      `${window.location.origin}/channel/post/${post.id}`,
    );
    alert('Post link copied!');
    setDropdownPost(null);
  };

  const handleCloseReport = () => {
    setShowReportModal(false);
    setReportPostId(null);
  };

  const handleReasonSelect = async reason => {
    if (!reportPostId) return;
    try {
      const data = await graphqlRequest(
        `
          mutation ReportPost($postId: String!, $reason: String!) {
            reportPost(postId: $postId, reason: $reason) {
              success
              message
              reportId
            }
          }
        `,
        { postId: reportPostId, reason },
      );
      const result = data?.reportPost;
      if (result?.success) {
        alert(`Post reported - id: ${result.reportId}`);
      } else {
        alert(result?.message || 'Failed to report post');
      }
    } catch (err) {
      console.error('Error reporting post:', err);
      alert('Failed to report post');
    } finally {
      handleCloseReport();
    }
  };

  const handleVideoClick = id => {
    const video = document.getElementById(`video-${id}`);
    if (video.paused) {
      video.play();
      setPlayingVideoId(id);
    } else {
      video.pause();
      setPlayingVideoId(null);
    }
  };

  const handleOpenPost = post => {
    setActivePostId(post.id);
  };

  const handleLike = async postId => {
    try {
      const data = await graphqlRequest(
        `
          mutation ToggleLikeChannelPost($postId: String!) {
            toggleLikeChannelPost(postId: $postId) {
              success
              id
              liked
              saved
              likes
            }
          }
        `,
        { postId },
      );
      const result = data?.toggleLikeChannelPost;
      if (result?.success) {
        setPosts(prev =>
          prev.map(p =>
            p._id === postId
              ? {
                  ...p,
                  likes: result.likes ?? p.likes,
                  liked: result.liked,
                  saved: result.saved ?? p.saved,
                }
              : p,
          ),
        );
      }
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const handleSave = async postId => {
    try {
      const data = await graphqlRequest(
        `
          mutation ToggleSaveChannelPost($postId: String!) {
            toggleSaveChannelPost(postId: $postId) {
              success
              id
              liked
              saved
              likes
            }
          }
        `,
        { postId },
      );
      const result = data?.toggleSaveChannelPost;
      if (result?.success) {
        setPosts(prev =>
          prev.map(p =>
            p._id === postId
              ? {
                  ...p,
                  saved: result.saved,
                  liked: result.liked ?? p.liked,
                  likes: result.likes ?? p.likes,
                }
              : p,
          ),
        );
      }
    } catch (err) {
      console.error('Error saving post:', err);
    }
  };

  return (
    <div className="channel_home_main">
      <div className="channel_home_left_section">
        <div
          className="channel_home_logo_class"
          onClick={() => navigate('/channelhome')}
        >
          <img
            className="channel_home_logo"
            src="https://ik.imagekit.io/FFSD0037/logo.jpeg?updatedAt=1746701257780"
            alt="Feeds Logo"
          />
        </div>
        <div className="channel_home_footer">
          <a href="/contact">About</a> • <a href="/help">Help</a> •{' '}
          <a href="/terms">Terms</a> •{' '}
          <a
            href="https://www.google.com/maps/place/Indian+Institute+of+Information+Technology,+Sri+City,+Chittoor/"
            target="_blank"
          >
            Location
          </a>
          <p>
            © 2025 <a href="/home">Feeds</a> from IIIT Sri City
          </p>
        </div>
      </div>

      <div className="channel_home_feed_section">
        <h1 className="channel_home_title">
          Feeds : The Personalized Social Platform
        </h1>
        <div className="channel_home_divider"></div>

        {posts.length === 0 && !loading ? (
          <p className="channel_home_no_posts">No posts to display.</p>
        ) : (
          posts.map(post => (
            <div key={post.id} className="channel_home_post_card">
              <div className="channel_home_post_header">
                <span
                  className="channel_home_post_channel"
                  onClick={() => navigate(`/channel/${post.channel}`)}
                >
                  @{post.channel}
                </span>
                <div
                  className="channel_home_post_menu_trigger"
                  onClick={() => handleDropdownToggle(post.id)}
                >
                  •••
                </div>

                {dropdownPost === post.id && (
                  <div className="channel_home_dropdown_menu" ref={dropdownRef}>
                    <div
                      className="channel_home_dropdown_item danger"
                      onClick={() => handleReportClick(post.id)}
                    >
                      Report
                    </div>
                    <div
                      className="channel_home_dropdown_item normal"
                      onClick={() => handleOpenPost(post)}
                    >
                      Go to post
                    </div>
                    <div
                      className="channel_home_dropdown_item normal"
                      onClick={() => handleShare(post)}
                    >
                      Share to...
                    </div>
                    <div
                      className="channel_home_dropdown_item normal"
                      onClick={() => handleCopyLink(post)}
                    >
                      Copy link
                    </div>
                    <div
                      className="channel_home_dropdown_item normal"
                      onClick={() => setDropdownPost(null)}
                    >
                      Cancel
                    </div>
                  </div>
                )}
              </div>

              {post.type === 'Img' ? (
                <img
                  className="channel_home_post_media"
                  src={post.url}
                  alt="Post"
                  onClick={() => handleOpenPost(post)}
                />
              ) : (
                <div
                  className="channel_home_video_wrapper"
                  onClick={() => handleVideoClick(post.id)}
                >
                  <video
                    id={`video-${post.id}`}
                    className="channel_home_post_media"
                    src={post.url}
                    muted
                    loop
                    playsInline
                  />
                  {playingVideoId !== post.id && (
                    <div className="channel_home_play_button">▶</div>
                  )}
                </div>
              )}

              {post.content && (
                <p
                  className="channel_home_post_caption"
                  onClick={() => handleOpenPost(post)}
                >
                  {post.content}
                </p>
              )}

              <div className="channel_home_post_actions">
                <div
                  className="channel_home_action_item"
                  onClick={() => handleLike(post._id)}
                  title={post.liked ? 'Unlike' : 'Like'}
                >
                  {post.liked ? '❤️' : '🤍'} {post.likes}
                </div>
                <div
                  className="channel_home_action_item"
                  onClick={() => handleSave(post._id)}
                  title={post.saved ? 'Unsave' : 'Save'}
                >
                  {post.saved ? '💾' : '📁'}
                </div>
                <div
                  className="channel_home_action_item"
                  onClick={() => handleOpenPost(post)}
                >
                  💬 {post.commentCount ?? 0}
                </div>
              </div>

              <div className="channel_home_post_time">
                {timeAgo(post.createdAt)}
              </div>
            </div>
          ))
        )}

        {loading && (
          <p className="channel_home_loading">Loading more posts...</p>
        )}
        {!hasMore && posts.length > 0 && (
          <p className="channel_home_end_text">No more posts to show</p>
        )}
        <div ref={observerRef}></div>
      </div>

      {activePostId && (
        <ChannelPostOverlay
          id={activePostId}
          onClose={() => setActivePostId(null)}
        />
      )}

      {showReportModal && (
        <div className="channel_home_report_overlay">
          <div className="channel_home_report_modal" ref={modalRef}>
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
    </div>
  );
}

export default ChannelHome;
