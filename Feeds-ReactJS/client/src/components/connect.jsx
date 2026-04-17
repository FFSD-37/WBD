import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserData } from './../providers/userData.jsx';
import './../styles/connect.css';
import {
  FaGlobe,
  FaBook,
  FaFilm,
  FaGamepad,
  FaLaugh,
  FaNewspaper,
  FaLaptopCode,
  FaVideo,
  FaTv,
  FaFutbol,
  FaLeaf,
  FaMusic,
  FaBullhorn,
  FaDumbbell,
  FaHeart,
} from 'react-icons/fa';

/*
ISSUES/Improvements:
1. Add pagination or infinite scroll for large result sets.
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

const Connect = () => {
  const { userData } = useUserData();
  const navigate = useNavigate();

  const [initialized, setInitialized] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [mode, setMode] = useState(null);
  const [filter, setFilter] = useState('All');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const categoryIcons = {
    All: <FaGlobe color="#9e9e9e" />,
    Entertainment: <FaTv color="#ffd740" />,
    Comedy: <FaLaugh color="#ff9800" />,
    Education: <FaBook color="#3f51b5" />,
    Science: <FaBook color="#4caf50" />,
    Tech: <FaLaptopCode color="#8e24aa" />,
    Gaming: <FaGamepad color="#00ff99" />,
    Animations: <FaFilm color="#ff9800" />,
    Memes: <FaLaugh color="#ff4081" />,
    Music: <FaMusic color="#00b0ff" />,
    Sports: <FaFutbol color="#4caf50" />,
    Fitness: <FaDumbbell color="#f44336" />,
    Lifestyle: <FaHeart color="#e91e63" />,
    Fashion: <FaHeart color="#ff80ab" />,
    Beauty: <FaHeart color="#ffb3c6" />,
    Food: <FaHeart color="#ffa726" />,
    Travel: <FaVideo color="#ff5722" />,
    Vlog: <FaVideo color="#ff7043" />,
    Nature: <FaLeaf color="#43a047" />,
    DIY: <FaBook color="#8d6e63" />,
    Art: <FaBook color="#ba68c8" />,
    Photography: <FaVideo color="#64b5f6" />,
    Business: <FaBullhorn color="#cddc39" />,
    Finance: <FaBullhorn color="#9ccc65" />,
    Marketing: <FaBullhorn color="#cddc39" />,
    News: <FaNewspaper color="#00bcd4" />,
    Movies: <FaFilm color="#ff7043" />,
    Pets: <FaHeart color="#ffcc80" />,
    Automotive: <FaBullhorn color="#90a4ae" />,
  };

  const categories = [
    'All',
    'Entertainment',
    'Comedy',
    'Education',
    'Science',
    'Tech',
    'Gaming',
    'Animations',
    'Memes',
    'Music',
    'Sports',
    'Fitness',
    'Lifestyle',
    'Fashion',
    'Beauty',
    'Food',
    'Travel',
    'Vlog',
    'Nature',
    'DIY',
    'Art',
    'Photography',
    'Business',
    'Finance',
    'Marketing',
    'News',
    'Movies',
    'Pets',
    'Automotive',
  ];

  useEffect(() => {
    if (userData && userData.type) {
      setMode(userData.type === 'Normal' ? 'users' : 'channels');
      setInitialized(true);
    }
  }, [userData]);

  const loadDefault = async () => {
    try {
      const data = await graphqlRequest(
        `
          query ConnectFeed($mode: String) {
            connectFeed(mode: $mode) {
              mode
              items {
                type
                username
                name
                avatarUrl
                logo
                display_name
                category
                members
                followers
                following
                visibility
                isFollowing
                requested
              }
            }
          }
        `,
        { mode },
      );
      const result = data?.connectFeed;
      setItems(result?.items || []);
    } catch (e) {
      console.error('loadDefault error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialized || !mode) return;

    const run = async () => {
      const queryValue = searchTerm.trim();

      if (mode === 'users' && queryValue === '') {
        setLoading(true);
        await loadDefault();
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await graphqlRequest(
          `
            query SearchConnect($query: String, $type: String, $category: String) {
              searchConnect(query: $query, type: $type, category: $category) {
                mode
                message
                items {
                  type
                  username
                  name
                  avatarUrl
                  logo
                  display_name
                  category
                  members
                  followers
                  following
                  visibility
                  isFollowing
                  requested
                }
              }
            }
          `,
          {
            query: queryValue,
            type: mode === 'channels' ? 'channel' : 'user',
            category: filter,
          },
        );

        setItems(data?.searchConnect?.items || []);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    };

    const delay = setTimeout(run, 300);
    return () => clearTimeout(delay);
  }, [searchTerm, filter, mode, initialized]);

  const handleFollowToggle = async (target, targetType, state) => {
    try {
      const data = await graphqlRequest(
        `
          mutation ToggleFollowEntity(
            $target: String!
            $targetType: String!
            $currentState: String
          ) {
            toggleFollowEntity(
              target: $target
              targetType: $targetType
              currentState: $currentState
            ) {
              success
              status
              message
              target
              targetType
            }
          }
        `,
        {
          target,
          targetType,
          currentState: state,
        },
      );

      const result = data?.toggleFollowEntity;

      setItems(prev =>
        prev.map(i => {
          if (i.username === target || i.name === target) {
            const updated = { ...i };

            if (result?.status === 'requested') {
              updated.requested = true;
              updated.isFollowing = false;
            }

            if (result?.status === 'request_canceled') {
              updated.requested = false;
              updated.isFollowing = false;
            }

            if (result?.status === 'following') {
              updated.isFollowing = true;
              updated.requested = false;
            }

            if (result?.status === 'unfollowed') {
              updated.isFollowing = false;
              updated.requested = false;
            }

            return updated;
          }
          return i;
        }),
      );
    } catch (err) {
      console.error('Follow toggle failed:', err);
    }
  };

  const getButtonLabel = item =>
    item.requested ? 'Requested' : item.isFollowing ? 'Following' : 'Follow';

  const getButtonClass = item =>
    item.requested
      ? 'connect-btn-requested'
      : item.isFollowing
        ? 'connect-btn-following'
        : 'connect-btn-default';

  if (!initialized) {
    return (
      <div className="connect-loading">
        <p>Loading...</p>
      </div>
    );
  }

  const handleCardClick = item => {
    if (item.type === 'Channel') navigate(`/channel/${item.name}`);
    else navigate(`/profile/${item.username}`);
  };

  return (
    <div className="connect-body">
      <div className="connect-container">
        <div className="connect-header">
          <h1 className="connect-title">
            {userData?.type === 'Normal'
              ? mode === 'users'
                ? '👥 Connect with People'
                : '📺 Discover Channels'
              : '📺 Channels You Follow'}
          </h1>

          {userData?.type === 'Normal' && (
            <div className="connect-toggle">
              <button
                className={`connect-toggle-btn ${mode === 'users' ? 'active' : ''}`}
                onClick={() => setMode('users')}
              >
                People
              </button>

              <button
                className={`connect-toggle-btn ${mode === 'channels' ? 'active' : ''}`}
                onClick={() => setMode('channels')}
              >
                Channels
              </button>
            </div>
          )}
        </div>

        <div className="connect-searchbar">
          <input
            type="text"
            className="connect-search-input"
            placeholder={
              mode === 'channels'
                ? 'Search by channel name...'
                : 'Search by username or name...'
            }
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />

          {mode === 'channels' && (
            <select
              className="connect-filter"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className={`connect-results ${loading ? '' : 'connect-fade show'}`}>
          {loading ? (
            <div className="connect-loading">Loading...</div>
          ) : items.length === 0 ? (
            <div className="connect-empty">No results found</div>
          ) : (
            <ul className="connect-list">
              {items.map((item, i) => (
                <li
                  key={i}
                  className="connect-item"
                  onClick={() => handleCardClick(item)}
                >
                  <div className="connect-left">
                    <img
                      src={item.avatarUrl || item.logo || null}
                      alt={item.username || item.name}
                      className="connect-avatar"
                    />

                    <div className="connect-info">
                      <div className="connect-name">
                        {item.display_name || item.name}
                        {item.category && (
                          <span className="connect-category-icon">
                            {categoryIcons[item.category]}
                          </span>
                        )}
                      </div>

                      <div className="connect-username">
                        @{item.username || item.name}
                      </div>

                      <div className="connect-stats">
                        {item.type === 'Channel' ? (
                          <span>{item.members} Members</span>
                        ) : (
                          <>
                            <span>{item.followers} Followers</span>
                            <span>{item.following} Following</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {(userData?.type === 'Normal' || userData?.type === 'Kids') && (
                    <button
                      className={`connect-follow-btn ${getButtonClass(item)}`}
                      onClick={e => {
                        e.stopPropagation();
                        handleFollowToggle(
                          item.username || item.name,
                          item.type,
                          item.isFollowing
                            ? 'following'
                            : item.requested
                              ? 'requested'
                              : 'none',
                        );
                      }}
                    >
                      {getButtonLabel(item)}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Connect;
