import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "./../styles/DeleteAccount.css";
const DeleteAccount = () => {
  const navigate = useNavigate();
  
  // Form state
  const [formData, setFormData] = useState({
    password: '',
    confirmation: '',
    understand: false
  });
  
  // Validation state
  const [errors, setErrors] = useState({
    password: '',
    confirmation: '',
    form: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // Initialize from props if available
  useEffect(() => {
    // You can fetch any initial data here
  }, []);

  const validateForm = () => {
    const newErrors = { password: '', confirmation: '', form: '' };
    let isValid = true;

    // Password validation
    if (!formData.password.trim()) {
      newErrors.password = 'Please enter your current password';
      isValid = false;
    }

    // Confirmation validation
    if (formData.confirmation.toUpperCase() !== 'DELETE') {
      newErrors.confirmation = 'Please type DELETE to confirm';
      isValid = false;
    }

    // Checkbox validation
    if (!formData.understand) {
      newErrors.form = 'You must confirm that you understand this action is permanent';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setShowModal(true);
  };

  const confirmDelete = async () => {
    setIsLoading(true);
    setErrors(prev => ({ ...prev, form: '' }));
    
    try {
      const response = await fetch('/delacc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: formData.password,
          confirmation: formData.confirmation
        }),
        credentials: 'include'
      });

      const data = await response.json();
      
      if (response.ok) {
        // Success - redirect to home or login
        navigate('/', { 
          state: { 
            message: 'Your account has been scheduled for deletion. It will be permanently removed after 30 days.',
            type: 'success'
          }
        });
      } else {
        setErrors(prev => ({ 
          ...prev, 
          form: data.message || 'Failed to delete account. Please try again.' 
        }));
      }
    } catch (error) {
      console.error('Delete account error:', error);
      setErrors(prev => ({ 
        ...prev, 
        form: 'Network error. Please check your connection and try again.' 
      }));
    } finally {
      setIsLoading(false);
      setShowModal(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="delete-account-container">
      <div className="delete-account-card">
        {/* Warning Alert */}
        <div className="warning-alert">
          <div className="warning-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div className="warning-content">
            <h4>Irreversible Action</h4>
            <p>Your account will be deactivated for 30 days before permanent deletion.</p>
          </div>
        </div>

        {/* Header */}
        <div className="delete-header">
          <h1>Delete Account</h1>
          <p className="subtitle">This action cannot be undone</p>
        </div>

        {/* Form Error */}
        {errors.form && (
          <div className="form-error-alert">
            <span className="error-icon">⚠️</span>
            <span>{errors.form}</span>
          </div>
        )}

        {/* Deletion Steps */}
        <div className="deletion-steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>Account Deactivation</h4>
              <p>Your account will be immediately deactivated</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>30-Day Grace Period</h4>
              <p>You can cancel deletion within 30 days</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>Permanent Removal</h4>
              <p>After 30 days, all data will be permanently deleted</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="delete-form" noValidate>
          {/* Password Field */}
          <div className={`form-group ${errors.password ? 'error' : ''}`}>
            <label htmlFor="password">
              Confirm Password
              <span className="required">*</span>
            </label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your current password"
                disabled={isLoading}
                className="password-input"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={togglePasswordVisibility}
                disabled={isLoading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <div className="error-message">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                {errors.password}
              </div>
            )}
          </div>

          {/* Confirmation Field */}
          <div className={`form-group ${errors.confirmation ? 'error' : ''}`}>
            <label htmlFor="confirmation">
              Type "DELETE" to confirm
              <span className="required">*</span>
            </label>
            <input
              type="text"
              id="confirmation"
              name="confirmation"
              value={formData.confirmation}
              onChange={handleInputChange}
              placeholder="Type DELETE here"
              disabled={isLoading}
              className={formData.confirmation.toUpperCase() === 'DELETE' ? 'valid' : ''}
            />
            {errors.confirmation && (
              <div className="error-message">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                {errors.confirmation}
              </div>
            )}
          </div>

          {/* Checkbox */}
          <div className={`checkbox-group ${errors.form && !formData.understand ? 'error' : ''}`}>
            <label className="checkbox-label">
              <input
                type="checkbox"
                id="understand"
                name="understand"
                checked={formData.understand}
                onChange={handleInputChange}
                disabled={isLoading}
                className="checkbox-input"
              />
              <span className="custom-checkbox">
                <svg className="check-icon" viewBox="0 0 12 10">
                  <polyline points="1.5 6 4.5 9 10.5 1"/>
                </svg>
              </span>
              <span className="checkbox-text">
                I understand that this action is permanent and cannot be undone
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="form-actions">
            <button
              type="submit"
              className="delete-btn"
              disabled={
                isLoading || 
                !formData.password || 
                formData.confirmation.toUpperCase() !== 'DELETE' || 
                !formData.understand
              }
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Processing...
                </>
              ) : (
                'Delete Account'
              )}
            </button>
            
            <button
              type="button"
              className="cancel-btn"
              onClick={() => navigate('/home')}
              disabled={isLoading}
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Additional Info */}
        <div className="additional-info">
          <h4>What happens when you delete your account?</h4>
          <ul>
            <li>Your profile will no longer be visible to other users</li>
            <li>All your posts, comments, and messages will be removed</li>
            <li>You will lose access to all connected services</li>
            <li>Your data will be permanently deleted after 30 days</li>
          </ul>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2>Final Confirmation</h2>
              <p>Are you absolutely sure you want to delete your account?</p>
            </div>
            
            <div className="modal-body">
              <div className="modal-warning">
                <strong>This action cannot be undone.</strong> You will lose all your data permanently.
              </div>
              
              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-cancel-btn"
                  onClick={() => setShowModal(false)}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="modal-confirm-btn"
                  onClick={confirmDelete}
                  disabled={isLoading}
                >
                  {isLoading ? 'Deleting...' : 'Yes, Delete Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeleteAccount;