"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Swords, Sparkles, Clock, Repeat, ListChecks, Wand2, ArrowDown } from "lucide-react";
import { TwinklingStars } from "@/components/TwinklingStars";
import { REALMS } from "@/lib/realms";
import { getRealmTheme } from "@/lib/realmThemes";

// Re-enters-viewport animations, used everywhere below so scrolling back up
// replays them instead of only firing once.
const fadeUp = {
  initial: { opacity: 0, y: 50 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: false, amount: 0.35 },
  transition: { duration: 0.7, ease: "easeOut" as const },
};

const fadeIn = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: false, amount: 0.3 },
  transition: { duration: 0.8 },
};

function Section({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <section style={{ position: "relative", padding: "6rem 1.5rem", ...style }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto", position: "relative", zIndex: 1 }}>{children}</div>
    </section>
  );
}

const FEATURES = [
  {
    icon: Wand2,
    title: "Speak Your Intent",
    color: "#8b5cf6",
    text: "Type a task in plain English. An oracle listens and discerns which Realm it belongs to — no dropdowns, no categorizing it yourself.",
  },
  {
    icon: Clock,
    title: "The Orbit Timer",
    color: "#f472b6",
    text: "Commit to a focus session and watch your character orbit that Realm's Tower in real time. The orbit completes exactly one revolution as your time runs out — the orbit is the timer.",
  },
  {
    icon: Repeat,
    title: "Quests That Return",
    color: "#14b8a6",
    text: "Daily habits and weekly rituals spawn their next occurrence automatically the moment you finish today's — nothing vanishes, nothing resets your streak.",
  },
  {
    icon: ListChecks,
    title: "Still a Real Todo List",
    color: "#60a5fa",
    text: "A unified Today view, instant quick-add, search, due dates, and manual editing — every AI or game mechanic has a fast, honest fallback underneath it.",
  },
];

export default function Home() {
  return (
    <div style={{ background: "#020617", color: "white", overflowX: "hidden" }}>
      {/* Fixed nav */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.2rem 1.5rem", backdropFilter: "blur(10px)", background: "rgba(2,6,23,0.5)" }}>
        <div style={{ fontWeight: "bold", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Sparkles size={18} color="#a855f7" /> Aetheria
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link href="/login" style={{ color: "#cbd5e1", fontSize: "0.9rem", padding: "0.5rem 1rem", textDecoration: "none" }}>Log In</Link>
          <Link href="/signup" className="btn-primary" style={{ width: "auto", padding: "0.5rem 1.2rem", fontSize: "0.9rem" }}>Sign Up</Link>
        </div>
      </div>

      {/* HERO */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "1.5rem" }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <TwinklingStars count={140} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 40%, rgba(99,102,241,0.18) 0%, transparent 55%)" }} />
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }} style={{ position: "relative" }}>
          <h1 style={{ fontSize: "clamp(2.8rem, 8vw, 5.5rem)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "1rem", textShadow: "0 0 60px rgba(139,92,246,0.5)" }}>
            Aetheria
          </h1>
          <p style={{ fontSize: "clamp(1rem, 2.5vw, 1.3rem)", color: "#94a3b8", maxWidth: "560px", margin: "0 auto 2.5rem" }}>
            A world sustained by intention. Your real tasks, reborn as Quests — complete them to grow your Realms and hold back the Void.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/signup" className="btn-primary" style={{ width: "auto", padding: "1rem 2.2rem", fontSize: "1.05rem" }}>
              Enter Aetheria
            </Link>
            <Link href="/login" style={{ color: "#cbd5e1", padding: "1rem 1.5rem", fontSize: "1.05rem", textDecoration: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px" }}>
              I already have an account
            </Link>
          </div>
        </motion.div>

        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute", bottom: "2.5rem", color: "#64748b", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem" }}
        >
          Scroll to learn the story <ArrowDown size={16} />
        </motion.div>
      </section>

      {/* THE STORY */}
      <Section style={{ background: "linear-gradient(180deg, #020617 0%, #0b0f2e 100%)" }}>
        <motion.div {...fadeUp} style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto" }}>
          <div style={{ color: "#94a3b8", fontSize: "0.8rem", fontWeight: "bold", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1rem" }}>The Story</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", fontSize: "1.15rem", lineHeight: 1.7, color: "#e2e8f0" }}>
            <p>Once upon a time, beyond the stars, there was a world powered by Aether.</p>
            <p>Aether grew whenever an intention became an action.</p>
            <p>
              But unfinished intentions created something else.{" "}
              <span style={{ color: "#f87171", fontWeight: "bold" }}>The Void.</span>
            </p>
            <p>Now, Aetheria is fading. And its future is in your hands.</p>
            <p style={{ fontWeight: "bold", color: "white", fontSize: "1.3rem", marginTop: "0.5rem" }}>
              Your quests. Your choices. Your world.
            </p>
          </div>
        </motion.div>
      </Section>

      {/* THE REALMS */}
      <Section style={{ background: "#0b0f2e" }}>
        <motion.div {...fadeUp} style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{ color: "#94a3b8", fontSize: "0.8rem", fontWeight: "bold", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.75rem" }}>Eight Realms</div>
          <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 800 }}>Every part of your life has a home here</h2>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>
          {REALMS.map((realm, i) => {
            const theme = getRealmTheme(realm.id);
            return (
              <motion.div
                key={realm.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.4 }}
                transition={{ duration: 0.5, delay: (i % 4) * 0.08 }}
                whileHover={{ scale: 1.04, y: -4 }}
                style={{
                  position: "relative",
                  borderRadius: "18px",
                  padding: "1.5rem",
                  overflow: "hidden",
                  border: `1px solid ${realm.themeColor}40`,
                  background: theme.gradient,
                  minHeight: "150px",
                }}
              >
                <div style={{ fontWeight: "bold", fontSize: "1.05rem", marginBottom: "0.3rem" }}>{realm.name}</div>
                <div style={{ fontSize: "0.8rem", color: realm.themeColor, fontWeight: "bold", marginBottom: "0.5rem" }}>{realm.attribute}</div>
                <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Guarded by {realm.guardian}</div>
              </motion.div>
            );
          })}
        </div>
      </Section>

      {/* FEATURES */}
      <Section style={{ background: "linear-gradient(180deg, #0b0f2e 0%, #020617 100%)" }}>
        <motion.div {...fadeUp} style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <div style={{ color: "#94a3b8", fontSize: "0.8rem", fontWeight: "bold", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.75rem" }}>How It Works</div>
          <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 800 }}>A todo list that actually feels like something</h2>
        </motion.div>

        <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const fromLeft = i % 2 === 0;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: fromLeft ? -60 : 60 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, amount: 0.4 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", flexDirection: fromLeft ? "row" : "row-reverse", textAlign: fromLeft ? "left" : "right" }}
              >
                <div style={{
                  flexShrink: 0, width: "56px", height: "56px", borderRadius: "16px",
                  background: `${f.color}20`, border: `1px solid ${f.color}60`,
                  display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 25px ${f.color}30`,
                }}>
                  <Icon size={26} color={f.color} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.3rem", fontWeight: "bold", marginBottom: "0.5rem" }}>{f.title}</h3>
                  <p style={{ color: "#94a3b8", lineHeight: 1.6, maxWidth: "480px" }}>{f.text}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Section>

      {/* THE VOID */}
      <Section style={{ background: "radial-gradient(circle at 50% 50%, #1e1b2e 0%, #020617 70%)" }}>
        <motion.div {...fadeIn} style={{ textAlign: "center", maxWidth: "650px", margin: "0 auto" }}>
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: "80px", height: "80px", borderRadius: "50%", margin: "0 auto 1.5rem", background: "radial-gradient(circle, #000000 20%, #1e1b4b 80%)", boxShadow: "0 0 40px rgba(239,68,68,0.4)" }}
          />
          <h2 style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 800, marginBottom: "1rem", color: "#fca5a5" }}>The Void doesn't wait</h2>
          <p style={{ color: "#94a3b8", lineHeight: 1.7, fontSize: "1.05rem" }}>
            Every task left undone feeds it a little more. Left unchecked, it dampens what you earn.
            Push it back, and every Realm you tend grows a little brighter. It's a genuine mechanic, not just a mood.
          </p>
        </motion.div>
      </Section>

      {/* FINAL CTA */}
      <Section style={{ background: "#020617", paddingBottom: "8rem" }}>
        <motion.div {...fadeUp} style={{ textAlign: "center" }}>
          <Swords size={40} color="#8b5cf6" style={{ marginBottom: "1.5rem" }} />
          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, marginBottom: "1rem" }}>Begin your journey</h2>
          <p style={{ color: "#94a3b8", marginBottom: "2.5rem", fontSize: "1.05rem" }}>Aetheria is waiting on your first Quest.</p>
          <Link href="/signup" className="btn-primary" style={{ width: "auto", padding: "1.1rem 2.6rem", fontSize: "1.1rem", display: "inline-flex" }}>
            Enter Aetheria
          </Link>
        </motion.div>
      </Section>

      <footer style={{ textAlign: "center", padding: "2rem", color: "#475569", fontSize: "0.8rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        Aetheria — The Realm Walker
      </footer>
    </div>
  );
}
