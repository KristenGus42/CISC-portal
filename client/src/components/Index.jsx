import { useState } from "react";
import { useNavigate } from "react-router";
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

      if (userData.status === "disabled") {
        setError("Your account has been disabled. Please contact an administrator if you need access.");
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

  const handleForgotPassword = () => {
    clearAccessError();
    setError("Please contact an administrator to reset your password.");
  };

  return (
    <div className="login-page d-flex flex-column align-items-center justify-content-center">
      {/* CISC Logo */}
      <div className="mb-4 text-center">
        <img
          src="/img/cisc-logo-with-description.png"
          alt="CISC – Bridging Cultures, Communities & Generations"
          className="login-logo"
        />
      </div>

      {/* Login Card */}
      <div className="login-card p-4">
        {/* Welcome Heading */}
        <h2 className="login-title text-center mb-4">
          Welcome
        </h2>

        {(error || accessError) && (
          <div className="login-alert alert alert-danger p-2 text-center mb-3">
            {error || accessError}
          </div>
        )}

        <form onSubmit={handleLogin}>
          {/* Username Field */}
          <div className="mb-3">
            <input
              id="username"
              type="text"
              className="login-input form-control"
              placeholder="Email or Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {/* Password Field */}
          <div className="mb-3">
            <input
              id="password"
              type="password"
              className="login-input form-control"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
                className="login-check-label form-check-label"
                htmlFor="keepSignedIn"
              >
                Keep me signed in
              </label>
            </div>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="login-forgot-btn"
            >
              Forgot Password?
            </button>
          </div>

          {/* Sign In Button */}
          <div className="d-flex justify-content-center">
            <button
              type="submit"
              id="sign-in-btn"
              className="login-submit-btn btn btn-primary px-5 py-2"
              disabled={loading}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
