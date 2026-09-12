"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthEmblem } from "@/components/AuthEmblem";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Step 1: Send OTP to Email
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess("OTP reset code sent! Please check your email inbox.");
        setStep("verify");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and Reset Password
  const handleVerifyOtpAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!otp || otp.trim().length < 6) {
      setError("Please enter the 6-digit OTP code sent to your email.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // 1. Verify OTP token for recovery
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp.trim(),
        type: "recovery",
      });

      if (verifyError) {
        setError(verifyError.message);
        setLoading(false);
        return;
      }

      // 2. Update user's password once OTP session is active
      if (verifyData.session || verifyData.user) {
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (updateError) {
          setError(updateError.message);
        } else {
          setSuccess("Password reset successfully! Redirecting to login...");
          setTimeout(() => {
            router.push("/login");
          }, 1500);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reset password.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container aetheria-auth">
      <div className="auth-background-shapes">
        <div className="shape-1" />
        <div className="shape-2" />
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <AuthEmblem />
          </div>
          <h1 className="auth-title" style={{ fontSize: "1.9rem" }}>
            {step === "request" ? "Reset Password" : "Verify OTP Code"}
          </h1>
          <p className="auth-subtitle">
            {step === "request"
              ? "Enter your registered email to receive an OTP code"
              : `Enter the 6-digit OTP sent to ${email} and your new password`}
          </p>
        </div>

        {error && (
          <div className="alert alert-error">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        {step === "request" ? (
          <form onSubmit={handleRequestOtp}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email Address
              </label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                    />
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <div className="spinner" />
                  <span>Sending OTP...</span>
                </>
              ) : (
                <span>Send Reset OTP</span>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtpAndReset}>
            <div className="form-group">
              <label className="form-label" htmlFor="otp">
                6-Digit OTP Code
              </label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </span>
                <input
                  id="otp"
                  type="text"
                  className="form-input"
                  placeholder="Enter 6-digit OTP code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  disabled={loading}
                  maxLength={10}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="newPassword">
                New Password
              </label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </span>
                <input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">
                Confirm New Password
              </label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </span>
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <div className="spinner" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <span>Reset & Set New Password</span>
              )}
            </button>

            <div style={{ marginTop: "1rem", textAlign: "center" }}>
              <button
                type="button"
                className="forgot-link"
                style={{ background: "none", border: "none", cursor: "pointer" }}
                onClick={() => {
                  setStep("request");
                  setError("");
                  setSuccess("");
                }}
              >
                ← Back to Request OTP
              </button>
            </div>
          </form>
        )}

        <div className="auth-footer">
          Remembered your password?
          <Link href="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
