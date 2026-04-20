import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/kidsHome.css';

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

function KidsHome() {
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState(null);

  const [dropdownPost, setDropdownPost] = useState(null);
  const [reportPostId, setReportPostId] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const observerRef = useRef();
  const dropdownRef = useRef();
  const modalRef = useRef();

  const fetchKidsPosts = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const data = await graphqlRequest(
        `
          query KidsHomeFeed($skip: Int, $limit: Int) {
            kidsHomeFeed(skip: $skip, limit: $limit) {
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
        { skip, limit: 6 },
      );

      const feed = data?.kidsHomeFeed;

      if (feed?.posts?.length > 0) {
        setPosts(prev => {
          const existing = new Set(prev.map(p => p.id));
          const newOnes = feed.posts.filter(p => !existing.has(p.id));
          return [...prev, ...newOnes];
        });

        setSkip(prev => prev + feed.posts.length);
        setHasMore(Boolean(feed.hasMore));
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error fetching kids home feed:', err);
    } finally {
      setLoading(false);
    }
  }, [skip, hasMore, loading]);

  useEffect(() => {
    fetchKidsPosts();
  }, []);

  useEffect(() => {
    if (loading || !hasMore) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchKidsPosts();
        }
      },
      { threshold: 0.9 },
    );

    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [fetchKidsPosts, loading, hasMore]);

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
      if (count >= 1) return `${count} ${unit}${count > 1 ? 's' : ''} ago`;
    }

    return 'just now';
  };

  const handleVideoClick = id => {
    const video = document.getElementById(`kids_video-${id}`);
    if (!video) return;

    if (video.paused) {
      video.play();
      setPlayingVideoId(id);
    } else {
      video.pause();
      setPlayingVideoId(null);
    }
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

  const handleDropdownToggle = id =>
    setDropdownPost(p => (p === id ? null : id));

  const handleReportClick = id => {
    setReportPostId(id);
    setDropdownPost(null);
    setShowReportModal(true);
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

  return (
    <div className="kids_home_main">
      <div className="kids_home_left_section">
        <div
          className="kids_home_logo_class"
          onClick={() => navigate('/kidshome')}
        >
          <img
            className="kids_home_logo"
            src="https://ik.imagekit.io/FFSD0037/logo.jpeg?updatedAt=1746701257780"
            alt="Feeds Logo"
          />
        </div>

        <div className="kids_home_footer">
          <a href="/contact">About</a> • <a href="/help">Help</a> •{' '}
          <a href="/terms">Terms</a> •{' '}
          <a
            href="https://www.google.com/maps/place/IIIT+Sri+City"
            target="_blank"
          >
            Location
          </a>
          <p>
            © 2025 <a href="/home">Feeds</a> from IIIT Sri City
          </p>
        </div>
      </div>

      <div className="kids_home_feed_section">
        <h1 className="kids_home_title">Kids Feeds</h1>
        <div className="kids_home_divider"></div>

        {posts.length === 0 && !loading ? (
          <p className="kids_home_no_posts">No posts available.</p>
        ) : (
          posts.map(post => (
            <div key={post.id} className="kids_home_post_card">
              <div className="kids_home_post_header">
                <span
                  className="kids_home_post_channel"
                  onClick={() => navigate(`/channel/${post.channel}`)}
                >
                  @{post.channel}
                </span>

                <div
                  className="kids_home_post_menu_trigger"
                  onClick={() => handleDropdownToggle(post.id)}
                >
                  •••
                </div>

                {dropdownPost === post.id && (
                  <div className="kids_home_dropdown_menu" ref={dropdownRef}>
                    <div
                      className="kids_home_dropdown_item danger"
                      onClick={() => handleReportClick(post.id)}
                    >
                      Report
                    </div>
                    <div
                      className="kids_home_dropdown_item"
                      onClick={() => setDropdownPost(null)}
                    >
                      Cancel
                    </div>
                  </div>
                )}
              </div>

              {post.type === 'Img' ? (
                <img
                  className="kids_home_post_media"
                  src={post.url}
                  alt="Post"
                />
              ) : (
                <div
                  className="kids_home_video_wrapper"
                  onClick={() => handleVideoClick(post.id)}
                >
                  <video
                    id={`kids_video-${post.id}`}
                    className="kids_home_post_media"
                    src={post.url}
                    muted
                    loop
                    playsInline
                  />
                  {playingVideoId !== post.id && (
                    <div className="kids_home_play_button">▶</div>
                  )}
                </div>
              )}

              {post.content && (
                <p className="kids_home_post_caption">{post.content}</p>
              )}

              <div className="kids_home_post_actions">
                <div
                  className="kids_home_action_item"
                  onClick={() => handleLike(post._id)}
                >
                  {post.liked ? '❤️' : '🤍'} {post.likes}
                </div>

                <div
                  className="kids_home_action_item"
                  onClick={() => handleSave(post._id)}
                >
                  {post.saved ? '💾' : '📁'}
                </div>
              </div>

              <div className="kids_home_post_time">
                {timeAgo(post.createdAt)}
              </div>
            </div>
          ))
        )}

        {loading && <p className="kids_home_loading">Loading...</p>}
        {!hasMore && posts.length > 0 && (
          <p className="kids_home_end_text">You're all caught up!</p>
        )}

        <div ref={observerRef}></div>
      </div>

      {showReportModal && (
        <div className="kids_home_report_overlay">
          <div className="kids_home_report_modal" ref={modalRef}>
            <div className="kids_home_modal_header">
              <span>Report</span>
              <button
                className="kids_home_close_btn"
                onClick={handleCloseReport}
              >
                ×
              </button>
            </div>
            <p className="kids_home_modal_title">
              Why are you reporting this post?
            </p>
            <ul className="kids_home_report_options">
              {[
                "I just don't like it",
                'Bullying or unwanted contact',
                'Violence or hate',
                'Inappropriate content',
                'Spam or scam',
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

export default KidsHome;
