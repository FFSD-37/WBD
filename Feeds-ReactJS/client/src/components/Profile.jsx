import React, { useEffect, useState } from 'react';
import { Settings, Grid, Heart, Bookmark, Archive, Flag, Ban } from 'lucide-react';
import { useUserData } from '../providers/userData.jsx';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/ProfilePage.css';

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState('posts');
  const { userData } = useUserData();
  const { username: targetUsername } = useParams();
  const navigate = useNavigate();

  const viewerType = userData?.type;
  const viewerUsername = userData?.username;
  const viewerIsChannel = viewerType === 'Channel';
  const ownProfile = !viewerIsChannel && viewerUsername === targetUsername;

  const [fullName, setFullName] = useState('');
  const [pfp, setPfp] = useState('');
  const [bio, setBio] = useState('');
  const [profileType, setProfileType] = useState('');
  const [visibility, setVisibility] = useState('');
  const [links, setLinks] = useState([]);
  const [displayName, setDisplayName] = useState('');
  const [posts, setPosts] = useState([]);
  const [liked, setLiked] = useState([]);
  const [saved, setSaved] = useState([]);
  const [archived, setArchived] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [followings, setFollowings] = useState([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayType, setOverlayType] = useState('');
  const [relationship, setRelationship] = useState('');
  const [href, setHref] = useState('');
  const [canFollow, setCanFollow] = useState(false);
  const [relationshipReason, setRelationshipReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState({
    isOwnProfile: false,
    blockedByTarget: false,
    viewerBlockedTarget: false,
    kidsBoundary: false,
    canViewPosts: false,
    canViewSocial: false,
  });

  const handleShare = async (username) => {
    const url = `http://localhost:5173/profile/${username}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Check out this profile', url });
      } catch (err) {
        console.log('Share cancelled', err);
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const fetchBasic = async (username) => {
    const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/profile/getbasic/${username}`, {
      method: 'GET',
      credentials: 'include',
    });
    const data = await res.json();
    if (!data.success) return;

    const details = data.details;
    setFullName(details.full_name || '');
    setPfp(details.pfp || '');
    setBio(details.bio || '');
    setProfileType(details.type || '');
    setVisibility(details.visibility || '');
    setLinks(details.links || []);
    setDisplayName(details.display_name || '');
    if (details.access) {
      setAccess((prev) => ({ ...prev, ...details.access }));
    }
  };

  const fetchSensitive = async (username) => {
    const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/profile/sensitive/${username}`, {
      method: 'GET',
      credentials: 'include',
    });
    const data = await res.json();
    if (!data.success) return;

    const details = data.details || {};
    setFollowers(details.followers || []);
    setFollowings(details.followings || []);
    setPosts(details.posts || []);
    setSaved(details.saved || []);
    setLiked(details.liked || []);
    setArchived(details.archived || []);
    if (details.access) {
      setAccess((prev) => ({ ...prev, ...details.access }));
    }
  };

  const isFriend = async (username) => {
    const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/isfriend/${username}`, {
      method: 'GET',
      credentials: 'include',
    });
    const data = await res.json();
    setRelationship(data.relationship || '');
    setHref(data.href || '');
    setCanFollow(Boolean(data.canFollow));
    setRelationshipReason(data.reason || '');
  };

  useEffect(() => {
    if (viewerType === 'Kids' && ownProfile) {
      navigate(`/kids-profile/${targetUsername}`, { replace: true });
      return;
    }

    if (!targetUsername) return;
    setLoading(true);
    Promise.all([fetchBasic(targetUsername), fetchSensitive(targetUsername)])
      .then(async () => {
        if (!ownProfile) await isFriend(targetUsername);
      })
      .finally(() => setLoading(false));
  }, [targetUsername, ownProfile, viewerType, navigate]);

  useEffect(() => {
    if (!ownProfile) setActiveTab('posts');
  }, [ownProfile]);

  const openFollowers = () => {
    setOverlayType('followers');
    setShowOverlay(true);
  };

  const openFollowings = () => {
    setOverlayType('followings');
    setShowOverlay(true);
  };

  const closeOverlay = () => {
    setShowOverlay(false);
    setOverlayType('');
  };

  const handleBlockUser = async () => {
    const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/block/${targetUsername}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    alert(`User ${data.flag} successfully`);
    window.location.href = '/home';
  };

  const handleReportUser = async () => {
    try {
      const reason =
        window.prompt('Why are you reporting this user?', 'Inappropriate behavior') ||
        'Inappropriate behavior';

      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/report/${encodeURIComponent(targetUsername)}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        },
      );
      const data = await res.json();
      if (data.success) {
        alert(`User reported - id: ${data.reportId}`);
      } else {
        alert(data.message || 'Failed to report user');
      }
    } catch (err) {
      console.error('Error reporting user:', err);
      alert('Failed to report user');
    }
  };

  const action = async () => {
    if (!href) return;
    const res = await fetch(`${import.meta.env.VITE_SERVER_URL}${href}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (data.success) {
      if (data.status === 'requested') {
        setRelationship('Requested');
        setHref(`/unrequest/${targetUsername}`);
      } else if (data.status === 'following' || data.status === 'friend') {
        setRelationship('Unfollow');
        setHref(`/unfollow/${targetUsername}`);
      } else if (data.status === 'request_canceled' || data.status === 'unfollowed') {
        setRelationship('Follow');
        setHref(`/follow/${targetUsername}`);
      }
      await Promise.all([isFriend(targetUsername), fetchSensitive(targetUsername)]);
    } else {
      alert(data.message || 'Action failed. Please try again.');
    }
  };

  const blockedByTarget = access.blockedByTarget || relationship === 'Blocked';
  const viewerBlockedTarget = access.viewerBlockedTarget || relationshipReason === 'You have blocked this user.';
  const kidsBoundary =
    access.kidsBoundary ||
    (!ownProfile && ((viewerType === 'Kids' && profileType !== 'Kids') || (viewerType !== 'Kids' && profileType === 'Kids')));

  const canSeeContent =
    !blockedByTarget &&
    !viewerBlockedTarget &&
    !kidsBoundary &&
    (ownProfile || access.canViewPosts || visibility === 'Public' || relationship === 'Unfollow');

  const canSeeSocial = !viewerIsChannel && !blockedByTarget && !viewerBlockedTarget && !kidsBoundary && (ownProfile || access.canViewSocial);
  const canShowFollow = !ownProfile && !viewerIsChannel && !blockedByTarget && !viewerBlockedTarget && !kidsBoundary;
  const canShowChat =
    !ownProfile &&
    viewerType === 'Normal' &&
    profileType === 'Normal' &&
    !blockedByTarget &&
    !viewerBlockedTarget &&
    !kidsBoundary;

  const getContent = () => {
    if (!ownProfile) return posts;
    switch (activeTab) {
      case 'posts':
        return posts;
      case 'liked':
        return liked;
      case 'saved':
        return saved;
      case 'archived':
        return archived;
      default:
        return posts;
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        <header className="profile-header">
          <h2 className="profile-username">{displayName} <span className="profile-slug">- {targetUsername}</span></h2>
          {ownProfile ? (
            <button className="profile-settings-btn" onClick={() => navigate('/settings')} aria-label="settings">
              <Settings size={18} />
            </button>
          ) : (
            !viewerIsChannel && (
              <div className="profile-action-icons">
                <button className="profile-icon-btn" title="Report this user" onClick={handleReportUser}><Flag size={16} /></button>
                <button className="profile-icon-btn" title="Block this user" onClick={handleBlockUser}><Ban size={16} /></button>
              </div>
            )
          )}
        </header>

        <section className="profile-top">
          <div className="profile-avatar-wrap">
            <img className="profile-avatar" src={pfp || ''} alt={`${displayName || targetUsername} avatar`} />
          </div>

          <div className="profile-stats">
            <div className="profile-stat">
              <div className="profile-stat-num">{canSeeContent ? posts.length + (ownProfile ? archived.length : 0) : '-'}</div>
              <div className="profile-stat-label">Posts</div>
            </div>
            <div className="profile-stat" onClick={canSeeSocial ? openFollowers : undefined}>
              <div className="profile-stat-num">{canSeeSocial ? followers.length : '-'}</div>
              <div className="profile-stat-label">Followers</div>
            </div>
            <div className="profile-stat" onClick={canSeeSocial ? openFollowings : undefined}>
              <div className="profile-stat-num">{canSeeSocial ? followings.length : '-'}</div>
              <div className="profile-stat-label">Following</div>
            </div>
          </div>
        </section>

        <section className="profile-bio">
          <h3 className="profile-display">{fullName}</h3>
          <p className="profile-bio-text">{bio}</p>
          {links.length > 0 && (
            <div className="profile-links">
              {links.map((link, index) => (
                <p key={index} className="profile-link-item"><a href={link} target="_blank" rel="noopener noreferrer">{link}</a></p>
              ))}
            </div>
          )}
        </section>

        <div className="profile-actions">
          {ownProfile ? (
            <>
              <button className="profile-btn primary" onClick={() => navigate('/edit_profile')}>Edit Profile</button>
              <button className="profile-btn" onClick={() => handleShare(targetUsername)}>Share Profile</button>
            </>
          ) : canShowFollow ? (
            <>
              <button className="profile-btn primary" onClick={action} disabled={!canFollow || !href}>
                {(canFollow && (relationship || 'Follow')) || 'Follow'}
              </button>
              {canShowChat && (
                <button
                  className="profile-btn"
                  onClick={() =>
                    navigate(
                      `/chat?target=${encodeURIComponent(targetUsername)}&targetType=Normal`,
                    )
                  }
                >
                  Chat
                </button>
              )}
              <button className="profile-btn" onClick={() => handleShare(targetUsername)}>Share Profile</button>
            </>
          ) : (
            <>
              {canShowChat && (
                <button
                  className="profile-btn"
                  onClick={() =>
                    navigate(
                      `/chat?target=${encodeURIComponent(targetUsername)}&targetType=Normal`,
                    )
                  }
                >
                  Chat
                </button>
              )}
              <button className="profile-btn" onClick={() => handleShare(targetUsername)}>Share Profile</button>
            </>
          )}
        </div>

        {loading ? (
          <div className="profile-private">Loading...</div>
        ) : canSeeContent ? (
          <>
            <nav className="profile-tabs">
              <button className={`profile-tab ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}><Grid size={16} /> <span>Posts</span></button>
              {ownProfile && (
                <>
                  <button className={`profile-tab ${activeTab === 'liked' ? 'active' : ''}`} onClick={() => setActiveTab('liked')}><Heart size={16} /> <span>Liked</span></button>
                  <button className={`profile-tab ${activeTab === 'saved' ? 'active' : ''}`} onClick={() => setActiveTab('saved')}><Bookmark size={16} /> <span>Saved</span></button>
                  <button className={`profile-tab ${activeTab === 'archived' ? 'active' : ''}`} onClick={() => setActiveTab('archived')}><Archive size={16} /> <span>Archived</span></button>
                </>
              )}
            </nav>

            <div className="profile-grid">
              {getContent().length === 0 ? (
                <div className="profile-empty">No {ownProfile ? activeTab : 'posts'} yet</div>
              ) : (
                getContent().map((post) => (
                  <div key={post.id} className="profile-grid-item">
                    {post.type === 'Img' ? (
                      <img src={post.url} alt="Post" className="profile-grid-media" />
                    ) : (
                      <video src={post.url} className="profile-grid-media" />
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        ) : viewerBlockedTarget ? (
          <div className="profile-private">
            You blocked this user.
            {!viewerIsChannel && (
              <div style={{ marginTop: '12px' }}>
                <button className="profile-btn" onClick={handleBlockUser}>Unblock User</button>
              </div>
            )}
          </div>
        ) : blockedByTarget ? (
          <div className="profile-private">You are blocked by this user.</div>
        ) : kidsBoundary ? (
          <div className="profile-private">This profile is restricted. Kids and non-kids accounts cannot view or follow each other.</div>
        ) : viewerIsChannel && visibility === 'Private' ? (
          <div className="profile-private">This account is private.</div>
        ) : (
          <div className="profile-private">This account is private.<br />Follow to see their posts.</div>
        )}

        {!loading && relationshipReason && !canFollow && canShowFollow && (
          <div className="profile-private">{relationshipReason}</div>
        )}
      </div>

      {showOverlay && canSeeSocial && (
        <div className="profile-overlay" role="dialog">
          <div className="profile-overlay-content">
            <h3>{overlayType === 'followers' ? 'Followers' : 'Following'}</h3>
            <button className="profile-close-btn" onClick={closeOverlay}>x</button>
            <div className="profile-overlay-list">
              {(overlayType === 'followers' ? followers : followings).map((user, index) => (
                <div key={index} className="profile-overlay-user" onClick={() => { closeOverlay(); navigate(`/profile/${user.username}`); }}>{user.username}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
