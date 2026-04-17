import React, { useState, useEffect, useRef } from 'react';
import ImageKit from 'imagekit-javascript';
import './../styles/editProfile.css';

/*
ISSUES/Improvements:
1. When on smaller screens, the edit profile heading should go above.
2. Add close button to terms and conditions overlay for better UX.
3. Add remove profile photo option.
4. When clicked edit on a field, focus should go to that field automatically i.e. cursor.
5. Add character limits to bio and display name fields.
*/

function EditProfile() {
  const [edit_profile_user, set_edit_profile_user] = useState({});
  const [edit_profile_photo, set_edit_profile_photo] = useState('');
  const [edit_profile_preview, set_edit_profile_preview] = useState('');
  const [edit_profile_termsVisible, set_edit_profile_termsVisible] =
    useState(false);

  const [editableFields, setEditableFields] = useState({});
  const overlayRef = useRef(null);

  const [links, setLinks] = useState(['']);
  const [linkErrors, setLinkErrors] = useState([]);
  const MAX_LINKS = 3;

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fetch User Data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/edit_profile`,
          { method: 'GET', credentials: 'include' },
        );

        if (!res.ok) throw new Error('Failed to fetch user details');

        const data = await res.json();
        const { user } = data;

        set_edit_profile_user({
          username: user.username,
          fullName: user.fullName || '',
          display_name: user.display_name || '',
          bio: user.bio || '',
          gender: user.gender || '',
          phone: user.phone || '',
          profilePicture: user.profilePicture || '',
          type: user.type || 'Normal',
        });

        setLinks(user.links?.length ? user.links : ['']);
      } catch (error) {
        console.error('Error fetching user details:', error);
      }
    };

    fetchUserData();
  }, []);

  const [errors, setErrors] = useState({
    fullName: '',
    phone: '',
    photo: '',
  });

  const validateFullName = name => {
    const pattern = /^[A-Za-z ]+$/;
    return pattern.test(name);
  };

  const validatePhone = phone => {
    return /^[0-9]{10}$/.test(phone);
  };

  // Improved relaxed URL validation
  const validateLink = url => {
    const pattern =
      /^(https?:\/\/)?([a-zA-Z0-9.-]+|\blocalhost\b|\b\d{1,3}(\.\d{1,3}){3}\b)(:\d+)?(\/.*)?$/i;
    return pattern.test(url);
  };

  // Update link field
  const handleLinkChange = (index, value) => {
    const updated = [...links];
    updated[index] = value;

    const updatedErrors = [...linkErrors];
    if (value.trim() && !validateLink(value)) {
      updatedErrors[index] = 'Invalid URL format';
    } else {
      updatedErrors[index] = '';
    }

    setLinks(updated);
    setLinkErrors(updatedErrors);
  };

  const addLink = () =>
    (links.length < MAX_LINKS && setLinks([...links, ''])) ||
    setLinkErrors([...linkErrors, '']);

  const removeLink = index => {
    const updated = links.filter((_, i) => i !== index);
    const updatedErr = linkErrors.filter((_, i) => i !== index);
    setLinks(updated.length ? updated : ['']);
    setLinkErrors(updatedErr);
  };

  // Enable field editing
  const edit_profile_enableField = field => {
    setEditableFields(prev => ({ ...prev, [field]: true }));
  };

  // Photo handling
  const edit_profile_handlePhoto = e => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, photo: 'Only image files are allowed' }));
      return;
    }

    setErrors(prev => ({ ...prev, photo: '' }));
    set_edit_profile_photo(file);
    set_edit_profile_preview(URL.createObjectURL(file));
  };

  // ImageKit Upload
  const imagekit = new ImageKit({
    publicKey: 'public_kFHkU6GMQrtHeX9lEvE8hn7bOqM=',
    urlEndpoint: 'https://ik.imagekit.io/vzp8taxcnc/',
  });

  // Handle Terms Modal closing conditions
  useEffect(() => {
    const handleClickOutside = e => {
      if (overlayRef.current && !overlayRef.current.contains(e.target)) {
        set_edit_profile_termsVisible(false);
      }
    };

    const handleEsc = e => {
      if (e.key === 'Escape') set_edit_profile_termsVisible(false);
    };

    if (edit_profile_termsVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [edit_profile_termsVisible]);

  // Handle Form Submit
  const edit_profile_handleSubmit = async e => {
    e.preventDefault();

    let newErrors = { fullName: '', phone: '', photo: '' };
    let hasError = false;

    // Full Name must be only letters + spaces
    if (!validateFullName(edit_profile_user.fullName)) {
      newErrors.fullName = 'Name must contain only letters and spaces';
      hasError = true;
    }

    // Phone must be exactly 10 digits
    if (!validatePhone(edit_profile_user.phone)) {
      newErrors.phone = 'Phone number must be exactly 10 digits';
      hasError = true;
    }

    // Image file validation is already handled in handlePhoto
    if (errors.photo.length > 0) {
      hasError = true;
    }

    setErrors(newErrors);

    if (hasError) {
      return; // Stop submit if any validation fails
    }

    // Validate URLs before submit
    for (let i = 0; i < links.length; i++) {
      if (links[i].trim() && !validateLink(links[i])) {
        alert(`Invalid link: ${links[i]}`);
        return;
      }
    }

    setIsSaving(true);

    let edit_profile_profileImageUrl = '';
    try {
      if (edit_profile_photo) {
        const authRes = await fetch(
          import.meta.env.VITE_SERVER_URL + '/imagKitauth',
        );
        const authData = await authRes.json();

        const uploadResponse = await imagekit.upload({
          file: edit_profile_photo,
          fileName: edit_profile_photo.name,
          token: authData.token,
          signature: authData.signature,
          expire: authData.expire,
        });
        edit_profile_profileImageUrl = uploadResponse.url;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/updateUserDetails`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            photo: edit_profile_photo ? 'yes' : '',
            profileImageUrl: edit_profile_profileImageUrl,
            display_name: edit_profile_user.display_name,
            fullName: edit_profile_user.fullName,
            bio: edit_profile_user.bio,
            gender: edit_profile_user.gender,
            phone: edit_profile_user.phone,
            links:
              edit_profile_user.type === 'Kids'
                ? []
                : links.filter(l => l.trim() !== ''),
            terms: true,
          }),
        },
      );

      if (!response.ok) throw new Error('Failed to update profile');

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="edit-profile_container">
      <h2 className="edit-profile_heading">Edit Profile</h2>

      <form className="edit-profile_form" onSubmit={edit_profile_handleSubmit}>
        {/* Profile Photo */}
        <div className="edit-profile_photo-section">
          <img
            src={
              edit_profile_preview ||
              edit_profile_user.profilePicture ||
              '/Images/default_user.jpeg'
            }
            alt="Profile"
            className="edit-profile_photo"
            onClick={() =>
              document.getElementById('edit-profile_photoInput').click()
            }
          />
          <input
            type="file"
            id="edit-profile_photoInput"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={edit_profile_handlePhoto}
          />
          {errors.photo && <p className="edit-profile_error">{errors.photo}</p>}
          <button
            type="button"
            className="edit-profile_photo-btn"
            onClick={() =>
              document.getElementById('edit-profile_photoInput').click()
            }
          >
            Change Photo
          </button>
        </div>

        {/* Display Name */}
        <h4>Display Name</h4>
        <div className="edit-profile_field">
          <input
            type="text"
            value={edit_profile_user.display_name || ''}
            readOnly={!editableFields.display_name}
            onChange={e =>
              set_edit_profile_user({
                ...edit_profile_user,
                display_name: e.target.value,
              })
            }
          />
          <a onClick={() => edit_profile_enableField('display_name')}>EDIT</a>
        </div>

        {/* Name */}
        <h4>Name</h4>
        <div className="edit-profile_field">
          <input
            type="text"
            value={edit_profile_user.fullName || ''}
            readOnly={!editableFields.fullName}
            onChange={e =>
              set_edit_profile_user({
                ...edit_profile_user,
                fullName: e.target.value,
              })
            }
          />
          {errors.fullName && (
            <p className="edit-profile_error">{errors.fullName}</p>
          )}

          <a onClick={() => edit_profile_enableField('fullName')}>EDIT</a>
        </div>

        {/* Bio */}
        <h4>Bio</h4>
        <div className="edit-profile_field">
          <textarea
            rows="3"
            value={edit_profile_user.bio || ''}
            readOnly={!editableFields.bio}
            onChange={e =>
              set_edit_profile_user({
                ...edit_profile_user,
                bio: e.target.value,
              })
            }
          />
          <a onClick={() => edit_profile_enableField('bio')}>EDIT</a>
        </div>

        {/* Gender */}
        <h4>Gender</h4>
        <div className="edit-profile_field">
          <select
            value={edit_profile_user.gender || ''}
            onChange={e =>
              set_edit_profile_user({
                ...edit_profile_user,
                gender: e.target.value,
              })
            }
          >
            <option value="">Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Phone */}
        <h4>Phone Number</h4>
        <div className="edit-profile_field">
          <input
            type="text"
            value={edit_profile_user.phone || ''}
            readOnly={!editableFields.phone}
            onChange={e =>
              set_edit_profile_user({
                ...edit_profile_user,
                phone: e.target.value,
              })
            }
          />
          {errors.phone && <p className="edit-profile_error">{errors.phone}</p>}
          <a onClick={() => edit_profile_enableField('phone')}>EDIT</a>
        </div>

        {/* Links Section — HIDDEN for Kids */}
        {edit_profile_user.type !== 'Kids' && (
          <>
            <h4>Links (Max 3)</h4>
            <div className="edit-profile_links">
              {links.map((link, i) => (
                <div key={i} className="edit-profile_field">
                  <input
                    type="text"
                    value={link}
                    onChange={e => handleLinkChange(i, e.target.value)}
                    placeholder="https://yourlink.com"
                  />
                  {linkErrors[i] && (
                    <p className="edit-profile_error">{linkErrors[i]}</p>
                  )}

                  {links.length > 1 && (
                    <button
                      type="button"
                      className="edit-profile_removeLink"
                      onClick={() => removeLink(i)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}

              {links.length < MAX_LINKS && (
                <button
                  type="button"
                  onClick={addLink}
                  className="edit-profile_addLink"
                >
                  + Add Link
                </button>
              )}
            </div>
          </>
        )}

        {/* Terms */}
        <div className="edit-profile_terms">
          <label>
            <input type="checkbox" required /> I agree to the{' '}
            <span
              className="edit-profile_terms-link"
              onClick={() => set_edit_profile_termsVisible(true)}
            >
              Terms & Conditions
            </span>
          </label>
        </div>

        <button
          type="submit"
          className={`edit-profile_submit-btn ${saved ? 'saved' : ''}`}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
        </button>

        {saved && (
          <p className="edit-profile_success-msg">
            Profile updated successfully!
          </p>
        )}
      </form>

      {/* TERMS OVERLAY */}
      {edit_profile_termsVisible && (
        <div className="edit-profile_overlay">
          <div className="edit-profile_overlay-content" ref={overlayRef}>
            <button
              className="edit-profile_close-btn"
              onClick={() => set_edit_profile_termsVisible(false)}
            >
              X
            </button>

            <h1>Terms & Conditions</h1>

            <div className="edit-profile_overlay-text">
              <h2>1. Introduction</h2>
              <p>
                Welcome to Feeds! By using our platform, you agree to these
                terms and conditions.
              </p>

              <h2>2. User Responsibilities</h2>
              <ul>
                <li>You must be at least 2 years old to use this platform.</li>
                <li>Do not post offensive or illegal content.</li>
                <li>
                  Respect other users and maintain a friendly environment.
                </li>
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
                We reserve the right to update these terms at any time.
                Continued use of the platform means you accept the new terms.
              </p>

              <p>
                <strong>Last Updated:</strong> February 2025{' '}
                <a href="/contact">@admin</a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditProfile;
