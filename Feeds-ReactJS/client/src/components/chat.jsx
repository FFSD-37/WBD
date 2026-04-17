import { useEffect, useState, useRef, useCallback } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import '../styles/chat.css';
import { useUserData } from '../providers/userData';
import socket from '../socket';
import EmojiPicker from 'emoji-picker-react';
import { HexColorPicker } from 'react-colorful';

const normalizeType = type =>
  type === 'Channel' ? 'Channel' : type === 'Kids' ? 'Kids' : 'Normal';

const parseChatTimestamp = value => {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);

  const raw = String(value || '').trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const parsed = new Date(Number(raw));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const sortMessagesChronologically = msgs =>
  [...msgs].sort((left, right) => {
    const leftDate = parseChatTimestamp(left?.dateTime || left?.createdAt);
    const rightDate = parseChatTimestamp(right?.dateTime || right?.createdAt);

    const leftTime = leftDate?.getTime?.() ?? 0;
    const rightTime = rightDate?.getTime?.() ?? 0;

    if (leftTime !== rightTime) return leftTime - rightTime;

    const leftId = String(left?._id || '');
    const rightId = String(right?._id || '');
    return leftId.localeCompare(rightId);
  });

export default function ChatPage() {
  const { userData } = useUserData();
  const [searchParams] = useSearchParams();
  const [activeChat, setActiveChat] = useState(null);
  const [chatCacheStatus, setChatCacheStatus] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [friends, setFriends] = useState([]);
  const chatBoxRef = useRef(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiRef = useRef(null);
  const [showColor, setShowColor] = useState(false);
  const [bgColor, setBgColor] = useState('#020617');
  const colorRef = useRef(null);
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);
  const [messageMenuId, setMessageMenuId] = useState(null);

  const selfName =
    userData?.type === 'Channel' ? userData?.channelName : userData?.username;
  const selfType = normalizeType(userData?.type);
  const canInitiate = selfType === 'Normal';

  const scrollBottom = useCallback(() => {
    const el = chatBoxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const markConversationSeen = useCallback(async friend => {
    if (!friend?.username) return;
    try {
      await fetch(
        `${import.meta.env.VITE_SERVER_URL}/chat/${encodeURIComponent(friend.username)}/seen?targetType=${encodeURIComponent(friend.type)}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        },
      );
    } catch (err) {
      console.error('Failed to mark chat as seen', err);
    }
  }, []);

  useEffect(() => {
    const onReceive = msg => {
      if (normalizeType(msg.fromType) === 'Kids') return;
      if (msg.from !== selfName) {
        setFriends(prev => {
          const exists = prev.some(
            f =>
              f.username === msg.from &&
              normalizeType(f.type) === normalizeType(msg.fromType),
          );
          if (exists) return prev;
          return [
            {
              username: msg.from,
              type: normalizeType(msg.fromType),
              avatarUrl: '/Images/default_user.jpeg',
            },
            ...prev,
          ];
        });
      }
      if (!activeChat) return;
      if (msg.from === activeChat.username && normalizeType(msg.fromType) === activeChat.type) {
        setMessages(prev => sortMessagesChronologically([...prev, msg]));
        markConversationSeen(activeChat);
        setTimeout(scrollBottom, 30);
      }
    };

    const onDeleted = data => {
      if (!activeChat) return;
      if (data.withUser === activeChat.username && normalizeType(data.withType) === activeChat.type) {
        setMessages([]);
        setChatCacheStatus(null);
      }
    };

    socket.on('receiveMessage', onReceive);
    socket.on('chatDeleted', onDeleted);
    return () => {
      socket.off('receiveMessage', onReceive);
      socket.off('chatDeleted', onDeleted);
    };
  }, [activeChat, scrollBottom, selfName, markConversationSeen]);

  useEffect(() => {
    async function loadFriends() {
      try {
        const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/friends`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        setFriends(data.friends || []);
      } catch (err) {
        console.error('Failed to load friends', err);
      }
    }

    loadFriends();
  }, []);

  const loadMessages = async friend => {
    if (!friend?.username) return;
    setActiveChat(friend);
    setChatCacheStatus(null);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/chat/${encodeURIComponent(friend.username)}?targetType=${encodeURIComponent(friend.type)}`,
        {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        },
      );
      const data = await res.json();
      setMessages(sortMessagesChronologically(data.chats || []));
      setChatCacheStatus(data.cache || null);
      markConversationSeen(friend);
      setTimeout(scrollBottom, 50);
    } catch (err) {
      console.error('Failed to fetch chat history', err);
      setChatCacheStatus(null);
    }
  };

  useEffect(() => {
    const target = searchParams.get('target');
    if (!target || !selfName) return;
    const targetType = normalizeType(searchParams.get('targetType'));
    if (targetType === 'Kids') return;

    const existing = friends.find(
      f => f.username === target && normalizeType(f.type) === targetType,
    );

    if (existing) {
      loadMessages(existing);
      return;
    }

    if (!canInitiate) return;

    const transientFriend = {
      username: target,
      type: targetType,
      avatarUrl: '/Images/default_user.jpeg',
    };
    setFriends(prev => {
      const already = prev.some(
        f => f.username === target && normalizeType(f.type) === targetType,
      );
      return already ? prev : [transientFriend, ...prev];
    });
    loadMessages(transientFriend);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, friends.length, selfName, canInitiate]);

  const sendMessage = () => {
    if (!input.trim() || !activeChat || !selfName) return;
    if (selfType === 'Channel') {
      const allowed = friends.some(
        f =>
          f.username === activeChat.username &&
          normalizeType(f.type) === normalizeType(activeChat.type),
      );
      if (!allowed) return;
    }

    const now = new Date();
    const date = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const time = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const dateTime = `${date} ${time}`;

    const newMsg = {
      text: input,
      from: selfName,
      fromType: selfType,
      to: activeChat.username,
      toType: activeChat.type,
      dateTime,
    };

    socket.emit('sendMessage', {
      to: activeChat.username,
      toType: activeChat.type,
      text: input,
      dateTime,
    });

    setMessages(prev => sortMessagesChronologically([...prev, newMsg]));
    setInput('');
    setTimeout(scrollBottom, 30);
  };

  const deleteCurrentChat = async () => {
    if (!activeChat) return;
    if (!window.confirm(`Delete all chats with ${activeChat.username}?`)) return;

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/chat/${encodeURIComponent(activeChat.username)}?targetType=${encodeURIComponent(activeChat.type)}`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        },
      );
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed');

      socket.emit('deleteChat', {
        withUser: activeChat.username,
        withType: activeChat.type,
      });

      setMessages([]);
      setChatCacheStatus(null);
    } catch (err) {
      alert(err.message || 'Failed to delete chat');
    }
  };

  const reportChatMessage = async msg => {
    if (!msg?._id) {
      alert('This message cannot be reported yet. Please refresh and try again.');
      return;
    }

    const reason = window.prompt('Reason for reporting this chat message?');
    if (!reason || !reason.trim()) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/report_chat`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: msg._id,
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Chat reported - id: ${data.reportId}`);
      } else {
        alert(data.message || 'Failed to report chat');
      }
    } catch (err) {
      console.error('Failed to report chat', err);
      alert('Failed to report chat');
    }
  };

  const handleReplyToMessage = msg => {
    if (!msg?.from) return;
    setInput(prev => `@${msg.from} ${prev}`.trimStart());
    setMessageMenuId(null);
  };

  const groupByDate = msgs => {
    const sortedMessages = sortMessagesChronologically(msgs);
    const map = {};
    sortedMessages.forEach(m => {
      const parsed = parseChatTimestamp(m.dateTime || m.createdAt);
      const d = parsed ? parsed.toDateString() : 'Unknown Date';
      if (!map[d]) map[d] = [];
      map[d].push(m);
    });
    return map;
  };

  useEffect(() => {
    const saved = localStorage.getItem('chatBg');
    if (saved) {
      document.documentElement.style.setProperty('--chat-bg', saved);
      if (!saved.startsWith('url(')) setBgColor(saved);
    } else {
      document.documentElement.style.setProperty('--chat-bg', bgColor);
    }
  }, [bgColor]);

  useEffect(() => {
    const close = e => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  useEffect(() => {
    const close = e => {
      if (colorRef.current && !colorRef.current.contains(e.target)) {
        setShowColor(false);
      }
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  useEffect(() => {
    const closeMessageMenu = e => {
      if (!e.target.closest('.chat-message-actions')) {
        setMessageMenuId(null);
      }
    };
    document.addEventListener('click', closeMessageMenu);
    return () => document.removeEventListener('click', closeMessageMenu);
  }, []);

  useEffect(() => {
    const onKeyDown = e => {
      if (e.key === 'Escape') {
        setShowEmoji(false);
        setShowColor(false);
        setMessageMenuId(null);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  if (selfType === 'Kids') {
    return <Navigate to="/home" />;
  }

  const cacheStatusLabel = activeChat && chatCacheStatus
    ? chatCacheStatus.source === 'redis'
      ? `Showing cached chat from Redis${chatCacheStatus.verified ? ' (validated)' : ''}`
      : chatCacheStatus.source === 'mongodb'
        ? chatCacheStatus.stored
          ? `Loaded from MongoDB and refreshed Redis${chatCacheStatus.verified ? ' (validated)' : ''}`
          : `Loaded from MongoDB${chatCacheStatus.reason ? `, Redis ${chatCacheStatus.reason}` : ''}`
        : null
    : null;

  return (
    <div style={{ display: 'flex', height: '100vh', width: '90vw' }}>
      <div className="chat-list">
        <div className="chat-me">{selfName}</div>

        {friends.map(friend => (
          <div
            key={`${friend.type}-${friend.username}`}
            className={`chat-user ${
              activeChat?.username === friend.username &&
              normalizeType(activeChat?.type) === normalizeType(friend.type)
                ? 'active'
                : ''
            }`}
            onClick={() =>
              loadMessages({
                username: friend.username,
                avatarUrl: friend.avatarUrl,
                type: normalizeType(friend.type),
              })
            }
          >
            <img src={friend.avatarUrl || '/Images/default_user.jpeg'} alt="" />
            <span>{friend.username}</span>
            <small className="chat-type-tag">{normalizeType(friend.type)}</small>
          </div>
        ))}

        <a href="/home" className="chat-back-button">
          ← Back to Home
        </a>
      </div>

      <div className="chat-area">
        <div className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="chat-toggle" onClick={() => setShowSidebarMobile(true)}>
              ☰
            </button>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span>{activeChat ? `${activeChat.username} (${activeChat.type})` : 'Chat'}</span>
              {cacheStatusLabel && (
                <small style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
                  {cacheStatusLabel}
                </small>
              )}
            </div>
          </div>
          <div className="chat-bg-controls">
            {activeChat && (
              <button className="chat-delete-btn" onClick={deleteCurrentChat}>
                Delete Chat
              </button>
            )}
            <select
              onChange={e => {
                const v = `url(${e.target.value})`;
                document.documentElement.style.setProperty('--chat-bg', v);
                localStorage.setItem('chatBg', v);
              }}
            >
            <option value="https://img.freepik.com/free-vector/night-ocean-landscape-full-moon-stars-shine_107791-7397.jpg?semt=ais_hybrid&w=740">
              🌃 Night Scene
            </option>
            <option value="https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1200&h=800&fit=crop">
              🌙 Night Sky
            </option>
            <option value="https://images.unsplash.com/photo-1444080748397-f442aa95c3e5?w=1200&h=800&fit=crop">
              💜 Purple Gradient
            </option>
            <option value="https://images.unsplash.com/photo-1557672172-298e090d0f80?w=1200&h=800&fit=crop">
              ⬛ Dark Minimal
            </option>
            <option value="https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&h=800&fit=crop">
              🌊 Ocean Blue
            </option>
            <option value="https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=1200&h=800&fit=crop">
              🌅 Sunset
            </option>
            <option value="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=800&fit=crop">
              🌲 Forest
            </option>
            <option value="https://images.unsplash.com/photo-1533709752211-118fcffe3312?w=1200&h=800&fit=crop">
              ✨ Lights
            </option>
            </select>
            <div className="chat-color-wrapper" ref={colorRef}>
              <button
                className="chat-color-btn"
                onClick={e => {
                  e.stopPropagation();
                  setShowEmoji(false);
                  setShowColor(p => !p);
                }}
                title="Pick background color"
              >
                🎨
              </button>
              {showColor && (
                <div className="chat-color-popover">
                  <HexColorPicker
                    color={bgColor}
                    onChange={c => {
                      setBgColor(c);
                      document.documentElement.style.setProperty('--chat-bg', c);
                      localStorage.setItem('chatBg', c);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="chat-messages" ref={chatBoxRef}>
          {!activeChat ? (
            <div className="chat-empty-state">Select a user/channel to start chatting</div>
          ) : messages.length === 0 ? (
            <div className="chat-empty-state">No messages yet. Start the conversation.</div>
          ) : (
            Object.entries(groupByDate(messages)).map(([date, msgs]) => (
              <div key={date} className="chat-date-group">
                <div className="chat-date-separator">{date}</div>
                {msgs.map((msg, i) => (
                  <div
                    key={i}
                    className={`chat-message ${
                      msg.from === selfName && normalizeType(msg.fromType) === selfType
                        ? 'sent'
                        : 'received'
                    }`}
                  >
                    <div className="chat-bubble">
                      <div>{msg.text}</div>
                      <div className="chat-timestamp-inline">
                        {(msg.dateTime || msg.createdAt).toString().split(' ').slice(-2).join(' ')}
                      </div>
                      {!(msg.from === selfName && normalizeType(msg.fromType) === selfType) && (
                        <div className="chat-message-actions">
                          <button
                            type="button"
                            className="chat-message-menu-btn"
                            onClick={() =>
                              setMessageMenuId(prev =>
                                prev === msg._id ? null : msg._id,
                              )
                            }
                            aria-label="Message options"
                          >
                            ⋮
                          </button>
                          {messageMenuId === msg._id && (
                            <div className="chat-message-menu">
                              <button
                                type="button"
                                className="chat-message-menu-item"
                                onClick={() => handleReplyToMessage(msg)}
                              >
                                Reply
                              </button>
                              <button
                                type="button"
                                className="chat-message-menu-item danger"
                                onClick={() => {
                                  reportChatMessage(msg);
                                  setMessageMenuId(null);
                                }}
                              >
                                Report
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {activeChat && (
          <div className="chat-controls">
            <div className="chat-input-area">
              <div className="chat-emoji-wrapper" ref={emojiRef}>
                <button
                  className="chat-emoji-btn"
                  onClick={e => {
                    e.stopPropagation();
                    setShowColor(false);
                    setShowEmoji(p => !p);
                  }}
                >
                  😊
                </button>
                {showEmoji && (
                  <div className="chat-emoji-popover">
                    <EmojiPicker
                      theme="dark"
                      onEmojiClick={e => setInput(prev => prev + e.emoji)}
                      searchDisabled={false}
                      previewConfig={{ showPreview: false }}
                    />
                  </div>
                )}
              </div>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </div>
        )}
      </div>

      {showSidebarMobile && (
        <div className={`chat-list mobile-open`}>
          <button className="chat-mobile-close" onClick={() => setShowSidebarMobile(false)}>
            ✕
          </button>
          <div className="chat-me">{selfName}</div>
          {friends.map(friend => (
            <div
              key={`mobile-${friend.type}-${friend.username}`}
              className={`chat-user ${
                activeChat?.username === friend.username &&
                normalizeType(activeChat?.type) === normalizeType(friend.type)
                  ? 'active'
                  : ''
              }`}
              onClick={() => {
                loadMessages({
                  username: friend.username,
                  avatarUrl: friend.avatarUrl,
                  type: normalizeType(friend.type),
                });
                if (window.innerWidth <= 640) setShowSidebarMobile(false);
              }}
            >
              <img src={friend.avatarUrl || '/Images/default_user.jpeg'} alt="" />
              <span>{friend.username}</span>
              <small className="chat-type-tag">{normalizeType(friend.type)}</small>
            </div>
          ))}
          <a href="/home" className="chat-back-button">
            ← Back to Home
          </a>
        </div>
      )}
    </div>
  );
}
