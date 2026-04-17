import React, { useState } from "react";
import "../styles/Contact.css";

const Contact = () => {
  const [fields, setFields] = useState({ name: "", email: "", subject: "", message: "" });
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setFields({ ...fields, [e.target.name]: e.target.value });

  const handleBlur = (e) =>
    setTouched({ ...touched, [e.target.name]: true });

  const isValid =
    fields.name.trim() &&
    fields.subject.trim() &&
    /\S+@\S+\.\S+/.test(fields.email) &&
    fields.message.trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!isValid) return setError("Please fill all fields correctly.");

    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(fields),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to send message");
      }

      setSubmitted(true);
      setFields({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      console.error("Contact submit error:", err);
      setError(err.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  return (
    // This container holds the Night Sky Background
    <div className="contact-container">
      
      {/* This card is the Glass Effect Bubble */}
      <div className="contact-card">
        <h1 className="contact-title">Contact Us</h1>
        
        {submitted ? (
          <div className="contact-success">
            <h3>Message Sent! 🚀</h3>
            <p>We’ll get back to you soon.</p>
          </div>
        ) : (
          <form className="contact-form" onSubmit={handleSubmit} noValidate>
            <label>
              Name
              <input
                type="text"
                name="name"
                placeholder="Enter your name"
                value={fields.name}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                className={touched.name && !fields.name ? "contact-error" : ""}
              />
            </label>

            <label>
              Email
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={fields.email}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                className={
                  touched.email &&
                  (!fields.email || !/\S+@\S+\.\S+/.test(fields.email))
                    ? "contact-error"
                    : ""
                }
              />
            </label>

            <label>
              Subject
              <input
                type="text"
                name="subject"
                placeholder="Subject"
                value={fields.subject}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                className={
                  touched.subject && !fields.subject ? "contact-error" : ""
                }
              />
            </label>

            <label>
              Message
              <textarea
                name="message"
                placeholder="Type your message..."
                value={fields.message}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                rows={4}
                className={
                  touched.message && !fields.message ? "contact-error" : ""
                }
              />
            </label>

            <button
              className="contact-btn"
              type="submit"
              disabled={!isValid || loading}
            >
              {loading ? "Sending..." : "Send Message"}
            </button>
            {error && <p className="contact-error-text">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
};

export default Contact;