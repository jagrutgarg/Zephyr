"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { AuthEmblem } from "@/components/AuthEmblem";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Post-signup "What should we call you?" step
  const [step, setStep] = useState<"form" | "naming" | "pending">("form");
  const [hasSession, setHasSession] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [namingLoading, setNamingLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!firstName || !lastName || !gender || !email || !password || !confirmPassword) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!agreeTerms) {
      setError("You must agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            first_name: firstName,
            last_name: lastName,
            gender: gender,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      setHasSession(!!data.session);
      setDisplayName(firstName);
      setStep("naming");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNamingLoading(true);
    const name = displayName.trim() || firstName;

    if (hasSession) {
      await supabase.auth.updateUser({ data: { display_name: name } });
      setNamingLoading(false);
      router.push("/dashboard");
    } else {
      // Email confirmation pending — no session yet to attach metadata to.
      // Dashboard picks this up and saves it once the user confirms and logs in.
      sessionStorage.setItem("pendingDisplayName", name);
      setNamingLoading(false);
      setSuccess("A sigil has been sent to your inbox. Confirm it to awaken.");
      setStep("pending");
    }
  };

  const handleGitHubSignIn = async () => {
    setError("");
    try {
      const { error: oAuthError } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (oAuthError) setError(oAuthError.message);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign in with GitHub.";
      setError(message);
    }
  };

  return (
    <div className="auth-container aetheria-auth">
      <div className="auth-background-shapes">
        <div className="shape-1" />
        <div className="shape-2" />
      </div>

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="auth-header">
          <div className="auth-logo">
            <AuthEmblem />
          </div>
          <h1 className="auth-title">Aetheria</h1>
          <p className="auth-subtitle">The Realms of Aether</p>
        </div>

        {error && (
          <div className="alert alert-error" role="alert" aria-live="assertive">
            <svg
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
          <div className="alert alert-success" role="status" aria-live="polite">
            <svg
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>{success}</span>
          </div>
        )}

        <div className="social-btns">
          <button type="button" className="btn-social" style={{ width: "100%", justifyContent: "center" }} onClick={handleGitHubSignIn}>
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Awaken with GitHub
          </button>
        </div>

        <div className="auth-footer">
          Already a Guardian?
          <Link href="/login">Return home</Link>
        </div>
      </motion.div>
    </div>
  );
}
