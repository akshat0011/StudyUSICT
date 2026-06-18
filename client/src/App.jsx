import { Routes, Route, NavLink } from "react-router";
import Logo from "./Logo";
import Footer from "./Footer";
import DashboardPage from "./DashboardPage";
import ResourceHubPage from "./ResourceHubPage";
import AITutorPage from "./AITutorPage";
import CareersPage from "./CareersPage";
import GpaPage from "./GpaPage";

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
            <span className="api-badge"><span className="api-dot"></span>API ACTIVE</span>
            <span className="user-chip">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.5v-1.7c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 4.7 18 5 18 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.5 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z"/></svg>
              akshat-saroha
            </span>
          </div>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/resources" element={<ResourceHubPage />} />
        <Route path="/tutor" element={<AITutorPage />} />
        <Route path="/careers" element={<CareersPage />} />
        <Route path="/gpa" element={<GpaPage />} />
      </Routes>

      <Footer />
    </div>
  );
}

export default App;