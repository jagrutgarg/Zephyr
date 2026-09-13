"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Check, Trash2, Edit2, Calendar, CalendarPlus, Swords, Repeat, Archive, Tag, ChevronDown, ChevronUp, Lock, CheckSquare } from "lucide-react";
import { RealmBackground } from "@/components/RealmBackground";
import { RealmModelShowcase } from "@/components/three/RealmModelShowcase";
import { useGameStore } from "@/store/useGameStore";
import { ThematicClock } from "@/components/Clock";
import { buildGoogleCalendarUrl } from "@/lib/googleCalendar";
import { DIFF_MAPPING, WEEKDAYS, describeRepeatRule, Priority, PRIORITY_MAPPING, ChecklistItem } from "@/lib/questDefaults";
import { FocusSessionOverlay } from "@/components/FocusSessionOverlay";
import { GuardianToast } from "@/components/GuardianToast";
import { pickGuardianLine } from "@/lib/guardianLines";
import { playSound } from "@/lib/audioUtil";

type Quest = {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "normal" | "hard";
  priority: Priority;
  tags: string[];
  notes: string | null;
  checklist: ChecklistItem[];
  blocked_by: string | null;
  xp_value: number;
  shard_value: number;
  due_date: string | null;
  is_completed: boolean;
  is_archived?: boolean;
  repeat_rule: string;
};

type FocusTarget = {
  questId: string;
  questTitle: string;
  resume?: { startedAt: string; durationMinutes: number };
};

type CrossRealmNotice = { type: "active" | "completed"; realmSlug: string; realmName: string; questTitle: string };

