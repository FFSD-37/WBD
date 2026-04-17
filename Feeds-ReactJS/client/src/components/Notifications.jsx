import React, { useEffect, useState } from 'react';

/*
ISSUES/Improvements:
1. Better Responsive design for mobile devices.
2. Add "Mark all as read" button for convenience.
3. Implement real-time updates using WebSockets.
4. Add pagination or infinite scroll for large number of notifications.
5. Add delete notification option.
*/

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchAllNotification = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/GetAllNotifications`,
        {
          method: "GET",
          credentials: "include"
        },
      );
      const data = await res.json();
      if (data.success){
        setNotifications(data.notifications);
      }
      else{
        console.log("error fetching notifications")
      }
    } finally {
      setLoading(false);
    }
  };

  const markAllAsSeen = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/notifications/mark-seen`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        },
      );
      const data = await res.json();
      if (!res.ok || !data.success) return;
      setNotifications(prev => prev.map(n => ({ ...n, seen: true })));
    } catch (err) {
      console.error('Failed to mark notifications as seen', err);
    }
  };
  
  useEffect(() => {
    const init = async () => {
      await fetchAllNotification();
      await markAllAsSeen();
    };
    init();
  }, []);

  const acceptFollowRequest = async (notificationId, username) => {
    const previousNotifications = notifications;

    setNotifications(prev => prev.filter(n => n._id !== notificationId));

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/follow-request/accept/${username}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to accept request');
      }

      await fetchAllNotification();
    } catch (error) {
      console.error(error);
      const friendlyMessage = /internal server error/i.test(error.message || '')
        ? 'Could not accept follow request right now. Please try again.'
        : (error.message || 'Failed to accept follow request. Please try again.');
      alert(friendlyMessage);
      setNotifications(previousNotifications);
      await fetchAllNotification();
    }
  };

  const getNotificationDetails = noti => {
    const configs = {
      1: {
        icon: '👤',
        color: '#3b82f6',
        type: 'follow',
        message: (
          <>
            <span className="user-name">{noti.userInvolved}</span>
            <span> started following you</span>
          </>
        )
      },
      2: {
        icon: '❤️',
        color: '#ef4444',
        type: 'like',
        message: (
          <>
            <span className="user-name">{noti.userInvolved}</span>
            <span> liked your comment</span>
          </>
        )
      },
      3: {
        icon: '👍',
        color: '#a855f7',
        type: 'like',
        message: (
          <>
            <span className="user-name">{noti.userInvolved}</span>
            <span> liked your post</span>
          </>
        )
      },
      4: {
        icon: '🤝',
        color: '#f97316',
        type: 'request',
        message: (
          <>
            <span className="user-name">{noti.userInvolved}</span>
            <span> requested to follow you</span>
          </>
        )
      },
      5: {
        icon: '👁️',
        color: '#6366f1',
        type: 'view',
        message: (
          <>
            <span className="user-name">{noti.userInvolved}</span>
            <span> viewed your profile</span>
          </>
        )
      },
      6: {
        icon: '🪙',
        color: '#eab308',
        type: 'reward',
        message: (
          <>
            <span>You received </span>
            <span className="coin-amount">{noti.coin} coins</span>
          </>
        )
      },
      7: {
        icon: '👋',
        color: '#6b7280',
        type: 'unfollow',
        message: (
          <>
            <span className="user-name">{noti.userInvolved}</span>
            <span> unfollowed you</span>
          </>
        )
      },
      8: {
        icon: '💬',
        color: '#10b981',
        type: 'comment',
        message: (
          <>
            <span className="user-name">{noti.userInvolved}</span>
            <span> commented on your post</span>
          </>
        )
      },
      9: {
        icon: '❤️',
        color: '#ef4444',
        type: 'like',
        message: (
          <>
            <span className="user-name">{noti.userInvolved}</span>
            <span> liked your comment</span>
          </>
        )
      }
    };

    return configs[noti.msgSerial] || { icon: '📩', color: '#6b7280', type: 'other', message: 'New notification' };
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => getNotificationDetails(n).type === filter);

  return (
    <>
      <style>{`
        .notifications-container {
          max-height: 100px;
          padding: 2rem 1rem;
        }

        .notifications-wrapper {
          max-width: 1000px;
          margin: 0 auto;
        }

        .notifications-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border: 1px solid #e5e7eb;
          margin-bottom: 1.5rem;
          overflow: hidden;
        }

        .header-section {
          padding: 1.5rem 1.5rem;
          border-bottom: 1px solid #f3f4f6;
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-icon-box {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }

        .header-text h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 0.25rem;
        }

        .header-text p {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .header-actions button {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          background: transparent;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .header-actions button:hover {
          background: #f3f4f6;
        }

        .filter-section {
          padding: 0.75rem 1.5rem;
          background: #f9fafb;
          border-bottom: 1px solid #f3f4f6;
          overflow-x: auto;
        }

        .filter-tabs {
          display: flex;
          gap: 0.5rem;
          min-width: max-content;
        }

        .filter-tab {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          background: transparent;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          color: #6b7280;
        }

        .filter-tab:hover {
          background: rgba(255, 255, 255, 0.5);
          color: #111827;
        }

        .filter-tab.active {
          background: white;
          color: #111827;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .notifications-list {
          background: white;
          border-radius: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border: 1px solid #e5e7eb;
          overflow: hidden;
        }

        .notification-item {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #f3f4f6;
          transition: background-color 0.2s;
        }

        .notification-item.unseen {
          background: #eff6ff;
        }

        .notification-item:last-child {
          border-bottom: none;
        }

        .notification-item:hover {
          background: #f9fafb;
        }

        .notification-content-wrapper {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }

        .notification-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          flex-shrink: 0;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .notification-body {
          flex: 1;
          min-width: 0;
        }

        .notification-main {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }

        .notification-text {
          flex: 1;
        }

        .notification-message {
          font-size: 0.9375rem;
          line-height: 1.5;
          color: #374151;
        }

        .user-name {
          font-weight: 600;
          color: #111827;
        }

        .coin-amount {
          font-weight: 600;
          color: #eab308;
        }

        .notification-time {
          font-size: 0.8125rem;
          color: #9ca3af;
          margin-top: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .time-icon {
          width: 14px;
          height: 14px;
        }

        .follow-btn {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .follow-btn.primary {
          background: #3b82f6;
          color: white;
          box-shadow: 0 1px 3px rgba(59, 130, 246, 0.3);
        }

        .follow-btn.primary:hover {
          background: #2563eb;
          box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
        }

        .follow-btn.success {
          background: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
          cursor: default;
        }

        .check-icon {
          width: 16px;
          height: 16px;
        }

        .loading-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 5rem 1.5rem;
          text-align: center;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .loading-state p,
        .empty-state h3 {
          font-weight: 500;
          color: #6b7280;
          margin-top: 0.5rem;
        }

        .empty-icon {
          width: 80px;
          height: 80px;
          background: #f3f4f6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }

        .empty-state h3 {
          font-size: 1.125rem;
          color: #111827;
          margin-bottom: 0.5rem;
        }

        .empty-state p {
          font-size: 0.875rem;
          color: #6b7280;
          max-width: 400px;
        }

        @media (max-width: 768px) {
          .notifications-container {
            padding: 1rem 0.5rem;
          }

          .header-section {
            padding: 1.25rem 1rem;
          }

          .header-content {
            flex-direction: column;
            align-items: flex-start;
          }

          .header-text h1 {
            font-size: 1.25rem;
          }

          .filter-section {
            padding: 0.75rem 1rem;
          }

          .notification-item {
            padding: 1rem;
          }

          .notification-content-wrapper {
            flex-direction: column;
          }

          .notification-main {
            flex-direction: column;
          }

          .follow-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <div className="notifications-container">
        <div className="notifications-wrapper">
          <div className="notifications-card">
            <div className="header-section">
              <div className="header-content">
                <div className="header-left">
                  <div className="header-icon-box">
                    <span>🔔</span>
                  </div>
                  <div className="header-text">
                    <h1>Notifications</h1>
                    <p>{notifications.length} notification{notifications.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="filter-section">
              <div className="filter-tabs">
                {[
                  { key: 'all', label: 'All', icon: '📋' },
                  { key: 'follow', label: 'Follows', icon: '👤' },
                  { key: 'like', label: 'Likes', icon: '❤️' },
                  { key: 'comment', label: 'Comments', icon: '💬' },
                  { key: 'request', label: 'Requests', icon: '🤝' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`filter-tab ${filter === tab.key ? 'active' : ''}`}
                  >
                    <span>{tab.icon}</span> {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="notifications-list">
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading notifications...</p>
              </div>
            ) : filteredNotifications.length > 0 ? (
              filteredNotifications.map((noti, index) => {
                const { icon, color, message } = getNotificationDetails(noti);
                const timeAgo = getTimeAgo(noti.createdAt);

                return (
                  <div
                    key={noti._id || index}
                    className={`notification-item ${noti.seen ? '' : 'unseen'}`}
                  >
                    <div className="notification-content-wrapper">
                      <div className="notification-icon" style={{ backgroundColor: color }}>
                        <span>{icon}</span>
                      </div>

                      <div className="notification-body">
                        <div className="notification-main">
                          <div className="notification-text">
                            <div className="notification-message">
                              {message}
                            </div>
                            <div className="notification-time">
                              <svg className="time-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {timeAgo}
                            </div>
                          </div>

                          {noti.msgSerial === 4 && (
                            <button
                              onClick={() => acceptFollowRequest(noti._id, noti.userInvolved)}
                              disabled={noti.isFollowingBack}
                              className={`follow-btn ${noti.isFollowingBack ? 'success' : 'primary'}`}
                            >
                              {noti.isFollowingBack ? (
                                <>
                                  <svg className="check-icon" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  Accepted
                                </>
                              ) : (
                                'Accept'
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <span>🔔</span>
                </div>
                <h3>No notifications yet</h3>
                <p>When you receive notifications, they'll appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
