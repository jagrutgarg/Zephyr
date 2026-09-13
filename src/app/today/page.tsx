"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Plus, Search, ArrowLeft, Archive, RefreshCw, Tag, Check, CheckSquare, Square, ChevronDown, ChevronUp, Lock, Repeat, Swords, Edit2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DIFF_MAPPING, PRIORITY_MAPPING, Priority, ChecklistItem, describeRepeatRule } from "@/lib/questDefaults";

type QuestRow = {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "normal" | "hard";
  priority: Priority;
  tags: string[];
  notes: string | null;
  checklist: ChecklistItem[];
  blocked_by: string | null;
  due_date: string | null;
  realm_id: string;
  is_archived: boolean;
  repeat_rule: string;
  realms: { slug: string; name: string; accent_color: string } | null;
};

export default function TodayPage() {
  const router = useRouter();
  const supabase = createClient();
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState("");
  const [selectedRealms, setSelectedRealms] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<Priority | "all">("all");
  const [showNoDueDateOnly, setShowNoDueDateOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"duedate" | "priority" | "realm">("duedate");

  const [viewMode, setViewMode] = useState<"active" | "archived">("active");
  const [selectedQuestIds, setSelectedQuestIds] = useState<string[]>([]);
  const [expandedQuests, setExpandedQuests] = useState<Set<string>>(new Set());
  const [processingBulk, setProcessingBulk] = useState(false);
  
  const [quickAddText, setQuickAddText] = useState("");
  const [quickAddRealmId, setQuickAddRealmId] = useState<string | null>(null);
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
      .select("id, title, description, difficulty, priority, tags, notes, checklist, blocked_by, due_date, realm_id, is_archived, repeat_rule, realms(slug, name, accent_color)")
      .eq("user_id", user.id)
      .eq("is_archived", isArchivedTarget)
      .eq("is_completed", false)
      .order("created_at", { ascending: false });

    if (data) setQuests(data as any);

    const { data: quickAddRealm } = await supabase.from("realms").select("id").eq("slug", "xyran_frontier").single();
    if (quickAddRealm) setQuickAddRealmId(quickAddRealm.id);

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

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('textarea')) return;
    setExpandedQuests(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRestore = async (questId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("quests").update({ is_archived: false }).eq("id", questId);
    await loadQuests();
  };
  
  const handleArchive = async (questId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuests(prev => prev.filter(q => q.id !== questId));
    await supabase.from("quests").update({ is_archived: true }).eq("id", questId);
  };

  const handleComplete = async (questId: string) => {
    setQuests(prev => prev.map(q => q.id === questId ? { ...q, is_completed: true } : q));
    const { error } = await supabase.rpc("complete_quest", { p_quest_id: questId });
    if (error) {
       alert("Failed to complete quest.");
       setQuests(prev => prev.map(q => q.id === questId ? { ...q, is_completed: false } : q));
    } else {
       await loadQuests();
    }
  };

  const handleBulkComplete = async () => {
    if (selectedQuestIds.length === 0) return;
    setProcessingBulk(true);
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
    if (!title || !quickAddRealmId) return;

    setAdding(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAdding(false); return; }

    const payload = {
      user_id: user.id,
      realm_id: quickAddRealmId,
      title,
      description: "",
      difficulty: "normal" as const,
      priority: "medium" as const,
      tags: [],
      notes: "",
      checklist: [],
      blocked_by: null,
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

  const updateQuestDetails = async (questId: string, updates: Partial<QuestRow>) => {
    setQuests(prev => prev.map(q => q.id === questId ? { ...q, ...updates } : q));
    await supabase.from("quests").update(updates).eq("id", questId);
  };

  const addChecklistItem = async (questId: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && e.currentTarget.value.trim()) {
      const val = e.currentTarget.value.trim();
      e.currentTarget.value = "";
      const q = quests.find(q => q.id === questId);
      if (q) {
        const nextCl = [...(q.checklist || []), { text: val, done: false }];
        updateQuestDetails(questId, { checklist: nextCl });
      }
    }
  };

  const toggleChecklistItem = async (questId: string, index: number) => {
    const q = quests.find(q => q.id === questId);
    if (q) {
      const nextCl = [...(q.checklist || [])];
      nextCl[index] = { ...nextCl[index], done: !nextCl[index].done };
      updateQuestDetails(questId, { checklist: nextCl });
    }
  };
  
  const removeChecklistItem = async (questId: string, index: number) => {
      const q = quests.find(q => q.id === questId);
      if (q) {
          const nextCl = (q.checklist || []).filter((_, i) => i !== index);
          updateQuestDetails(questId, { checklist: nextCl });
      }
  };

  const allTags = useMemo(() => Array.from(new Set(quests.flatMap(q => Array.isArray(q.tags) ? q.tags : []))), [quests]);
  const allRealms = useMemo(() => {
    const map = new Map<string, {name: string, color: string}>();
    quests.forEach(q => { if (q.realms) map.set(q.realm_id, { name: q.realms.name, color: q.realms.accent_color }); });
    return Array.from(map.entries()).map(([id, data]) => ({ id, ...data }));
  }, [quests]);

  const now = Date.now();
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = quests;
    if (term) {
      list = list.filter(q => q.title.toLowerCase().includes(term) || (q.description || "").toLowerCase().includes(term));
    }
    if (selectedTag) {
      list = list.filter(q => Array.isArray(q.tags) && q.tags.includes(selectedTag));
    }
    if (selectedRealms.length > 0) {
      list = list.filter(q => selectedRealms.includes(q.realm_id));
    }
    if (selectedPriority !== "all") {
      list = list.filter(q => q.priority === selectedPriority);
    }
    if (showNoDueDateOnly) {
      list = list.filter(q => !q.due_date);
    }
    
    return [...list].sort((a, b) => {
      if (sortBy === "duedate") {
        const aTime = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const bTime = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        if (aTime !== bTime) return aTime - bTime;
      } else if (sortBy === "priority") {
        const aRank = PRIORITY_MAPPING[a.priority || "medium"]?.rank || 2;
        const bRank = PRIORITY_MAPPING[b.priority || "medium"]?.rank || 2;
        if (aRank !== bRank) return bRank - aRank;
      } else if (sortBy === "realm") {
        const aRealm = a.realms?.name || "";
        const bRealm = b.realms?.name || "";
        if (aRealm !== bRealm) return aRealm.localeCompare(bRealm);
      }
      // Fallback sorts
      const aTimeFallback = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const bTimeFallback = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      if (aTimeFallback !== bTimeFallback) return aTimeFallback - bTimeFallback;
      
      const aRankFb = PRIORITY_MAPPING[a.priority || "medium"]?.rank || 2;
      const bRankFb = PRIORITY_MAPPING[b.priority || "medium"]?.rank || 2;
      return bRankFb - aRankFb;
    });
  }, [quests, search, selectedTag, selectedRealms, selectedPriority, showNoDueDateOnly, sortBy]);

  const toggleSelectAll = () => (selectedQuestIds.length === filtered.length) ? setSelectedQuestIds([]) : setSelectedQuestIds(filtered.map(q => q.id));

  const todayAndOverdue = filtered.filter((q) => q.due_date && new Date(q.due_date).getTime() <= now + 24 * 60 * 60 * 1000);
  const upcoming = filtered.filter((q) => q.due_date && !todayAndOverdue.includes(q));
  const undated = filtered.filter((q) => !q.due_date);

  const activeQuestsMap = new Map(quests.map(q => [q.id, q]));

  if (loading) return <div className="auth-container"><div className="spinner"></div></div>;

  const renderQuest = (q: QuestRow) => {
    const overdue = q.due_date ? new Date(q.due_date).getTime() < now : false;
    const accent = q.realms?.accent_color || "#8b5cf6";
    const prio = PRIORITY_MAPPING[q.priority || "medium"] || PRIORITY_MAPPING.medium;
    const isSelected = selectedQuestIds.includes(q.id);
    const isExpanded = expandedQuests.has(q.id);
    const blockingQuest = q.blocked_by && activeQuestsMap.get(q.blocked_by);
    const isBlocked = !!blockingQuest && !blockingQuest.is_archived;

    return (
      <motion.div
        key={q.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        onClick={(e) => toggleExpand(q.id, e)}
        style={{
          background: isSelected ? "rgba(139,92,246,0.18)" : "rgba(15,23,42,0.7)",
          border: isSelected ? "1px solid #8b5cf6" : `1px solid ${accent}50`, borderLeft: `4px solid ${accent}`,
          borderRadius: "14px", marginBottom: "0.75rem", transition: "background 0.2s, border 0.2s",
          cursor: "default", overflow: "hidden"
        }}
      >
        <div style={{ padding: "1rem 1.2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flex: 1 }}>
            <button
                type="button" onClick={(e) => toggleSelect(q.id, e)}
                style={{ background: 'transparent', border: 'none', color: isSelected ? '#8b5cf6' : '#64748b', cursor: 'pointer', padding: 0, display: 'flex' }}
            >
                {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
            </button>
            <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", flexWrap: 'wrap' }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: accent, display: "inline-block" }} />
                <button onClick={(e) => { e.stopPropagation(); router.push(`/realms/${q.realms?.slug}`); }} style={{ background: 'transparent', border: 'none', padding: 0, fontSize: "0.75rem", color: accent, fontWeight: "bold", cursor: 'pointer' }}>
                    {q.realms?.name || "Unknown Realm"}
                </button>
                <span style={{ padding: "1px 6px", borderRadius: "10px", background: prio.bg, color: prio.color, border: `1px solid ${prio.border}`, fontSize: "0.65rem", fontWeight: "600" }}>
                    {prio.label} Priority
                </span>
                </div>
                <div style={{ fontWeight: "bold", color: isBlocked ? '#cbd5e1' : 'white' }}>{q.title}</div>
                {isBlocked && (
                    <p style={{ fontSize: '0.75rem', color: '#f43f5e', marginTop: '4px', fontWeight: 'bold' }}>Blocked by: {blockingQuest.title}</p>
                )}
                {q.tags && q.tags.length > 0 && (
                <div style={{ display: 'flex', gap: '4px', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                    {q.tags.map(t => (
                    <span key={t} style={{ padding: '1px 6px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '0.65rem' }}>#{t}</span>
                    ))}
                </div>
                )}
            </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {viewMode === "active" ? (
                <>
                {q.due_date && (
                    <span style={{
                    padding: "2px 10px", borderRadius: "12px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px",
                    background: overdue ? "rgba(239,68,68,0.3)" : "rgba(148,163,184,0.2)", color: overdue ? "#fca5a5" : "#cbd5e1",
                    }}>
                    <Calendar size={12} /> {new Date(q.due_date).toLocaleDateString()}{overdue && " (Overdue)"}
                    </span>
                )}
                {isExpanded ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
                <button
                    onClick={(e) => { e.stopPropagation(); if (!isBlocked) handleComplete(q.id); }}
                    disabled={isBlocked}
                    style={{ padding: '0.4rem 0.7rem', borderRadius: '8px', background: isBlocked ? '#334155' : accent, color: 'black', border: 'none', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', cursor: isBlocked ? 'not-allowed' : 'pointer' }}
                >
                    {isBlocked ? <Lock size={12} /> : <Check size={12} />} Complete
                </button>
                </>
            ) : (
                <button
                onClick={(e) => handleRestore(q.id, e)}
                style={{ padding: '0.4rem 0.7rem', borderRadius: '8px', background: '#3b82f6', color: 'white', border: 'none', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                >
                <RefreshCw size={12} /> Restore
                </button>
            )}
            </div>
        </div>
        
        {/* Expandable Body */}
        <AnimatePresence>
            {isExpanded && viewMode === "active" && (
                <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden' }}
                >
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    {/* Subtasks (Checklist) */}
                    <div>
                        <h4 style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckSquare size={12} /> Checklist
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {(q.checklist || []).map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); toggleChecklistItem(q.id, i); }}
                                        style={{ width: '16px', height: '16px', borderRadius: '4px', border: `1px solid ${item.done ? accent : '#64748b'}`, background: item.done ? accent : 'transparent', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                    >
                                        {item.done && <Check size={12} />}
                                    </button>
                                    <span style={{ fontSize: '0.85rem', color: item.done ? '#64748b' : '#cbd5e1', textDecoration: item.done ? 'line-through' : 'none', flex: 1 }}>{item.text}</span>
                                    <button onClick={(e) => { e.stopPropagation(); removeChecklistItem(q.id, i); }} style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: 0 }}><X size={12}/></button>
                                </div>
                            ))}
                            <input 
                                type="text"
                                className="form-input"
                                placeholder="+ Add item (press Enter)"
                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)', border: '1px dashed rgba(255,255,255,0.1)' }}
                                onKeyDown={(e) => addChecklistItem(q.id, e)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.05)' }} />

                    {/* Notes */}
                    <div>
                        <h4 style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 'bold' }}>Notes</h4>
                        <textarea
                            className="form-input"
                            style={{ padding: '0.6rem', fontSize: '0.85rem', background: 'rgba(0,0,0,0.2)', minHeight: '80px' }}
                            placeholder="Jot down notes here..."
                            defaultValue={q.notes || ""}
                            onClick={(e) => e.stopPropagation()}
                            onBlur={(e) => {
                                if (e.target.value !== q.notes) {
                                    updateQuestDetails(q.id, { notes: e.target.value });
                                }
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button onClick={(e) => { e.stopPropagation(); router.push(`/realms/${q.realms?.slug}`); }} style={{ background: 'transparent', border: `1px solid ${accent}60`, color: accent, padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Edit2 size={12} /> Edit Details in Realm
                        </button>
                    </div>

                </div>
                </motion.div>
            )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#020617", color: "white", paddingBottom: "6rem" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <button onClick={() => router.push("/dashboard")} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <ArrowLeft size={16} /> Back to World Map
          </button>
          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(15,23,42,0.8)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button onClick={() => setViewMode("active")} style={{ padding: '0.3rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', border: 'none', background: viewMode === "active" ? "#8b5cf6" : "transparent", color: viewMode === "active" ? "white" : "#94a3b8", cursor: "pointer", fontWeight: 'bold' }}>Active</button>
            <button onClick={() => setViewMode("archived")} style={{ padding: '0.3rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', border: 'none', background: viewMode === "archived" ? "#f43f5e" : "transparent", color: viewMode === "archived" ? "white" : "#94a3b8", cursor: "pointer", fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Archive size={14} /> Archive
            </button>
          </div>
        </div>

        <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "0.3rem" }}>{viewMode === "active" ? "Today" : "Archived Quests"}</h1>
        <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>{viewMode === "active" ? "Every Quest due or overdue, across all Realms." : "Quests safely archived. You can restore them anytime."}</p>

        {viewMode === "active" && (
          <form onSubmit={handleQuickAdd} style={{ display: "flex", gap: "0.6rem", marginBottom: "1rem" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Plus size={16} style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)", color: "#8b5cf6" }} />
              <input className="form-input" style={{ paddingLeft: "2.2rem" }} placeholder="Quick-add a Quest — press Enter (goes to Xyran Frontier)" value={quickAddText} onChange={(e) => setQuickAddText(e.target.value)} disabled={adding} />
            </div>
          </form>
        )}

        {/* Filter Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', padding: '1.2rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px' }}>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <div style={{ position: "relative", flex: 1, minWidth: '200px' }}>
                    <Search size={16} style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                    <input className="form-input" style={{ paddingLeft: "2.2rem" }} placeholder="Search quests..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <select className="form-input form-select" style={{ width: 'auto' }} value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
                    <option value="duedate">Sort: Due Date (Default)</option>
                    <option value="priority">Sort: Priority</option>
                    <option value="realm">Sort: Realm</option>
                </select>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0 0.8rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <input type="checkbox" id="showNoDueDate" checked={showNoDueDateOnly} onChange={e => setShowNoDueDateOnly(e.target.checked)} style={{ cursor: 'pointer' }} />
                    <label htmlFor="showNoDueDate" style={{ fontSize: '0.8rem', color: '#cbd5e1', cursor: 'pointer', userSelect: 'none' }}>No due date only</label>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                {/* Realm Filter */}
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 'bold' }}>FILTER BY REALM</p>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {allRealms.map(r => (
                            <button
                                key={r.id}
                                onClick={() => setSelectedRealms(prev => prev.includes(r.id) ? prev.filter(id => id !== r.id) : [...prev, r.id])}
                                style={{
                                    padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', cursor: 'pointer',
                                    background: selectedRealms.includes(r.id) ? `${r.color}30` : 'rgba(255,255,255,0.05)',
                                    color: selectedRealms.includes(r.id) ? r.color : '#94a3b8',
                                    border: `1px solid ${selectedRealms.includes(r.id) ? r.color : 'transparent'}`
                                }}
                            >
                                {r.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tag Filter */}
                {allTags.length > 0 && (
                <div style={{ flex: 1, minWidth: '150px' }}>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 'bold' }}>FILTER BY TAG</p>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => setSelectedTag(null)}
                            style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', cursor: 'pointer', background: selectedTag === null ? '#8b5cf6' : 'rgba(255,255,255,0.08)', color: selectedTag === null ? 'white' : '#94a3b8', border: 'none' }}
                        >All</button>
                        {allTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                                style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', cursor: 'pointer', background: selectedTag === tag ? '#8b5cf6' : 'rgba(255,255,255,0.08)', color: selectedTag === tag ? 'white' : '#cbd5e1', border: 'none' }}
                            >#{tag}</button>
                        ))}
                    </div>
                </div>
                )}
                
                {/* Priority Filter */}
                <div style={{ minWidth: '150px' }}>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 'bold' }}>FILTER BY PRIORITY</p>
                    <select className="form-input form-select py-1" style={{ fontSize: '0.8rem' }} value={selectedPriority} onChange={e => setSelectedPriority(e.target.value as any)}>
                        <option value="all">All Priorities</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-1rem' }}>
               {filtered.length > 0 && (
                <button
                    onClick={toggleSelectAll}
                    style={{ padding: '0 0.9rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(15,23,42,0.8)', color: '#cbd5e1', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', height: '32px' }}
                >
                    {selectedQuestIds.length === filtered.length ? <CheckSquare size={16} /> : <Square size={16} />}
                    {selectedQuestIds.length === filtered.length ? "Deselect All" : "Select All"}
                </button>
               )}
            </div>
        </div>

        <AnimatePresence>
          {sortBy === "duedate" && !showNoDueDateOnly ? (
              <>
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
                    <div style={{ marginBottom: "2rem" }}>
                      <h2 style={{ fontSize: "1rem", fontWeight: "bold", color: "#64748b", marginBottom: "0.75rem" }}>No Due Date</h2>
                      {undated.map(renderQuest)}
                    </div>
                  )}
              </>
          ) : (
              <div style={{ marginBottom: "2rem" }}>
                  <h2 style={{ fontSize: "1rem", fontWeight: "bold", color: "#cbd5e1", marginBottom: "0.75rem" }}>Quests</h2>
                  {filtered.map(renderQuest)}
              </div>
          )}
          
          {filtered.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: "2rem", textAlign: "center", color: "#64748b", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: "16px" }}>
              {search || selectedTag || selectedRealms.length > 0 || selectedPriority !== "all" || showNoDueDateOnly ? "No quests match your filter." : viewMode === "archived" ? "No archived quests found." : "Nothing pending — the map is quiet."}
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
              style={{ position: 'fixed', bottom: '2.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(139, 92, 246, 0.6)', boxShadow: '0 20px 40px rgba(0,0,0,0.7), 0 0 35px rgba(139, 92, 246, 0.3)', borderRadius: '20px', padding: '0.8rem 1.4rem', display: 'flex', alignItems: 'center', gap: '1.2rem', maxWidth: '90vw' }}
            >
              <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#e2e8f0' }}>{selectedQuestIds.length} quest{selectedQuestIds.length > 1 ? 's' : ''} selected</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleBulkComplete} disabled={processingBulk}
                  style={{ padding: '0.45rem 1rem', borderRadius: '10px', background: '#22c55e', color: 'black', border: 'none', fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', opacity: processingBulk ? 0.6 : 1 }}
                >
                  <Check size={14} /> Bulk Complete
                </button>
                <button
                  onClick={handleBulkArchive} disabled={processingBulk}
                  style={{ padding: '0.45rem 1rem', borderRadius: '10px', background: '#f43f5e', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', opacity: processingBulk ? 0.6 : 1 }}
                >
                  <Archive size={14} /> Bulk Archive
                </button>
                <button onClick={() => setSelectedQuestIds([])} style={{ padding: '0.45rem 0.8rem', borderRadius: '10px', background: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.8rem', cursor: 'pointer' }}>Cancel</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
