"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Volume2, VolumeX } from "lucide-react";

const VOLUME_KEY = "aetheria_audio_volume";
const MUTED_KEY = "aetheria_audio_muted";

// Background music only plays once the player is actually in Aetheria —
// not on the public marketing/auth pages.
const SILENT_ROUTES = ["/", "/login", "/signup", "/forgot-password"];

export function AudioController() {
  const pathname = usePathname();
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const [volume, setVolume] = useState(0.4);
  const [muted, setMuted] = useState(false);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  // Load saved preferences once on mount.
  useEffect(() => {
    const savedVolume = localStorage.getItem(VOLUME_KEY);
    const savedMuted = localStorage.getItem(MUTED_KEY);
    if (savedVolume !== null) setVolume(parseFloat(savedVolume));
    if (savedMuted !== null) setMuted(savedMuted === "true");
    setReady(true);
  }, []);

  // Keep the <audio> element's volume/mute in sync, and persist preferences.
  useEffect(() => {
    if (!ready) return;
    if (musicRef.current) {
      musicRef.current.volume = volume;
      musicRef.current.muted = muted;
    }
    localStorage.setItem(VOLUME_KEY, String(volume));
    localStorage.setItem(MUTED_KEY, String(muted));
  }, [volume, muted, ready]);

  // Play/pause background music based on which page we're on.
  useEffect(() => {
    const audio = musicRef.current;
    if (!audio || !ready) return;
    const shouldPlay = !SILENT_ROUTES.includes(pathname);
    if (shouldPlay) {
      audio.play().catch(() => {
        // Autoplay blocked — resume on the next user interaction anywhere.
        const resume = () => {
          audio.play().catch(() => {});
          window.removeEventListener("click", resume);
        };
        window.addEventListener("click", resume, { once: true });
      });
    } else {
      audio.pause();
    }
  }, [pathname, ready]);

  // Global click sound — every click anywhere on the site.
  useEffect(() => {
    if (!ready) return;
    const handleClick = () => {
      if (muted) return;
      const click = new Audio("/audio/click.mp3");
      click.volume = volume * 0.6;
      click.play().catch(() => {});
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [muted, volume, ready]);

  return (
    <>
      <audio ref={musicRef} src="/audio/background-music.mp3" loop preload="auto" />

      <div style={{ position: "fixed", bottom: "1.25rem", left: "1.25rem", zIndex: 100 }}>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Audio settings"
          style={{
            width: "42px", height: "42px", borderRadius: "50%",
            background: "rgba(15,23,42,0.85)", border: "1px solid rgba(139,92,246,0.4)",
            color: "#c4b5fd", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(10px)", boxShadow: "0 4px 15px rgba(0,0,0,0.4)",
          }}
        >
          <Settings size={18} />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              style={{
                position: "absolute", bottom: "3.2rem", left: 0,
                background: "rgba(15,23,42,0.95)", border: "1px solid rgba(139,92,246,0.4)",
                borderRadius: "14px", padding: "1rem", width: "220px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)", backdropFilter: "blur(10px)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.85rem", color: "#e2e8f0", fontWeight: "bold" }}>Sound</span>
                <button
                  onClick={() => setMuted((m) => !m)}
                  aria-label={muted ? "Unmute" : "Mute"}
                  style={{ background: "transparent", border: "none", color: muted ? "#f87171" : "#c4b5fd", cursor: "pointer", display: "flex" }}
                >
                  {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                disabled={muted}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "#8b5cf6", opacity: muted ? 0.4 : 1 }}
                aria-label="Volume"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
