import Link from "next/link";

export default function Home() {
  return (
    <div className="auth-container">
      <div className="auth-background-shapes">
        <div className="shape-1" />
        <div className="shape-2" />
      </div>

      <div className="auth-card" style={{ textAlign: "center" }}>
        <div className="auth-logo" style={{ margin: "0 auto 1.5rem" }}>
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>

        <h1 className="auth-title">Zephyr Portal</h1>
        <p className="auth-subtitle" style={{ marginBottom: "2.5rem" }}>
          Modern Next.js &amp; React Authentication System
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Link href="/login" className="btn-primary">
            Sign In to Account
          </Link>
          <Link href="/signup" className="btn-social" style={{ justifyContent: "center" }}>
            Create New Account
          </Link>
        </div>
      </div>
    </div>
  );
}
