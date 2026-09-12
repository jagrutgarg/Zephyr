"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Redirect to login if user is not authenticated
        router.push("/login");
      } else {
        setUser(user);
      }
      setLoading(false);
    }
    getUser();
  }, [router, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: "center", padding: "3rem" }}>
          <div className="spinner" style={{ width: "32px", height: "32px", margin: "0 auto 1rem" }} />
          <p className="auth-subtitle">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const firstName = user?.user_metadata?.first_name || "User";
  const lastName = user?.user_metadata?.last_name || "";
  const username = user?.user_metadata?.username;
  const avatarLetter = firstName ? firstName.charAt(0).toUpperCase() : "Z";

  return (
    <div className="auth-container">
      <div className="auth-background-shapes">
        <div className="shape-1" />
        <div className="shape-2" />
      </div>

      <div className="dashboard-card">
        <div className="user-avatar">{avatarLetter}</div>
        <h1 className="auth-title">Welcome back, {firstName} {lastName}!</h1>
        <p className="auth-subtitle" style={{ marginBottom: "1.5rem" }}>
          Logged in as <strong>{user?.email}</strong> {username ? `(@${username})` : ""}
        </p>

        <div style={{
          background: "rgba(255, 255, 255, 0.05)",
          padding: "1rem 1.5rem",
          borderRadius: "0.75rem",
          marginBottom: "2rem",
          textAlign: "left",
          border: "1px solid rgba(255, 255, 255, 0.1)"
        }}>
          <p style={{ color: "#a1a1aa", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
            <strong>User ID:</strong> {user?.id}
          </p>
          <p style={{ color: "#a1a1aa", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
            <strong>Email Confirmed:</strong> {user?.email_confirmed_at ? "Yes ✅" : "Pending ⏳"}
          </p>
          {user?.user_metadata?.gender && (
            <p style={{ color: "#a1a1aa", fontSize: "0.875rem" }}>
              <strong>Gender:</strong> {user.user_metadata.gender}
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <button
            onClick={handleSignOut}
            className="btn-primary"
            style={{ display: "inline-flex", width: "auto", padding: "0.75rem 1.5rem" }}
          >
            Sign Out
          </button>
          <Link
            href="/"
            className="btn-social"
            style={{ display: "inline-flex", width: "auto", padding: "0.75rem 1.5rem" }}
          >
            Home Page
          </Link>
        </div>
      </div>
    </div>
  );
}
