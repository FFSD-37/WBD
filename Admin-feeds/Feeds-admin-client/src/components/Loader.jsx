import '../styles/LoadingSpinner.css';

const LoadingSpinner = ({ size = 'medium', color = '#3b82f6', text = '' }) => {
  const sizeValues = {
    small: '24px',
    medium: '48px',
    large: '64px'
  };

  const borderWidth = size === 'small' ? '3px' : '4px';

  return (
    <div className="loading-container">
      <div
        className="spinner"
        style={{
          width: sizeValues[size],
          height: sizeValues[size],
          borderWidth: borderWidth,
          borderTopColor: color
        }}
        role="status"
        aria-label="Loading"
      />
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;