import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import ImageKit from 'imagekit-javascript';
import './../styles/editChannel.css';

/*
ISSUES/Improvements:
1. Make it mobile responsive for better accessibility on different devices.
2. When clicked edit on a field, focus should go to that field automatically i.e. cursor.
3. Add remove logo option.
4. Add character limit to channel description.
*/

function EditChannel() {
  const [edit_channel_data, set_edit_channel_data] = useState({});
  const [edit_channel_logo, set_edit_channel_logo] = useState('');
  const [edit_channel_preview, set_edit_channel_preview] = useState('');
  const [edit_channel_termsVisible, set_edit_channel_termsVisible] =
    useState(false);
  const [editableFields, setEditableFields] = useState({});
  const [links, setLinks] = useState(['']);
  const [linkErrors, setLinkErrors] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const overlayRef = useRef(null);
  const [logoError, setLogoError] = useState('');
  const [descError, setDescError] = useState('');
  const [generalError, setGeneralError] = useState('');

  const MAX_LINKS = 3;

  const validate = url => {
    const pattern =
      /^(https?:\/\/)?([a-zA-Z0-9.-]+|\blocalhost\b|\b\d{1,3}(\.\d{1,3}){3}\b)(:\d+)?(\/.*)?$/i;
    return pattern.test(url);
  };

  useEffect(() => {
    const fetchChannelData = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/edit_channel`,
          {
            method: 'GET',
            credentials: 'include',
          },
        );

        const data = await res.json();
        const { CurrentChannel } = data;

        set_edit_channel_data({
          channelName: CurrentChannel.channelName,
          channelDescription: CurrentChannel.channelDescription || '',
          channelLogo: CurrentChannel.channelLogo || '',
        });

        setLinks(CurrentChannel.links?.length ? CurrentChannel.links : ['']);
      } catch (error) {
        console.error('Error fetching channel details:', error);
      }
    };

    fetchChannelData();
  }, []);

  const imagekit = new ImageKit({
    publicKey: 'public_kFHkU6GMQrtHeX9lEvE8hn7bOqM=',
    urlEndpoint: 'https://ik.imagekit.io/vzp8taxcnc/'
  });

  const enable = field => setEditableFields(p => ({ ...p, [field]: true }));

  const handleLogo = e => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/jpg',
      'image/gif',
    ];

    if (!validTypes.includes(file.type)) {
      setLogoError('Only image files (JPG, PNG, WEBP, GIF) are allowed.');
      set_edit_channel_logo('');
      set_edit_channel_preview('');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      setLogoError('Image must be less than 5MB.');
      return;
    }

    setLogoError('');
    set_edit_channel_logo(file);
    set_edit_channel_preview(URL.createObjectURL(file));
  };

  useEffect(() => {
    const handleClickOutside = e => {
      if (overlayRef.current && !overlayRef.current.contains(e.target)) {
        set_edit_channel_termsVisible(false);
      }
    };

    const handleEsc = e => {
      if (e.key === 'Escape') set_edit_channel_termsVisible(false);
    };

    if (edit_channel_termsVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [edit_channel_termsVisible]);

  useEffect(() => {
    if (edit_channel_termsVisible) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }, [edit_channel_termsVisible]);

  const updateLink = (i, v) => {
    const u = [...links];
    const e = [...linkErrors];
    u[i] = v;
    e[i] = v.trim() && !validate(v) ? 'Invalid URL' : '';
    setLinks(u);
    setLinkErrors(e);
  };

  const addLink = () => {
    if (links.length < MAX_LINKS) {
      setLinks([...links, '']);
      setLinkErrors([...linkErrors, '']);
    }
  };

  const removeLink = i => {
    const u = links.filter((_, x) => x !== i);
    const e = linkErrors.filter((_, x) => x !== i);
    setLinks(u.length ? u : ['']);
    setLinkErrors(e);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setGeneralError('');
    setDescError('');

    // Validate Description
    if (!edit_channel_data.channelDescription.trim()) {
      setDescError('Description cannot be empty.');
      return;
    }

    // Validate Links
    for (let i = 0; i < links.length; i++) {
      if (links[i].trim() && !validate(links[i])) {
        setGeneralError(`Invalid link detected: ${links[i]}`);
        return;
      }
    }

    // If logo error exists → stop submit
    if (logoError) {
      setGeneralError('Please fix the logo error before saving.');
      return;
    }

    setIsSaving(true);
    let logoUrl = '';

    try {
      // Upload image if changed
      if (edit_channel_logo) {
        const authRes = await fetch(
          import.meta.env.VITE_SERVER_URL + '/imagKitauth',
        );
        const authData = await authRes.json();
        const upload = await imagekit.upload({
          file: edit_channel_logo,
          fileName: edit_channel_logo.name,
          token: authData.token,
          signature: authData.signature,
          expire: authData.expire,
        });

        logoUrl = upload.url;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/updateChannelDetails`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            logo: edit_channel_logo ? 'yes' : '',
            logoUrl,
            channelDescription: edit_channel_data.channelDescription,
            links: links.filter(l => l.trim() !== ''),
          }),
        },
      );

      if (!response.ok) throw new Error('Failed to update channel');

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      console.error('Error updating channel:', error);
      setGeneralError('Something went wrong while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="edit_channel_container">
      <h2 className="edit_channel_heading">Edit Channel</h2>

      <form className="edit_channel_form" onSubmit={handleSubmit}>
        <div className="edit_channel_logo-section">
          <img
            src={
              edit_channel_preview ||
              edit_channel_data.channelLogo ||
              '/Images/default_user.jpeg'
            }
            alt="Channel Logo"
            className="edit_channel_logo"
            onClick={() =>
              document.getElementById('edit_channel_logoInput').click()
            }
          />

          <input
            type="file"
            id="edit_channel_logoInput"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleLogo}
          />

          <button
            type="button"
            className="edit_channel_logo-btn"
            onClick={() =>
              document.getElementById('edit_channel_logoInput').click()
            }
          >
            Change Logo
          </button>
          {logoError && <p className="edit_channel_error">{logoError}</p>}
        </div>

        <h4>Channel Name</h4>
        <div className="edit_channel_field">
          <input
            type="text"
            value={edit_channel_data.channelName || ''}
            readOnly
          />
        </div>

        <h4>Description</h4>
        <div className="edit_channel_field">
          <textarea
            rows="4"
            value={edit_channel_data.channelDescription || ''}
            readOnly={!editableFields.channelDescription}
            onChange={e =>
              set_edit_channel_data({
                ...edit_channel_data,
                channelDescription: e.target.value,
              })
            }
          />
          <a onClick={() => enable('channelDescription')}>EDIT</a>
        </div>
        {descError && <p className="edit_channel_error">{descError}</p>}

        <h4>Links (Max 3)</h4>
        <div className="edit_channel_links">
          {links.map((l, i) => (
            <div key={i} className="edit_channel_field">
              <input
                type="text"
                value={l}
                onChange={e => updateLink(i, e.target.value)}
                placeholder="https://yourlink.com"
              />

              {linkErrors[i] && (
                <p className="edit_channel_error">{linkErrors[i]}</p>
              )}

              {links.length > 1 && (
                <button
                  type="button"
                  className="edit_channel_removeLink"
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
              className="edit_channel_addLink"
            >
              + Add Link
            </button>
          )}
        </div>

        <div className="edit_channel_terms">
          <label>
            <input type="checkbox" required /> I agree to the{' '}
            <span
              className="edit_channel_terms-link"
              onClick={() => set_edit_channel_termsVisible(true)}
            >
              Terms & Conditions
            </span>
          </label>
        </div>

        <button
          type="submit"
          className={`edit_channel_submit-btn ${saved ? 'saved' : ''}`}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
        </button>
        {generalError && (
          <p className="edit_channel_error" style={{ textAlign: 'center' }}>
            {generalError}
          </p>
        )}

        {saved && (
          <p className="edit_channel_success-msg">
            Channel updated successfully!
          </p>
        )}
      </form>

      {edit_channel_termsVisible &&
        createPortal(
          <div className="edit_channel_overlay">
            <div className="edit_channel_overlay-content" ref={overlayRef}>
              <button
                className="edit_channel_close-btn"
                onClick={() => set_edit_channel_termsVisible(false)}
              >
                X
              </button>

              <h1>Terms & Conditions</h1>

              <div className="edit_channel_overlay-text">
                <h2>1. Channel Guidelines</h2>
                <p>Maintain professionalism and avoid inappropriate content.</p>

                <h2>2. Data Policy</h2>
                <p>
                  Feeds collects minimal channel data for discovery and analytics.
                </p>

                <h2>3. Content Rights</h2>
                <p>
                  You retain ownership of uploads but grant Feeds permission to
                  display them.
                </p>

                <h2>4. Termination</h2>
                <p>Violations may result in channel suspension.</p>

                <p>
                  <strong>Last Updated: February 2025</strong>
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default EditChannel;
