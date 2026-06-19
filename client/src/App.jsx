import { useState, useEffect } from "react";
import { Routes, Route, NavLink, Link } from "react-router";
import Logo from "./Logo";
import Footer from "./Footer";
import DashboardPage from "./DashboardPage";
import ResourceHubPage from "./ResourceHubPage";
import AITutorPage from "./AITutorPage";
import CareersPage from "./CareersPage";
import GpaPage from "./GpaPage";
import LoginPage from "./LoginPage";

const tabs = [
  { to: "/", end: true, label: "Dashboard",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> },
  { to: "/resources", label: "Resource Hub",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
  { to: "/tutor", label: "AI Study Tutor",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg> },
  { to: "/careers", label: "Careers & Jobs",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> },
  { to: "/gpa", label: "GPA Calculator",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 2 3 6 3s6-2 6-3v-5"/></svg> },
];

function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light"); // NEW

  useEffect(() => {                                              // NEW
    document.documentElement.setAttribute("data-theme", theme);  // NEW
    localStorage.setItem("theme", theme);                        // NEW
  }, [theme]);                                                   // NEW

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch("http://localhost:3000/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem("token"));
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  return (
    <div>
      <header className="topbar">
        <div className="topbar-inner">
          <Logo />
          <nav className="nav-tabs">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) => (isActive ? "nav-tab active" : "nav-tab")}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="topbar-right">
            <button
              className="theme-toggle"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              aria-label="Toggle light or dark mode"
            >
              {theme === "light" ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
              )}
            </button>
            {user ? (
              <>
                <span className="user-chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>
                  {user.name}{user.role === "admin" ? " · Admin" : ""}
                </span>
                <button className="logout-btn" onClick={handleLogout}>Log out</button>
              </>
            ) : (
              <Link to="/login" className="login-link">Log in</Link>
            )}
          </div>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/resources" element={<ResourceHubPage user={user} />} />
        <Route path="/tutor" element={<AITutorPage />} />
        <Route path="/careers" element={<CareersPage user={user} />} />
        <Route path="/gpa" element={<GpaPage />} />
        <Route path="/login" element={<LoginPage onLogin={setUser} />} />
      </Routes>

      <Footer />
    </div>
  );
}

export default App;