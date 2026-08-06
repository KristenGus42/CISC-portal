import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router";
import { getFunctions, httpsCallable } from "firebase/functions";

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("This reset link is missing its token. Please use the link from your email.");
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const functions = getFunctions();
      const completePasswordReset = httpsCallable(functions, "completePasswordReset");
      await completePasswordReset({ token, newPassword });
      setSuccess(true);
    } catch (err) {
      console.error("Password reset error:", err);
      setError(err.message || "Failed to reset password. Please request a new link and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page d-flex flex-column align-items-center justify-content-center">
      <div className="mb-4 text-center">
        <img
          src="/img/cisc-logo-with-description.png"
          alt="CISC – Bridging Cultures, Communities & Generations"
          className="login-logo"
        />
      </div>

      <div className="login-card p-4">
        <h2 className="login-title text-center mb-4">Reset Password</h2>

        {!token && (
          <div className="login-alert alert alert-danger p-2 text-center mb-3">
            This link is missing its reset token. Please use the link from your email.
          </div>
        )}

        {success ? (
          <div>
            <div className="login-alert alert alert-success p-2 text-center mb-3">
              Your password has been reset. You can now sign in.
            </div>
            <div className="d-flex justify-content-center">
              <button
                type="button"
                className="login-submit-btn btn btn-primary px-5 py-2"
                onClick={() => navigate("/")}
              >
                Back to Sign In
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="login-alert alert alert-danger p-2 text-center mb-3">
                {error}
              </div>
            )}

            <div className="mb-3">
              <input
                id="newPassword"
                type="password"
                className="login-input form-control"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={!token}
              />
            </div>

            <div className="mb-4">
              <input
                id="confirmPassword"
                type="password"
                className="login-input form-control"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={!token}
              />
            </div>

            <div className="d-flex justify-content-center mb-3">
              <button
                type="submit"
                className="login-submit-btn btn btn-primary px-5 py-2"
                disabled={loading || !token}
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </div>

            <div className="text-center">
              <Link to="/" className="login-forgot-btn">Back to Sign In</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
