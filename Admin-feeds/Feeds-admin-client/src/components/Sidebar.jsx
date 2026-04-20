import {
  Book,
  BarChart3,
  ShoppingCart,
  Monitor,
  LogOut,
  Users,
  Antenna,
  FileText,
  Menu,
  X,
} from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { useContext, useEffect, useState } from "react";
import { useNavigate, NavLink, useLocation } from "react-router-dom";
import "../styles/sidebar.css";

export default function Sidebar() {
  const { setIsAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const logout = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    if (data.success) {
      setIsAuthenticated(false);
      navigate("/login", { replace: true });
    }
  };

  return (
    <>
      <button
        className="mobile-menu-button"
        onClick={() => setIsMobileOpen(true)}
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>

      {isMobileOpen && (
        <button
          className="sidebar-backdrop"
          onClick={() => setIsMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <div className={`sidebar ${isMobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-logo">F</div>
            <span className="sidebar-title">Feeds</span>
          </div>
          <button
            className="sidebar-close-button"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
          >
            <BarChart3 size={18} />
            <span>Overview</span>
          </NavLink>

          <NavLink
            to="/userList"
            className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
          >
            <Users size={18} />
            <span>Users</span>
          </NavLink>

          <NavLink
            to="/channelList"
            className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
          >
            <Antenna size={18} />
            <span>Channels</span>
          </NavLink>

          <NavLink
            to="/posts"
            className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
          >
            <FileText size={18} />
            <span>Posts</span>
          </NavLink>

          <NavLink
            to="/reports"
            className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
          >
            <Book size={18} />
            <span>Tickets</span>
          </NavLink>

          <NavLink
            to="/transactions"
            className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
          >
            <ShoppingCart size={18} />
            <span>Transactions</span>
          </NavLink>

          <NavLink
            to="/feedbacks"
            className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
          >
            <Book size={18} />
            <span>Feedbacks</span>
          </NavLink>

          <NavLink
            to="/managers"
            className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
          >
            <Book size={18} />
            <span>Managers</span>
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
          >
            <Monitor size={18} />
            <span>Settings</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button className="upgrade-button" onClick={logout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </>
  );
}
