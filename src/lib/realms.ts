export type Attribute =
  | "Strength"
  | "Intellect"
  | "Vitality"
  | "Creativity"
  | "Discipline"
  | "Exploration";

export type RealmDef = {
  id: string; // matches realms.slug in Supabase
  name: string;
  guardian: string;
  themeColor: string;
  attribute: Attribute;
  x: number;
  y: number;
};

export const REALMS: RealmDef[] = [
  { id: "enchanted_woods", name: "The Enchanted Woods", guardian: "The Fairy Keeper", themeColor: "#10b981", attribute: "Strength", x: 20, y: 30 },
  { id: "celestial_kingdom", name: "The Celestial Kingdom", guardian: "The Royal Dragon", themeColor: "#fbbf24", attribute: "Vitality", x: 50, y: 15 },
  { id: "astral_library", name: "The Astral Library", guardian: "The Archivist", themeColor: "#3b82f6", attribute: "Intellect", x: 80, y: 30 },
  { id: "xyran_frontier", name: "Xyran Frontier", guardian: "The Star Wanderer", themeColor: "#6366f1", attribute: "Exploration", x: 60, y: 85 },
  { id: "timeless_realm", name: "The Timeless Realm", guardian: "The Chronomancer", themeColor: "#14b8a6", attribute: "Discipline", x: 30, y: 85 },
  { id: "dreaming_isles", name: "The Dreaming Isles", guardian: "The Dream Weaver", themeColor: "#f472b6", attribute: "Creativity", x: 10, y: 60 },
];

export function findRealmBySlug(slug: string): RealmDef | undefined {
  return REALMS.find((r) => r.id === slug);
}

export function findRealmByAttribute(attribute: string): RealmDef | undefined {
  return REALMS.find((r) => r.attribute.toLowerCase() === attribute.toLowerCase());
}
