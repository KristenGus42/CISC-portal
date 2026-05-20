import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { getDatabase, ref, get } from "firebase/database";
import { isValidRole } from "../auth/roles";
import { useAuth } from "../auth/useAuth";

export default function Index() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { accessError, clearAccessError } = useAuth();
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    clearAccessError();
    setLoading(true);

    try {
      const auth = getAuth();
      await setPersistence(
        auth,
        keepSignedIn ? browserLocalPersistence : browserSessionPersistence
      );

      // Username is usually an email for Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, username, password);
      const user = userCredential.user;

      const db = getDatabase();
      const userRef = ref(db, `users/${user.uid}`);
      const snapshot = await get(userRef);

      const userData = snapshot.exists() ? snapshot.val() : null;
      const role = userData?.role;

      if (!userData) {
        setError("Your account may have been deleted by an administrator. Please contact an administrator if you need access.");
        await signOut(auth);
        return;
      }

      if (isValidRole(role)) {

        // Route based on role
        if (role === "Admin") {
          navigate("/schedule");
        } else if (role === "Staff") {
          navigate("/case-library");
        } else if (role === "Attorney") {
          navigate("/attorney-view");
        } else {
          navigate("/schedule");
        }
      } else {
        setError("User access not found. Please contact an administrator.");
        await signOut(auth);
      }
    } catch (err) {
      console.error(err);
      setError("Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

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

        {(error || accessError) && (
          <div className="alert alert-danger p-2 text-center mb-3" style={{ fontSize: "0.9rem" }}>
            {error || accessError}
          </div>
        )}

        <form onSubmit={handleLogin}>
          {/* Username Field */}
          <div className="mb-3">
            <input
              id="username"
              type="text"
              className="form-control"
              placeholder="Email or Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                borderRadius: "50px",
                border: "2px solid var(--call-to-action)",
                padding: "0.6rem 1.1rem",
                color: "var(--primary-text)",
              }}
              required
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
              required
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
            <button
              type="submit"
              id="sign-in-btn"
              className="btn btn-primary px-5 py-2"
              disabled={loading}
              style={{
                borderRadius: "50px",
                backgroundColor: "var(--call-to-action)",
                borderColor: "var(--call-to-action)",
                fontWeight: 600,
                fontSize: "1rem",
                letterSpacing: "0.03em",
              }}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
