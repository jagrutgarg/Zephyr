"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Check, Trash2, Edit2, Calendar, CalendarPlus } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import { useGameStore } from "@/store/useGameStore";
import { ThematicClock } from "@/components/Clock";
import { buildGoogleCalendarUrl } from "@/lib/googleCalendar";
import { DIFF_MAPPING } from "@/lib/questDefaults";

type Quest = {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "normal" | "hard";
  xp_value: number;
  shard_value: number;
  due_date: string | null;
  is_completed: boolean;
};

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
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  
  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<"easy"|"normal"|"hard">("normal");
  const [dueDate, setDueDate] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

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

      // Fetch Quests
      const { data: questData } = await supabase
        .from("quests")
        .select("*")
        .eq("realm_id", realmData.id)
        .order("created_at", { ascending: false });
        
      if (questData) setQuests(questData);
      setLoading(false);
    }
    loadData();
  }, [slug, router, supabase]);

  const openModal = (q?: Quest) => {
    if (q) {
        setEditingQuest(q);
        setTitle(q.title);
        setDescription(q.description || "");
        setDifficulty(q.difficulty);
        setDueDate(q.due_date ? q.due_date.split('T')[0] : "");
    } else {
        setEditingQuest(null);
        setTitle("");
        setDescription("");
        setDifficulty("normal");
        setDueDate("");
    }
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleSaveQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
        setErrorMsg("Your quest needs a title.");
        return;
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !realm) return;

    const payload = {
        user_id: user.id,
        realm_id: realm.id,
        title,
        description,
        difficulty,
        xp_value: DIFF_MAPPING[difficulty].xp,
        shard_value: DIFF_MAPPING[difficulty].shard,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
    };

    if (editingQuest) {
        // Edit Optimistic
        setQuests(prev => prev.map(q => q.id === editingQuest.id ? { ...q, ...payload } : q));
        setIsModalOpen(false);
        const { error } = await supabase.from("quests").update(payload).eq("id", editingQuest.id);
        if (error) {
            alert("The Aether didn't respond. Try again.");
            // rollback skipped for MVP brevity
        }
    } else {
        // Add Optimistic (fake ID initially)
        const fakeId = "temp-" + Date.now();
        const optimisticQuest = { ...payload, id: fakeId, is_completed: false } as Quest;
        setQuests([optimisticQuest, ...quests]);
        setIsModalOpen(false);
        
        const { data, error } = await supabase.from("quests").insert([payload]).select().single();
        if (error) {
            alert("The Aether didn't respond. Try again.");
            setQuests(prev => prev.filter(q => q.id !== fakeId));
        } else {
            setQuests(prev => prev.map(q => q.id === fakeId ? data : q));
        }
    }
  };

  const handleDelete = async (questId: string) => {
      if (!confirm("Are you sure you want to abandon this quest?")) return;
      
      setQuests(prev => prev.filter(q => q.id !== questId));
      await supabase.from("quests").delete().eq("id", questId);
  };

  const handleComplete = async (questId: string) => {
      // Optimistic visual
      setQuests(prev => prev.map(q => q.id === questId ? { ...q, is_completed: true } : q));
      
      // Server update
      const { data, error } = await supabase.rpc('complete_quest', { p_quest_id: questId });
      
      if (error) {
          alert("Failed to complete quest.");
          // Rollback
          setQuests(prev => prev.map(q => q.id === questId ? { ...q, is_completed: false } : q));
      } else {
          // data contains {current_xp, new_level, leveled_up, streak}
          // Update game store
          const q = quests.find(q => q.id === questId);
          if (q) {
             addShards(q.shard_value);
             reduceVoid(2);
             // Streak logic is handled simply in the store if we want, or we just rely on DB fetch later
             gainRealmXP(realm.id, q.xp_value, data.leveled_up, data.new_level);
             if (typeof window !== "undefined") {
                 sessionStorage.setItem("lastCompletedRealmSlug", slug);
             }
             if (data.leveled_up) {
                 alert(`The ${realm.guardian} smiles! ${realm.name} grew to level ${data.new_level}!`);
             }
          }
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

  return (
    <div className="relative min-h-screen pb-20" style={{ background: '#020617', color: 'white', overflowX: 'hidden' }}>
      <ParticleBackground />
      
      <div className="relative z-10 max-w-4xl mx-auto pt-10 px-6">
         {/* Internal Header */}
         <button onClick={() => router.push('/dashboard')} className="mb-6 text-sm flex items-center gap-2" style={{color: realm?.accent_color}}>
           ← Back to World Map
         </button>
         
         <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">{realm?.name}</h1>
              <p className="text-slate-400">Guarded by {realm?.guardian}</p>
            </div>
            
            <div className="flex items-center gap-6">
                <div className="hidden sm:block"><ThematicClock /></div>
                <button onClick={() => openModal()} className="btn-primary" style={{ background: realm?.accent_color, boxShadow: `0 4px 15px ${realm?.accent_color}40`, border: 'none', padding: '0.8rem 1.5rem', borderRadius: '12px', color: 'black', fontWeight: 'bold', display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer' }}>
                   <Plus size={18} /> New Quest
                </button>
            </div>
         </div>

         {/* Quest List */}
         <div className="space-y-4">
             <h2 className="text-xl font-semibold mb-4" style={{color: realm?.accent_color}}>Active Quests</h2>
             <AnimatePresence>
                 {activeQuests.length === 0 && (
                     <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="p-6 rounded-2xl text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)' }}>
                         {realm?.name} awaits your first quest. Plant a seed of intention.
                     </motion.div>
                 )}
                 {activeQuests.map(q => (
                     <motion.div 
                        key={q.id}
                        layout
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, y: -20, filter: 'blur(5px)' }}
                        whileHover={{ scale: 1.02, rotateX: 5, rotateY: 2 }}
                        style={{ perspective: 800 }}
                        className="mb-4"
                     >
                         <div style={{ background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(10px)', border: `1px solid ${realm?.accent_color}60`, borderRadius: '16px', padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 4px 15px ${realm?.accent_color}10` }}>
                             
                             <div className="flex-1 flex gap-4 items-center">
                                 <button onClick={() => handleComplete(q.id)} style={{ width: '32px', height: '32px', borderRadius: '50%', border: `2px solid ${realm?.accent_color}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: realm?.accent_color, transition: 'all 0.2s' }}>
                                     <Check size={16} style={{opacity: 0}} />
                                 </button>
                                 <div>
                                    <h3 className="text-lg font-bold">{q.title}</h3>
                                    {q.description && <p className="text-sm text-slate-400 mt-1">{q.description}</p>}
                                    <div className="flex gap-3 mt-2 text-xs">
                                        <span style={{ padding: '2px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)' }}>{q.difficulty.toUpperCase()} • XP {DIFF_MAPPING[q.difficulty].xp}</span>
                                        {q.due_date && (
                                           <span style={{ 
                                               padding: '2px 8px', 
                                               borderRadius: '12px', 
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
                                    </div>
                                 </div>
                             </div>

                             <div className="flex gap-2">
                                 {q.due_date && (
                                     <button 
                                        onClick={() => handleAddToCalendar({ title: q.title, description: q.description, dueDate: q.due_date! })} 
                                        title="Add to Google Calendar"
                                        style={{ background: 'transparent', border: 'none', color: '#6366f1', cursor: 'pointer' }}>
                                         <CalendarPlus size={18} />
                                     </button>
                                 )}
                                 <button onClick={() => openModal(q)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><Edit2 size={18} /></button>
                                 <button onClick={() => handleDelete(q.id)} style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer' }}><Trash2 size={18} /></button>
                             </div>
                         </div>
                     </motion.div>
                 ))}
             </AnimatePresence>

             {completedQuests.length > 0 && (
                 <div className="mt-12">
                     <h2 className="text-xl font-semibold mb-4 text-slate-500">Completed Quests</h2>
                     <div className="opacity-50">
                         {completedQuests.map(q => (
                             <div key={q.id} style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', padding: '1rem', display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                 <h3 className="line-through">{q.title}</h3>
                                 <button onClick={() => handleDelete(q.id)} style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer' }}><Trash2 size={16} /></button>
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                <motion.div 
                    initial={{opacity: 0, scale: 0.95, y: 20}} animate={{opacity: 1, scale: 1, y: 0}} exit={{opacity: 0, scale: 0.95, y: 20}}
                    style={{ background: 'rgba(15,23,42,0.9)', border: `1px solid ${realm?.accent_color}`, borderRadius: '24px', padding: '2rem', width: '100%', maxWidth: '500px', position: 'relative', zIndex: 51, boxShadow: `0 25px 50px rgba(0,0,0,0.5), 0 0 40px ${realm?.accent_color}20` }}
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
                        </div>
                        <button type="submit" className="btn-primary mt-4" style={{ background: realm?.accent_color, color: 'black' }}>
                            {editingQuest ? 'Reshape Quest' : 'Bind Quest to Realm'}
                        </button>
                    </form>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
}
