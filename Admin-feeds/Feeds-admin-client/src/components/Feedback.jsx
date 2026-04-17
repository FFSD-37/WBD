import React, { useState, useEffect, useContext } from 'react';
import {
  Mail,
  User,
  MessageSquare,
  Calendar,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "../styles/dashboard.css";
import Sidebar from './Sidebar';
import api, { apiCall } from "../utils/api";
import { useError } from "../context/ErrorContext";

const FeedbacksPage = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const { user } = useContext(AuthContext);
  const { showError } = useError();

  useEffect(() => {
  const fetchFeedbacks = async () => {
    try {
      const data = await apiCall(
        () => api.get("/feedback/list"),
        showError
      );

      setFeedbacks(data.feedbacks);
    } finally {
      setLoading(false);
    }
  };

  fetchFeedbacks();
}, []);

  const formatDate = (dateObj) => {
    if (!dateObj) return 'N/A';
    const date = dateObj.$date ? new Date(dateObj.$date) : new Date(dateObj);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSubjectColor = (subject) => {
    const colors = {
      'support': '#fef3c7',
      'bug': '#fee2e2',
      'feature': '#dbeafe',
      'general': '#e0e7ff',
      'complaint': '#fce7f3',
    };
    return colors[subject?.toLowerCase()] || '#f3f4f6';
  };

  const [searchQuery, setSearchQuery] = useState("");

  const searchStyles = {
    container: { display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '1rem' },
    input: {
      padding: '8px 12px',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      width: '320px',
      outline: 'none',
      fontSize: '14px',
    },
    clearBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '14px' },
  };

  const handleClearSearch = () => setSearchQuery("");

  const filteredFeedbacks = (feedbacks || []).filter((f) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = f.name || "";
    const email = f.email || "";
    const message = f.message || "";
    const subject = f.subject || "";
    return (
      name.toLowerCase().includes(q) ||
      email.toLowerCase().includes(q) ||
      message.toLowerCase().includes(q) ||
      subject.toLowerCase().includes(q)
    );
  });

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <div className="header">
          <div className="header-right">
            <div className="user-info">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Bonnie"
                alt="User"
                className="user-avatar"
              />
              <span className="user-name">{user.username}</span>
            </div>
          </div>
        </div>

        {/* Feedbacks Content */}
        <div className="content-area">
          <div style={styles.header}>
            <h2 style={styles.pageTitle}>User Feedbacks</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="search"
                placeholder="Search name, email, subject or message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={searchStyles.input}
                aria-label="Search feedbacks"
              />
              {searchQuery && (
                <button onClick={handleClearSearch} style={searchStyles.clearBtn} aria-label="Clear search">Clear</button>
              )}
              <div style={styles.stats}>
                <span style={styles.statBadge}>Total: {filteredFeedbacks.length}</span>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div style={styles.loading}>
              <div className="spinner" />
              <p>Loading feedbacks...</p>
            </div>
          ) : feedbacks.length === 0 ? (
            <div style={styles.emptyState}>
              <MessageSquare size={48} color="#9ca3af" />
              <p style={styles.emptyText}>No feedbacks yet</p>
            </div>
          ) : filteredFeedbacks.length === 0 ? (
            <div style={styles.emptyState}>
              <MessageSquare size={48} color="#9ca3af" />
              <p style={styles.emptyText}>No feedbacks match your search</p>
            </div>
          ) : (
            <div style={styles.feedbackList}>
              {filteredFeedbacks.map((feedback) => (
                <div 
                  key={feedback.id || feedback._id} 
                  style={{
                    ...styles.feedbackCard,
                    backgroundColor: getSubjectColor(feedback.subject),
                  }}
                  onClick={() => setSelectedFeedback(feedback)}
                >
                  <div style={styles.cardHeader}>
                    <div style={styles.userSection}>
                      <div style={styles.iconCircle}>
                        <User size={20} color="#4b5563" />
                      </div>
                      <div>
                        <div style={styles.userName}>{feedback.name}</div>
                        <div style={styles.userEmail}>
                          <Mail size={14} />
                          <span>{feedback.email}</span>
                        </div>
                      </div>
                    </div>
                    <div style={styles.idBadge}>{feedback.id}</div>
                  </div>

                  <div style={styles.cardBody}>
                    <div style={styles.subjectRow}>
                      <span style={styles.subjectLabel}>Subject:</span>
                      <span style={styles.subjectBadge}>
                        {feedback.subject}
                      </span>
                    </div>
                    <div style={styles.messageContainer}>
                      <MessageSquare size={16} color="#6b7280" />
                      <p style={styles.message}>
                        {feedback.message.length > 150 
                          ? `${feedback.message.substring(0, 150)}...` 
                          : feedback.message
                        }
                      </p>
                    </div>
                  </div>

                  <div style={styles.cardFooter}>
                    <div style={styles.dateInfo}>
                      <Calendar size={14} color="#6b7280" />
                      <span>{formatDate(feedback.createdAt)}</span>
                    </div>
                    <button 
                      style={styles.viewButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFeedback(feedback);
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal for detailed view */}
      {selectedFeedback && (
        <div style={styles.modalOverlay} onClick={() => setSelectedFeedback(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Feedback Details</h3>
              <button 
                style={styles.closeButton}
                onClick={() => setSelectedFeedback(null)}
              >
                ✕
              </button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>ID:</span>
                <span style={styles.modalValue}>{selectedFeedback.id}</span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>Name:</span>
                <span style={styles.modalValue}>{selectedFeedback.name}</span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>Email:</span>
                <span style={styles.modalValue}>{selectedFeedback.email}</span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>Subject:</span>
                <span style={{
                  ...styles.subjectBadge,
                  display: 'inline-block',
                }}>
                  {selectedFeedback.subject}
                </span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>Date:</span>
                <span style={styles.modalValue}>{formatDate(selectedFeedback.createdAt)}</span>
              </div>
              <div style={styles.modalMessageSection}>
                <span style={styles.modalLabel}>Message:</span>
                <p style={styles.modalMessage}>{selectedFeedback.message}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  pageTitle: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0,
  },
  stats: {
    display: 'flex',
    gap: '0.5rem',
  },
  statBadge: {
    padding: '0.5rem 1rem',
    backgroundColor: '#e0e7ff',
    color: '#4338ca',
    borderRadius: '20px',
    fontSize: '0.875rem',
    fontWeight: '600',
  },
  loading: {
    textAlign: 'center',
    padding: '4rem 2rem',
    color: '#6b7280',
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
  },
  emptyText: {
    marginTop: '1rem',
    color: '#6b7280',
    fontSize: '1.125rem',
  },
  feedbackList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: '1.5rem',
  },
  feedbackCard: {
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid rgba(0, 0, 0, 0.05)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
  },
  userSection: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
  },
  iconCircle: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1f2937',
  },
  userEmail: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    fontSize: '0.875rem',
    color: '#6b7280',
    marginTop: '0.25rem',
  },
  idBadge: {
    fontSize: '0.75rem',
    color: '#6b7280',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontWeight: '500',
  },
  cardBody: {
    marginBottom: '1rem',
  },
  subjectRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.75rem',
  },
  subjectLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#4b5563',
  },
  subjectBadge: {
    padding: '0.25rem 0.75rem',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: '12px',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1f2937',
    textTransform: 'capitalize',
  },
  messageContainer: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'flex-start',
  },
  message: {
    fontSize: '0.9rem',
    color: '#374151',
    lineHeight: '1.5',
    margin: 0,
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '1rem',
    borderTop: '1px solid rgba(0, 0, 0, 0.1)',
  },
  dateInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  viewButton: {
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#4f46e5',
    color: '#fff',
    fontSize: '0.875rem',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    borderBottom: '1px solid #e5e7eb',
  },
  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '0.25rem',
    lineHeight: 1,
  },
  modalBody: {
    padding: '1.5rem',
  },
  modalRow: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem',
    alignItems: 'center',
  },
  modalLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#6b7280',
    minWidth: '80px',
  },
  modalValue: {
    fontSize: '1rem',
    color: '#1f2937',
  },
  modalMessageSection: {
    marginTop: '1.5rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #e5e7eb',
  },
  modalMessage: {
    fontSize: '1rem',
    color: '#374151',
    lineHeight: '1.6',
    marginTop: '0.75rem',
    whiteSpace: 'pre-wrap',
  },
};

export default FeedbacksPage;