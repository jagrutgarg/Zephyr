"use client";

import { motion } from "framer-motion";
import ParticleBackground from "./ParticleBackground";
import { RealmSilhouette } from "./RealmSilhouette";
import { getRealmTheme } from "@/lib/realmThemes";
import { useParallax } from "@/hooks/useParallax";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Full-bleed, per-realm background: a themed gradient, a large blurred
 * silhouette hinting at the realm's identity, and accent-tinted ambient
 * particles — all driven by REALM_THEMES[slug], so every Realm Page uses
 * this one component and differs purely through data.
 */
export function RealmBackground({ slug, accentColor }: { slug: string; accentColor: string }) {
  const theme = getRealmTheme(slug);
  const mouse = useParallax();
  const reducedMotion = usePrefersReducedMotion();
  const parallaxAmount = reducedMotion ? 0 : 1;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
      <div style={{ position: "absolute", inset: 0, background: theme.gradient }} />
      <motion.div
        style={{ position: "absolute", inset: "-5%" }}
        animate={{ x: mouse.x * -20 * parallaxAmount, y: mouse.y * -12 * parallaxAmount }}
        transition={{ type: "spring", stiffness: 40, damping: 20 }}
      >
        <RealmSilhouette type={theme.silhouette} color={accentColor} />
      </motion.div>
      <ParticleBackground color={theme.particleColor} />
    </div>
  );
}
