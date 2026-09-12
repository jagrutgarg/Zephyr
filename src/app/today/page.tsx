"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Plus, Search, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DIFF_MAPPING } from "@/lib/questDefaults";

type QuestRow = {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "normal" | "hard";
  due_date: string | null;
  realm_id: string;
  realms: { slug: string; name: string; accent_color: string } | null;
};

export default function TodayPage() {
  const router = useRouter();
  const supabase = createClient();
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [quickAddText, setQuickAddText] = useState("");
  const [wanderingIslesId, setWanderingIslesId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const loadQuests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data } = await supabase
      .from("quests")
      .select("id, title, description, difficulty, due_date, realm_id, realms(slug, name, accent_color)")
      .eq("user_id", user.id)
      .eq("is_completed", false)
      .order("due_date", { ascending: true, nullsFirst: false });

    if (data) setQuests(data as any);

    const { data: wandering } = await supabase.from("realms").select("id").eq("slug", "wandering_isles").single();
    if (wandering) setWanderingIslesId(wandering.id);

    setLoading(false);
  };

  useEffect(() => {
    loadQuests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = quickAddText.trim();
    if (!title || !wanderingIslesId) return;

    setAdding(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAdding(false); return; }

    const payload = {
      user_id: user.id,
      realm_id: wanderingIslesId,
      title,
      description: "",
      difficulty: "normal" as const,
      xp_value: DIFF_MAPPING.normal.xp,
      shard_value: DIFF_MAPPING.normal.shard,
      due_date: null,
      repeat_rule: "none",
    };

    const { error } = await supabase.from("quests").insert([payload]);
    setAdding(false);
    if (!error) {
      setQuickAddText("");
      await loadQuests();
    }
  };

  const now = Date.now();
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = quests;
    if (term) {
      list = list.filter(
        (q) => q.title.toLowerCase().includes(term) || (q.description || "").toLowerCase().includes(term)
      );
    }
    // Overdue/due-soon first; undated last.
    return [...list].sort((a, b) => {
      const aTime = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const bTime = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return aTime - bTime;
    });
  }, [quests, search]);

  const todayAndOverdue = filtered.filter((q) => {
    if (!q.due_date) return false;
    return new Date(q.due_date).getTime() <= now + 24 * 60 * 60 * 1000;
  });
  const upcoming = filtered.filter((q) => q.due_date && !todayAndOverdue.includes(q));
  const undated = filtered.filter((q) => !q.due_date);

  if (loading) return <div className="auth-container"><div className="spinner"></div></div>;

  const renderQuest = (q: QuestRow) => {
    const overdue = q.due_date ? new Date(q.due_date).getTime() < now : false;
    const accent = q.realms?.accent_color || "#8b5cf6";
    return (
      <motion.div
        key={q.id}
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => router.push(`/realms/${q.realms?.slug}`)}
        style={{
          background: "rgba(15,23,42,0.7)",
          border: `1px solid ${accent}50`,
          borderLeft: `4px solid ${accent}`,
          borderRadius: "14px",
          padding: "1rem 1.2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          marginBottom: "0.75rem",
        }}
        whileHover={{ scale: 1.01 }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: accent, display: "inline-block" }} />
            <span style={{ fontSize: "0.75rem", color: accent, fontWeight: "bold" }}>{q.realms?.name || "Unknown Realm"}</span>
          </div>
          <div style={{ fontWeight: "bold" }}>{q.title}</div>
        </div>
        {q.due_date && (
          <span style={{
            padding: "2px 10px", borderRadius: "12px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px",
            background: overdue ? "rgba(239,68,68,0.3)" : "rgba(148,163,184,0.2)",
            color: overdue ? "#fca5a5" : "#cbd5e1",
          }}>
            <Calendar size={12} /> {new Date(q.due_date).toLocaleDateString()}{overdue && " (Overdue)"}
          </span>
        )}
      </motion.div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#020617", color: "white", paddingBottom: "4rem" }}>
      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <button onClick={() => router.push("/dashboard")} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "1.5rem" }}>
          <ArrowLeft size={16} /> Back to World Map
        </button>

        <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "0.3rem" }}>Today</h1>
        <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>Every Quest due or overdue, across all Realms.</p>

        <form onSubmit={handleQuickAdd} style={{ display: "flex", gap: "0.6rem", marginBottom: "1rem" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Plus size={16} style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)", color: "#8b5cf6" }} />
            <input
              className="form-input"
              style={{ paddingLeft: "2.2rem" }}
              placeholder="Quick-add a Quest — press Enter (goes to Wandering Isles for now)"
              value={quickAddText}
              onChange={(e) => setQuickAddText(e.target.value)}
              disabled={adding}
            />
          </div>
        </form>

        <div style={{ position: "relative", marginBottom: "2rem" }}>
          <Search size={16} style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
          <input
            className="form-input"
            style={{ paddingLeft: "2.2rem" }}
            placeholder="Search quests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <AnimatePresence>
          {todayAndOverdue.length > 0 && (
            <div style={{ marginBottom: "2rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: "bold", color: "#fca5a5", marginBottom: "0.75rem" }}>Due Today / Overdue</h2>
              {todayAndOverdue.map(renderQuest)}
            </div>
          )}
          {upcoming.length > 0 && (
            <div style={{ marginBottom: "2rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: "bold", color: "#cbd5e1", marginBottom: "0.75rem" }}>Upcoming</h2>
              {upcoming.map(renderQuest)}
            </div>
          )}
          {undated.length > 0 && (
            <div>
              <h2 style={{ fontSize: "1rem", fontWeight: "bold", color: "#64748b", marginBottom: "0.75rem" }}>No Due Date</h2>
              {undated.map(renderQuest)}
            </div>
          )}
          {filtered.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: "2rem", textAlign: "center", color: "#64748b", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: "16px" }}>
              {search ? "No quests match your search." : "Nothing pending — the map is quiet."}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
