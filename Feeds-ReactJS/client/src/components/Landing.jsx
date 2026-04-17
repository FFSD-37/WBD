import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  File,
  MessageCircle,
  Heart,
  Share2,
  Bookmark,
} from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import '../styles/Landing.css';
import { useUserData } from '../providers/userData.jsx';
import { useNavigate } from 'react-router-dom';

/*
ISSUES/Improvements:
1. Optimize API calls with pagination or infinite scroll for posts.
2. Better Responsive design for mobile devices.
3. Story indicators for viewed/unviewed stories.
4. Change the path of stories instead of showing profile on click.
5. Add tooltips to ads for better user engagement.
6. Show channel posts that the user follows
*/

import Stories from './stories';

const HomePage = () => {
  const { userData } = useUserData();
  const [allPosts, setAllPosts] = useState([]);
  const [friends, setFriends] = useState([]);
  const [allAds, setAds] = useState([]);

  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const [activePostId, setActivePostId] = useState(null);
  const [comments, setComments] = useState([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [stories, setStories] = useState([]);
  const [storyToOpen, setStoryToOpen] = useState(null);
  const [showArrows, setShowArrows] = useState(false);
  const storiesRef = useRef(null);

  const scrollStories = direction => {
    const container = storiesRef.current;
    const scrollAmount = 200; // adjust

    if (direction === 'left') {
      container.scrollLeft -= scrollAmount;
    } else {
      container.scrollLeft += scrollAmount;
    }
  };

  const navigate = useNavigate();

  const getAllPosts = async () => {
    setLoadingPosts(true);
    setLoadingFriends(true);

    const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        query: `
          query HomeFeed {
            homeFeed {
              posts {
                _id
                id
                type
                url
                content
                author
                authorAvatar
                likes
                commentCount
                liked
                saved
                createdAt
              }
              friends {
                username
                avatarUrl
              }
              ads {
                _id
                url
                ad_url
              }
              channels {
                _id
                channelName
                channelLogo
              }
              stories {
                _id
                username
                url
                likes
                avatarUrl
                createdAt
              }
            }
          }
        `,
      }),
    });
    const data = await res.json();
    const feed = data?.data?.homeFeed;

    if (feed) {
      setAllPosts(feed.posts ?? []);
      setFriends(feed.friends ?? []);
      setAds(feed.ads ?? []);
      setChannels(feed.channels ?? []);
      setStories(feed.stories ?? []);
    }

    setLoadingPosts(false);
    setLoadingFriends(false);
  };

  useEffect(() => {
    getAllPosts();
  }, []);

  const toggleSave = async postId => {
    setAllPosts(prev =>
      prev.map(p => (p.id === postId ? { ...p, saved: !p.saved } : p)),
    );

    const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        query: `
          mutation ToggleSavePost($postId: String!) {
            toggleSavePost(postId: $postId) {
              success
              id
              saved
              liked
              likes
            }
          }
        `,
        variables: { postId },
      }),
    });
    const data = await res.json();
    const result = data?.data?.toggleSavePost;

    if (result?.success) {
      setAllPosts(prev =>
        prev.map(p =>
          p.id === postId
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
  };

  const selectReason = async reason => {
    setShowReportModal(false);
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          query: `
            mutation ReportPost($postId: String!, $reason: String!) {
              reportPost(postId: $postId, reason: $reason) {
                success
                message
                reportId
              }
            }
          `,
          variables: {
            postId: selectedPostId,
            reason,
          },
        }),
      });

      const data = await res.json();
      const result = data?.data?.reportPost;

      if (result?.success) {
        alert(`Post reported - id: ${result.reportId}`);
      } else {
        alert(
          data?.errors?.[0]?.message ||
            result?.message ||
            'Something went wrong',
        );
      }
    } catch (err) {
      console.log('Error reporting post:', err);
    }
  };

  const toggleLike = async postId => {
    setAllPosts(prev =>
      prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            liked: !p.liked,
            likes: p.liked ? p.likes - 1 : p.likes + 1,
          };
        }
        return p;
      }),
    );

    const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        query: `
          mutation ToggleLikePost($postId: String!) {
            toggleLikePost(postId: $postId) {
              success
              id
              liked
              saved
              likes
            }
          }
        `,
        variables: { postId },
      }),
    });
    const data = await res.json();
    const result = data?.data?.toggleLikePost;

    if (result?.success) {
      setAllPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? {
                ...p,
                liked: result.liked,
                saved: result.saved ?? p.saved,
                likes: result.likes ?? p.likes,
              }
            : p,
        ),
      );
    }
  };

  const handleShare = async postId => {
    const url = `http://localhost:5173/post/${postId}`;

    // ✔ If Web Share API is supported
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check this post!',
          url,
        });
      } catch (err) {
        console.log('Share cancelled', err);
      }
    } else {
      // ✔ Fallback (copies URL to clipboard)
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  function timeAgo(value) {
    if (!value) {
      return 'just now';
    }

    const normalizedValue =
      typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
    const date = normalizedValue instanceof Date ? normalizedValue : new Date(normalizedValue);

    if (Number.isNaN(date.getTime())) {
      return 'just now';
    }

    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
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
  }

  const openComments = async postId => {
    setActivePostId(postId);
    const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        query: `
          query PostComments($postId: String!) {
            postComments(postId: $postId) {
              main {
                _id
                text
                username
                avatarUrl
              }
              replies {
                _id
                text
                username
                avatarUrl
              }
            }
          }
        `,
        variables: { postId },
      }),
    });

    const data = await res.json();
    if (data?.data?.postComments) {
      setComments(
        data.data.postComments.map(thread => [thread.main, thread.replies ?? []]),
      );
    }
    setShowComments(true);
    console.log(comments);
  };

  const [replyBoxVisible, setReplyBoxVisible] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [commentText, setCommentText] = useState('');
  // const [commentNumbers, setCommentNumbers] = useState(0);

  const openReplyBox = commentId => {
    setReplyBoxVisible(commentId);
  };

  const sendReply = async commentId => {
    const res = await fetch(
      `${import.meta.env.VITE_SERVER_URL}/graphql`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `
            mutation AddCommentReply(
              $commentId: String!
              $postId: String!
              $replyText: String!
            ) {
              addCommentReply(
                commentId: $commentId
                postId: $postId
                replyText: $replyText
              ) {
                success
                reply {
                  _id
                  text
                  username
                  avatarUrl
                }
              }
            }
          `,
          variables: {
            commentId,
            postId: activePostId,
            replyText,
          },
        }),
      },
    );

    const data = await res.json();
    const result = data?.data?.addCommentReply;

    if (result?.success) {
      // ⭐ UPDATE UI IMMEDIATELY (REAL-TIME REPLY)
      setComments(prev =>
        prev.map(commentPair => {
          const main = commentPair[0];
          const replies = commentPair[1] || [];

          if (main._id === commentId) {
            return [
              main,
              [
                ...replies,
                result.reply,
              ],
            ];
          }

          return commentPair;
        }),
      );
    } else {
      console.log('error!!');
    }

    // close reply UI
    setReplyBoxVisible(null);
    setReplyText('');
  };

  const sendComment = async () => {
    console.log(activePostId);
    const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        query: `
          mutation AddPostComment($postId: String!, $commentText: String!) {
            addPostComment(postId: $postId, commentText: $commentText) {
              success
              message
              commentCount
              comment {
                _id
                text
                username
                avatarUrl
              }
            }
          }
        `,
        variables: {
          postId: activePostId,
          commentText,
        },
      }),
    });
    const data = await res.json();
    const result = data?.data?.addPostComment;

    if (result?.success) {
      setComments(prev => [
        ...prev,
        [
          {
            _id: result.comment._id,
            text: result.comment.text,
            username: result.comment.username,
            avatarUrl: result.comment.avatarUrl,
          },
          [], // empty replies
        ],
      ]);
      setAllPosts(prev =>
        prev.map(post =>
          post.id === activePostId
            ? {
                ...post,
                commentCount: result.commentCount ?? (post.commentCount ?? 0) + 1,
              }
            : post,
        ),
      );
    } else {
      alert(data?.errors?.[0]?.message || result?.message || 'Unable to add comment');
    }
    // console.log('Posting new comment:', commentText);

    setCommentText('');
  };

  const [channels, setChannels] = useState([]);

  console.log(channels);

  const reportComment = async commentId => {
    // 🔥 Your API fetch
    const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        query: `
          mutation ReportComment($commentId: String!) {
            reportComment(commentId: $commentId) {
              success
              message
              reportId
            }
          }
        `,
        variables: { commentId },
      }),
    });
    const data = await res.json();
    const result = data?.data?.reportComment;
    if (result?.success) {
      alert(`${result.message} with id: ${result.reportId}`);
    } else {
      alert(
        data?.errors?.[0]?.message || result?.message || 'Something went wrong',
      );
    }
    // console.log(data);
    // alert(`Reported comment ID: ${commentId}`);
  };

  // 🔥 Simple skeleton loader UI
  // const PostSkeleton = () => (
  //   <div className="post-card skeleton">
  //     <div className="skeleton-header"></div>
  //     <div className="skeleton-media"></div>
  //     <div className="skeleton-text"></div>
  //   </div>
  // );

  useEffect(() => {
    if (storiesRef.current) {
      const container = storiesRef.current;
      const needsScroll = container.scrollWidth > container.clientWidth;
      setShowArrows(needsScroll);
    }
  }, [stories]);

  return (
    <div className="main-layout">
      {(loadingPosts || loadingFriends) && (
        <div className="loading-overlay">
          <div>
            <div className="loader"></div>
            <h1>Loading</h1>
          </div>
        </div>
      )}
      <main className="main-content">
        <div className="content-section">
          {/* ===== STORIES SECTION ===== */}
          {stories.length > 0 && (
            <div className="stories-container">
              {showArrows && (
                <button
                  className="stories-arrow left"
                  onClick={() => scrollStories('left')}
                >
                  &lt;
                </button>
              )}

              <div className="stories-list" ref={storiesRef}>
                {stories.map(story => (
                  <div
                    className="story-item"
                    key={story._id}
                    onClick={() => setStoryToOpen(story.username)}
                  >
                    <img
                      src={story.avatarUrl}
                      alt={story.username}
                      className="story-avatar"
                    />
                    <p className="story-name">{story.username}</p>
                  </div>
                ))}
              </div>

              {showArrows && (
                <button
                  className="stories-arrow right"
                  onClick={() => scrollStories('right')}
                >
                  &gt;
                </button>
              )}

              {/* Stories Viewer */}
              <Stories
                initialStories={stories}
                currentUser={userData?.username}
                openUser={storyToOpen}
                onClose={() => setStoryToOpen(null)}
                hideGrid={true}
                fetchUrl={`${import.meta.env.VITE_SERVER_URL}/stories`}
              />
            </div>
          )}

          {/* ===== POSTS SECTION ===== */}
          {!loadingPosts && (
            <div className="post-card">
              {allPosts.map((post, index) => (
                <React.Fragment key={index}>
                  <div className="post-header">
                    <img
                      src={post.authorAvatar}
                      alt={post.author}
                      className="post-avatar"
                    />

                    <div className="post-author">
                      <h3
                        className="post-author-name"
                        onClick={() => navigate(`/profile/${post.author}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        {post.author}
                      </h3>
                      <p className="post-timestamp">
                        {timeAgo(post.createdAt)}
                      </p>
                    </div>

                    <button
                      className="icon-button"
                      onClick={() => {
                        setSelectedPostId(post.id);
                        setShowReportModal(true);
                      }}
                    >
                      <AlertTriangle
                        style={{
                          width: '20px',
                          height: '20px',
                          color: '#ef4444',
                        }}
                      />
                    </button>
                  </div>

                  {post.type === 'Img' ? (
                    <img src={post.url} alt="Post" className="post-image" />
                  ) : (
                    <video
                      src={post.url}
                      className="post-image"
                      onMouseEnter={e => e.target.play()}
                      onMouseLeave={e => {
                        e.target.pause();
                        e.target.currentTime = 0;
                      }}
                    />
                  )}

                  <div className="post-stats">
                    <div
                      className="post-stat"
                      onClick={() => openComments(post.id)}
                    >
                      <MessageCircle
                        style={{ width: '16px', height: '16px' }}
                      />
                      <span>{post.commentCount ?? 0}</span>
                    </div>

                    <div
                      className="post-stat"
                      onClick={() => toggleLike(post.id)}
                    >
                      {post.liked ? (
                        <Heart
                          fill="red"
                          color="red"
                          style={{ width: '16px' }}
                        />
                      ) : (
                        <Heart style={{ width: '16px' }} />
                      )}
                      <span>{post.likes}</span>
                    </div>

                    <div
                      className="post-stat"
                      onClick={() => toggleSave(post.id)}
                    >
                      {post.saved ? (
                        <Bookmark
                          fill="blue"
                          color="blue"
                          style={{ width: '16px' }}
                        />
                      ) : (
                        <Bookmark style={{ width: '16px' }} />
                      )}
                    </div>

                    <button
                      className="icon-button post-stat-auto"
                      onClick={() => handleShare(post.id)}
                    >
                      <Share2 style={{ width: '16px' }} />
                    </button>
                  </div>

                  <p className="post-text">{post.content}</p>
                  <hr />
                  <br />
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* RIGHT SIDEBAR */}

      <aside className="right-sidebar">
        <br />
        {!userData.isPremium ? (
          <div></div>
        ) : (
          <div>
            <div className="sidebar-section">
              {/* Create Page Card */}
              <div className="create-page-card">
                <div className="create-page-icon">
                  <File
                    style={{ width: '24px', height: '24px', color: 'white' }}
                  />
                </div>
                <h3 className="create-page-title">
                  CREATE YOUR OWN FAVOURITE CHANNEL.
                </h3>
                <button
                  className="create-page-button"
                  onClick={() => navigate('/channelregistration')}
                >
                  Start Now!
                </button>
              </div>
            </div>
            <br />
          </div>
        )}

        {/* FRIENDS SKELETON */}
        <div className="sidebar-section">
          <div className="card">
            <h3 className="card-title">recent Friends</h3>

            {loadingFriends ? (
              <div className="friends-grid">
                {Array(9)
                  .fill(0)
                  .map((_, i) => (
                    <div
                      key={i}
                      className="friend-avatar skeleton-circle"
                    ></div>
                  ))}
              </div>
            ) : (
              <div className="friends-grid">
                {friends.slice(0, 9).map((friend, index) => (
                  <div
                    key={index}
                    className="friend-item"
                    onClick={() => navigate(`/profile/${friend.username}`)}
                  >
                    <img
                      src={friend.avatarUrl}
                      alt={friend.username}
                      className="friend-avatar"
                    />
                    <p className="friend-name">{friend.username}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {userData.type === 'Normal' ? (
          <div className="sidebar-section">
            {channels.length > 0 ? (
              <div className="card">
                <h3 className="card-title">Channels you follow</h3>
                {
                  <div className="friends-grid">
                    {channels.slice(0, 9).map(channel => (
                      <div
                        key={channel._id}
                        className="friend-item"
                        onClick={() =>
                          navigate(`/channel/${channel.channelName}`)
                        }
                      >
                        <img
                          src={channel.channelLogo}
                          alt={channel.channelName}
                          className="friend-avatar"
                        />
                        <p className="friend-name">{channel.channelName}</p>
                      </div>
                    ))}
                  </div>
                }
              </div>
            ) : null}
          </div>
        ) : (
          <div></div>
        )}
        <br />
        {!userData.isPremium ? (
          <div className="sidebar-section">
            <div className="card2">
              {allAds.map((ad, index) => (
                <div key={index} className="single_ad">
                  <a href={ad.url}>
                    <video
                      src={ad.ad_url}
                      className="post-image2"
                      autoPlay
                      muted
                      loop
                    ></video>
                  </a>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div></div>
        )}
      </aside>
      {showReportModal && (
        <div className="report-modal-overlay">
          <div className="report-modal">
            <p className="modal-title">Why are you reporting this post?</p>

            <ul className="report-options">
              {[
                "I just don't like it",
                'Bullying or unwanted contact',
                'Suicide, self-injury or eating disorders',
                'Violence, hate or exploitation',
                'Selling or promoting restricted items',
                'Nudity or sexual activity',
                'Scam, fraud or spam',
                'False information',
              ].map((reason, i) => (
                <li key={i} onClick={() => selectReason(reason)}>
                  {reason} <span>&#8250;</span>
                </li>
              ))}
            </ul>

            <button
              className="close-modal-btn"
              onClick={() => setShowReportModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
      {showComments && (
        <div className="comment-overlay">
          <div className="comment-box">
            {/* HEADER */}
            <div className="comment-header">
              <h3 className="comment-title">Comments</h3>
              <button
                className="close-btn"
                onClick={() => {
                  setShowComments(false);
                  setShowEmoji(false);
                }}
              >
                ✕
              </button>
            </div>

            {/* LIST */}
            <div className="comment-list">
              {comments.length === 0 && (
                <p className="no-comments">No comments yet</p>
              )}

              {comments.map(commentPair => {
                const main = commentPair[0];
                const replies = commentPair[1] || [];

                return (
                  <div key={main._id} className="comment-item">
                    {/* MAIN COMMENT */}
                    <div
                      className="comment-body"
                      style={{ display: 'flex', gap: '10px' }}
                    >
                      {/* PFP */}
                      <img
                        src={main.avatarUrl}
                        alt={main.username}
                        className="comment-pfp"
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                        }}
                      />

                      {/* TEXT */}
                      <div>
                        <p className="comment-text">{main.text}</p>
                        <span className="comment-author">@{main.username}</span>
                      </div>
                    </div>

                    {/* ACTIONS */}
                    <div
                      className="comment-actions"
                      style={{
                        display: 'flex',
                        gap: '12px',
                        marginLeft: '48px',
                      }}
                    >
                      <button onClick={() => reportComment(main._id)}>
                        Report
                      </button>
                      <button onClick={() => openReplyBox(main._id)}>
                        Reply
                      </button>
                    </div>

                    {/* REPLIES */}
                    {replies.length > 0 && (
                      <div
                        className="reply-list"
                        style={{ marginLeft: '55px' }}
                      >
                        {replies.map((reply, idx) => (
                          <div key={reply._id || idx} className="reply-item">
                            <div style={{ display: 'flex', gap: '10px' }}>
                              {/* PFP */}
                              <img
                                src={reply.avatarUrl}
                                alt={reply.username}
                                className="reply-pfp"
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                }}
                              />

                              {/* TEXT */}
                              <div>
                                <p
                                  className="reply-text"
                                  style={{ color: 'black', fontSize: '12px' }}
                                >
                                  {reply.text}
                                </p>
                                <span
                                  className="reply-author"
                                  style={{
                                    color: 'black',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                  }}
                                >
                                  @{reply.username}
                                </span>
                              </div>
                            </div>

                            <button
                              className="reply-report-btn"
                              onClick={() => reportComment(reply._id)}
                              style={{ marginLeft: '42px' }}
                            >
                              Report
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* REPLY BOX */}
                    {replyBoxVisible === main._id && (
                      <div
                        className="reply-input-wrapper"
                        style={{ marginLeft: '48px' }}
                      >
                        <input
                          className="reply-input"
                          type="text"
                          placeholder="Write a reply..."
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                        />

                        {/* SEND */}
                        <button
                          className="reply-send-btn"
                          onClick={() => sendReply(main._id)}
                        >
                          Send
                        </button>

                        {/* CANCEL - NEW BUTTON */}
                        <button
                          className="reply-cancel-btn"
                          style={{
                            marginLeft: '8px',
                            background: 'transparent',
                            border: '1px solid #666',
                            color: '#ccc',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            setReplyBoxVisible(null);
                            setReplyText('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* NEW COMMENT INPUT */}
            <div className="new-comment-area">
              {showEmoji && (
                <div className="emoji-picker-popup">
                  <EmojiPicker
                    onEmojiClick={emoji => {
                      setCommentText(prev => prev + emoji.emoji);
                      setShowEmoji(false);
                    }}
                    theme="dark"
                  />
                </div>
              )}

              <div className="comment-input-wrapper">
                <button
                  className="emoji-btn"
                  onClick={() => setShowEmoji(!showEmoji)}
                >
                  😃
                </button>

                <input
                  className="comment-input"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                />

                <button className="post-btn" onClick={sendComment}>
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
