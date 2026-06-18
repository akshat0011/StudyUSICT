import { useState, useEffect } from "react";
import { Routes, Route, Link } from "react-router";
import Logo from "./Logo";
import HomePage from "./HomePage";
import LoginPage from "./LoginPage";
import MaterialsPage from "./MaterialsPage";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch("http://localhost:3000/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        setUser(data.user);
      } catch (err) {
        localStorage.removeItem("token");
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  if (loading) {
    return <p>Loading...</p>;
  }

return (
    <div>
      <nav className="navbar">
        <div className="container"> {/* NEW: centers the bar's contents */}
          <Link to="/"><Logo /></Link>
          <div className="nav-links">
            {/* CHANGED: Materials link removed from the top bar */}
            {user ? (
              <>
                <span className="nav-user">Hi, {user.name}</span>
                <button className="nav-logout" onClick={handleLogout}>Log out</button>
              </>
            ) : (
              <Link to="/login" className="nav-login">Log in</Link>
            )}
          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<HomePage />} /> {/* CHANGED: no user prop needed now */}
        <Route path="/login" element={<LoginPage onLogin={setUser} />} />
        <Route path="/materials" element={<MaterialsPage user={user} />} />
      </Routes>
    </div>
  );
}

export default App;