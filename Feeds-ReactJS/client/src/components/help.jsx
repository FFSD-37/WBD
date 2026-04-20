import React, { useState } from "react";
import "../styles/Help.css";

/*
ISSUES/Improvements:
1. Add more FAQs based on user feedback.
2. Implement a search feature for FAQs.
3. Include links to relevant help articles like forgot password.
*/

const faqs = [
  {
    q: "How do I reset my password?",
    a: "Click on Forgot Password on the login page and follow the instructions sent to your registered email.",
  },
  {
    q: "How can I contact support?",
    a: "Go to our Contact page and fill out the form or email support@feeds.com.",
  },
  {
    q: "How do I earn coins?",
    a: "You currently earn 10 coins for each qualifying post or reel creation, 1 coin for each qualifying chat and game play, and 0.5 coins for each qualifying engagement action, subject to the daily limits.",
  },
  {
    q: "Do channel posts earn coins?",
    a: "Yes. When a channel creates a post or reel, the channel admin receives the reward and that creation follows the premium creator limit.",
  },
];

const earningRules = [
  {
    title: "Create posts or reels",
    detail:
      "Earn 10 coins for each post or reel you publish. Normal users can earn from up to 3 creations per day. Premium users can earn from up to 10 creations per day.",
  },
  {
    title: "Channel creations",
    detail:
      "If a channel publishes a post or reel, the channel admin earns 10 coins for that creation. Channel creations are counted with the premium creation limit of 10 per day.",
  },
  {
    title: "Chat with different users",
    detail:
      "Earn 1 coin per qualifying chat user, for up to 10 different people each day. A chat counts only after both sides have sent at least one message on that day.",
  },
  {
    title: "Post engagement",
    detail:
      "Earn 0.5 coins for each qualifying engagement action such as a like, comment, reply, or save. Engagement rewards are limited to 20 qualifying actions per day.",
  },
  {
    title: "Play games",
    detail:
      "Earn 1 coin each time you start a qualifying game from the Games page. Game rewards are limited to 5 qualifying plays per day.",
  },
];

const AccordionList = ({ items, openKey, setOpenKey, keyPrefix, labelKey, valueKey }) => (
  <ul className="help-faq-list">
    {items.map((item, idx) => {
      const itemKey = `${keyPrefix}-${idx}`;
      const isOpen = openKey === itemKey;

      return (
        <li key={itemKey} className={`help-faq-item ${isOpen ? "help-faq-item-open" : ""}`}>
          <button
            type="button"
            className="help-faq-question"
            onClick={() => setOpenKey(isOpen ? null : itemKey)}
          >
            <b>{item[labelKey]}</b>
            <span className="help-faq-toggle">{isOpen ? "−" : "+"}</span>
          </button>
          {isOpen && <span className="help-faq-answer">{item[valueKey]}</span>}
        </li>
      );
    })}
  </ul>
);

const Help = () => {
  const [openKey, setOpenKey] = useState(null);

  return (
    <div className="help-container">
      <main className="help-card">
        <h1 className="help-title">Help & Support</h1>

        <section>
          <h2 className="help-subtitle">Frequently Asked Questions</h2>
          <AccordionList
            items={faqs}
            openKey={openKey}
            setOpenKey={setOpenKey}
            keyPrefix="faq"
            labelKey="q"
            valueKey="a"
          />
        </section>

        <section className="help-section">
          <h2 className="help-subtitle">How To Earn Coins</h2>
          <AccordionList
            items={earningRules}
            openKey={openKey}
            setOpenKey={setOpenKey}
            keyPrefix="earn"
            labelKey="title"
            valueKey="detail"
          />
        </section>

        <p className="help-footer">
          Still need help? <a className="help-link" href="/contact">Contact us</a>
        </p>
      </main>
    </div>
  );
};

export default Help;
