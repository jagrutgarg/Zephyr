"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DIFF_MAPPING, Difficulty } from "@/lib/questDefaults";

const MAX_TEXT_LENGTH = 200;

type RealmRow = { id: string; slug: string; name: string; guardian: string; accent_color: string };

type Step = "intent" | "classifying" | "confirm" | "manual" | "details" | "success";

export function OnboardingModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [realms, setRealms] = useState<RealmRow[]>([]);
  const [step, setStep] = useState<Step>("intent");
  const [intentText, setIntentText] = useState("");
  const [selectedRealm, setSelectedRealm] = useState<RealmRow | null>(null);
  const [confidence, setConfidence] = useState<"high" | "medium" | "low" | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastCreated, setLastCreated] = useState<{ title: string; realmName: string } | null>(null);

  useEffect(() => {
    supabase
      .from("realms")
      .select("id, slug, name, guardian, accent_color")
      .then(({ data }) => {
        if (data) setRealms(data);
      });
  }, [supabase]);

  const resetForNextQuest = () => {
    setIntentText("");
    setSelectedRealm(null);
    setConfidence(null);
    setDifficulty("normal");
    setTitle("");
    setDueDate("");
    setInfoMsg("");
    setErrorMsg("");
    setStep("intent");
  };

  const handleAskOracle = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = intentText.trim();
    if (!text) {
      setErrorMsg("Speak your intent before asking the oracle.");
      return;
    }
    setErrorMsg("");
    setStep("classifying");

    try {
      const res = await fetch("/api/classify-quest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();

      if (data.ok) {
        setSelectedRealm(data.realm);
        setConfidence(data.confidence);
        setDifficulty(data.difficulty || "normal");
        setStep("confirm");
      } else if (data.reason === "low_confidence") {
        setInfoMsg("The oracle isn't sure where this belongs. Choose a Realm yourself.");
        setStep("manual");
      } else {
        setInfoMsg("The oracle is resting. Pick a Realm manually for now.");
        setStep("manual");
      }
    } catch {
      setInfoMsg("The oracle is resting. Pick a Realm manually for now.");
      setStep("manual");
    }
  };

  const proceedToDetails = () => {
    setTitle(intentText.trim());
    setStep("details");
  };

  const handleManualPick = (realmId: string) => {
    const realm = realms.find((r) => r.id === realmId);
    if (realm) setSelectedRealm(realm);
  };

  const handleCreateQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedRealm) return;

    setSaving(true);
    setErrorMsg("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const payload = {
      user_id: user.id,
      realm_id: selectedRealm.id,
      title: title.trim(),
      description: "",
      difficulty,
      xp_value: DIFF_MAPPING[difficulty].xp,
      shard_value: DIFF_MAPPING[difficulty].shard,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
    };

    const { error } = await supabase.from("quests").insert([payload]);
    setSaving(false);

    if (error) {
      setErrorMsg("The Aether didn't respond. Try again.");
      return;
    }

    setLastCreated({ title: payload.title, realmName: selectedRealm.name });
    setStep("success");
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
            maxWidth: "480px",
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

          {errorMsg && (
            <div className="alert alert-error mb-4" role="alert" aria-live="assertive">
              {errorMsg}
            </div>
          )}

          {step === "intent" && (
            <motion.form key="intent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleAskOracle}>
              <h2 className="text-2xl font-bold mb-2">What quest will you conquer today?</h2>
              <p className="text-slate-400 mb-6">Speak your intent — the oracle will discern which Realm it belongs to.</p>
              <div className="form-group">
                <textarea
                  className="form-input"
                  style={{ paddingLeft: "1rem", minHeight: "90px", fontSize: "1.05rem" }}
                  value={intentText}
                  onChange={(e) => setIntentText(e.target.value.slice(0, MAX_TEXT_LENGTH))}
                  placeholder="e.g. Go for a run this evening"
                  maxLength={MAX_TEXT_LENGTH}
                  autoFocus
                />
                <div style={{ textAlign: "right", fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
                  {intentText.length}/{MAX_TEXT_LENGTH}
                </div>
              </div>
              <button type="submit" className="btn-primary mt-2" style={{ background: "#8b5cf6", color: "black", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                <Sparkles size={18} /> Ask the Oracle
              </button>
            </motion.form>
          )}

          {step === "classifying" && (
            <motion.div key="classifying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: "center", padding: "2rem 0" }}>
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                style={{ fontSize: "2rem", marginBottom: "1rem" }}
              >
                🔮
              </motion.div>
              <p className="auth-subtitle">An oracle is listening...</p>
            </motion.div>
          )}

          {step === "confirm" && selectedRealm && (
            <motion.div key="confirm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-xl font-bold mb-4">
                {confidence === "medium" ? "The oracle senses this belongs to" : "The oracle is certain:"}
              </h2>
              <div
                style={{
                  background: `${selectedRealm.accent_color}15`,
                  border: `1px solid ${selectedRealm.accent_color}60`,
                  borderRadius: "16px",
                  padding: "1.2rem",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ fontSize: "1.15rem", fontWeight: "bold", color: selectedRealm.accent_color }}>{selectedRealm.name}</div>
                <div style={{ fontSize: "0.85rem", color: "#cbd5e1", marginTop: "2px" }}>Guarded by {selectedRealm.guardian}</div>
                <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "8px", fontStyle: "italic" }}>&ldquo;{intentText}&rdquo;</div>
              </div>
              <button type="button" onClick={proceedToDetails} className="btn-primary mb-3" style={{ background: selectedRealm.accent_color, color: "black" }}>
                That&apos;s the one
              </button>
              <button
                type="button"
                onClick={() => { setInfoMsg(""); setStep("manual"); }}
                style={{ display: "block", width: "100%", textAlign: "center", background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "0.85rem" }}
              >
                Not quite? Choose a different Realm
              </button>
            </motion.div>
          )}

          {step === "manual" && (
            <motion.div key="manual" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {infoMsg && (
                <div className="alert mb-4" role="status" style={{ background: "rgba(148,163,184,0.15)", border: "1px solid rgba(148,163,184,0.4)", borderRadius: "12px", padding: "0.75rem 1rem", color: "#cbd5e1" }}>
                  {infoMsg}
                </div>
              )}
              <h2 className="text-xl font-bold mb-4">Choose a Realm</h2>
              <div className="form-group">
                <label className="form-label" htmlFor="manual-realm">Realm</label>
                <select
                  id="manual-realm"
                  className="form-input form-select"
                  style={{ paddingLeft: "1rem" }}
                  value={selectedRealm?.id ?? ""}
                  onChange={(e) => handleManualPick(e.target.value)}
                >
                  <option value="" disabled>Select a Realm</option>
                  {realms.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={proceedToDetails}
                disabled={!selectedRealm}
                className="btn-primary mt-2"
                style={{ background: selectedRealm?.accent_color || "#8b5cf6", color: "black" }}
              >
                Continue
              </button>
            </motion.div>
          )}

          {step === "details" && selectedRealm && (
            <motion.form key="details" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleCreateQuest} className="flex flex-col gap-4">
              <h2 className="text-xl font-bold mb-2" style={{ color: selectedRealm.accent_color }}>{selectedRealm.name}</h2>
              <div className="form-group mb-0">
                <label className="form-label" htmlFor="quest-title">Quest</label>
                <input
                  id="quest-title"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: "1rem" }}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="flex gap-4">
                <div className="form-group flex-1 mb-0">
                  <label className="form-label" htmlFor="quest-difficulty">Difficulty</label>
                  <select
                    id="quest-difficulty"
                    className="form-input form-select"
                    style={{ paddingLeft: "1rem" }}
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  >
                    <option value="easy">Easy (10 XP / 5 Shards)</option>
                    <option value="normal">Normal (25 XP / 12 Shards)</option>
                    <option value="hard">Hard (50 XP / 25 Shards)</option>
                  </select>
                </div>
                <div className="form-group flex-1 mb-0">
                  <label className="form-label" htmlFor="quest-due">Due Date (Optional)</label>
                  <input
                    id="quest-due"
                    type="date"
                    className="form-input"
                    style={{ paddingLeft: "1rem" }}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary mt-2" disabled={saving} style={{ background: selectedRealm.accent_color, color: "black" }}>
                {saving ? "Binding Quest..." : "Bind Quest to Realm"}
              </button>
            </motion.form>
          )}

          {step === "success" && lastCreated && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✨</div>
              <h2 className="text-xl font-bold mb-2">Quest Bound</h2>
              <p className="text-slate-400 mb-6">&ldquo;{lastCreated.title}&rdquo; now belongs to {lastCreated.realmName}.</p>
              <button type="button" onClick={resetForNextQuest} className="btn-primary mb-3" style={{ background: "#8b5cf6", color: "black" }}>
                Add Another Quest
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{ display: "block", width: "100%", textAlign: "center", background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "0.85rem" }}
              >
                Done
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
