import React, { useEffect, useRef, useState } from 'react';
import './../styles/channelRegistration.css';

/*
ISSUES/Improvements:
1. Make it more responsive for mobile.
*/

const PLACEHOLDER_IMAGE_PATH =
  '/Images/channelLogo.webp';

const DEFAULT_CATEGORIES = [
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

export default function ChannelRegistration() {
  const [channelName, setChannelName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [pfpFile, setPfpFile] = useState(null);
  const [channelDescription, setChannelDescription] = useState('');
  const [termsChecked, setTermsChecked] = useState(false);
  const [errors, setErrors] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [serverMsg, setServerMsg] = useState('');
  const [showOverlay, setShowOverlay] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.ImageKit) return;
    const id = 'imagekit-js';
    if (document.getElementById(id)) return;
    const s = document.createElement('script');
    s.id = id;
    s.src = 'https://unpkg.com/imagekit-javascript/dist/imagekit.min.js';
    s.async = true;
    document.body.appendChild(s);
  }, []);

  useEffect(() => {
    function onDocClick(e) {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const validatePassword = p =>
    p.length >= 6 &&
    /[A-Z]/.test(p) &&
    /[0-9]/.test(p) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(p);

  const showFieldError = (field, flag) =>
    setErrors(prev => ({ ...prev, [field]: !!flag }));

  async function handlePfpChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPfpFile(file);
    setProfileImageUrl(URL.createObjectURL(file));
    setUploading(true);

    try {
      const authRes = await fetch('/imagKitauth', { credentials: 'include' });
      if (!authRes.ok) throw new Error('Auth fetch failed');
      const authData = await authRes.json();

      if (!window.ImageKit) throw new Error('ImageKit not loaded');

      const imagekit = new window.ImageKit({
        publicKey: authData.publicKey || 'public_wbpheuS28ohGGR1W5QtPU+uv/z8=',
        urlEndpoint:
          authData.urlEndpoint || 'https://ik.imagekit.io/lidyx2zxm/',
      });

      imagekit.upload(
        {
          file,
          fileName: file.name,
          token: authData.token,
          signature: authData.signature,
          expire: authData.expire,
        },
        (err, result) => {
          setUploading(false);
          if (err) {
            console.error('ImageKit upload error', err);
            setServerMsg('Image upload failed. Please try again.');
            return;
          }
          setProfileImageUrl(result.url);
        },
      );
    } catch (err) {
      console.error('Image upload error', err);
      setUploading(false);
      setServerMsg('Failed to upload image. Please try again.');
    }
  }

  const toggleCategory = val => {
    setSelectedCategories(prev => {
      if (val === 'All') {
        if (prev.includes('All')) {
          return prev.filter(v => v !== 'All');
        }
        return ['All'];
      }

      const withoutAll = prev.filter(v => v !== 'All');
      if (withoutAll.includes(val)) {
        return withoutAll.filter(v => v !== val);
      } else {
        return [...withoutAll, val];
      }
    });
  };

  const filteredCategories = DEFAULT_CATEGORIES.filter(c =>
    c.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setServerMsg('');

    const pwValid = validatePassword(password);
    const pwMatch = password === confirmPassword;
    const nameValid = channelName && channelName.trim().length >= 2;
    const termsValid = termsChecked;

    showFieldError('channelName', !nameValid);
    showFieldError('password', !pwValid);
    showFieldError('confirmPassword', !pwMatch);
    showFieldError('terms', !termsValid);

    if (!nameValid || !pwValid || !pwMatch || !termsValid) {
      setServerMsg('Please fix the highlighted fields.');
      return;
    }

    const formData = new FormData();
    formData.append('channelName', channelName);
    formData.append('password', password);
    formData.append('confirmPassword', confirmPassword);
    formData.append('selectedCategories', JSON.stringify(selectedCategories));
    formData.append('channelDescription', channelDescription);
    formData.append('terms', String(termsChecked));
    if (profileImageUrl) formData.append('profileImageUrl', profileImageUrl);
    if (pfpFile) formData.append('pfp', pfpFile);

    try {
      const res = await fetch('/signupChannel', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          window.location.href = data.redirect || '/channels';
          return;
        } else {
          setServerMsg(data.reason || data.message || 'Registration failed');
          return;
        }
      } else {
        if (res.redirected) {
          window.location.href = res.url;
        } else if (res.ok) {
          window.location.href = '/channels';
        } else {
          setServerMsg('Registration failed');
        }
      }
    } catch (err) {
      console.error('submit error', err);
      setServerMsg('An error occurred. Please try again.');
    }
  }

  return (
    <>
      <div className="registration-wrapper">
        <div className="registration-card">
          <div className="card-header">
            <h1>Create Your Channel</h1>
            <p>Start your content creation journey today</p>
          </div>

          <div className="card-body">
            {serverMsg && (
              <div className="alert">
                <div className="alert-text">{serverMsg}</div>
                <button className="close-btn" onClick={() => setServerMsg('')}>
                  ×
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div
                className={`form-group ${errors.channelName ? 'error' : ''}`}
              >
                <label htmlFor="channelName">Channel Name</label>
                <input
                  id="channelName"
                  type="text"
                  placeholder="Enter your channel name"
                  value={channelName}
                  onChange={e => setChannelName(e.target.value)}
                  required
                />
                <div className="error-message">
                  Please enter a unique channel name (minimum 2 characters)
                </div>
              </div>

              <div className={`form-group ${errors.password ? 'error' : ''}`}>
                <label htmlFor="password">Password</label>
                <div className="password-wrapper">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? '👁️‍🗨️' : '👁️'}
                  </button>
                </div>
                <div className="error-message">
                  Password must be 6+ characters with uppercase, number, and
                  special character
                </div>
              </div>

              <div
                className={`form-group ${errors.confirmPassword ? 'error' : ''}`}
              >
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="password-wrapper">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? '👁️‍🗨️' : '👁️'}
                  </button>
                </div>
                <div className="error-message">Passwords must match</div>
              </div>

              <div className="form-group">
                <label>Select Categories</label>
                <div ref={dropdownRef} className="multiselect-dropdown">
                  <div
                    className={`select-box ${dropdownOpen ? 'open' : ''}`}
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setDropdownOpen(!dropdownOpen);
                      }
                    }}
                  >
                    <div className="selected-items">
                      {selectedCategories.length === 0 ? (
                        <span className="placeholder">
                          Choose your content categories...
                        </span>
                      ) : (
                        selectedCategories.map(v => (
                          <div key={v} className="selected-item">
                            <span>{v}</span>
                            <button
                              type="button"
                              className="remove-btn"
                              onClick={ev => {
                                ev.stopPropagation();
                                toggleCategory(v);
                              }}
                              aria-label={`Remove ${v}`}
                            >
                              ×
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                    <span
                      className="dropdown-arrow"
                      style={{
                        transform: dropdownOpen
                          ? 'rotate(180deg)'
                          : 'rotate(0deg)',
                      }}
                    >
                      ▼
                    </span>
                  </div>

                  <div
                    className={`dropdown-content ${dropdownOpen ? 'show' : ''}`}
                  >
                    <div className="search-box">
                      <input
                        className="search-input"
                        placeholder="Search categories..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                    <ul className="options">
                      {filteredCategories.length === 0 ? (
                        <div className="no-options">No categories found</div>
                      ) : (
                        filteredCategories.map(opt => (
                          <li
                            key={opt}
                            className={`option ${selectedCategories.includes(opt) ? 'selected' : ''}`}
                            onClick={ev => {
                              ev.stopPropagation();
                              toggleCategory(opt);
                            }}
                            role="option"
                            aria-selected={selectedCategories.includes(opt)}
                            tabIndex={0}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                toggleCategory(opt);
                              }
                            }}
                          >
                            <input
                              type="checkbox"
                              readOnly
                              checked={selectedCategories.includes(opt)}
                            />
                            <span>{opt}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="pfp">Channel Logo</label>
                <div className="image-upload-section">
                  <input
                    ref={fileInputRef}
                    id="pfp"
                    type="file"
                    accept="image/*"
                    onChange={handlePfpChange}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background:
                        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                    }}
                  >
                    Choose Image
                  </button>
                  {uploading && (
                    <div className="upload-status">Uploading your logo...</div>
                  )}
                  <div className="image-preview">
                    <img
                      src={profileImageUrl || PLACEHOLDER_IMAGE_PATH}
                      alt="Channel logo preview"
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="channelDescription">Channel Description</label>
                <textarea
                  id="channelDescription"
                  placeholder="Tell viewers what your channel is about..."
                  value={channelDescription}
                  onChange={e => setChannelDescription(e.target.value)}
                  required
                />
              </div>

              <div className={`checkbox-group ${errors.terms ? 'error' : ''}`}>
                <label>
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsChecked}
                    onChange={e => setTermsChecked(e.target.checked)}
                  />
                  <span>
                    I agree to the{' '}
                    <a
                      href="#"
                      onClick={ev => {
                        ev.preventDefault();
                        setShowOverlay(true);
                      }}
                    >
                      Terms & Conditions
                    </a>
                  </span>
                </label>
                <div className="error-message">
                  You must agree to the terms and conditions
                </div>
              </div>

              <button type="submit" className="submit-btn">
                Create Channel
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className={`overlay ${showOverlay ? 'show' : ''}`}>
        <div className="overlay-content">
          <div className="overlay-header">
            <h1>Terms & Conditions</h1>
            <button className="close-btn" onClick={() => setShowOverlay(false)}>
              ×
            </button>
          </div>
          <div className="overlay-body">
            <h2>1. Introduction</h2>
            <p>
              Welcome to Feeds! By using our platform, you agree to these terms
              and conditions. Please read them carefully before creating your
              channel.
            </p>

            <h2>2. User Category Information</h2>

            <h3>Kids Category</h3>
            <pre>1. Education 2. Animation 3. Nature</pre>

            <h3>Students Category</h3>
            <pre>All categories available</pre>

            <h2>3. Content Guidelines</h2>
            <p>
              All content must comply with our community guidelines and
              applicable laws. Creators are responsible for ensuring their
              content is appropriate for their selected categories.
            </p>

            <p
              style={{ marginTop: '24px', fontWeight: '600', color: '#2d3748' }}
            >
              Last Updated: February 2025
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
