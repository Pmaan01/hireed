import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu, X, Sun, Moon, LogOut, Settings, Home,
  User as UserIcon
} from "lucide-react";
import "../styles/Navbar.css"; // external CSS

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.setAttribute("data-theme", "dark");
      root.classList.add("dark");
    } else {
      root.setAttribute("data-theme", "light");
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  // mock auth check
  useEffect(() => {
    setIsAuthenticated(Math.random() > 0.5);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".user-menu-container")) setIsUserMenuOpen(false);
      if (!event.target.closest(".mobile-menu-container")) setIsMenuOpen(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const navigationLinks = [
    { to: "/", label: "Home", exact: true },
    { to: "/planner", label: "Planner" },
    { to: "/about", label: "About" },
    { to: "/contact", label: "Contact" },
  ];

  const isActiveLink = (path, exact = false) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">🎯</span>
          <span className="logo-text">Skills-Gap</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="navbar-menu">
          {navigationLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`navbar-link ${isActiveLink(link.to, link.exact) ? "active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right Side Actions */}
        <div className="navbar-actions">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* User Menu */}
          {isAuthenticated ? (
            <div className="user-menu-container">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="user-menu-trigger"
                aria-expanded={isUserMenuOpen}
                aria-label="User menu"
              >
                <UserIcon size={18} />
              </button>

              {isUserMenuOpen && (
                <div className="user-menu-dropdown">
                  <Link to="/profile" className="user-menu-item">
                    <UserIcon size={16} />
                    Profile
                  </Link>
                  <Link to="/settings" className="user-menu-item">
                    <Settings size={16} />
                    Settings
                  </Link>
                  <hr className="user-menu-divider" />
                  <button className="user-menu-item logout">
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="auth-link">Sign In</Link>
              <Link to="/signup" className="auth-button">Sign Up</Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <div className="mobile-menu-container">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="mobile-menu-toggle"
              aria-expanded={isMenuOpen}
              aria-label="Toggle mobile menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="mobile-menu">
          <div className="mobile-menu-content">
            {navigationLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`mobile-menu-link ${isActiveLink(link.to, link.exact) ? "active" : ""}`}
              >
                {link.label}
              </Link>
            ))}

            <hr className="mobile-menu-divider" />

            {!isAuthenticated && (
              <div className="mobile-auth-buttons">
                <Link to="/login" className="mobile-auth-link">Sign In</Link>
                <Link to="/signup" className="mobile-auth-button">Sign Up</Link>
              </div>
            )}

            {isAuthenticated && (
              <div className="mobile-user-menu">
                <Link to="/profile" className="mobile-menu-link">
                  <UserIcon size={18} />
                  Profile
                </Link>
                <Link to="/settings" className="mobile-menu-link">
                  <Settings size={18} />
                  Settings
                </Link>
                <button className="mobile-menu-link logout">
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
