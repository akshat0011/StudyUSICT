import { useState } from "react";
import { useNavigate } from "react-router";

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
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error);
        return;
      }

      if (mode === "signup") {
        setMessage("Account created! You can log in now.");
        setMode("login");
      } else {
        localStorage.setItem("token", data.token);
        onLogin(data.user);
        navigate("/");
      }
    } catch (err) {
      setMessage("Could not reach the server. Is it running?");
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2>{mode === "signup" ? "Create your account" : "Welcome back"}</h2>

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">{mode === "signup" ? "Sign up" : "Log in"}</button>
        </form>

        <p className="auth-message">{message}</p>

        <button
          className="link-button"
          onClick={() => setMode(mode === "signup" ? "login" : "signup")}
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