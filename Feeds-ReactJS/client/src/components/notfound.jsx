const NotFoundRoute = () => {
  const styles = `
    * {
      box-sizing: border-box;
    }

    .not-found-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 1.5rem;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      position: relative;
      overflow: hidden;
      width: 100vw;
    }

    .animated-bg {
      position: absolute;
      width: 400px;
      height: 400px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      animation: float 6s ease-in-out infinite;
    }

    .animated-bg:nth-child(1) {
      top: -100px;
      left: -100px;
      animation-delay: 0s;
    }

    .animated-bg:nth-child(2) {
      bottom: -150px;
      right: -100px;
      animation-delay: 2s;
    }

    @keyframes float {
      0%, 100% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(30px);
      }
    }

    .not-found-card {
      position: relative;
      max-width: 500px;
      width: 100%;
      text-align: center;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 2rem;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      padding: 3rem 2rem;
      z-index: 10;
    }

    .avatar-container {
      margin-bottom: 2rem;
      position: relative;
      height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cat-avatar {
      width: 200px;
      height: 200px;
      animation: bounce 2s ease-in-out infinite;
    }

    @keyframes bounce {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-20px);
      }
    }

    .error-code {
      position: relative;
      font-size: 9rem;
      font-weight: 900;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1;
      margin: 0;
      animation: wiggle 2s ease-in-out infinite;
    }

    @keyframes wiggle {
      0%, 100% {
        transform: rotate(0deg);
      }
      25% {
        transform: rotate(-2deg);
      }
      75% {
        transform: rotate(2deg);
      }
    }

    .error-title {
      margin-top: 1.5rem;
      font-size: 2rem;
      font-weight: 700;
      color: #2d3748;
      margin-bottom: 0.5rem;
    }

    .error-message {
      margin-top: 1rem;
      font-size: 1rem;
      color: #718096;
      line-height: 1.6;
      max-width: 100%;
      margin-left: auto;
      margin-right: auto;
    }

    .home-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-top: 2.5rem;
      padding: 0.875rem 2rem;
      font-size: 1rem;
      font-weight: 600;
      color: white;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 0.75rem;
      box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
      text-decoration: none;
      cursor: pointer;
      transition: all 0.3s ease;
      font-family: inherit;
    }

    .home-button:hover {
      box-shadow: 0 15px 35px rgba(102, 126, 234, 0.6);
      transform: translateY(-2px);
    }

    .home-button:active {
      transform: translateY(0);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }
  `;

  const CatAvatar = () => (
    <svg className="cat-avatar" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      {/* Head */}
      <circle cx="100" cy="110" r="70" fill="#FFB84D" />

      {/* Ears */}
      <polygon points="70,55 50,20 75,60" fill="#FFB84D" />
      <polygon points="130,55 150,20 125,60" fill="#FFB84D" />
      <polygon points="72,58 60,40 70,62" fill="#FFD699" />
      <polygon points="128,58 140,40 130,62" fill="#FFD699" />

      {/* Eyes */}
      <ellipse cx="80" cy="100" rx="8" ry="12" fill="#2D3748" />
      <ellipse cx="120" cy="100" rx="8" ry="12" fill="#2D3748" />

      {/* Eye shine */}
      <circle cx="82" cy="98" r="3" fill="white" />
      <circle cx="122" cy="98" r="3" fill="white" />

      {/* Nose */}
      <polygon points="100,120 95,128 105,128" fill="#FF69B4" />

      {/* Mouth */}
      <path d="M 100 128 Q 90 135 85 132" stroke="#2D3748" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M 100 128 Q 110 135 115 132" stroke="#2D3748" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Whiskers */}
      <line x1="40" y1="110" x2="65" y2="108" stroke="#2D3748" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="40" y1="120" x2="65" y2="122" stroke="#2D3748" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="160" y1="110" x2="135" y2="108" stroke="#2D3748" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="160" y1="120" x2="135" y2="122" stroke="#2D3748" strokeWidth="1.5" strokeLinecap="round" />

      {/* Body */}
      <ellipse cx="100" cy="180" rx="45" ry="35" fill="#FFB84D" />

      {/* Front paws */}
      <ellipse cx="80" cy="200" rx="10" ry="20" fill="#FFB84D" />
      <ellipse cx="120" cy="200" rx="10" ry="20" fill="#FFB84D" />

      {/* Tail */}
      <path d="M 145 160 Q 170 140 165 100 Q 160 80 170 60" stroke="#FFB84D" strokeWidth="18" fill="none" strokeLinecap="round" />
    </svg>
  );

  return (
    <>
      <style>{styles}</style>
      <div className="not-found-container">
        <div className="animated-bg" />
        <div className="animated-bg" />
        
        <div className="not-found-card">
          <div className="avatar-container">
            <CatAvatar />
          </div>

          <h1 className="error-code">404</h1>

          <p className="error-title">Oops! Page not found</p>

          <p className="error-message">
            Looks like our kitty knocked this page off the shelf! 
            The page you're looking for doesn't exist. Let's get you back home.
          </p>

          <a href="/" className="home-button">
            Go back home
          </a>
        </div>
      </div>
    </>
  );
};

export default NotFoundRoute;
