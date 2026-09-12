"use client";

import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="auth-container">
      <div className="auth-background-shapes">
        <div className="shape-1" />
        <div className="shape-2" />
      </div>

      <div className="dashboard-card">
        <div className="user-avatar">Z</div>
        <h1 className="auth-title">Welcome to Zephyr Dashboard!</h1>
        <p className="auth-subtitle" style={{ marginBottom: "2rem" }}>
          You have successfully logged in to your account.
        </p>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <Link href="/login" className="btn-primary" style={{ display: "inline-flex", width: "auto", padding: "0.75rem 1.5rem" }}>
            Sign Out
          </Link>
          <Link href="/" className="btn-social" style={{ display: "inline-flex", width: "auto", padding: "0.75rem 1.5rem" }}>
            Home Page
          </Link>
        </div>
      </div>
    </div>
  );
}
