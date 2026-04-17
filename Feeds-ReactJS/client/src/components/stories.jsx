import React, { useEffect, useMemo, useRef, useState } from "react";
import "./../styles/stories.css";

/*
ISSUES/Improvements:
1. Better responsive design for small screens (e.g. mobile).
2. Better styling overall.
3. Like option not yet implemented on server side.
4. Go to profile from story viewer.
5. Story upload option.
6. Story deletion option.
7. Own story displayed in the page.
8. Story viewer accessibility improvements.
*/

/**
 * Stories component
 *
 * Props:
 *  - initialStories: optional array of stories preloaded from server
 *      each story: { _id, username, avatarUrl, url, createdAt, liked? }
 *  - currentUser: optional current logged-in username
 *  - fetchUrl: optional url to fetch stories if initialStories not provided (default '/stories')
 */
export default function Stories({
  initialStories = null,
  currentUser = null,
  fetchUrl = "http://localhost:3000/stories",
  // If provided, Stories will automatically open that user's stories
  openUser = null,
  // When `hideGrid` is true the component will only render the viewer (useful when embedding)
  hideGrid = false,
  // optional onClose callback
  onClose = null,
}) {
  const [stories, setStories] = useState(initialStories || []);
  const [loading, setLoading] = useState(!initialStories);
  const [error, setError] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeUsername, setActiveUsername] = useState(null);
  const [activeStories, setActiveStories] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progressPercents, setProgressPercents] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const progressIntervalRef = useRef(null);
  const storyMediaRefs = useRef({});
  const defaultDuration = 5000;
  const [progressDuration, setProgressDuration] = useState(defaultDuration);
  const usersMap = useMemo(() => {
    const m = {};
    (stories || []).forEach((s) => {
      const u = s.username;
      if (!m[u]) m[u] = { username: u, avatar: s.avatarUrl, stories: [] };
      m[u].stories.push(s);
    });
    Object.values(m).forEach((obj) =>
      obj.stories.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    );
    return m;
  }, [stories]);
  const usernamesOrdered = useMemo(() => Object.keys(usersMap), [usersMap]);
  useEffect(() => {
    if (!initialStories) {
      setLoading(true);
      fetch(fetchUrl, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
          return res.json();
        })
        .then((data) => {
          const payload = data.allStories || data.stories || data;
          setStories(Array.isArray(payload) ? payload : []);
        })
        .catch((err) => {
          console.error("Stories fetch failed:", err);
          setError("Could not load stories");
        })
        .finally(() => setLoading(false));
    }
  }, [initialStories, fetchUrl]);
  function openStory(username) {
    const arr = usersMap[username]?.stories || [];
    if (!arr.length) return;
    setActiveUsername(username);
    setActiveStories(arr);
    setActiveIndex(0);
    setProgressPercents(new Array(arr.length).fill(0));
    setViewerOpen(true);
    setIsPaused(false);
    setIsBuffering(false);
    setProgressDuration(defaultDuration);
    setTimeout(() => startProgress(0), 50);
  }

  function closeStory() {
    stopProgress();
    setViewerOpen(false);
    setActiveUsername(null);
    setActiveStories([]);
    setActiveIndex(0);
    storyMediaRefs.current = {};
    if (typeof onClose === "function") onClose();
  }

  // open story when parent provides `openUser` (wait for usersMap to be ready)
  useEffect(() => {
    if (!openUser) return;
    if (usersMap[openUser] && usersMap[openUser].stories && usersMap[openUser].stories.length) {
      openStory(openUser);
    }
  }, [openUser, usersMap]);

  function startProgress(index) {
    stopProgress();
    setProgressPercents((prev) => {
      const next = prev.slice(0, activeStories.length).map((v, i) => (i < index ? 100 : 0));
      while (next.length < activeStories.length) next.push(0);
      return next;
    });

    const mediaEl = storyMediaRefs.current[index];
    let duration = defaultDuration;
    if (mediaEl && mediaEl.tagName === "VIDEO" && mediaEl.duration && !Number.isNaN(mediaEl.duration)) {
      duration = Math.min(Math.max(mediaEl.duration * 1000, 2000), 30000);
    } else {
      duration = defaultDuration;
    }
    setProgressDuration(duration);

    const stepMs = Math.max(30, Math.round(duration / 200));
    let width = 0;
    progressIntervalRef.current = setInterval(() => {
      if (isPaused) return;
      width += 100 / (duration / stepMs);
      if (width >= 100) {
        setProgressPercents((prev) => {
          const updated = prev.slice();
          updated[index] = 100;
          return updated;
        });
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
        setTimeout(() => nextStory(), 120);
      } else {
        setProgressPercents((prev) => {
          const next = prev.slice();
          next[index] = Math.min(100, width);
          return next;
        });
      }
    }, stepMs);
  }

  function stopProgress() {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }

  function pauseProgress() {
    setIsPaused(true);
    stopProgress();
    const media = storyMediaRefs.current[activeIndex];
    if (media && media.tagName === "VIDEO") {
      try { media.pause(); } catch (e) {}
    }
  }

  function resumeProgress() {
    setIsPaused(false);
    const media = storyMediaRefs.current[activeIndex];
    if (media && media.tagName === "VIDEO") {
      setIsBuffering(true);
      media.play().then(() => setIsBuffering(false)).catch(() => setIsBuffering(false));
    }
    startProgress(activeIndex);
  }

  function showStoryAt(index) {
    if (index < 0 || index >= activeStories.length) return;
    const prevMedia = storyMediaRefs.current[activeIndex];
    if (prevMedia && prevMedia.tagName === "VIDEO") {
      try { prevMedia.pause(); } catch (e) {}
    }
    setActiveIndex(index);
    setIsBuffering(false);
    setProgressPercents((prev) => {
      const next = prev.slice();
      for (let i = 0; i < next.length; i++) {
        next[i] = i < index ? 100 : 0;
      }
      return next;
    });
    setTimeout(() => startProgress(index), 50);
    setIsPaused(false);
  }

  function nextStory() {
    if (activeIndex < activeStories.length - 1) {
      showStoryAt(activeIndex + 1);
    } else {
      const userList = usernamesOrdered;
      const currentUserIndex = userList.indexOf(activeUsername);
      if (currentUserIndex >= 0 && currentUserIndex < userList.length - 1) {
        openStory(userList[currentUserIndex + 1]);
      } else {
        closeStory();
      }
    }
  }

  function previousStory() {
    if (activeIndex > 0) {
      showStoryAt(activeIndex - 1);
    } else {
      const userList = usernamesOrdered;
      const currentUserIndex = userList.indexOf(activeUsername);
      if (currentUserIndex > 0) {
        const prevUser = userList[currentUserIndex - 1];
        openStory(prevUser);
        setTimeout(() => {
          const len = (usersMap[prevUser]?.stories || []).length;
          if (len > 0) showStoryAt(len - 1);
        }, 100);
      } else {
        closeStory();
      }
    }
  }

  function handleMediaClick() {
    const media = storyMediaRefs.current[activeIndex];
    if (!media) return;
    if (media.tagName === "VIDEO") {
      if (media.paused) {
        setIsBuffering(true);
        media.play().then(() => setIsBuffering(false)).catch(() => setIsBuffering(false));
        resumeProgress();
      } else {
        media.pause();
        pauseProgress();
      }
    } else {
      if (isPaused) resumeProgress(); else pauseProgress();
    }
  }

  async function toggleLike(storyId, currentlyLiked, setLocalLiked) {
    setLocalLiked(!currentlyLiked);
    try {
      const res = await fetch(`/stories/liked/${storyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Like API error");
      const data = await res.json();
      const final = typeof data.liked !== "undefined" ? !!data.liked : !currentlyLiked;
      setStories((prev) => prev.map((s) => (s._id === storyId ? { ...s, liked: final } : s)));
      setLocalLiked(final);
    } catch (err) {
      console.error("Like toggle failed", err);
      setLocalLiked(currentlyLiked);
    }
  }

  useEffect(() => {
    function onKey(e) {
      if (!viewerOpen) return;
      if (e.key === "ArrowRight") nextStory();
      else if (e.key === "ArrowLeft") previousStory();
      else if (e.key === "Escape") closeStory();
      else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        if (isPaused) resumeProgress(); else pauseProgress();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewerOpen, isPaused, activeIndex, activeStories, activeUsername, usersMap]);

  useEffect(() => () => stopProgress(), []);

  function attachMediaRef(index, el) {
    if (!el) return;
    storyMediaRefs.current[index] = el;
    if (el.tagName === "VIDEO") {
      el.addEventListener("waiting", () => setIsBuffering(true));
      el.addEventListener("playing", () => setIsBuffering(false));
      el.addEventListener("loadedmetadata", () => {
        if (index === activeIndex) {
          stopProgress();
          startProgress(index);
        }
      });
      el.addEventListener("play", () => setIsPaused(false));
      el.addEventListener("pause", () => setIsPaused(true));
    }
  }

  const uniqueUsers = useMemo(() => Object.values(usersMap).map((u) => ({ username: u.username, avatar: u.avatar })), [usersMap]);

  // Professional spinner with gradient
  const Spinner = () => (
    <div className="spinner-container">
      <div className="spinner">
        <div className="spinner-gradient"></div>
      </div>
      <div className="spinner-text">Loading stories...</div>
    </div>
  );

  const NoStories = () => (
    <div className="no-stories-container">
      <div className="no-stories-icon">✨</div>
      <div className="no-stories-title">No stories available</div>
      <div className="no-stories-subtitle">When users post stories, they'll appear here</div>
    </div>
  );

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="stories-app">
      {!hideGrid && (
        <>
          <div className="stories-header">
            <h1 className="stories-title">Stories</h1>
            <div className="stories-subtitle">See what's happening with people you follow</div>
          </div>

          {loading ? (
            <div className="loading-container">
              <Spinner />
            </div>
          ) : error ? (
            <div className="error-container">
              <div className="error-icon">⚠️</div>
              <div className="error-message">{error}</div>
              <button className="error-retry" onClick={() => window.location.reload()}>Try Again</button>
            </div>
          ) : uniqueUsers.length === 0 ? (
            <NoStories />
          ) : (
            <div className="stories-grid">
              {uniqueUsers.map((user) => (
                <div
                  key={user.username}
                  className="story-user-card"
                  onClick={() => openStory(user.username)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") openStory(user.username);
                  }}
                >
                  <div className="story-avatar-wrapper">
                    <div className="story-avatar-glow"></div>
                    <img 
                      src={user.avatar || "/api/placeholder/96/96"} 
                      alt={user.username} 
                      className="story-avatar" 
                      loading="lazy"
                    />
                    <div className="story-indicator"></div>
                  </div>
                  <div className="story-user-info">
                    <div className="story-username">{user.username}</div>
                    <div className="story-count">
                      {usersMap[user.username]?.stories.length || 0} story
                      {usersMap[user.username]?.stories.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Viewer Modal (always rendered so parent can hide grid and still show viewer) */}
      <div className={`story-viewer ${viewerOpen ? 'open' : ''}`} id="story-viewer" aria-hidden={!viewerOpen}>
        <div className="viewer-backdrop" onClick={closeStory}></div>

        <div className="viewer-content">
          {/* Progress Bars */}
          <div className="story-progress" id="story-progress-container">
            {(activeStories || []).map((s, i) => (
              <div className="progress-track" key={s._id || i}>
                <div 
                  className="progress-fill" 
                  id={`progress-${i}`} 
                  style={{ width: `${progressPercents[i] || 0}%` }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="story-header">
            <div className="user-info" id="story-user-info">
              <div className="user-avatar-container">
                <img 
                  src={activeStories[0]?.avatarUrl || "/api/placeholder/40/40"} 
                  alt={activeUsername} 
                  className="user-avatar" 
                />
              </div>
              <div className="user-details">
                <div className="username" id="story-username">{activeUsername}</div>
                <div className="post-time" id="story-time">
                  {activeStories[activeIndex] ? formatTime(activeStories[activeIndex].createdAt) : ''}
                </div>
              </div>
            </div>
            <div className="header-actions">
              <button 
                className="action-button pause-resume" 
                onClick={(e) => {
                  e.stopPropagation();
                  if (isPaused) resumeProgress(); else pauseProgress();
                }}
                aria-label={isPaused ? "Resume story" : "Pause story"}
              >
                {isPaused ? '▶️' : '⏸️'}
              </button>
              <button 
                className="action-button close" 
                onClick={closeStory}
                aria-label="Close story"
              >
                ×
              </button>
            </div>
          </div>

          {/* Story Content */}
          <div className="story-content" id="story-view-container" onClick={handleMediaClick}>
            {(activeStories || []).map((story, i) => {
              const isActive = i === activeIndex;
              const type = story.url && story.url.toLowerCase().includes(".mp4") ? "video" : "image";
              return (
                <div 
                  key={story._id || i} 
                  id={`story-image-${i}`} 
                  className={`story-media-wrapper ${isActive ? 'active' : ''}`}
                >
                  {type === "image" ? (
                    <img
                      src={story.url}
                      alt={`Story by ${activeUsername}`}
                      className="story-media"
                      ref={(el) => {
                        if (isActive) attachMediaRef(i, el);
                        else {
                          storyMediaRefs.current[i] = storyMediaRefs.current[i] || null;
                        }
                      }}
                      loading="eager"
                    />
                  ) : (
                    <video 
                      src={story.url} 
                      className="story-media" 
                      ref={(el) => attachMediaRef(i, el)} 
                      playsInline 
                      muted 
                      autoPlay={isActive}
                    />
                  )}
                  
                  {isActive && isBuffering && (
                    <div className="buffering-overlay">
                      <div className="buffering-spinner"></div>
                      <span>Buffering...</span>
                    </div>
                  )}
                  
                  {isActive && isPaused && !isBuffering && (
                    <div className="paused-overlay">
                      <div className="pause-icon">⏸️</div>
                      <span>Story Paused</span>
                    </div>
                  )}

                  <StoryLikeButton story={story} onToggle={(setLocal) => toggleLike(story._id || story.id, !!story.liked, setLocal)} />
                </div>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="navigation-controls">
            <button 
              className="nav-button prev" 
              onClick={(e) => { e.stopPropagation(); previousStory(); }}
              aria-label="Previous story"
            >
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
              </svg>
            </button>
            <button 
              className="nav-button next" 
              onClick={(e) => { e.stopPropagation(); nextStory(); }}
              aria-label="Next story"
            >
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
              </svg>
            </button>
          </div>

          {/* Story Counter */}
          <div className="story-counter">
            {activeIndex + 1} / {activeStories.length}
          </div>
        </div>
      </div>
    </div>
  );
}

// ... (keep all imports and main component code the same until the StoryLikeButton component)

/* Subcomponent for the like button */
function StoryLikeButton({ story, onToggle }) {
  const [liked, setLiked] = useState(!!story.liked);
  const [animating, setAnimating] = useState(false);

  useEffect(() => setLiked(!!story.liked), [story.liked]);

  const handleClick = (e) => {
    e.stopPropagation();
    const newLikedState = !liked;
    setLiked(newLikedState);
    setAnimating(true);
    onToggle(newLikedState); // Pass the new state directly
    setTimeout(() => setAnimating(false), 600);
  };

  return (
    <button 
      className={`story-like-button ${liked ? 'liked' : ''} ${animating ? 'animating' : ''}`} 
      type="button" 
      aria-pressed={liked} 
      title={liked ? "Unlike" : "Like"} 
      onClick={handleClick}
    >
      <svg viewBox="0 0 24 24" className="heart-icon" width="24" height="24" aria-hidden="true" focusable="false">
        <path 
          className="heart-outline" 
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
          fill={liked ? "#ef4444" : "none"} 
          stroke={liked ? "#ef4444" : "currentColor"} 
          strokeWidth="1.5"
        />
        <path 
          className="heart-filled" 
          d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3z" 
          fill="#ef4444" 
          opacity={liked ? 1 : 0}
        />
      </svg>
      <span className="like-particles">
        {[...Array(8)].map((_, i) => <span key={i} className="particle" style={{ '--i': i }}></span>)}
      </span>
    </button>
  );
}