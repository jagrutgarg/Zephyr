"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Priority, PRIORITY_MAPPING } from "@/lib/questDefaults";

type CalendarQuest = {
  id: string;
  title: string;
  priority: Priority;
  due_date: string | null;
  is_completed: boolean;
  realm_id: string;
  realms: { slug: string; name: string; accent_color: string } | null;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const router = useRouter();
  const supabase = createClient();
  const [quests, setQuests] = useState<CalendarQuest[]>([]);
  const [loading, setLoading] = useState(true);

  // Month navigation
  const [currentDate, setCurrentDate] = useState(() => new Date());
  
  // Selection
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  useEffect(() => {
    async function loadQuests() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      
      const { data } = await supabase
        .from("quests")
        .select("id, title, priority, due_date, is_completed, realm_id, realms(slug, name, accent_color)")
        .eq("user_id", user.id)
        .eq("is_archived", false)
        .not("due_date", "is", null);

      if (data) setQuests(data as any);
      setLoading(false);
    }
    loadQuests();
  }, [router, supabase]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handleComplete = async (questId: string) => {
    setQuests(prev => prev.map(q => q.id === questId ? { ...q, is_completed: true } : q));
    await supabase.rpc("complete_quest", { p_quest_id: questId });
  };

  // Calendar logic
  const gridCells = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: { date: Date, isCurrentMonth: boolean, dateString: string }[] = [];

    // Previous month filler days
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      cells.push({ date: d, isCurrentMonth: false, dateString: d.toISOString().split("T")[0] });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        cells.push({ date: d, isCurrentMonth: true, dateString: d.toISOString().split("T")[0] });
    }
    
    // Next month filler days to complete the 7xN grid
    let nextMonthDay = 1;
    while (cells.length % 7 !== 0) {
        const d = new Date(year, month + 1, nextMonthDay++);
        cells.push({ date: d, isCurrentMonth: false, dateString: d.toISOString().split("T")[0] });
    }

    return cells;
  }, [year, month]);

  const questsByDate = useMemo(() => {
    const map = new Map<string, CalendarQuest[]>();
    quests.forEach(q => {
      if (!q.due_date) return;
      const dStr = new Date(q.due_date).toISOString().split("T")[0];
      if (!map.has(dStr)) map.set(dStr, []);
      map.get(dStr)!.push(q);
    });
    return map;
  }, [quests]);

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));

  if (loading) return <div className="auth-container"><div className="spinner"></div></div>;

  const selectedDateStr = selectedDate ? selectedDate.toISOString().split("T")[0] : null;
  const selectedQuests = selectedDateStr ? (questsByDate.get(selectedDateStr) || []) : [];

  return (
    <div style={{ minHeight: "100vh", background: "#020617", color: "white" }}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        
        {/* Header */}
        <div style={{ padding: "1.5rem", borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button onClick={() => router.push("/dashboard")} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                    <ArrowLeft size={16} /> Dashboard
                </button>
                <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />
                <h1 style={{ fontSize: "1.2rem", fontWeight: "bold", margin: 0 }}>Calendar</h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button onClick={prevMonth} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><ChevronLeft size={24}/></button>
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold', width: '150px', textAlign: 'center' }}>
                    {currentDate.toLocaleString('default', { month: 'long' })} {year}
                </span>
                <button onClick={nextMonth} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><ChevronRight size={24}/></button>
            </div>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            
            {/* Calendar Grid */}
            <div style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '1px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
                    {WEEKDAYS.map(d => (
                        <div key={d} style={{ padding: '0.8rem', textAlign: 'center', background: 'rgba(15,23,42,0.9)', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 'bold' }}>
                            {d}
                        </div>
                    ))}

                    {gridCells.map((cell, i) => {
                        const cellQuests = questsByDate.get(cell.dateString) || [];
                        const isSelected = selectedDateStr === cell.dateString;
                        const isToday = new Date().toISOString().split("T")[0] === cell.dateString;

                        return (
                            <div 
                                key={i} 
                                onClick={() => setSelectedDate(cell.date)}
                                style={{ 
                                    background: isSelected ? 'rgba(139,92,246,0.15)' : 'rgba(15,23,42,0.85)',
                                    minHeight: '120px', padding: '0.6rem', cursor: 'pointer', transition: 'background 0.2s',
                                    border: isSelected ? '1px solid rgba(139,92,246,0.5)' : '1px solid transparent',
                                    position: 'relative', opacity: cell.isCurrentMonth ? 1 : 0.4
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <span style={{ 
                                        width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', 
                                        background: isToday ? '#8b5cf6' : 'transparent', color: isToday ? 'white' : (cell.isCurrentMonth ? 'white' : '#64748b'),
                                        fontSize: '0.85rem', fontWeight: isToday ? 'bold' : 'normal'
                                    }}>
                                        {cell.date.getDate()}
                                    </span>
                                    {cellQuests.length > 3 && (
                                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>+{cellQuests.length - 3}</span>
                                    )}
                                </div>
                                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {cellQuests.slice(0, 3).map(q => {
                                        const c = q.realms?.accent_color || '#8b5cf6';
                                        return (
                                            <div key={q.id} style={{ 
                                                fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', 
                                                background: q.is_completed ? 'rgba(255,255,255,0.05)' : `${c}20`,
                                                color: q.is_completed ? '#64748b' : c,
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                borderLeft: `2px solid ${q.is_completed ? '#64748b' : c}`,
                                                textDecoration: q.is_completed ? 'line-through' : 'none'
                                            }}>
                                                {q.title}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Side Panel */}
            <AnimatePresence>
                <motion.div
                    initial={{ width: 0, opacity: 0 }} animate={{ width: '350px', opacity: 1 }}
                    style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                >
                    {selectedDate && (
                        <div style={{ padding: '2rem 1.5rem', flex: 1, overflowY: 'auto' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.2rem' }}>
                                {selectedDate.toLocaleDateString(undefined, { weekday: 'long' })}
                            </h2>
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '2rem' }}>
                                {selectedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>

                            {selectedQuests.length === 0 ? (
                                <div style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', marginTop: '2rem' }}>
                                    No quests scheduled for this day.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    {selectedQuests.map(q => {
                                        const c = q.realms?.accent_color || '#8b5cf6';
                                        return (
                                            <div key={q.id} style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${c}30`, borderRadius: '12px', padding: '1rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                    <span style={{ fontSize: '0.75rem', color: c, fontWeight: 'bold' }}>{q.realms?.name}</span>
                                                    {!q.is_completed && (
                                                        <button 
                                                          onClick={() => handleComplete(q.id)}
                                                          title="Complete Quest"
                                                          style={{ background: 'transparent', border: `1px solid ${c}80`, borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyItems: 'center', color: c, cursor: 'pointer' }}
                                                        ><Check size={12}/></button>
                                                    )}
                                                </div>
                                                <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: q.is_completed ? '#64748b' : 'white', textDecoration: q.is_completed ? 'line-through' : 'none' }}>
                                                    {q.title}
                                                </h3>
                                                <button onClick={() => router.push(`/realms/${q.realms?.slug}`)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.8rem', padding: 0, marginTop: '0.5rem', cursor: 'pointer', textDecoration: 'underline' }}>
                                                    Go to Realm →
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
