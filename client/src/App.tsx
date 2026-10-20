import React, { useState } from "react";
import { isAxiosError } from "axios";
import { authService } from "./features/auth/services/authService";

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    try {
      if (isLogin) {
        const data = await authService.login({ email, password });
        setMessage(`Login successful! Welcome back, ${data.user.name}.`);
      } else {
        const data = await authService.register({ name, email, password });
        setMessage(`Registration successful! Welcome, ${data.user.name}.`);
      }
    } catch (error: unknown) {
      const message = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message || error.message
        : error instanceof Error
          ? error.message
          : "An unexpected error occurred";
      setMessage(`Error: ${message}`);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#121212",
        color: "#fff",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          background: "#1e1e1e",
          padding: "2rem",
          borderRadius: "8px",
          width: "320px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          {isLogin ? "Focus Flow Login" : "Register"}
        </h2>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          {!isLogin && (
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                padding: "10px",
                borderRadius: "4px",
                border: "1px solid #444",
                background: "#2a2a2a",
                color: "#fff",
              }}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              padding: "10px",
              borderRadius: "4px",
              border: "1px solid #444",
              background: "#2a2a2a",
              color: "#fff",
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              padding: "10px",
              borderRadius: "4px",
              border: "1px solid #444",
              background: "#2a2a2a",
              color: "#fff",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "10px",
              borderRadius: "4px",
              border: "none",
              background: "#646cff",
              color: "#fff",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {isLogin ? "Login" : "Register"}
          </button>
        </form>

        <p
          style={{
            marginTop: "1rem",
            textAlign: "center",
            fontSize: "0.9rem",
            cursor: "pointer",
            color: "#8c9eff",
          }}
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin
            ? "Don't have an account? Register"
            : "Already have an account? Login"}
        </p>

        {message && (
          <p
            style={{
              marginTop: "1rem",
              textAlign: "center",
              fontSize: "0.85rem",
              color: message.includes("successful") ? "#4caf50" : "#f44336",
            }}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export default App;
