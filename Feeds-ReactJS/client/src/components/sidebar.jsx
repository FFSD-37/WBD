import React, { useEffect, useState } from 'react';
import './../styles/sidebar.css';
import { useUserData } from './../providers/userData.jsx';
import { useNavigate } from 'react-router-dom';

/*
ISSUES/Improvements:
1. When entering parental password, pressing 'Enter' key does not submit the form.
2. Add DailyUsage option.
*/

function Sidebar() {
  const { userData, setUserData } = useUserData();
  const navigate = useNavigate();

  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [unseenCounts, setUnseenCounts] = useState({ notifications: 0, chats: 0 });

  const toggleDropdown = () => {
    if (userData.type === 'Kids') {
      // If dropdown is open → close without password
      if (showDropdown) {
        setShowDropdown(false);
      }
      // If dropdown is closed → ask for parental password
      else {
        setShowPasswordModal(true);
      }
    } else {
      // Normal users
      setShowDropdown(!showDropdown);
    }
  };

  const toggleLogoutModal = () => setShowLogoutModal(prev => !prev);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [parentPass, setParentPass] = useState('');

  const checkParentalPassword = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/checkParentPassword`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: parentPass }),
          credentials: 'include',
        },
      );

      const data = await res.json();
      console.log(data);

      if (data.success) {
        setShowPasswordModal(!showPasswordModal);
        setShowDropdown(!showDropdown);
        setParentPass('');
      } else {
        alert(data.message || 'Incorrect password!');
        setShowPasswordModal(!showPasswordModal);
        setParentPass('');
      }
    } catch {
      alert('Error verifying password');
      setShowPasswordModal(!showPasswordModal);
      setParentPass('');
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      if (res.ok || res.status === 401) {
        setUserData({});
        navigate('/login', { replace: true });
      } else {
        console.error('Logout failed');
      }
    } catch (err) {
      console.error('Error logging out:', err);
    } finally {
      setTimeout(() => navigate('/login', { replace: true }), 300);
    }
  };

  const { username, channelName, profileUrl, type, isPremium } = userData || {};

  useEffect(() => {
    if (!type) return undefined;

    let mounted = true;
    let intervalId;

    const loadUnseenCounts = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/unseen-counts`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (!res.ok || !data.success || !mounted) return;
        setUnseenCounts({
          notifications: Number(data?.counts?.notifications || 0),
          chats: Number(data?.counts?.chats || 0),
        });
      } catch (err) {
        console.error('Failed to fetch unseen counts', err);
      }
    };

    loadUnseenCounts();
    intervalId = setInterval(loadUnseenCounts, 15000);
    window.addEventListener('focus', loadUnseenCounts);
    document.addEventListener('visibilitychange', loadUnseenCounts);

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('focus', loadUnseenCounts);
      document.removeEventListener('visibilitychange', loadUnseenCounts);
    };
  }, [type]);

  // Sidebar items
  const allItems = [
    { name: 'Home', href: '/home', icon: '/Images/Home.svg' },
    {
      name: 'Notifications',
      href: '/notifications',
      icon: '/Images/Notifications.svg',
    },
    { name: 'Create', href: '/create_post', icon: '/Images/Create.svg' },
    { name: 'Chat', href: '/chat', icon: '/Images/Chat.svg' },
    { name: 'Connect', href: '/connect', icon: '/Images/Connect.svg' },
    { name: 'Stories', href: '/stories', icon: '/Images/Stories.svg' },
    { name: 'Reels', href: '/reels', icon: '/Images/Reels.svg' },
    { name: 'Game', href: '/games', icon: '/Images/Game.svg' },
    { name: 'Premium', href: '/payment', icon: '/Images/Premium.svg' },
  ];

  // Filter out Premium if user is already premium
  const filteredNormalItems = allItems.filter(item => {
    if (item.name === 'Premium' && isPremium) return false;
    return true;
  });

  const channelItems = [
    { name: 'Home', href: '/home', icon: '/Images/Home.svg' },
    {
      name: 'Notifications',
      href: '/notifications',
      icon: '/Images/Notifications.svg',
    },
    { name: 'Create', href: '/create_post', icon: '/Images/Create.svg' },
    { name: 'Chat', href: '/chat', icon: '/Images/Chat.svg' },
    { name: 'Connect', href: '/connect', icon: '/Images/Connect.svg' },
    { name: 'Reels', href: '/reels', icon: '/Images/Reels.svg' },
  ];

  const kidsItems = allItems.filter(item =>
    ['Home', 'Connect', 'Reels', 'Game'].includes(item.name),
  );

  // Select which items to show
  const filteredItems =
    type === 'Kids'
      ? kidsItems
      : type === 'Channel'
        ? channelItems
        : filteredNormalItems;

  // Determine profile link
  const profileLink =
    type === 'Channel'
      ? `/channel/${channelName}`
      : type === 'Kids'
        ? `/kids-profile/${username}`
        : `/profile/${username}`;

  return (
    <>
      <div className="sidebar">
        {/* Main Nav Icons */}
        {filteredItems.map(item => {
          const badgeCount =
            item.name === 'Notifications'
              ? unseenCounts.notifications
              : item.name === 'Chat'
                ? unseenCounts.chats
                : 0;

          return (
          <div key={item.name} className="icon-container">
            <a href={item.href} className="nav-item">
              {badgeCount > 0 && <span className="sidebar-badge">{badgeCount > 99 ? '99+' : badgeCount}</span>}
              <img
                src={item.icon}
                alt={item.name}
                className="icon-img"
                width="30"
                height="30"
              />
            </a>
            <span className="sidebar_tooltip">{item.name}</span>
          </div>
          );
        })}

        {/* Menu Icon */}
        <div className="icon-container" onClick={toggleDropdown}>
          <div className="nav-item">
            <img
              src="/Images/Menu.svg"
              alt="Menu"
              className="icon-img"
              width="30"
              height="30"
              style={{ cursor: 'pointer' }}
            />
          </div>
          <span className="sidebar_tooltip">Menu</span>
        </div>

        {/* Profile Section */}
        {(username || channelName) && (
          <div className="profile">
            <a href={profileLink} className="nav-item profile-pic-anchor">
              <img
                src={profileUrl || '/Images/default_user.jpeg'}
                alt="Profile"
                className="sidebar-profile-pic"
              />
            </a>
          </div>
        )}

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="profile-dropdown show">
            {type === 'Channel' ? (
              <>
                <a href="/edit_channel">Edit Channel</a>
              </>
            ) : (
              <>
                <a href="/edit_profile">Edit Profile</a>
              </>
            )}
            {userData.type === 'Normal' && (
              <a href="/dailyUsage">See Daily Usage</a>
            )} 
            <a href="/settings">Settings</a>
            <button onClick={toggleLogoutModal}>Logout</button>
            <a href="/help">Help & Support</a>
            <a href="/DeleteAccount">
              {type === 'Channel' ? 'Delete Channel' : 'Delete Account'}
            </a>
          </div>
        )}
      </div>

      {showPasswordModal && (
        <div className="password-modal">
          <div className="password-box">
            <h3>Enter Parental Password</h3>
            <input
              type="password"
              placeholder="Parental Password"
              value={parentPass}
              onChange={e => setParentPass(e.target.value)}
            />
            <div className="btn-row">
              <button onClick={checkParentalPassword}>Submit</button>
              <button onClick={() => setShowPasswordModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Modal */}
      {showLogoutModal && (
        <div
          className="modal-overlay active"
          onClick={e => {
            if (e.target === e.currentTarget) toggleLogoutModal();
          }}
        >
          <div className="logout-modal">
            <h2>Confirm Logout</h2>
            <p>Are you sure you want to log out from your account?</p>
            <div className="buttons">
              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
              <button className="cancel-btn" onClick={toggleLogoutModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;
