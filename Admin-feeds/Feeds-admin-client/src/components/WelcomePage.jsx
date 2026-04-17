import React from 'react';
import { useNavigate } from 'react-router-dom';

const WelcomePage = () => {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.logoContainer}>
          <div style={styles.logo}>⚡</div>
        </div>
        <h1 style={styles.title}>Welcome to Feeds</h1>
        <p style={styles.subtitle}>Admin Portal</p>
        <p style={styles.description}>
          Manage your platform with ease. Monitor users, track analytics, 
          and oversee all operations from one centralized dashboard.
        </p>
        <button onClick={handleLoginClick} style={styles.loginButton}>
          Login to Dashboard
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  content: {
    textAlign: 'center',
    maxWidth: '500px',
    padding: '3rem 2rem',
  },
  logoContainer: {
    marginBottom: '2rem',
  },
  logo: {
    fontSize: '4rem',
    display: 'inline-block',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '1.5rem',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: '0.5rem',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '1.25rem',
    color: '#718096',
    marginBottom: '1.5rem',
    fontWeight: '500',
  },
  description: {
    fontSize: '1rem',
    color: '#4a5568',
    lineHeight: '1.6',
    marginBottom: '2.5rem',
    maxWidth: '400px',
    margin: '0 auto 2.5rem',
  },
  loginButton: {
    padding: '1rem 3rem',
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#fff',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
    transition: 'all 0.3s ease',
    outline: 'none',
  },
};

// Add hover effect via inline style won't work, so here's a version with onMouseEnter/Leave
const WelcomePageWithHover = () => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = React.useState(false);

  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.logoContainer}>
          <div style={styles.logo}>⚡</div>
        </div>
        <h1 style={styles.title}>Welcome to Feeds</h1>
        <p style={styles.subtitle}>Admin Portal</p>
        <p style={styles.description}>
          Manage your platform with ease. Monitor users, track analytics, 
          and oversee all operations from one centralized dashboard.
        </p>
        <button 
          onClick={handleLoginClick} 
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            ...styles.loginButton,
            transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
            boxShadow: isHovered 
              ? '0 6px 20px rgba(102, 126, 234, 0.5)' 
              : '0 4px 15px rgba(102, 126, 234, 0.4)',
          }}
        >
          Login to Dashboard
        </button>
      </div>
    </div>
  );
};

export default WelcomePageWithHover;