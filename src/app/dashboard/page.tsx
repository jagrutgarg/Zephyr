"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { MapParallax, RealmNode, VoidNode } from "@/components/MapComponents";
import { LogOut } from "lucide-react";
import { useGameStore } from "@/store/useGameStore";
import { ThematicClock } from "@/components/Clock";

const REALMS = [
  { id: 'enchanted_woods', name: 'The Enchanted Woods', guardian: 'The Fairy Keeper', themeColor: '#10b981', x: 20, y: 30 },
  { id: 'celestial_kingdom', name: 'The Celestial Kingdom', guardian: 'The Royal Dragon', themeColor: '#fbbf24', x: 50, y: 15 },
  { id: 'astral_library', name: 'The Astral Library', guardian: 'The Archivist', themeColor: '#3b82f6', x: 80, y: 30 },
  { id: 'neo_mystica', name: 'Neo-Mystica', guardian: 'AX-7 Ancient Machine', themeColor: '#8b5cf6', x: 85, y: 65 },
  { id: 'xyran_frontier', name: 'Xyran Frontier', guardian: 'The Star Wanderer', themeColor: '#6366f1', x: 60, y: 85 },
  { id: 'timeless_realm', name: 'The Timeless Realm', guardian: 'The Chronomancer', themeColor: '#14b8a6', x: 30, y: 85 },
  { id: 'dreaming_isles', name: 'The Dreaming Isles', guardian: 'The Dream Weaver', themeColor: '#f472b6', x: 10, y: 60 },
];

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Zustand Score Hook
  const { stats, realmProgress, setStats, setRealmProgress } = useGameStore();

  const aetherRank = Object.values(realmProgress).reduce((acc, curr) => acc + curr.current_level, 0);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);
      
      // Load global stats
      const { data: statsData } = await supabase.from('user_stats').select('*').eq('user_id', user.id).single();
      if (statsData) setStats(statsData);

      // Passive Void Growth check
      const { data: voidUpdate } = await supabase.rpc('sync_passive_void');
      if (voidUpdate && voidUpdate.void_percentage !== undefined) {
         setStats({ ...statsData, void_percentage: voidUpdate.void_percentage });
      }

      // Load Realm Progress
      const { data: realmData } = await supabase.from('user_realm_progress').select('*').eq('user_id', user.id);
      if (realmData) setRealmProgress(realmData);

      setLoading(false);
    }
    loadData();
  }, [router, supabase, setStats, setRealmProgress]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: "center", padding: "3rem" }}>
          <div className="spinner" style={{ width: "32px", height: "32px", margin: "0 auto 1rem" }} />
          <p className="auth-subtitle">Loading Aetheria map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[100vh]" style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: '#020617' }}>
      <MapParallax />
      
      {/* HUD (Heads Up Display) */}
      <div style={{ position: 'absolute', top: '1rem', left: '1rem', right: '1rem', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem', background: 'rgba(15,23,42,0.8)', padding: '0.5rem 1rem', borderRadius: '1rem', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{color: 'white', fontWeight: 'bold'}}>✨ Rank: {aetherRank || 1}</div>
            <div style={{color: '#34d399', fontWeight: 'bold'}}>💎 Shards: {stats.total_shards}</div>
            <div style={{color: '#fb923c', fontWeight: 'bold'}}>🔥 Streak: {stats.streak_count}</div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <ThematicClock />
            <button onClick={handleSignOut} style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '50%', padding: '0.75rem', color: '#fca5a5', cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(10px)' }} aria-label="Sign Out">
               <LogOut size={20} />
            </button>
        </div>
      </div>

      {/* Center Hub / Void */}
      <VoidNode percentage={Number(stats.void_percentage) || 0} />

      {/* Floating Islands */}
      {REALMS.map(realm => {
         // Using ID/Slug mapping constraint for MVP
         // We lookup using the ID mapped in Zustand
         const progressObj = Object.values(realmProgress).find(p => p.realm_id === realm.id || (p as any).slug === realm.id);
         const nodeLevel = progressObj ? progressObj.current_level : 1;
         
         return <RealmNode key={realm.id} {...realm} level={nodeLevel} />
      })}
    </div>
  );
}
