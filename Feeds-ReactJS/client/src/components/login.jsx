import React, { useEffect, useState } from 'react';
import './../styles/login.css';

export default function Login() {
  const [role, setRole] = useState('normal');
  const [identifierMode, setIdentifierMode] = useState('email');
  const [serverMessage, setServerMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const [values, setValues] = useState({
    childEmail: '',
    parentPassword: '',
    identifier: '',
    password: '',
    channelName: '',
    adminName: '',
    channelPassword: '',
  });

  const [visiblePasswords, setVisiblePasswords] = useState({
    parentPassword: false,
    password: false,
    channelPassword: false,
  });

  const roleTitle = {
    kids: 'Child Account',
    normal: 'Standard Account',
    channel: 'Channel Account',
  };

  // Handle responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (role !== 'normal') setIdentifierMode('email');
    setShowAlert(false);
    setServerMessage('');
  }, [role]);

  const onChange = e => {
    const { name, value } = e.target;
    setValues(s => ({ ...s, [name]: value }));
  };

  const togglePasswordVisibility = key => {
    setVisiblePasswords(s => ({ ...s, [key]: !s[key] }));
  };

  // Handle Enter key press
  const handleKeyPress = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    const payload = {};
    if (role === 'kids') {
      payload.childEmail = values.childEmail;
      payload.parentPassword = values.parentPassword;
      payload.userTypeiden = 'parent';
    } else if (role === 'normal') {
      payload.identifier = values.identifier;
      payload.password = values.password;
      payload.userTypeiden =
        identifierMode === 'username' ? 'Username' : 'Email';
    } else if (role === 'channel') {
      payload.channelName = values.channelName;
      payload.adminName = values.adminName;
      payload.channelPassword = values.channelPassword;
      payload.userTypeiden = 'channel';
    }

    payload.type = roleTitle[role];
    console.log(payload);

    try {
      const res = await fetch('http://localhost:3000/atin_job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const data = await res.json();
      if (data && data.success) {
        if (data.redirect) window.location.href = data.redirect;
        else window.location.href = '/home';
      } else {
        setServerMessage(
          (data && data.reason) || 'Login failed. Please check credentials.',
        );
        setShowAlert(true);
      }
    } catch (err) {
      console.error('Login error:', err);
      setServerMessage('An error occurred. Please try again.');
      setShowAlert(true);
    }
  };

  const roleIcons = {
    kids: '👶',
    normal: '👤',
    channel: '📺',
  };

  return (
    <div className="login-wrap" onKeyDown={handleKeyPress}>
      <div className="login-container">
        {/* Left Side - Role Selection */}
        <div className="login-left-panel">
          <div className="login-heading">
            <h1>Welcome Back</h1>
            <p>Select your account type to continue</p>
          </div>

          {/* Dynamic role selector based on screen size */}
          {isMobile ? (
            <div className="login-role-dropdown">
              <label htmlFor="role-select">Account Type</label>
              <select
                id="role-select"
                value={role}
                onChange={e => setRole(e.target.value)}
                className="login-select"
              >
                <option value="kids">👶 Child Account</option>
                <option value="normal">👤 Standard Account</option>
                <option value="channel">📺 Channel Account</option>
              </select>
            </div>
          ) : (
            <div className="login-roles">
              <div
                className={`login-role ${role === 'kids' ? 'login-active' : ''}`}
                onClick={() => setRole('kids')}
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setRole('kids')}
              >
                <span className="login-icon">{roleIcons.kids}</span>
                <div className="login-role-content">
                  <div className="login-title">Child Account</div>
                  <div className="login-desc">
                    Restricted portal with guardian approval
                  </div>
                </div>
              </div>

              <div
                className={`login-role ${role === 'normal' ? 'login-active' : ''}`}
                onClick={() => setRole('normal')}
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setRole('normal')}
              >
                <span className="login-icon">{roleIcons.normal}</span>
                <div className="login-role-content">
                  <div className="login-title">Standard Account</div>
                  <div className="login-desc">Personal login for all users</div>
                </div>
              </div>

              <div
                className={`login-role ${role === 'channel' ? 'login-active' : ''}`}
                onClick={() => setRole('channel')}
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setRole('channel')}
              >
                <span className="login-icon">{roleIcons.channel}</span>
                <div className="login-role-content">
                  <div className="login-title">Channel Account</div>
                  <div className="login-desc">Manage communications and teams</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Login Form */}
        <div className="login-card" role="region" aria-labelledby="loginHeading">
        {showAlert && (
          <div className="login-alert" role="alert">
            <div>{serverMessage}</div>
            <button
              className="login-closebtn"
              onClick={() => setShowAlert(false)}
              aria-label="Close alert"
            >
              ×
            </button>
          </div>
        )}

        <h2 id="loginHeading">{roleTitle[role]} Login</h2>

        <div>
          {role === 'kids' && (
            <>
              <div className="login-field-group">
                <label className="login-label" htmlFor="login-childEmail">
                  Child Email Address
                </label>
                <div className="login-field">
                  <input
                    id="login-childEmail"
                    name="childEmail"
                    type="email"
                    placeholder="child@example.com"
                    value={values.childEmail}
                    onChange={onChange}
                  />
                </div>
              </div>

              <div className="login-field-group">
                <label className="login-label" htmlFor="login-parentPassword">
                  Guardian Password
                </label>
                <div className="login-field">
                  <input
                    id="login-parentPassword"
                    name="parentPassword"
                    type={visiblePasswords.parentPassword ? 'text' : 'password'}
                    placeholder="Enter guardian password"
                    value={values.parentPassword}
                    onChange={onChange}
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() => togglePasswordVisibility('parentPassword')}
                    aria-label="Toggle password visibility"
                  >
                    {visiblePasswords.parentPassword ? '👁️‍🗨️' : '👁️'}
                  </button>
                </div>
                <div className="login-hint">
                  A parent or guardian password is required for access.
                </div>
              </div>
            </>
          )}

          {role === 'normal' && (
            <>
              <div className="login-field-group">
                <div className="login-toggle-wrapper">
                  <label className="login-label">Login With</label>
                  <div className="login-toggle-group">
                    <button
                      type="button"
                      className={`login-toggle-btn ${identifierMode === 'email' ? 'login-active' : ''}`}
                      onClick={() => setIdentifierMode('email')}
                    >
                      Email
                    </button>
                    <button
                      type="button"
                      className={`login-toggle-btn ${identifierMode === 'username' ? 'login-active' : ''}`}
                      onClick={() => setIdentifierMode('username')}
                    >
                      Username
                    </button>
                  </div>
                </div>

                <div className="login-field">
                  <input
                    name="identifier"
                    type={identifierMode === 'username' ? 'text' : 'email'}
                    placeholder={
                      identifierMode === 'username'
                        ? 'Enter your username'
                        : 'you@example.com'
                    }
                    value={values.identifier}
                    onChange={onChange}
                  />
                </div>
              </div>

              <div className="login-field-group">
                <label className="login-label">Password</label>
                <div className="login-field">
                  <input
                    name="password"
                    type={visiblePasswords.password ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={values.password}
                    onChange={onChange}
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() => togglePasswordVisibility('password')}
                    aria-label="Toggle password visibility"
                  >
                    {visiblePasswords.password ? '👁️‍🗨️' : '👁️'}
                  </button>
                </div>
              </div>
            </>
          )}

          {role === 'channel' && (
            <>
              <div className="login-field-group">
                <label className="login-label" htmlFor="login-channelName">
                  Channel Name
                </label>
                <div className="login-field">
                  <input
                    id="login-channelName"
                    name="channelName"
                    type="text"
                    placeholder="Enter channel name"
                    value={values.channelName}
                    onChange={onChange}
                  />
                </div>
              </div>

              <div className="login-field-group">
                <label className="login-label" htmlFor="login-adminName">
                  Admin Name
                </label>
                <div className="login-field">
                  <input
                    id="login-adminName"
                    name="adminName"
                    type="text"
                    placeholder="Enter admin name"
                    value={values.adminName}
                    onChange={onChange}
                  />
                </div>
              </div>

              <div className="login-field-group">
                <label className="login-label" htmlFor="login-channelPassword">
                  Password
                </label>
                <div className="login-field">
                  <input
                    id="login-channelPassword"
                    name="channelPassword"
                    type={
                      visiblePasswords.channelPassword ? 'text' : 'password'
                    }
                    placeholder="Enter password"
                    value={values.channelPassword}
                    onChange={onChange}
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() => togglePasswordVisibility('channelPassword')}
                    aria-label="Toggle password visibility"
                  >
                    {visiblePasswords.channelPassword ? '👁️‍🗨️' : '👁️'}
                  </button>
                </div>
                <div className="login-hint">
                  Admin credentials are required to manage channel settings.
                </div>
              </div>
            </>
          )}

          <button className="login-submit" onClick={handleSubmit}>
            Sign In
          </button>
        </div>

        <div className="login-footer-links">
          <a href="/forget-password" className="login-forgot-link">
            Forgot password?
          </a>
          <div className="login-secondary-text">
            Don't have an account? <a href="/signup">Sign up here</a>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}