export default function RealmPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const supabase = createClient();
  const { slug } = use(params);
  
  // Game Store
  const { addShards, reduceVoid, incrementStreak, gainRealmXP } = useGameStore();
  
  // State
  const [realm, setRealm] = useState<any>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQuests, setExpandedQuests] = useState<Set<string>>(new Set());
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  
  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<"easy"|"normal"|"hard">("normal");
  const [priority, setPriority] = useState<Priority>("medium");
  const [tagsInput, setTagsInput] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [repeatRule, setRepeatRule] = useState("none");
  const [repeatDays, setRepeatDays] = useState<string[]>([]);
  const [blockedBy, setBlockedBy] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState("");

  // Focus Session state
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  const [crossRealmNotice, setCrossRealmNotice] = useState<CrossRealmNotice | null>(null);
  const [guardianToast, setGuardianToast] = useState<string | null>(null);

  const refetchQuests = async (realmId: string) => {
    const { data: questData } = await supabase
      .from("quests")
      .select("*")
      .eq("realm_id", realmId)
      .eq("is_archived", false)
      .order("created_at", { ascending: false });
    if (questData) setQuests(questData);
  };

  const applyCompletionRewards = (completedQuest: Quest, completion: any, realmData: any) => {
    addShards(completion.awarded_shards ?? completedQuest.shard_value);
    reduceVoid(2);
    gainRealmXP(realmData.id, completion.awarded_xp ?? completedQuest.xp_value, completion.leveled_up, completion.new_level);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("lastCompletedRealmSlug", realmData.slug);
    }
    setGuardianToast(pickGuardianLine(realmData.guardian));
    if (completion.leveled_up) {
      alert(`The ${realmData.guardian} smiles! ${realmData.name} grew to level ${completion.new_level}!`);
    } else if (completion.void_penalty_pct > 0) {
      alert(`The Void dampened your reward by ${Math.round(completion.void_penalty_pct)}%. Push it back to earn in full.`);
    }
  };

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Fetch Realm
      const { data: realmData } = await supabase.from("realms").select("*").eq("slug", slug).single();
      if (!realmData) {
        router.push("/dashboard");
        return;
      }
      setRealm(realmData);

      // Fetch Active Quests
      const { data: questData } = await supabase
        .from("quests")
        .select("*")
        .eq("realm_id", realmData.id)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (questData) setQuests(questData);
      setLoading(false);

      // Resume/surface focus session
      const { data: session } = await supabase.rpc("get_active_focus_session");
      if (!session || session.status === "none") return;

      if (session.status === "completed") {
        if (session.realm_slug === slug) {
          const finishedQuest = (questData || []).find((q: Quest) => q.id === session.quest_id);
          await refetchQuests(realmData.id);
          if (finishedQuest) applyCompletionRewards(finishedQuest, session.completion, realmData);
        } else {
          setCrossRealmNotice({ type: "completed", realmSlug: session.realm_slug, realmName: session.realm_name, questTitle: session.quest_title });
        }
        return;
      }

      if (session.status === "active") {
        if (session.realm_slug === slug) {
          setFocusTarget({
            questId: session.quest_id,
            questTitle: session.quest_title,
            resume: { startedAt: session.started_at, durationMinutes: session.duration_minutes },
          });
        } else {
          setCrossRealmNotice({ type: "active", realmSlug: session.realm_slug, realmName: session.realm_name, questTitle: session.quest_title });
        }
      }
    }
    loadData();
  }, [slug, router, supabase]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    // Only expand if clicking the card background, not buttons
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('textarea')) return;
    setExpandedQuests(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openModal = (q?: Quest) => {
    if (q) {
        setEditingQuest(q);
        setTitle(q.title);
        setDescription(q.description || "");
        setDifficulty(q.difficulty);
        setPriority(q.priority || "medium");
        setTagsInput((q.tags || []).join(", "));
        setDueDate(q.due_date ? q.due_date.split('T')[0] : "");
        setBlockedBy(q.blocked_by || "");
        if (q.repeat_rule?.startsWith("weekly:")) {
          setRepeatRule("weekly");
          setRepeatDays(q.repeat_rule.slice(7).split(","));
        } else {
          setRepeatRule(q.repeat_rule || "none");
          setRepeatDays([]);
        }
    } else {
        setEditingQuest(null);
        setTitle("");
        setDescription("");
        setDifficulty("normal");
        setPriority("medium");
        setTagsInput("");
        setDueDate("");
        setBlockedBy("");
        setRepeatRule("none");
        setRepeatDays([]);
    }
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const toggleRepeatDay = (day: string) => {
    setRepeatDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleSaveQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
        setErrorMsg("Your quest needs a title.");
        return;
    }
    if (repeatRule === "weekly" && repeatDays.length === 0) {
        setErrorMsg("Pick at least one day for a weekly repeat.");
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !realm) return;

    const finalRepeatRule = repeatRule === "weekly" ? `weekly:${repeatDays.join(",")}` : repeatRule;
    const parsedTags = tagsInput
      .split(",")
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    const payload = {
        user_id: user.id,
        realm_id: realm.id,
        title,
        description,
        difficulty,
        priority,
        tags: parsedTags,
        blocked_by: blockedBy || null,
        xp_value: DIFF_MAPPING[difficulty].xp,
        shard_value: DIFF_MAPPING[difficulty].shard,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        repeat_rule: finalRepeatRule,
        is_archived: false,
    };

    if (editingQuest) {
        setQuests(prev => prev.map(q => q.id === editingQuest.id ? { ...q, ...payload } : q));
        setIsModalOpen(false);
        const { error } = await supabase.from("quests").update(payload).eq("id", editingQuest.id);
        if (error) alert("The Aether didn't respond. Try again.");
    } else {
        const fakeId = "temp-" + Date.now();
        const optimisticQuest = { ...payload, id: fakeId, is_completed: false, checklist: [], notes: "" } as Quest;
        setQuests([optimisticQuest, ...quests]);
        setIsModalOpen(false);
        
        const { data, error } = await supabase.from("quests").insert([{ ...payload, checklist: [], notes: "" }]).select().single();
        if (error) {
            alert("The Aether didn't respond. Try again.");
            setQuests(prev => prev.filter(q => q.id !== fakeId));
        } else {
            setQuests(prev => prev.map(q => q.id === fakeId ? data : q));
        }
    }
  };

  const updateQuestDetails = async (questId: string, updates: Partial<Quest>) => {
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
      const isDone = !nextCl[index].done;
      if (isDone) playSound("win"); else playSound("void");
      nextCl[index] = { ...nextCl[index], done: isDone };
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

  const handleArchive = async (questId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!confirm("Archive this quest? It can be restored anytime.")) return;
      
      playSound("void");
      setQuests(prev => prev.filter(q => q.id !== questId));
      await supabase.from("quests").update({ is_archived: true }).eq("id", questId);
  };

  const handleComplete = async (questId: string) => {
      playSound("win");
      setQuests(prev => prev.map(q => q.id === questId ? { ...q, is_completed: true } : q));
      const { data, error } = await supabase.rpc('complete_quest', { p_quest_id: questId });
      if (error) {
          alert("Failed to complete quest.");
          setQuests(prev => prev.map(q => q.id === questId ? { ...q, is_completed: false } : q));
      } else {
          const q = quests.find(q => q.id === questId);
          if (q) applyCompletionRewards(q, data, realm);
          if (realm) await refetchQuests(realm.id);
      }
  };

  const handleAddToCalendar = (questDetails: { title: string, description?: string, dueDate: string }) => {
      if (!questDetails.dueDate) return;
      const url = buildGoogleCalendarUrl({
          title: questDetails.title,
          description: questDetails.description,
          dueDate: new Date(questDetails.dueDate),
          realmName: realm?.name || "Unknown Realm"
      });
      window.open(url, '_blank');
  };

  if (loading) return <div className="auth-container"><div className="spinner"></div></div>;

  const activeQuests = quests.filter(q => !q.is_completed);
  const completedQuests = quests.filter(q => q.is_completed);
  const activeQuestsMap = new Map(activeQuests.map(q => [q.id, q]));

  const accent = realm?.accent_color || '#8b5cf6';

  return (
    <div className="relative min-h-screen pb-20" style={{ background: '#020617', color: 'white', overflowX: 'hidden' }}>
      {realm && <RealmBackground slug={slug} accentColor={accent} />}

      <div className="relative z-10 max-w-4xl mx-auto pt-14 px-6 pb-10">
         <motion.button
            onClick={() => router.push('/dashboard')}
            whileHover={{ x: -3 }}
            className="mb-8 text-sm flex items-center gap-2"
            style={{ color: accent, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
         >
           <span style={{ textDecoration: 'underline', textDecorationColor: `${accent}60`, textUnderlineOffset: '4px' }}>← Back to World Map</span>
         </motion.button>

         {crossRealmNotice && (
             <div style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: '12px', padding: '0.8rem 1.2rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                 <span style={{ fontSize: '0.9rem' }}>
                     {crossRealmNotice.type === 'completed'
                        ? `🏆 "${crossRealmNotice.questTitle}" completed in ${crossRealmNotice.realmName}!`
                        : `A focus session for "${crossRealmNotice.questTitle}" is running in ${crossRealmNotice.realmName}.`}
                 </span>
                 <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                     <button onClick={() => router.push(`/realms/${crossRealmNotice.realmSlug}`)} style={{ background: 'transparent', border: 'none', color: '#c4b5fd', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                         {crossRealmNotice.type === 'active' ? 'Go there' : 'View'}
                     </button>
                     <button onClick={() => setCrossRealmNotice(null)} aria-label="Dismiss" style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={16} /></button>
                 </div>
             </div>
         )}

         <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 mb-10 lg:mb-12 items-start justify-between">
            {/* Left Column: Info + Buttons */}
            <div className="flex-1 flex flex-col gap-6 w-full lg:max-w-xl">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
                    <div style={{
                        width: '56px', height: '56px', borderRadius: '50%', flexShrink: 0,
                        background: `radial-gradient(circle, ${accent}30 0%, rgba(15,23,42,0.9) 75%)`,
                        border: `2px solid ${accent}`, boxShadow: `0 0 20px ${accent}60`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.4rem', fontWeight: 'bold', color: accent,
                    }}>
                        {realm?.guardian?.[0] || '?'}
                    </div>
                    <div>
                      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2" style={{ textShadow: `0 0 24px ${accent}70, 0 2px 8px rgba(0,0,0,0.6)`, lineHeight: 1.1 }}>{realm?.name}</h1>
                      <p className="text-slate-300 font-medium text-sm sm:text-base leading-snug mb-2" style={{ maxWidth: '420px' }}>
                          {realm?.attribute === "Strength" && "Train your body and conquer physical challenges."}
                          {realm?.attribute === "Intellect" && "Expand your mind, read, and learn new skills."}
                          {realm?.attribute === "Vitality" && "Focus on health, wellness, and self-care routines."}
                          {realm?.attribute === "Creativity" && "Build, write, draw, and express your imagination."}
                          {realm?.attribute === "Discipline" && "Build habits, organize your life, and stay consistent."}
                          {realm?.attribute === "Connection" && "Spend time with others and nurture relationships."}
                          {realm?.attribute === "Exploration" && "Travel, try new things, and step out of your comfort zone."}
                          {realm?.attribute === "Miscellany" && "Handle the unclassified, the errands, and the odds and ends."}
                      </p>
                      <p className="text-slate-500 text-xs sm:text-sm font-semibold tracking-wide uppercase">Guarded by {realm?.guardian}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6 flex-wrap mt-2">
                    <div className="hidden sm:block"><ThematicClock accentColor={accent} /></div>
                    <motion.button
                        onClick={() => openModal()}
                        whileHover={{ scale: 1.04, boxShadow: `0 6px 28px ${accent}70` }}
                        whileTap={{ scale: 0.95 }}
                        style={{ background: accent, boxShadow: `0 4px 18px ${accent}50`, border: 'none', padding: '0.8rem 1.75rem', borderRadius: '999px', color: 'black', fontWeight: 'bold', display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer' }}
                    >
                       <motion.span whileHover={{ rotate: 90 }} style={{ display: 'inline-flex' }}><Plus size={18} /></motion.span> New Quest
                    </motion.button>
                </div>
            </div>

            {/* Right Column: Image */}
            {realm && (
              <div className="w-full lg:max-w-md xl:max-w-lg shrink-0">
                <div style={{ borderRadius: '24px', overflow: 'hidden', border: `1px solid ${accent}40`, boxShadow: `0 10px 40px ${accent}25`, background: 'rgba(15,23,42,0.6)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={`/images/${slug}.png`} 
                    alt={realm?.name || "Realm"} 
                    style={{ width: '100%', height: 'auto', maxHeight: '280px', display: 'block', objectFit: 'cover', objectPosition: 'center' }}
                    onError={(e) => {
                      (e.currentTarget.parentNode as HTMLElement).style.display = 'none';
                    }} 
                  />
                </div>
              </div>
            )}
         </div>
         {/* Quest List */}
         <div className="space-y-4">
             <div style={{ marginBottom: '1.25rem' }}>
                 <h2 className="text-xl font-semibold" style={{color: 'white', marginBottom: '0.4rem'}}>Active Quests</h2>
                 <div style={{ width: '64px', height: '3px', borderRadius: '2px', background: `linear-gradient(90deg, ${accent}, transparent)` }} />
             </div>
             <AnimatePresence>
                 {activeQuests.length === 0 && (
                     <motion.div
                        initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}}
                        className="p-8 rounded-2xl text-center"
                        style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(10px)', border: `1px solid ${accent}35`, boxShadow: `0 0 30px ${accent}15` }}
                     >
                         <motion.div
                            animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.15, 1] }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                            style={{ fontSize: '1.8rem', marginBottom: '0.75rem' }}
                         >
                            ✦
                         </motion.div>
                         <p style={{ fontSize: '1.05rem', color: '#cbd5e1' }}>{realm?.name} awaits your first quest.</p>
                         <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.3rem' }}>Plant a seed of intention.</p>
                     </motion.div>
                 )}
                 {activeQuests.map(q => {
                     const isExpanded = expandedQuests.has(q.id);
                     const blockingQuest = q.blocked_by && activeQuestsMap.get(q.blocked_by);
                     const isBlocked = !!blockingQuest;
                     const qPri = PRIORITY_MAPPING[q.priority || "medium"] || PRIORITY_MAPPING.medium;
                     
                     return (
                         <motion.div 
                            key={q.id}
                            layout
                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, y: -20, filter: 'blur(5px)' }}
                            className="mb-4"
                            onClick={(e) => toggleExpand(q.id, e)}
                            style={{ 
                                background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(10px)', 
                                border: `1px solid ${realm?.accent_color}60`, borderRadius: '16px', 
                                boxShadow: `0 4px 15px ${realm?.accent_color}10`,
                                overflow: 'hidden', cursor: 'default'
                            }}
                         >
                             <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 p-4 sm:p-5">
                                 <div className="flex-1 flex gap-4 items-start sm:items-center">
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); if (!isBlocked) handleComplete(q.id); }} 
                                        title={isBlocked ? "Blocked quests cannot be completed" : "Mark Done Instantly"} 
                                        disabled={isBlocked}
                                        style={{ width: '32px', height: '32px', borderRadius: '50%', border: `2px solid ${isBlocked ? '#64748b' : realm?.accent_color}`, background: 'transparent', cursor: isBlocked ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isBlocked ? '#64748b' : realm?.accent_color, transition: 'all 0.2s', flexShrink: 0 }}
                                     >
                                         {isBlocked ? <Lock size={14} /> : <Check size={16} style={{opacity: 0}} />}
                                     </button>
                                     <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                            <h3 className="text-lg font-bold" style={{ color: isBlocked ? '#cbd5e1' : 'white' }}>{q.title}</h3>
                                            <span style={{ padding: '1px 6px', borderRadius: '8px', background: qPri.bg, color: qPri.color, border: `1px solid ${qPri.border}`, fontSize: '0.65rem' }}>{qPri.label} Priority</span>
                                        </div>
                                        {q.description && <p className="text-sm text-slate-400 mt-1">{q.description}</p>}
                                        {isBlocked && (
                                            <p style={{ fontSize: '0.75rem', color: '#f43f5e', marginTop: '4px', fontWeight: 'bold' }}>
                                                Blocked by: {blockingQuest.title}
                                            </p>
                                        )}
                                        <div className="flex gap-3 mt-2 text-xs flex-wrap">
                                            <span style={{ padding: '2px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)' }}>{q.difficulty.toUpperCase()} • XP {DIFF_MAPPING[q.difficulty].xp}</span>
                                            {q.due_date && (
                                               <span style={{ 
                                                   padding: '2px 8px', borderRadius: '12px', 
                                                   background: new Date(q.due_date) < new Date() ? 'rgba(239, 68, 68, 0.3)' : 'rgba(148, 163, 184, 0.2)', 
                                                   color: new Date(q.due_date) < new Date() ? '#fca5a5' : '#cbd5e1', 
                                                   display: 'flex', alignItems: 'center', gap: '4px',
                                                   border: new Date(q.due_date) < new Date() ? '1px solid rgba(239, 68, 68, 0.5)' : 'none'
                                               }}>
                                                   <Calendar size={12}/> 
                                                   {new Date(q.due_date).toLocaleDateString()}
                                                   {new Date(q.due_date) < new Date() && " (Overdue)"}
                                               </span>
                                            )}
                                            {q.repeat_rule && q.repeat_rule !== 'none' && (
                                               <span style={{ padding: '2px 8px', borderRadius: '12px', background: 'rgba(139,92,246,0.2)', color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                   <Repeat size={12} /> {describeRepeatRule(q.repeat_rule)}
                                               </span>
                                            )}
                                        </div>
                                     </div>
                                 </div>
    
                                 <div className="flex gap-3 items-center justify-end w-full sm:w-auto">
                                     {isExpanded ? <ChevronUp size={16} color="#64748b" className="hidden sm:block" /> : <ChevronDown size={16} color="#64748b" className="hidden sm:block" />}
                                     <button
                                        disabled={isBlocked}
                                        onClick={(e) => { e.stopPropagation(); if(!isBlocked) setFocusTarget({ questId: q.id, questTitle: q.title }); }}
                                        style={{ background: isBlocked ? '#334155' : realm?.accent_color, color: isBlocked ? '#94a3b8' : 'black', border: 'none', borderRadius: '10px', padding: '0.5rem 0.9rem', fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: isBlocked ? 'not-allowed' : 'pointer' }}
                                     >
                                        <Swords size={14} /> Begin Quest
                                     </button>
                                     <button onClick={(e) => { e.stopPropagation(); openModal(q); }} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><Edit2 size={18} /></button>
                                     <button onClick={(e) => handleArchive(q.id, e)} style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer' }}><Archive size={18} /></button>
                                 </div>
                             </div>

                             {/* Expandable Body */}
                             <AnimatePresence>
                               {isExpanded && (
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
                                                          style={{ width: '16px', height: '16px', borderRadius: '4px', border: `1px solid ${item.done ? realm?.accent_color : '#64748b'}`, background: item.done ? realm?.accent_color : 'transparent', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
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

                                   </div>
                                 </motion.div>
                               )}
                             </AnimatePresence>
                         </motion.div>
                     );
                 })}
             </AnimatePresence>

             {completedQuests.length > 0 && (
                 <div className="mt-12">
                     <h2 className="text-xl font-semibold mb-4 text-slate-400">Completed Quests ({completedQuests.length})</h2>
                     <div className="space-y-3">
                         {completedQuests.map(q => (
                             <div key={q.id} style={{ background: 'rgba(15, 23, 42, 0.6)', border: `1px solid ${realm?.accent_color}30`, borderLeft: `3px solid ${realm?.accent_color}80`, borderRadius: '12px', padding: '0.9rem 1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                 <h3 className="line-through text-slate-300">{q.title}</h3>
                                 <button onClick={(e) => handleArchive(q.id, e)} aria-label="Archive quest" style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer' }}><Archive size={16} /></button>
                             </div>
                         ))}
                     </div>
                 </div>
             )}
         </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                <motion.div 
                    initial={{opacity: 0, scale: 0.95, y: 20}} animate={{opacity: 1, scale: 1, y: 0}} exit={{opacity: 0, scale: 0.95, y: 20}}
                    style={{ background: 'rgba(15,23,42,0.95)', border: `1px solid ${realm?.accent_color}`, borderRadius: '24px', padding: '2rem', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', zIndex: 61, boxShadow: `0 25px 50px rgba(0,0,0,0.5), 0 0 40px ${realm?.accent_color}20` }}
                >
                    <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24}/></button>
                    <h2 className="text-2xl font-bold mb-6">{editingQuest ? 'Modify Intent' : 'Forge New Intent'}</h2>
                    
                    {errorMsg && <div className="alert alert-error mb-4" role="alert" aria-live="assertive">{errorMsg}</div>}

                    <form onSubmit={handleSaveQuest} className="flex flex-col gap-4">
                        <div className="form-group mb-0">
                            <label className="form-label">Quest Title</label>
                            <input type="text" className="form-input" style={{paddingLeft: '1rem'}} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Read Chapter 4" />
                        </div>
                        <div className="form-group mb-0">
                            <label className="form-label">Description (Optional)</label>
                            <textarea className="form-input" style={{paddingLeft: '1rem', minHeight: '80px'}} value={description} onChange={e => setDescription(e.target.value)} placeholder="Add any details..." />
                        </div>
                        <div className="flex gap-4">
                            <div className="form-group flex-1 mb-0">
                                <label className="form-label">Difficulty</label>
                                <select className="form-input form-select" style={{paddingLeft: '1rem'}} value={difficulty} onChange={e => setDifficulty(e.target.value as any)}>
                                    <option value="easy">Easy (10 XP / 5 Shards)</option>
                                    <option value="normal">Normal (25 XP / 12 Shards)</option>
                                    <option value="hard">Hard (50 XP / 25 Shards)</option>
                                </select>
                            </div>
                            <div className="form-group flex-1 mb-0">
                                <label className="form-label">Priority</label>
                                <select className="form-input form-select" style={{paddingLeft: '1rem'}} value={priority} onChange={e => setPriority(e.target.value as Priority)}>
                                    <option value="low">Low Priority</option>
                                    <option value="medium">Medium Priority</option>
                                    <option value="high">High Priority</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group mb-0">
                            <label className="form-label">Blocked By (Dependency)</label>
                            <select className="form-input form-select" style={{paddingLeft: '1rem'}} value={blockedBy} onChange={e => setBlockedBy(e.target.value)}>
                                <option value="">None</option>
                                {activeQuests.map(q => q.id !== editingQuest?.id && <option key={q.id} value={q.id}>{q.title}</option>)}
                            </select>
                        </div>
                        <div className="form-group mb-0">
                            <div className="flex justify-between items-center">
                                <label className="form-label">Due Date (Optional)</label>
                                {dueDate && (
                                    <button 
                                        type="button"
                                        onClick={() => handleAddToCalendar({ title, description, dueDate })}
                                        title="Add to Google Calendar"
                                        style={{ background: 'transparent', border: 'none', color: '#6366f1', cursor: 'pointer', padding: 0 }}
                                    >
                                        <CalendarPlus size={16} />
                                    </button>
                                )}
                            </div>
                            <input type="date" className="form-input mt-1" style={{paddingLeft: '1rem'}} value={dueDate} onChange={e => setDueDate(e.target.value)} />
                        </div>
                        <div className="form-group mb-0">
                            <label className="form-label">Tags (comma-separated)</label>
                            <input type="text" className="form-input" style={{paddingLeft: '1rem'}} value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="e.g. work, reading, urgent" />
                        </div>
                        <div className="form-group mb-0">
                            <label className="form-label">Repeats</label>
                            <select className="form-input form-select" style={{paddingLeft: '1rem'}} value={repeatRule} onChange={e => setRepeatRule(e.target.value)}>
                                <option value="none">Does not repeat</option>
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly (choose days)</option>
                            </select>
                            {repeatRule === 'weekly' && (
                                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
                                    {WEEKDAYS.map(d => (
                                        <button
                                            key={d.key}
                                            type="button"
                                            onClick={() => toggleRepeatDay(d.key)}
                                            style={{
                                                padding: '0.35rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer',
                                                border: repeatDays.includes(d.key) ? `2px solid ${realm?.accent_color}` : '1px solid rgba(255,255,255,0.2)',
                                                background: repeatDays.includes(d.key) ? `${realm?.accent_color}25` : 'transparent',
                                                color: 'white',
                                            }}
                                        >
                                            {d.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button type="submit" className="btn-primary mt-4" style={{ background: realm?.accent_color, color: 'black' }}>
                            {editingQuest ? 'Reshape Quest' : 'Bind Quest to Realm'}
                        </button>
                    </form>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {focusTarget && realm && (
          <FocusSessionOverlay
              questId={focusTarget.questId}
              questTitle={focusTarget.questTitle}
              realmName={realm.name}
              guardian={realm.guardian}
              accentColor={realm.accent_color}
              resume={focusTarget.resume}
              onCancelled={() => setFocusTarget(null)}
              onError={(message) => { alert(message); setFocusTarget(null); }}
              onCompleted={async (completion) => {
                  const finishedQuest = quests.find(q => q.id === focusTarget.questId);
                  setFocusTarget(null);
                  await refetchQuests(realm.id);
                  if (completion && finishedQuest) {
                      applyCompletionRewards(finishedQuest, completion, realm);
                  }
              }}
          />
      )}

      {guardianToast && realm && (
          <GuardianToast guardian={realm.guardian} line={guardianToast} accentColor={realm.accent_color} onDismiss={() => setGuardianToast(null)} />
      )}
    </div>
  );
}
