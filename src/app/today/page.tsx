"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Plus, Search, ArrowLeft, Archive, RefreshCw, Tag, Check, CheckSquare, Square } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DIFF_MAPPING, PRIORITY_MAPPING, Priority } from "@/lib/questDefaults";

type QuestRow = {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "normal" | "hard";
  priority: Priority;
  tags: string[];
  due_date: string | null;
  realm_id: string;
  is_archived: boolean;
  realms: { slug: string; name: string; accent_color: string } | null;
};

export default function TodayPage() {
  const router = useRouter();
  const supabase = createClient();
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"active" | "archived">("active");
  const [selectedQuestIds, setSelectedQuestIds] = useState<string[]>([]);
  const [processingBulk, setProcessingBulk] = useState(false);
  const [quickAddText, setQuickAddText] = useState("");
  const [wanderingIslesId, setWanderingIslesId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const loadQuests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const isArchivedTarget = viewMode === "archived";

    const { data } = await supabase
      .from("quests")
      .select("id, title, description, difficulty, priority, tags, due_date, realm_id, is_archived, realms(slug, name, accent_color)")
      .eq("user_id", user.id)
      .eq("is_archived", isArchivedTarget)
      .eq("is_completed", false)
      .order("due_date", { ascending: true, nullsFirst: false });

    if (data) setQuests(data as any);

    const { data: wandering } = await supabase.from("realms").select("id").eq("slug", "wandering_isles").single();
    if (wandering) setWanderingIslesId(wandering.id);

    setLoading(false);
  };

  useEffect(() => {
    setSelectedQuestIds([]);
    loadQuests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  const toggleSelect = (questId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedQuestIds(prev => 
      prev.includes(questId) ? prev.filter(id => id !== questId) : [...prev, questId]
    );
  };

  const handleRestore = async (questId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("quests").update({ is_archived: false }).eq("id", questId);
    await loadQuests();
  };

  const handleBulkComplete = async () => {
    if (selectedQuestIds.length === 0) return;
    setProcessingBulk(true);
    // Optimistic filter
    setQuests(prev => prev.filter(q => !selectedQuestIds.includes(q.id)));
    for (const id of selectedQuestIds) {
      await supabase.rpc("complete_quest", { p_quest_id: id });
    }
    setSelectedQuestIds([]);
    await loadQuests();
    setProcessingBulk(false);
  };

  const handleBulkArchive = async () => {
    if (selectedQuestIds.length === 0) return;
    setProcessingBulk(true);
    setQuests(prev => prev.filter(q => !selectedQuestIds.includes(q.id)));
    await supabase.from("quests").update({ is_archived: true }).in("id", selectedQuestIds);
    setSelectedQuestIds([]);
    await loadQuests();
    setProcessingBulk(false);
  };

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
      priority: "medium" as const,
      tags: [],
      xp_value: DIFF_MAPPING.normal.xp,
      shard_value: DIFF_MAPPING.normal.shard,
      due_date: null,
      repeat_rule: "none",
      is_archived: false
    };

    const { error } = await supabase.from("quests").insert([payload]);
    setAdding(false);
    if (!error) {
      setQuickAddText("");
      await loadQuests();
    }
  };

  const allTags = useMemo(() => {
    const set = new Set<string>();
    quests.forEach(q => {
      if (Array.isArray(q.tags)) {
        q.tags.forEach(t => set.add(t));
      }
    });
    return Array.from(set);
  }, [quests]);

  const now = Date.now();
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = quests;
    if (term) {
      list = list.filter(
        (q) => q.title.toLowerCase().includes(term) || (q.description || "").toLowerCase().includes(term)
      );
    }
    if (selectedTag) {
      list = list.filter(q => Array.isArray(q.tags) && q.tags.includes(selectedTag));
    }
    // Sort: Due Date primary, Priority secondary (rank high > medium > low)
    return [...list].sort((a, b) => {
      const aTime = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const bTime = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      if (aTime !== bTime) return aTime - bTime;
      
      const aRank = PRIORITY_MAPPING[a.priority || "medium"]?.rank || 2;
      const bRank = PRIORITY_MAPPING[b.priority || "medium"]?.rank || 2;
      return bRank - aRank;
    });
  }, [quests, search, selectedTag]);

  const toggleSelectAll = () => {
    if (selectedQuestIds.length === filtered.length) {
      setSelectedQuestIds([]);
    } else {
      setSelectedQuestIds(filtered.map(q => q.id));
    }
  };

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
    const prio = PRIORITY_MAPPING[q.priority || "medium"] || PRIORITY_MAPPING.medium;
    const isSelected = selectedQuestIds.includes(q.id);

    return (
      <motion.div
        key={q.id}
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => router.push(`/realms/${q.realms?.slug}`)}
        style={{
          background: isSelected ? "rgba(139,92,246,0.18)" : "rgba(15,23,42,0.7)",
          border: isSelected ? "1px solid #8b5cf6" : `1px solid ${accent}50`,
          borderLeft: `4px solid ${accent}`,
          borderRadius: "14px",
          padding: "1rem 1.2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          marginBottom: "0.75rem",
          transition: "all 0.2s"
        }}
        whileHover={{ scale: 1.01 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <button
            type="button"
            onClick={(e) => toggleSelect(q.id, e)}
            style={{ background: 'transparent', border: 'none', color: isSelected ? '#8b5cf6' : '#64748b', cursor: 'pointer', padding: 0, display: 'flex' }}
          >
            {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", flexWrap: 'wrap' }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: accent, display: "inline-block" }} />
              <span style={{ fontSize: "0.75rem", color: accent, fontWeight: "bold" }}>{q.realms?.name || "Unknown Realm"}</span>
              <span style={{ padding: "1px 6px", borderRadius: "10px", background: prio.bg, color: prio.color, border: `1px solid ${prio.border}`, fontSize: "0.65rem", fontWeight: "600" }}>
                {prio.label} Priority
              </span>
            </div>
            <div style={{ fontWeight: "bold" }}>{q.title}</div>
            {q.tags && q.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '4px', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                {q.tags.map(t => (
                  <span key={t} style={{ padding: '1px 6px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '0.65rem' }}>
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {q.due_date && (
            <span style={{
              padding: "2px 10px", borderRadius: "12px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px",
              background: overdue ? "rgba(239,68,68,0.3)" : "rgba(148,163,184,0.2)",
              color: overdue ? "#fca5a5" : "#cbd5e1",
            }}>
              <Calendar size={12} /> {new Date(q.due_date).toLocaleDateString()}{overdue && " (Overdue)"}
            </span>
          )}
          {viewMode === "archived" && (
            <button
              onClick={(e) => handleRestore(q.id, e)}
              style={{ padding: '0.4rem 0.7rem', borderRadius: '8px', background: '#3b82f6', color: 'white', border: 'none', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
              title="Restore Quest"
            >
              <RefreshCw size={12} /> Restore
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#020617", color: "white", paddingBottom: "6rem" }}>
      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <button onClick={() => router.push("/dashboard")} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <ArrowLeft size={16} /> Back to World Map
          </button>
          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(15,23,42,0.8)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => setViewMode("active")}
              style={{ padding: '0.3rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', border: 'none', background: viewMode === "active" ? "#8b5cf6" : "transparent", color: viewMode === "active" ? "white" : "#94a3b8", cursor: "pointer", fontWeight: 'bold' }}
            >
              Active
            </button>
            <button
              onClick={() => setViewMode("archived")}
              style={{ padding: '0.3rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', border: 'none', background: viewMode === "archived" ? "#f43f5e" : "transparent", color: viewMode === "archived" ? "white" : "#94a3b8", cursor: "pointer", fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Archive size={14} /> Archive
            </button>
          </div>
        </div>

        <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "0.3rem" }}>
          {viewMode === "active" ? "Today" : "Archived Quests"}
        </h1>
        <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>
          {viewMode === "active" ? "Every Quest due or overdue, across all Realms." : "Quests safely archived. You can restore them anytime."}
        </p>

        {viewMode === "active" && (
          <form onSubmit={handleQuickAdd} style={{ display: "flex", gap: "0.6rem", marginBottom: "1rem" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Plus size={16} style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)", color: "#8b5cf6" }} />
              <input
                className="form-input"
                style={{ paddingLeft: "2.2rem" }}
                placeholder="Quick-add a Quest — press Enter (goes to Wandering Isles)"
                value={quickAddText}
                onChange={(e) => setQuickAddText(e.target.value)}
                disabled={adding}
              />
            </div>
          </form>
        )}

        <div style={{ display: 'flex', gap: '0.6rem', marginBottom: "1rem" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={16} style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
            <input
              className="form-input"
              style={{ paddingLeft: "2.2rem" }}
              placeholder="Search quests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {filtered.length > 0 && (
            <button
              onClick={toggleSelectAll}
              style={{ padding: '0 0.9rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(15,23,42,0.8)', color: '#cbd5e1', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {selectedQuestIds.length === filtered.length ? <CheckSquare size={16} /> : <Square size={16} />}
              {selectedQuestIds.length === filtered.length ? "Deselect All" : "Select All"}
            </button>
          )}
        </div>

        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Tag size={12} /> Filter tag:
            </span>
            <button
              onClick={() => setSelectedTag(null)}
              style={{
                padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', cursor: 'pointer',
                background: selectedTag === null ? '#8b5cf6' : 'rgba(255,255,255,0.08)',
                color: selectedTag === null ? 'white' : '#94a3b8', border: 'none'
              }}
            >
              All
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                style={{
                  padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', cursor: 'pointer',
                  background: selectedTag === tag ? '#8b5cf6' : 'rgba(255,255,255,0.08)',
                  color: selectedTag === tag ? 'white' : '#cbd5e1', border: 'none'
                }}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

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
              {search || selectedTag ? "No quests match your filter." : viewMode === "archived" ? "No archived quests found." : "Nothing pending — the map is quiet."}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bulk Action Bar */}
        <AnimatePresence>
          {selectedQuestIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              style={{
                position: 'fixed',
                bottom: '2.5rem',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 100,
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(139, 92, 246, 0.6)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.7), 0 0 35px rgba(139, 92, 246, 0.3)',
                borderRadius: '20px',
                padding: '0.8rem 1.4rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1.2rem',
                maxWidth: '90vw'
              }}
            >
              <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#e2e8f0' }}>
                {selectedQuestIds.length} quest{selectedQuestIds.length > 1 ? 's' : ''} selected
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleBulkComplete}
                  disabled={processingBulk}
                  style={{
                    padding: '0.45rem 1rem', borderRadius: '10px', background: '#22c55e', color: 'black', border: 'none',
                    fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                    opacity: processingBulk ? 0.6 : 1
                  }}
                >
                  <Check size={14} /> Bulk Complete
                </button>
                <button
                  onClick={handleBulkArchive}
                  disabled={processingBulk}
                  style={{
                    padding: '0.45rem 1rem', borderRadius: '10px', background: '#f43f5e', color: 'white', border: 'none',
                    fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                    opacity: processingBulk ? 0.6 : 1
                  }}
                >
                  <Archive size={14} /> Bulk Archive
                </button>
                <button
                  onClick={() => setSelectedQuestIds([])}
                  style={{
                    padding: '0.45rem 0.8rem', borderRadius: '10px', background: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.2)',
                    fontSize: '0.8rem', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
