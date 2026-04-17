import React from "react";
import "../styles/TandC.css";

/*
ISSUES/Improvements:
1. Better styling.
2. Add more sections as needed.
3. Add a "Back to Home" button.
*/

const TandC = () => (
  <div className="tandc-container">
    <main className="tandc-card">
      <h1 className="tandc-title">Terms &amp; Conditions</h1>
      
      <div className="tandc-content">
        {/* Section 1 */}
        <div className="tandc-section">
          <h2>1. Introduction</h2>
          <p>
            Welcome to Feeds! By using our platform, you agree to these terms.
          </p>
        </div>

        {/* Section 2 */}
        <div className="tandc-section">
          <h2>2. User Responsibilities</h2>
          <ul>
            <li>You must be at least 13 years old to use this platform.</li>
            <li>Do not post offensive or illegal content.</li>
            <li>Respect other users and maintain a friendly environment.</li>
          </ul>
        </div>
      </div>
      
      <div className="tandc-footer">
        Questions? <a className="tandc-link" href="/contact">Contact support</a>
      </div>
    </main>
  </div>
);

export default TandC;