import { useState } from "react";
import { Link } from "react-router";

export default function Index() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(false);

  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center"
      style={{ minHeight: "90vh", backgroundColor: "var(--background)" }}
    >
      {/* CISC Logo */}
      <div className="mb-4 text-center">
        <img
          src="/img/cisc-logo-with-description.png"
          alt="CISC – Bridging Cultures, Communities & Generations"
          style={{ width: "170px" }}
        />
      </div>

      {/* Login Card */}
      <div
        className="p-4"
        style={{
          width: "100%",
          maxWidth: "420px",
          border: "2px solid var(--call-to-action)",
          borderRadius: "12px",
          backgroundColor: "var(--background)",
        }}
      >
        {/* Welcome Heading */}
        <h2
          className="text-center mb-4"
          style={{
            color: "var(--call-to-action)",
            fontWeight: 600,
            fontSize: "1.4rem",
          }}
        >
          Welcome
        </h2>

        {/* Username Field */}
        <div className="mb-3">
          <input
            id="username"
            type="text"
            className="form-control"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              borderRadius: "50px",
              border: "2px solid var(--call-to-action)",
              padding: "0.6rem 1.1rem",
              color: "var(--primary-text)",
            }}
          />
        </div>

        {/* Password Field */}
        <div className="mb-3">
          <input
            id="password"
            type="password"
            className="form-control"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              borderRadius: "50px",
              border: "2px solid var(--call-to-action)",
              padding: "0.6rem 1.1rem",
              color: "var(--primary-text)",
            }}
          />
        </div>

        {/* Keep me signed in + Forgot Password */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="form-check">
            <input
              id="keepSignedIn"
              type="checkbox"
              className="form-check-input circular-checkbox"
              checked={keepSignedIn}
              onChange={(e) => setKeepSignedIn(e.target.checked)}
            />
            <label
              className="form-check-label"
              htmlFor="keepSignedIn"
              style={{ fontSize: "0.9rem", color: "var(--primary-text)" }}
            >
              Keep me signed in
            </label>
          </div>
          <Link
            to="#"
            style={{
              color: "var(--call-to-action)",
              fontWeight: 600,
              fontSize: "0.9rem",
              textDecoration: "none",
            }}
          >
            Forgot Password?
          </Link>
        </div>

        {/* Sign In Button */}
        <div className="d-flex justify-content-center">
          <Link
            to="/schedule"
            id="sign-in-btn"
            className="btn btn-primary px-5 py-2"
            role="button"
            style={{
              borderRadius: "50px",
              backgroundColor: "var(--call-to-action)",
              borderColor: "var(--call-to-action)",
              fontWeight: 600,
              fontSize: "1rem",
              letterSpacing: "0.03em",
            }}
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
