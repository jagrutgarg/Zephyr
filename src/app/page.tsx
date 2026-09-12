import Link from "next/link";
import ParticleBackground from "@/components/ParticleBackground";

export default function Home() {
  return (
    <div className="auth-container">
      <div className="auth-background-shapes">
        <ParticleBackground />
        <div className="shape-1" />
        <div className="shape-2" />
      </div>

      <div className="auth-card" style={{ textAlign: "center", maxWidth: "600px" }}>
        <h1 className="auth-title" style={{ fontSize: "2.5rem", marginBottom: "2rem" }}>Aetheria</h1>
        
        <div style={{ color: "#cbd5e1", fontSize: "1.1rem", lineHeight: "1.6", marginBottom: "3rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p>Once upon a time, beyond the stars, there was a world powered by Aether.</p>
          <p>Aether grew whenever an intention became an action.</p>
          <p>But unfinished intentions created something else. <strong style={{color: '#f43f5e'}}>The Void.</strong></p>
          <p>Now, Aetheria is fading. And its future is in your hands.</p>
          <p style={{ fontWeight: 'bold', color: 'white', marginTop: '1rem' }}>Your quests. Your choices. Your world.</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Link href="/login" className="btn-primary" style={{ padding: "1rem", fontSize: "1.2rem" }}>
            Enter Aetheria
          </Link>
        </div>
      </div>
    </div>
  );
}
