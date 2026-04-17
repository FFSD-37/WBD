import React, { useEffect, useRef, useState } from 'react';
import './../styles/register.css';
import ImageKit from 'imagekit-javascript';

/*
ISSUES/Improvements:
1. Improve css styling for kids-specific sections
*/

export default function Register() {
  const initialValues = {
    fullName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acctype: 'Normal',
    dob: '',
    profileImageUrl:
      'https://ik.imagekit.io/FFSD0037/default_user.png?updatedAt=1741701160385',
    bio: '',
    gender: '',
    terms: false,
    parentalPassword: '',
    confirmParentalPassword: '',
  };

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [serverMsg, setServerMsg] = useState('');
  const [alertVisible, setAlertVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(values.profileImageUrl);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const [imageKitLoaded, setImageKitLoaded] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState({
    password: false,
    confirmPassword: false,
    parentalPassword: false,
    confirmParentalPassword: false,
  });

  useEffect(() => {
    if (window.ImageKit) {
      setImageKitLoaded(true);
      return;
    }
    const id = 'imagekit-js';
    if (document.getElementById(id)) {
      setImageKitLoaded(true);
      return;
    }
    const s = document.createElement('script');
    s.id = id;
    s.src = 'https://unpkg.com/imagekit-javascript/dist/imagekit.min.js';
    s.onload = () => setImageKitLoaded(true);
    s.onerror = () => {
      console.warn('Failed to load ImageKit script.');
      setImageKitLoaded(false);
    };
    document.body.appendChild(s);
  }, []);

  const validateFullName = name =>
    name && name.length >= 2 && /^[a-zA-Z\s]+$/.test(name);

  const validateUsername = username => /^[a-zA-Z0-9]{3,20}$/.test(username);

  const validateEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validatePhone = phone => /^\+?[\d\s-]{10,}$/.test(phone);

  const validatePassword = password =>
    password &&
    password.length >= 6 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const validateParentalPassword = password => {
    return password && password.length >= 4;
  };

  const validateDOB = dobISO => {
    if (!dobISO) return false;
    const date = new Date(dobISO);
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const m = today.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--;
    const temp = values.acctype;
    if (temp === 'Kids') {
      return age >= 2 && age <= 8;
    }
    return age >= 9 && age <= 120;
  };

  const onChange = e => {
    const { name, value, type, checked } = e.target;

    // If account type changes, clear parental password fields
    if (name === 'acctype' && value === 'Normal') {
      setValues(v => ({
        ...v,
        [name]: value,
        parentalPassword: '',
        confirmParentalPassword: '',
      }));
    } else {
      setValues(v => ({
        ...v,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const togglePasswordVisibility = fieldName => {
    setPasswordVisible(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName],
    }));
  };

  const showAlert = msg => {
    setServerMsg(msg);
    setAlertVisible(true);
  };

  const handleImageChange = async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);

    try {
      const authRes = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/imagKitauth`,
      );
      if (!authRes.ok) throw new Error('Failed to fetch imagekit auth');
      const authData = await authRes.json();

      const imagekit = new ImageKit({
        publicKey: 'public_kFHkU6GMQrtHeX9lEvE8hn7bOqM=',
        urlEndpoint: 'https://ik.imagekit.io/vzp8taxcnc/',
      });

      const uploadOptions = {
        file,
        fileName: file.name,
        token: authData.token,
        signature: authData.signature,
        expire: authData.expire,
      };

      imagekit.upload(uploadOptions, function (err, result) {
        setUploading(false);
        if (err) {
          console.error('ImageKit upload error', err);
          showAlert('Image upload failed. Try again.');
          setPreviewUrl(values.profileImageUrl);
          return;
        }
        setValues(v => ({ ...v, profileImageUrl: result.url }));
        setPreviewUrl(result.url);
      });
    } catch (err) {
      console.error('Image upload flow error:', err);
      setUploading(false);
      showAlert('Image upload failed. Try again.');
    }
  };

  const handleSubmit = async () => {
    // 1) validate inputs
    const newErrors = {};

    // Basic validations
    if (!validateFullName(values.fullName)) newErrors.fullName = true;
    if (!validateUsername(values.username)) newErrors.username = true;
    if (!validateEmail(values.email)) newErrors.email = true;
    if (!validatePhone(values.phone)) newErrors.phone = true;
    if (!validatePassword(values.password)) newErrors.password = true;
    if (values.password !== values.confirmPassword)
      newErrors.confirmPassword = true;
    if (!validateDOB(values.dob)) newErrors.dob = true;
    if (!values.gender) newErrors.gender = true;
    if (!values.terms) newErrors.terms = true;

    // Parental password validation for kids accounts
    if (values.acctype === 'Kids') {
      if (!validateParentalPassword(values.parentalPassword)) {
        newErrors.parentalPassword = true;
      }
      if (values.parentalPassword !== values.confirmParentalPassword) {
        newErrors.confirmParentalPassword = true;
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      showAlert('Please fix the errors highlighted in the form.');
      return;
    }

    // 2) Build FormData properly
    const formData = new FormData();

    // Helper to append values
    function appendValue(key, val) {
      if (val === undefined || val === null) return;
      if (val instanceof File) {
        formData.append(key, val);
      } else if (typeof val === 'boolean') {
        formData.append(key, String(val));
      } else if (typeof val === 'object') {
        formData.append(key, JSON.stringify(val));
      } else {
        formData.append(key, String(val));
      }
    }

    Object.entries(values).forEach(([k, v]) => appendValue(k, v));

    // Append profile picture file if provided
    if (fileRef?.current?.files?.[0]) {
      appendValue('pfp', fileRef.current.files[0]);
    }

    // 3) Debug: print FormData contents
    console.log('FormData entries:');
    for (const [name, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(name, '=> File:', value.name, value.type, value.size);
      } else {
        console.log(name, '=>', value);
      }
    }

    // 4) Send FormData with fetch
    const payload = {
      ...values,
      terms: Boolean(values.terms),
      parentalPassword:
        values.acctype === 'Kids' ? values.parentalPassword : null,
      confirmParentalPassword:
        values.acctype === 'Kids' ? values.confirmParentalPassword : null,
    };
    console.log(payload);

    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const contentType = res.headers.get('content-type') || '';
      let data = null;
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = { rawText: text };
        }
      }

      if (!res.ok) {
        console.error('Signup failed:', res.status, data);
        showAlert(
          data?.message || data?.reason || `Signup failed (${res.status})`,
        );
        return;
      }

      // success branch
      if (data && data.success) {
        window.location.href = data.redirect || '/login';
      } else {
        showAlert(data?.message || data?.reason || 'Signup failed. Try again.');
      }
    } catch (err) {
      console.error('Signup error:', err);
      showAlert('An error occurred while creating account.');
    }
  };

  const groupClass = field =>
    `registration-form-group ${errors[field] ? 'registration-error' : ''}`;

  return (
    <div className="registration-wrap">
      <div className="registration-card">
        {alertVisible && (
          <div className="registration-alert" role="alert">
            <div>{serverMsg}</div>
            <button
              className="registration-close-btn-alert"
              onClick={() => setAlertVisible(false)}
            >
              ×
            </button>
          </div>
        )}

        <div className="registration-header">
          <h1>Create Account</h1>
          <p>
            Already Registered? <a href="/login">Login here</a>
          </p>
        </div>

        <div className="registration-form-scroll">
          {/* FULL NAME */}
          <div className={groupClass('fullName')}>
            <label htmlFor="registration-fullName">Full Name</label>
            <input
              name="fullName"
              id="registration-fullName"
              placeholder="Enter your full name"
              value={values.fullName}
              onChange={onChange}
            />
            <div className="registration-error-message">
              Please enter your full name (letters only, 2+ characters)
            </div>
          </div>

          {/* USERNAME */}
          <div className={groupClass('username')}>
            <label htmlFor="registration-username">Username</label>
            <input
              name="username"
              id="registration-username"
              placeholder="Choose a unique username"
              value={values.username}
              onChange={onChange}
            />
            <div className="registration-error-message">
              Username must be 3-20 characters, letters and numbers only
            </div>
          </div>

          {/* EMAIL */}
          <div className={groupClass('email')}>
            <label htmlFor="registration-email">Email Address</label>
            <input
              name="email"
              id="registration-email"
              type="email"
              placeholder="you@example.com"
              value={values.email}
              onChange={onChange}
            />
            <div className="registration-error-message">
              Please enter a valid email address
            </div>
          </div>

          {/* PHONE */}
          <div className={groupClass('phone')}>
            <label htmlFor="registration-phone">Phone Number</label>
            <input
              name="phone"
              id="registration-phone"
              placeholder="+1 234 567 8900"
              value={values.phone}
              onChange={onChange}
            />
            <div className="registration-error-message">
              Please enter a valid phone number (10+ digits)
            </div>
          </div>

          {/* PASSWORD */}
          <div className={groupClass('password')}>
            <label htmlFor="registration-password">Password</label>
            <div className="registration-input-wrapper">
              <input
                name="password"
                id="registration-password"
                type={passwordVisible.password ? 'text' : 'password'}
                placeholder="Create a strong password"
                value={values.password}
                onChange={onChange}
              />
              <button
                type="button"
                className="registration-password-toggle"
                onClick={() => togglePasswordVisibility('password')}
              >
                {passwordVisible.password ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>
            <div className="registration-error-message">
              Password must be 6+ characters with uppercase, number, and special
              character
            </div>
          </div>

          {/* CONFIRM PASSWORD */}
          <div className={groupClass('confirmPassword')}>
            <label htmlFor="registration-confirmPassword">
              Confirm Password
            </label>
            <div className="registration-input-wrapper">
              <input
                name="confirmPassword"
                id="registration-confirmPassword"
                type={passwordVisible.confirmPassword ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={values.confirmPassword}
                onChange={onChange}
              />
              <button
                type="button"
                className="registration-password-toggle"
                onClick={() => togglePasswordVisibility('confirmPassword')}
              >
                {passwordVisible.confirmPassword ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>
            <div className="registration-error-message">
              Passwords must match
            </div>
          </div>

          {/* ACCOUNT TYPE */}
          <div className="registration-form-group">
            <label>Account Type</label>
            <div className="registration-radio-group">
              <label>
                <input
                  type="radio"
                  name="acctype"
                  value="Kids"
                  checked={values.acctype === 'Kids'}
                  onChange={onChange}
                />
                Kids (2-8 years) - Requires parental permission
              </label>
              <label>
                <input
                  type="radio"
                  name="acctype"
                  value="Normal"
                  checked={values.acctype === 'Normal'}
                  onChange={onChange}
                />
                Normal (9+ years)
              </label>
            </div>

            <div className="registration-know-about-type">
              <button
                type="button"
                onClick={() =>
                  alert(
                    '1. Kids: Age should be 2 to 8 years - Requires parental password\n2. Normal: Age should be greater than 8',
                  )
                }
              >
                Not sure about the type?
              </button>
            </div>
          </div>

          {/* DOB */}
          <div className={groupClass('dob')}>
            <label htmlFor="registration-dob">Date of Birth</label>
            <input
              name="dob"
              id="registration-dob"
              type="date"
              value={values.dob}
              onChange={onChange}
            />
            <div className="registration-error-message">
              Age criteria must match the selected account type
            </div>
          </div>

          {/* PARENTAL PASSWORD SECTION - Only show for Kids account */}
          {values.acctype === 'Kids' && (
            <>
              <div className="parental-section">
                <div className="section-title">
                  <h3>👨‍👩‍👧‍👦 Parental Consent Required</h3>
                  <p className="section-description">
                    For kids accounts, a parent/guardian must set up a parental
                    password to manage account settings and permissions.
                  </p>
                </div>

                {/* PARENTAL PASSWORD */}
                <div className={groupClass('parentalPassword')}>
                  <label htmlFor="registration-parentalPassword">
                    Parental Password
                  </label>
                  <div className="registration-input-wrapper">
                    <input
                      name="parentalPassword"
                      id="registration-parentalPassword"
                      type={
                        passwordVisible.parentalPassword ? 'text' : 'password'
                      }
                      placeholder="Set a parental control password (min 4 characters)"
                      value={values.parentalPassword}
                      onChange={onChange}
                    />
                    <button
                      type="button"
                      className="registration-password-toggle"
                      onClick={() =>
                        togglePasswordVisibility('parentalPassword')
                      }
                    >
                      {passwordVisible.parentalPassword ? '👁️‍🗨️' : '👁️'}
                    </button>
                  </div>
                  <div className="registration-error-message">
                    Parental password must be at least 4 characters
                  </div>
                  <div className="parental-password-info">
                    <small>
                      ⚠️ This password will be needed to modify account
                      settings, change privacy options, or delete the account.
                    </small>
                  </div>
                </div>

                {/* CONFIRM PARENTAL PASSWORD */}
                <div className={groupClass('confirmParentalPassword')}>
                  <label htmlFor="registration-confirmParentalPassword">
                    Confirm Parental Password
                  </label>
                  <div className="registration-input-wrapper">
                    <input
                      name="confirmParentalPassword"
                      id="registration-confirmParentalPassword"
                      type={
                        passwordVisible.confirmParentalPassword
                          ? 'text'
                          : 'password'
                      }
                      placeholder="Re-enter parental password"
                      value={values.confirmParentalPassword}
                      onChange={onChange}
                    />
                    <button
                      type="button"
                      className="registration-password-toggle"
                      onClick={() =>
                        togglePasswordVisibility('confirmParentalPassword')
                      }
                    >
                      {passwordVisible.confirmParentalPassword ? '👁️‍🗨️' : '👁️'}
                    </button>
                  </div>
                  <div className="registration-error-message">
                    Parental passwords must match
                  </div>
                </div>
              </div>
            </>
          )}

          {/* PROFILE UPLOAD */}
          <div className="registration-form-group">
            <label>Profile Picture (Optional)</label>
            <div className="registration-profile-upload">
              <div className="registration-upload-btn-wrapper">
                <label
                  htmlFor="registration-pfp"
                  className="registration-file-label"
                >
                  📷 Choose Image
                </label>
                <input
                  ref={fileRef}
                  name="pfp"
                  id="registration-pfp"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </div>

              {uploading && (
                <div className="registration-uploading-text">
                  Uploading image...
                </div>
              )}

              {previewUrl && (
                <div className="registration-profile-preview">
                  <img
                    src={previewUrl}
                    className="registration-preview-image"
                    alt="Profile Preview"
                  />
                </div>
              )}
            </div>
          </div>

          {/* BIO */}
          <div className="registration-form-group">
            <label htmlFor="registration-bio">Bio (Optional)</label>
            <textarea
              name="bio"
              id="registration-bio"
              rows="4"
              placeholder="Tell us a bit about yourself..."
              value={values.bio}
              onChange={onChange}
            />
          </div>

          {/* GENDER */}
          <div className={groupClass('gender')}>
            <label>Gender</label>
            <div className="registration-radio-group">
              <label>
                <input
                  type="radio"
                  name="gender"
                  value="Male"
                  checked={values.gender === 'Male'}
                  onChange={onChange}
                />
                Male
              </label>
              <label>
                <input
                  type="radio"
                  name="gender"
                  value="Female"
                  checked={values.gender === 'Female'}
                  onChange={onChange}
                />
                Female
              </label>
              <label>
                <input
                  type="radio"
                  name="gender"
                  value="Other"
                  checked={values.gender === 'Other'}
                  onChange={onChange}
                />
                Other
              </label>
            </div>
            <div className="registration-error-message">
              Please select your gender
            </div>
          </div>

          {/* TERMS */}
          <div className={groupClass('terms') + ' registration-checkbox-group'}>
            <label>
              <input
                type="checkbox"
                name="terms"
                checked={values.terms}
                onChange={onChange}
              />
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
              {values.acctype === 'Kids' && (
                <span className="kids-consent-note">
                  {' '}
                  (For kids accounts, parent/guardian consent is required)
                </span>
              )}
            </label>
            <div className="registration-error-message">
              You must agree to the terms and conditions
            </div>
          </div>
        </div>

        <button className="registration-submit-btn" onClick={handleSubmit}>
          {values.acctype === 'Kids' ? 'Create Kids Account' : 'Create Account'}
        </button>
      </div>

      {/* TERMS OVERLAY */}
      {showOverlay && (
        <div className="registration-overlay">
          <div className="registration-overlay-content">
            <button
              className="registration-overlay-close"
              onClick={() => setShowOverlay(false)}
            >
              ×
            </button>

            <h1>Terms & Conditions</h1>

            <h2>1. Introduction</h2>
            <p>
              Welcome to Feeds! By using our platform, you agree to these terms
              and conditions.
            </p>

            {values.acctype === 'Kids' && (
              <>
                <h2>Parental Consent for Kids Accounts</h2>
                <p>
                  For accounts designated as "Kids" (ages 2-8), the parent or
                  guardian creating this account acknowledges and agrees to:
                </p>
                <ul>
                  <li>Supervise the child's use of the platform</li>
                  <li>Use the parental password to manage privacy settings</li>
                  <li>Monitor the child's interactions and content</li>
                  <li>
                    Assume responsibility for the child's activities on the
                    platform
                  </li>
                  <li>
                    Use the parental password for any account modifications or
                    deletions
                  </li>
                </ul>
              </>
            )}

            <h2>2. User Responsibilities</h2>
            <ul>
              <li>You must be at least 13 years old to use this platform.</li>
              <li>Do not post offensive or illegal content.</li>
              <li>Respect other users and maintain a friendly environment.</li>
            </ul>

            <h2>3. Privacy & Data</h2>
            <p>
              We collect user data only for improving our services. Your
              personal details will not be shared without consent.
            </p>

            <h2>4. Payments</h2>
            <p>
              All payments for premium features are handled securely via
              Razorpay.
            </p>

            <h2>5. Changes to Terms</h2>
            <p>
              We reserve the right to update these terms at any time. Continued
              use of the platform means you accept the new terms.
            </p>

            <p>
              <strong>Last Updated: February 2025</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
