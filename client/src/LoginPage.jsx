import { useState } from "react";
import { useNavigate } from "react-router";

function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // "login" or "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    const url =
      mode === "signup"
        ? "http://localhost:3000/signup"
        : "http://localhost:3000/login";
    const body =
      mode === "signup" ? { name, email, password } : { email, password };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Something went wrong.");
        return;
      }

      if (mode === "signup") {
        setMessage("Account created! You can log in now.");
        setMode("login");
        setPassword("");
      } else {
        localStorage.setItem("token", data.token);
        onLogin(data.user);
        navigate("/");
      }
    } catch (err) {
      setMessage("Couldn't reach the server. Is the backend running?");
    }
  }

  function handleGoogle() {
    setMessage("Google sign-in will be switched on once setup is finished.");
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="auth-title">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="auth-sub">
          {mode === "signup"
            ? "Sign up to save your progress on StudyUSICT."
            : "Log in to your StudyUSICT account."}
        </p>

        <button type="button" className="google-btn" onClick={handleGoogle}>
          <svg viewBox="0 0 48 48" width="18" height="18">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
          </svg>
          Continue with Google
        </button>

        <div className="auth-divider"><span>or</span></div>

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div className="auth-field">
              <label className="field-label">Full Name</label>
              <input
                className="auth-input"
                type="text"
                value={name}
                placeholder="Akshat Saroha"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div className="auth-field">
            <label className="field-label">Email</label>
            <input
              className="auth-input"
              type="email"
              value={email}
              placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="auth-field">
            <label className="field-label">Password</label>
            <input
              className="auth-input"
              type="password"
              value={password}
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="auth-submit">
            {mode === "signup" ? "Create account" : "Log in"}
          </button>
        </form>

        {message && <p className="auth-msg">{message}</p>}

        <button
          type="button"
          className="auth-toggle"
          onClick={() => {
            setMode(mode === "signup" ? "login" : "signup");
            setMessage("");
          }}
        >
          {mode === "signup"
            ? "Already have an account? Log in"
            : "Need an account? Sign up"}
        </button>
      </div>
    </div>
  );
}

export default LoginPage;