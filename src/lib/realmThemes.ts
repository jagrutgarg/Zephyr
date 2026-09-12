export type SilhouetteType = "castle" | "trees" | "books" | "circuit" | "planet" | "gears" | "clouds" | "compass";

export type RealmTheme = {
  gradient: string;
  particleColor: string;
  silhouette: SilhouetteType;
};

// Per-realm visual identity, keyed by slug — the single place that drives
// every Realm Page's background/particle tint. Falls back to a neutral
// theme for any realm not listed here.
export const REALM_THEMES: Record<string, RealmTheme> = {
  celestial_kingdom: {
    gradient: "radial-gradient(circle at 50% 0%, rgba(251,191,36,0.25) 0%, rgba(15,23,42,0.4) 45%, #020617 100%)",
    particleColor: "#fde68a",
    silhouette: "castle",
  },
  enchanted_woods: {
    gradient: "radial-gradient(circle at 30% 20%, rgba(16,185,129,0.22) 0%, rgba(15,23,42,0.4) 45%, #020617 100%)",
    particleColor: "#6ee7b7",
    silhouette: "trees",
  },
  astral_library: {
    gradient: "radial-gradient(circle at 70% 10%, rgba(99,102,241,0.25) 0%, rgba(15,23,42,0.4) 45%, #020617 100%)",
    particleColor: "#a5b4fc",
    silhouette: "books",
  },
  neo_mystica: {
    gradient: "radial-gradient(circle at 50% 20%, rgba(139,92,246,0.28) 0%, rgba(6,20,26,0.5) 45%, #020617 100%)",
    particleColor: "#f0abfc",
    silhouette: "circuit",
  },
  xyran_frontier: {
    gradient: "radial-gradient(circle at 60% 15%, rgba(99,102,241,0.2) 0%, rgba(15,10,30,0.5) 45%, #020617 100%)",
    particleColor: "#c4b5fd",
    silhouette: "planet",
  },
  timeless_realm: {
    gradient: "radial-gradient(circle at 40% 10%, rgba(20,184,166,0.2) 0%, rgba(30,20,10,0.4) 45%, #020617 100%)",
    particleColor: "#5eead4",
    silhouette: "gears",
  },
  dreaming_isles: {
    gradient: "radial-gradient(circle at 50% 15%, rgba(244,114,182,0.25) 0%, rgba(20,15,30,0.4) 45%, #020617 100%)",
    particleColor: "#fbcfe8",
    silhouette: "clouds",
  },
  wandering_isles: {
    gradient: "radial-gradient(circle at 50% 15%, rgba(148,163,184,0.2) 0%, rgba(20,20,20,0.4) 45%, #020617 100%)",
    particleColor: "#e2e8f0",
    silhouette: "compass",
  },
};

export function getRealmTheme(slug: string): RealmTheme {
  return REALM_THEMES[slug] || {
    gradient: "radial-gradient(circle at 50% 0%, rgba(139,92,246,0.2) 0%, rgba(15,23,42,0.4) 45%, #020617 100%)",
    particleColor: "#c4b5fd",
    silhouette: "compass",
  };
}
