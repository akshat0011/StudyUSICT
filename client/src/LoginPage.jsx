import { useState } from "react";
import { useNavigate } from "react-router";
import { GoogleLogin } from "@react-oauth/google";

function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
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

  async function handleGoogleSuccess(credentialResponse) {
    setMessage("");
    try {
      const res = await fetch("http://localhost:3000/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Google sign-in failed.");
        return;
      }
      localStorage.setItem("token", data.token);
      onLogin(data.user);
      navigate("/");
    } catch (err) {
      setMessage("Couldn't reach the server. Is the backend running?");
    }
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

        <div className="google-login-wrap">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setMessage("Google sign-in was cancelled or failed.")}
            theme="outline"
            size="large"
            text="continue_with"
            shape="rectangular"
            width="340"
          />
        </div>

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