import React, { useEffect, useMemo, useState } from 'react';
import { Bookmark, Heart, Share2, Sparkles, Star } from 'lucide-react';
import { useUserData } from '../providers/userData.jsx';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/KidsProfile.css';

const KidsProfile = () => {
  const { userData } = useUserData();
  const { username: targetUsername } = useParams();
  const navigate = useNavigate();
  const loggedInUsername = userData?.username;
  const ownProfile = loggedInUsername === targetUsername;

  const [details, setDetails] = useState({
    full_name: '',
    bio: '',
    pfp: '',
    display_name: '',
    links: [],
    liked: [],
    saved: [],
    visibility: '',
  });
  const [relationship, setRelationship] = useState('');
  const [loading, setLoading] = useState(true);

  const profileName =
    details.display_name || details.full_name || targetUsername || 'Kid Explorer';

  const favoriteCount = details.liked?.length || 0;
  const savedCount = details.saved?.length || 0;

  const previewCards = useMemo(
    () => [
      {
        key: 'favorites',
        title: 'Favorite Picks',
        icon: <Heart size={18} />,
        accent: 'pink',
        count: favoriteCount,
        subtitle:
          favoriteCount > 0
            ? 'Things you loved are waiting here.'
            : 'Start liking fun things to fill this shelf.',
      },
      {
        key: 'saved',
        title: 'Treasure Box',
        icon: <Bookmark size={18} />,
        accent: 'blue',
        count: savedCount,
        subtitle:
          savedCount > 0
            ? 'Saved adventures for another day.'
            : 'Save cool finds and they will show up here.',
      },
    ],
    [favoriteCount, savedCount],
  );

  const fetchBasic = async username => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/profile/getbasic/${username}`,
        { credentials: 'include' },
      );
      const data = await res.json();
      if (data.success) {
        setDetails(prev => ({ ...prev, ...data.details }));
      }
    } catch (err) {
      console.error('Basic fetch error', err);
    }
  };

  const fetchSensitive = async username => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/profile/sensitive/${username}`,
        { credentials: 'include' },
      );
      const data = await res.json();
      if (data.success) {
        setDetails(prev => ({ ...prev, ...data.details }));
      }
    } catch (err) {
      console.error('Sensitive fetch error', err);
    }
  };

  const isFriend = async username => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/isfriend/${username}`,
        { credentials: 'include' },
      );
      const data = await res.json();
      setRelationship(data.relationship || '');
    } catch (err) {
      console.error('Friend check error', err);
    }
  };

  useEffect(() => {
    if (!targetUsername) return;

    setLoading(true);
    Promise.all([fetchBasic(targetUsername), fetchSensitive(targetUsername)])
      .then(() => {
        if (!ownProfile) {
          return isFriend(targetUsername);
        }
        return null;
      })
      .finally(() => setLoading(false));
  }, [targetUsername, ownProfile]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Check out this profile!', url });
      } catch (err) {
        console.log('Share cancelled', err);
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copied!');
    }
  };

  const renderMediaGrid = (items, emptyText) => {
    if (!items?.length) {
      return <div className="kids-profile-empty">{emptyText}</div>;
    }

    return items.map(item => (
      <div key={item._id || item.id || item.url} className="kids-profile-preview-item">
        {item.type === 'Img' ? (
          <img src={item.url} alt="Preview" className="kids-profile-preview-media" />
        ) : (
          <video src={item.url} className="kids-profile-preview-media" muted />
        )}
      </div>
    ));
  };

  if (loading) {
    return <div className="kids-profile-loading">Building your colorful profile...</div>;
  }

  return (
    <div className="kids-profile-page">
      <div className="kids-profile-decor kids-profile-decor-one" />
      <div className="kids-profile-decor kids-profile-decor-two" />

      <div className="kids-profile-shell">
        <section className="kids-profile-hero">
          <div className="kids-profile-badge">
            <Sparkles size={16} />
            <span>Kids Space</span>
          </div>

          <div className="kids-profile-hero-main">
            <div className="kids-profile-avatar-ring">
              <img
                src={details.pfp || '/Images/default_user.jpeg'}
                alt={`${profileName} avatar`}
                className="kids-profile-avatar"
              />
            </div>

            <div className="kids-profile-copy">
              <p className="kids-profile-kicker">
                {ownProfile ? 'Welcome back!' : 'Say hello to'}
              </p>
              <h1 className="kids-profile-title">{profileName}</h1>
              <p className="kids-profile-username">@{targetUsername}</p>
              <p className="kids-profile-bio">
                {details.bio || 'This profile is all set for fun, safe exploring.'}
              </p>
            </div>
          </div>

          <div className="kids-profile-actions">
            {ownProfile ? (
              <button
                className="kids-profile-btn kids-profile-btn-secondary"
                onClick={handleShare}
              >
                <Share2 size={18} />
                <span>Share</span>
              </button>
            ) : (
              <>
                <button className="kids-profile-btn kids-profile-btn-primary">
                  <Star size={18} />
                  <span>{relationship || 'Follow'}</span>
                </button>
                <button
                  className="kids-profile-btn kids-profile-btn-secondary"
                  onClick={handleShare}
                >
                  <Share2 size={18} />
                  <span>Share</span>
                </button>
              </>
            )}
          </div>
        </section>

        {ownProfile && (
          <>
            <section className="kids-profile-glance">
              {previewCards.map(card => (
                <article
                  key={card.key}
                  className={`kids-profile-glance-card kids-profile-glance-${card.accent}`}
                >
                  <div className="kids-profile-glance-icon">{card.icon}</div>
                  <div className="kids-profile-glance-count">{card.count}</div>
                  <h2>{card.title}</h2>
                  <p>{card.subtitle}</p>
                </article>
              ))}
            </section>

            <section className="kids-profile-shelves">
              <article className="kids-profile-shelf">
                <div className="kids-profile-shelf-head">
                  <div>
                    <h3>Favorite Picks</h3>
                    <p>All your liked posts show up here.</p>
                  </div>
                </div>
                <div className="kids-profile-preview-grid">
                  {renderMediaGrid(
                    details.liked,
                    'Your favorites shelf is waiting for its first star.',
                  )}
                </div>
              </article>

              <article className="kids-profile-shelf">
                <div className="kids-profile-shelf-head">
                  <div>
                    <h3>Treasure Box</h3>
                    <p>All your saved posts stay here for later.</p>
                  </div>
                </div>
                <div className="kids-profile-preview-grid">
                  {renderMediaGrid(
                    details.saved,
                    'Save fun discoveries and they will appear here.',
                  )}
                </div>
              </article>
            </section>
          </>
        )}

        {!ownProfile && details.visibility === 'Private' && (
          <section className="kids-profile-note">
            This account is private.
          </section>
        )}
      </div>
    </div>
  );
};

export default KidsProfile;
