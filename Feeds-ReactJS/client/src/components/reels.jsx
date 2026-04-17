import { useEffect, useState, useRef } from 'react';
import { useUserData } from './../providers/userData.jsx';
import './../styles/Reels.css';

/*
ISSUES/Improvements:
1. Fix the audio issue.
2. Better responsiveness for various screen sizes.
3. When i click like/save/mute button on a paused reel, it should not start playing automatically.
*/

const REPORT_OPTIONS = [
  "I just don't like it",
  'Bullying or unwanted contact',
  'Suicide, self-injury or eating disorders',
  'Violence, hate or exploitation',
  'Selling or promoting restricted items',
  'Nudity or sexual activity',
  'Scam, fraud or spam',
  'False information',
];

function normalizeComment(raw) {
  const name = raw.name || raw.username || 'unknown';
  const avatarUrl = raw.avatarUrl || raw.avatarUrl || '';
  const text = raw.text || raw.body || '';
  const repliesRaw = raw.replies || raw.reply_array || [];
  const replies = Array.isArray(repliesRaw)
    ? repliesRaw.map(r => normalizeComment(r))
    : [];
  return { _id: raw._id || raw.id || '', name, avatarUrl, text, replies, raw };
}

export default function Reels() {
  const { userData } = useUserData();
  const [reels, setReels] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const [openComments, setOpenComments] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const isLoadingMore = useRef(false);

  const [menuOpenId, setMenuOpenId] = useState(null);
  const [reportState, setReportState] = useState({
    open: false,
    postId: null,
    postType: null,
  });

  // Start unmuted by default; browser autoplay block is expected until user interacts
  // User can toggle with 'm' key or mute button
  const [muted, setMuted] = useState(false);
  const isKids = userData?.type === 'Kids';

  const videoRefs = useRef([]);
  const touchStartY = useRef(null);
  const navLock = useRef(false);
  const containerRef = useRef(null);
  const playTokenRef = useRef(0);
  const visibilityDebounce = useRef(null);

  // Load emoji picker script once
  useEffect(() => {
    const s = document.createElement('script');
    s.type = 'module';
    s.src = 'https://cdn.jsdelivr.net/npm/emoji-picker-element@^1/index.js';
    document.body.appendChild(s);
    return () => {
      try {
        document.body.removeChild(s);
      } catch {}
    };
  }, []);

  useEffect(() => {
    loadReels(page);
  }, [page]);

  const loadReels = async pg => {
    if (isLoadingMore.current || !hasMore) return;
    isLoadingMore.current = true;

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/reels?page=${pg}&limit=5`,
        { credentials: 'include' },
      );
      const data = await res.json();

      if (data.success) {
        setReels(prev => [...prev, ...data.reels]);
        setHasMore(data.hasMore);
      }
    } catch (err) {
      console.error('Pagination load error:', err);
    } finally {
      isLoadingMore.current = false;
      setLoading(false);
    }
  };

  // Ensure refs array length matches reels to avoid stale refs
  useEffect(() => {
    if (!videoRefs.current) videoRefs.current = [];
    if (videoRefs.current.length > reels.length) {
      videoRefs.current = videoRefs.current.slice(0, reels.length);
    }
  }, [reels]);

  // Robust playback: only play the active video, pause/reset others.
  useEffect(() => {
    const myToken = ++playTokenRef.current;

    const ensureReady = v =>
      new Promise(resolve => {
        if (!v) return resolve(false);
        if (v.readyState >= 3) return resolve(true);
        const onReady = () => {
          cleanup();
          resolve(true);
        };
        const onError = () => {
          cleanup();
          resolve(false);
        };
        const cleanup = () => {
          v.removeEventListener('canplaythrough', onReady);
          v.removeEventListener('loadeddata', onReady);
          v.removeEventListener('error', onError);
        };
        v.addEventListener('canplaythrough', onReady, { once: true });
        v.addEventListener('loadeddata', onReady, { once: true });
        v.addEventListener('error', onError, { once: true });
        setTimeout(() => {
          cleanup();
          resolve(v.readyState >= 2);
        }, 2500);
      });

    (async () => {
      // Pause and reset non-active videos
      for (let i = 0; i < videoRefs.current.length; i++) {
        const vv = videoRefs.current[i];
        if (!vv) continue;
        if (i !== activeIndex) {
          try { vv.pause(); } catch {}
          try { vv.currentTime = 0; } catch {}
          vv.dataset.playing = 'false';
        }
      }

      const activeV = videoRefs.current[activeIndex];
      if (!activeV) return;
      if (myToken !== playTokenRef.current) return;

      activeV.muted = muted;
      const ready = await ensureReady(activeV);
      if (myToken !== playTokenRef.current) return;

      try {
        await activeV.play();
        activeV.dataset.playing = 'true';
      } catch (err) {
        // If play fails, video may be loading; just mark and move on
        activeV.dataset.playing = 'false';
      }
    })();

    return () => { playTokenRef.current++; };
  }, [activeIndex, muted, reels]);

  // Intersection observer: pick the most visible slide and debounce updates
  useEffect(() => {
    if (!containerRef.current) return;
    const root = null;
    const options = { root, rootMargin: '0px', threshold: Array.from({ length: 21 }, (_, i) => i / 20) };

    const observer = new IntersectionObserver(entries => {
      let best = null;
      for (const e of entries) if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
      if (!best) return;
      const slide = best.target.closest('.reels-slide');
      if (!slide) return;
      const slides = Array.from(containerRef.current.querySelectorAll('.reels-slide'));
      const index = slides.indexOf(slide);
      if (index === -1) return;

      if (visibilityDebounce.current) clearTimeout(visibilityDebounce.current);
      visibilityDebounce.current = setTimeout(() => {
        if (best.intersectionRatio >= 0.35) setActiveIndex(index);
      }, 80);
    }, options);

    const slides = containerRef.current.querySelectorAll('.reels-slide');
    slides.forEach(s => observer.observe(s));

    return () => {
      observer.disconnect();
      if (visibilityDebounce.current) clearTimeout(visibilityDebounce.current);
    };
  }, [reels]);

  useEffect(() => {
    if (activeIndex === reels.length - 1 && hasMore) {
      setPage(p => p + 1);
    }
  }, [activeIndex, reels, hasMore]);

  // Navigation locking to prevent rapid multi-steps (wheel/keys/touch)
  const lockNav = (duration = 350) => {
    navLock.current = true;
    setTimeout(() => (navLock.current = false), duration);
  };

  const nextReel = () => {
    if (navLock.current) return;
    setActiveIndex(p => (p + 1 < reels.length ? p + 1 : p));
    lockNav();
  };
  const prevReel = () => {
    if (navLock.current) return;
    setActiveIndex(p => (p - 1 >= 0 ? p - 1 : p));
    lockNav();
  };

  // Wheel navigation -> route through next/prev to get debounce
  useEffect(() => {
    const wheel = e => {
      if (e.deltaY > 0) nextReel();
      else prevReel();
    };
    window.addEventListener('wheel', wheel, { passive: true });
    return () => window.removeEventListener('wheel', wheel);
  }, [reels]);

  // Keyboard nav + Escape handling
  useEffect(() => {
    const keys = e => {
      const k = e.key;
      if (k.toLowerCase() === 'm') {
        setMuted(m => !m);
        return;
      }
      if (k === 'ArrowDown') {
        nextReel();
        return;
      }
      if (k === 'ArrowUp') {
        prevReel();
        return;
      }
      if (k === 'Escape') {
        setOpenComments(null);
        setMenuOpenId(null);
        setShowEmoji(false);
        setReportState({ open: false, postId: null, postType: null });
        setReplyTo(null);
      }
    };
    window.addEventListener('keydown', keys);
    return () => window.removeEventListener('keydown', keys);
  }, [reels]);

  // Load comments for open reel
  useEffect(() => {
    if (!openComments) return;
    const reel = reels.find(r => r._id === openComments);
    if (!reel) return;
    let cancelled = false;
    const loadComments = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/reelcomments/${openComments}?postType=${reel.postType}`,
          { credentials: 'include' },
        );
        const data = await res.json();
        if (
          !cancelled &&
          data &&
          data.success &&
          Array.isArray(data.comments)
        ) {
          setComments(data.comments.map(normalizeComment));
        } else if (!cancelled) {
          setComments([]);
        }
      } catch (err) {
        console.error('Comments fetch error:', err);
        if (!cancelled) setComments([]);
      }
    };
    loadComments();
    return () => {
      cancelled = true;
    };
  }, [openComments, reels]);

  // Hook emoji clicks when picker visible
  useEffect(() => {
    if (!showEmoji) return;
    const onEmoji = e => setCommentText(p => p + e.detail.unicode);
    const picker = document.querySelector('#reels-emoji-picker');
    if (picker) picker.addEventListener('emoji-click', onEmoji);
    return () => {
      if (picker) picker.removeEventListener('emoji-click', onEmoji);
    };
  }, [showEmoji]);

  // (nextReel/prevReel moved above to use navLock)

  const onTouchStart = e => (touchStartY.current = e.touches[0].clientY);
  const onTouchMove = e => {
    if (!touchStartY.current) return;
    const diff = touchStartY.current - e.touches[0].clientY;
    if (diff > 60) nextReel();
    if (diff < -60) prevReel();
    touchStartY.current = null;
  };

  const animateHeart = index => {
    const el = document.getElementById(`reels-heart-${index}`);
    if (!el) return;
    el.classList.add('reels-show-heart');
    setTimeout(() => el.classList.remove('reels-show-heart'), 600);
  };

  // Toggle like/unlike
  const toggleLike = async (reel, index) => {
    animateHeart(index);
    try {
      if (reel._liked) {
        const res = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/unlikereel`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId: reel._id, postType: reel.postType }),
          },
        );
        const data = await res.json();
        if (data && data.success) {
          setReels(prev =>
            prev.map(r =>
              r._id === reel._id
                ? { ...r, likes: data.likes, _liked: false }
                : r,
            ),
          );
        }
      } else {
        const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/likereel`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: reel._id, postType: reel.postType }),
        });
        const data = await res.json();
        if (data && data.success) {
          setReels(prev =>
            prev.map(r =>
              r._id === reel._id
                ? { ...r, likes: data.likes, _liked: true }
                : r,
            ),
          );
        }
      }
    } catch (err) {
      console.error('Like toggle error:', err);
    }
  };

  // Toggle save/unsave
  const toggleSave = async reel => {
    try {
      if (reel._saved) {
        const res = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/unsavereel`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId: reel._id, postType: reel.postType }),
          },
        );
        const data = await res.json();
        if (data && data.success) {
          setReels(prev =>
            prev.map(r => (r._id === reel._id ? { ...r, _saved: false } : r)),
          );
        }
      } else {
        const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/savereel`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: reel._id, postType: reel.postType }),
        });
        const data = await res.json();
        if (data && data.success) {
          setReels(prev =>
            prev.map(r => (r._id === reel._id ? { ...r, _saved: true } : r)),
          );
        }
      }
    } catch (err) {
      console.error('Save toggle error:', err);
    }
  };



  const toggleMute = () => {
    setMuted(m => {
      const newVal = !m;
      const video = videoRefs.current[activeIndex];
      if (video) video.muted = newVal;
      return newVal;
    });
  };

  // Submit a new top-level comment
  const handleSubmitComment = async () => {
    if (!commentText.trim() || !openComments) return;
    const reel = reels.find(r => r._id === openComments);
    if (!reel) return;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/commentreel`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postId: reel._id,
            postType: reel.postType,
            text: commentText,
          }),
        },
      );
      const data = await res.json();
      if (data && data.success) {
        const norm = normalizeComment(data.comment);
        setComments(p => [norm, ...p]);
        setCommentText('');
        setReplyTo(null);
      } else {
        console.error('Comment failed', data);
      }
    } catch (err) {
      console.error('Comment error:', err);
    }
  };

  // Submit a reply to a comment
  const handleSubmitReply = async () => {
    if (!commentText.trim() || !replyTo) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/replyreel`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentCommentId: replyTo._id,
          postType:
            replyTo.raw?.type === 'Channel' || replyTo.raw?.type === 'channel'
              ? 'channel'
              : 'normal',
          text: commentText,
        }),
      });
      const data = await res.json();
      if (data && data.success) {
        const replyNorm = normalizeComment(data.reply);
        setComments(prev =>
          prev.map(c =>
            c._id === replyTo._id
              ? { ...c, replies: [...(c.replies || []), replyNorm] }
              : c,
          ),
        );
        setReplyTo(null);
        setCommentText('');
      } else {
        console.error('Reply failed', data);
      }
    } catch (err) {
      console.error('Reply error:', err);
    }
  };

  const openMenuFor = id => setMenuOpenId(prev => (prev === id ? null : id));

  const doCopy = async text => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      alert('Copy failed');
    }
    setMenuOpenId(null);
  };

  const doShare = async url => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Feed Reel', url });
      } catch {}
    } else {
      alert('Share not supported. Copy the link instead.');
    }
    setMenuOpenId(null);
  };

  const openReportModal = (postId, postType) =>
    setReportState({ open: true, postId, postType });

  const submitReport = async reason => {
    try {
      await fetch(`${import.meta.env.VITE_SERVER_URL}/report_post`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: reportState.postId,
          postType: reportState.postType,
          reason,
        }),
      });
      alert('Reported');
    } catch (e) {
      console.error(e);
      alert('Report failed');
    } finally {
      setReportState({ open: false, postId: null, postType: null });
    }
  };

  if (loading) return <div className="reels-loading">Loading...</div>;

  return (
    <div
      ref={containerRef}
      className="reels-container"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
    >
      {reels.map((reel, i) => {
        const active = i === activeIndex;
        const commentsOpen = openComments === reel._id;
        const menuOpen = menuOpenId === reel._id;
        return (
          <div
            key={reel._id}
            className={`reels-slide ${active ? 'reels-active' : ''} ${commentsOpen ? 'reels-comments-open' : ''}`}
          >
            <div id={`reels-heart-${i}`} className="reels-heart">
              <img src="/Images/liked.svg"/>
            </div>

            <video
              ref={el => (videoRefs.current[i] = el)}
              className="reels-video"
              src={reel.url}
              preload="auto"
              muted={muted}
              loop
              playsInline
              onClick={e => {
                if (e.target.paused) e.target.play();
                else e.target.pause();
              }}
            />

            <div className="reels-sidebar">
              <button
                className="reels-btn"
                onClick={() => toggleLike(reel, i)}
                aria-pressed={!!reel._liked}
                title={reel._liked ? 'Unlike' : 'Like'}
              >
                {reel._liked ? <img src="/Images/liked.svg"/> : <img src="/Images/unliked.svg"/>} {reel.likes ?? 0}
              </button>

              {!isKids && (
                <button
                  className="reels-btn"
                  onClick={() => {
                    setOpenComments(reel._id);
                    setMenuOpenId(null);
                  }}
                >
                  <img src="/Images/comment.svg"/>
                </button>
              )}

              <button
                className="reels-btn"
                onClick={() => toggleSave(reel)}
                title={reel._saved ? 'Unsave' : 'Save'}
              >
                {reel._saved ? <img src="/Images/saved.svg"/> : <img src="/Images/unsaved.svg"/>}
              </button>

              <button className="reels-btn" onClick={toggleMute}>
                {muted ? '🔇' : '🔊'}
              </button>

              <button
                className="reels-btn"
                onClick={() => openMenuFor(reel._id)}
                aria-expanded={menuOpen}
              >
                ⋯
              </button>

              {menuOpen && (
                <div className="reels-menu" role="menu">
                  <p onClick={() => doCopy(reel.url)}>Copy Link</p>
                  <p onClick={() => doShare(reel.url)}>Share</p>
                  <p onClick={() => openReportModal(reel._id, reel.postType)}>
                    Report
                  </p>
                  <p onClick={() => setMenuOpenId(null)}>Cancel</p>
                </div>
              )}
            </div>

            <div className="reels-info">
              <p
                className="reels-author"
                onClick={() => {
                  if (reel.postType === 'channel') {
                    window.location.href = `/channel/${reel.channel}`;
                  } else {
                    window.location.href = `/profile/${reel.author}`;
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                {reel.postType === 'normal'
                  ? '@' + reel.author
                  : '#' + reel.channel}
              </p>
              <p className="reels-caption">{reel.content}</p>
            </div>

            <div
              className={`reels-comments-panel ${commentsOpen ? 'reels-comments-active' : ''}`}
            >
              {commentsOpen && (
                <div className="reels-comments-container">
                  <div className="reels-comments-header">
                    <p>Comments</p>
                    <button
                      onClick={() => {
                        setOpenComments(null);
                        setReplyTo(null);
                        setCommentText('');
                      }}
                    >
                      ×
                    </button>
                  </div>

                  <div className="reels-comments-list">
                    {comments.length === 0 && (
                      <p className="reels-no-comments">No comments yet</p>
                    )}
                    {comments.map(c => (
                      <div key={c._id} className="reels-comment-block">
                        <img
                          src={c.avatarUrl}
                          className="reels-comment-avatar"
                          alt="avatar"
                        />
                        <div className="reels-comment-body">
                          <strong>@{c.name}</strong>
                          <p>{c.text}</p>
                          <span
                            className="reels-reply-btn"
                            onClick={() => {
                              setReplyTo(c);
                              setCommentText('');
                            }}
                          >
                            Reply
                          </span>

                          {c.replies && c.replies.length > 0 && (
                            <div className="reels-replies">
                              {c.replies.map(r => (
                                <div key={r._id} className="reels-reply-item">
                                  <img
                                    src={r.avatarUrl}
                                    className="reels-reply-avatar"
                                    alt="avatar"
                                  />
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
                    ))}
                  </div>

                  <div className="reels-comment-input-box">
                    {replyTo && (
                      <div className="reels-replying-to">
                        Replying to @{replyTo.name}
                        <span onClick={() => setReplyTo(null)}>×</span>
                      </div>
                    )}

                    <button
                      className="reels-emoji-btn"
                      onClick={() => setShowEmoji(s => !s)}
                    >
                      😀
                    </button>

                    <input
                      className="reels-comment-input"
                      value={commentText}
                      placeholder="Add a comment..."
                      onChange={e => setCommentText(e.target.value)}
                    />

                    <button
                      className="reels-send-btn"
                      onClick={() =>
                        replyTo ? handleSubmitReply() : handleSubmitComment()
                      }
                    >
                      Post
                    </button>
                  </div>

                  {showEmoji && (
                    <emoji-picker id="reels-emoji-picker"></emoji-picker>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {reportState.open && (
        <div
          className="reels-report-overlay"
          onClick={() =>
            setReportState({ open: false, postId: null, postType: null })
          }
        >
          <div
            className="reels-report-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="reels-report-header">
              <span>Report</span>
              <button
                onClick={() =>
                  setReportState({ open: false, postId: null, postType: null })
                }
              >
                ×
              </button>
            </div>
            <p className="reels-report-title">
              Why are you reporting this post?
            </p>
            <ul className="reels-report-options">
              {REPORT_OPTIONS.map(opt => (
                <li key={opt} onClick={() => submitReport(opt)}>
                  {opt}
                  <span>›</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
