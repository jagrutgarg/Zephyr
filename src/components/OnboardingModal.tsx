"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DIFF_MAPPING, Difficulty } from "@/lib/questDefaults";

export type RealmOption = { id: string; name: string; themeColor: string };

type DraftQuest = {
  title: string;
  realmSlug: string;
  difficulty: Difficulty;
};

export function OnboardingModal({
  realms,
  onClose,
  onSaved,
}: {
  realms: RealmOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [drafts, setDrafts] = useState<DraftQuest[]>([
    { title: "", realmSlug: realms[0]?.id ?? "", difficulty: "normal" },
  ]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const updateDraft = (index: number, patch: Partial<DraftQuest>) => {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const addDraftRow = () => {
    setDrafts((prev) => [...prev, { title: "", realmSlug: realms[0]?.id ?? "", difficulty: "normal" }]);
  };

  const removeDraftRow = (index: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validDrafts = drafts.filter((d) => d.title.trim());
    if (validDrafts.length === 0) {
      setErrorMsg("Give at least one Quest a title before setting forth.");
      return;
    }

    setSaving(true);
    setErrorMsg("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const { data: realmRows, error: realmError } = await supabase
      .from("realms")
      .select("id, slug")
      .in("slug", validDrafts.map((d) => d.realmSlug));

    if (realmError || !realmRows) {
      setErrorMsg("The Aether didn't respond. Try again.");
      setSaving(false);
      return;
    }

    const slugToRealmId = new Map(realmRows.map((r) => [r.slug, r.id]));

    const payload = validDrafts.map((d) => ({
      user_id: user.id,
      realm_id: slugToRealmId.get(d.realmSlug),
      title: d.title.trim(),
      description: "",
      difficulty: d.difficulty,
      xp_value: DIFF_MAPPING[d.difficulty].xp,
      shard_value: DIFF_MAPPING[d.difficulty].shard,
      due_date: null,
    }));

    const { error } = await supabase.from("quests").insert(payload);
    setSaving(false);

    if (error) {
      setErrorMsg("The Aether didn't respond. Try again.");
      return;
    }

    onSaved();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20, rotateX: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          style={{
            background: "rgba(15,23,42,0.92)",
            border: "1px solid rgba(139,92,246,0.5)",
            borderRadius: "24px",
            padding: "2rem",
            width: "100%",
            maxWidth: "560px",
            position: "relative",
            zIndex: 51,
            boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 50px rgba(139,92,246,0.2)",
            perspective: 1000,
            maxHeight: "85vh",
            overflowY: "auto",
          }}
        >
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "transparent", border: "none", color: "white", cursor: "pointer" }}
          >
            <X size={24} />
          </button>

          <h2 className="text-2xl font-bold mb-2">The Map Awaits Your Purpose</h2>
          <p className="text-slate-400 mb-6">
            Name your first Quests and choose the Realm each belongs to — a Tower rises for every Realm you claim.
          </p>

          {errorMsg && (
            <div className="alert alert-error mb-4" role="alert" aria-live="assertive">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {drafts.map((draft, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  alignItems: "flex-end",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "16px",
                  padding: "1rem",
                }}
              >
                <div className="form-group mb-0 flex-1">
                  <label className="form-label" htmlFor={`quest-title-${i}`}>Quest</label>
                  <input
                    id={`quest-title-${i}`}
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: "1rem" }}
                    value={draft.title}
                    onChange={(e) => updateDraft(i, { title: e.target.value })}
                    placeholder="e.g. Run 3km"
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label" htmlFor={`quest-realm-${i}`}>Realm</label>
                  <select
                    id={`quest-realm-${i}`}
                    className="form-input form-select"
                    style={{ paddingLeft: "1rem" }}
                    value={draft.realmSlug}
                    onChange={(e) => updateDraft(i, { realmSlug: e.target.value })}
                  >
                    {realms.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group mb-0">
                  <label className="form-label" htmlFor={`quest-diff-${i}`}>Difficulty</label>
                  <select
                    id={`quest-diff-${i}`}
                    className="form-input form-select"
                    style={{ paddingLeft: "1rem" }}
                    value={draft.difficulty}
                    onChange={(e) => updateDraft(i, { difficulty: e.target.value as Difficulty })}
                  >
                    <option value="easy">Easy</option>
                    <option value="normal">Normal</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                {drafts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDraftRow(i)}
                    aria-label="Remove quest"
                    style={{ background: "transparent", border: "none", color: "#f43f5e", cursor: "pointer", paddingBottom: "0.6rem" }}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addDraftRow}
              style={{ background: "rgba(139,92,246,0.15)", border: "1px dashed rgba(139,92,246,0.5)", borderRadius: "12px", padding: "0.6rem", color: "#c4b5fd", cursor: "pointer", display: "flex", gap: "0.5rem", alignItems: "center", justifyContent: "center" }}
            >
              <Plus size={16} /> Add another Quest
            </button>

            <button type="submit" className="btn-primary mt-2" disabled={saving} style={{ background: "#8b5cf6", color: "black" }}>
              {saving ? "Summoning Towers..." : "Set Forth"}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
