"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { MapParallax, RealmNode, VoidNode } from "@/components/MapComponents";
import { PlayerCharacter } from "@/components/PlayerCharacter";
import { OnboardingModal } from "@/components/OnboardingModal";
import { LogOut, Plus } from "lucide-react";
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
  const [activeRealmSlugs, setActiveRealmSlugs] = useState<Set<string>>(new Set());
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [characterTarget, setCharacterTarget] = useState<{ x: number; y: number } | null>(null);
  const [isWalking, setIsWalking] = useState(false);

  // Zustand Score Hook
  const { stats, realmProgress, setStats, setRealmProgress } = useGameStore();

  const aetherRank = Object.values(realmProgress).reduce((acc, curr) => acc + curr.current_level, 0);

  const loadActiveRealms = async (userId: string) => {
    const { data: questRows } = await supabase
      .from('quests')
      .select('realm_id, realms(slug)')
      .eq('user_id', userId);

    const slugs = new Set<string>();
    (questRows || []).forEach((row: any) => {
      const slug = row.realms?.slug;
      if (slug) slugs.add(slug);
    });
    setActiveRealmSlugs(slugs);
    return slugs;
  };

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

      const slugs = await loadActiveRealms(user.id);
      if (slugs.size === 0) {
        setShowOnboarding(true);
      }

      // Character: walk to the realm of the most recently completed quest, else rest at first active realm
      const lastCompletedSlug = typeof window !== "undefined" ? sessionStorage.getItem("lastCompletedRealmSlug") : null;
      const homeSlug = lastCompletedSlug && slugs.has(lastCompletedSlug) ? lastCompletedSlug : Array.from(slugs)[0];
      const homeRealm = REALMS.find(r => r.id === homeSlug);
      if (homeRealm) {
        setCharacterTarget({ x: homeRealm.x, y: homeRealm.y });
        if (lastCompletedSlug) {
          setIsWalking(true);
          sessionStorage.removeItem("lastCompletedRealmSlug");
          setTimeout(() => setIsWalking(false), 1200);
        }
      }

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

  const activeRealms = REALMS.filter(r => activeRealmSlugs.has(r.id));

  return (
    <div className="relative w-full h-[100vh]" style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: '#020617', perspective: 1400 }}>
      <MapParallax />

      {/* HUD (Heads Up Display) */}
      <div style={{ position: 'absolute', top: '1rem', left: '1rem', right: '1rem', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '1rem', background: 'rgba(15,23,42,0.8)', padding: '0.5rem 1rem', borderRadius: '1rem', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{color: 'white', fontWeight: 'bold'}}>✨ Rank: {aetherRank || 1}</div>
            <div style={{color: '#34d399', fontWeight: 'bold'}}>💎 Shards: {stats.total_shards}</div>
            <div style={{color: '#fb923c', fontWeight: 'bold'}}>🔥 Streak: {stats.streak_count}</div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <ThematicClock />
            <button
              onClick={() => setShowOnboarding(true)}
              aria-label="Add Quest"
              style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: '50%', padding: '0.75rem', color: '#c4b5fd', cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(10px)' }}
            >
               <Plus size={20} />
            </button>
            <button onClick={handleSignOut} style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '50%', padding: '0.75rem', color: '#fca5a5', cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(10px)' }} aria-label="Sign Out">
               <LogOut size={20} />
            </button>
        </div>
      </div>

      {/* Center Hub / Void */}
      <VoidNode percentage={Number(stats.void_percentage) || 0} />

      {/* Floating Islands — only Realms with at least one Quest manifest a Tower */}
      {activeRealms.map(realm => {
         const progressObj = Object.values(realmProgress).find(p => p.realm_id === realm.id || (p as any).slug === realm.id);
         const nodeLevel = progressObj ? progressObj.current_level : 1;

         return <RealmNode key={realm.id} {...realm} level={nodeLevel} />
      })}

      {/* Player Character */}
      {characterTarget && <PlayerCharacter x={characterTarget.x} y={characterTarget.y} isWalking={isWalking} />}

      {/* Empty-map prompt */}
      {activeRealms.length === 0 && !showOnboarding && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 6, textAlign: 'center', color: '#cbd5e1', maxWidth: '360px' }}>
          <p style={{ marginBottom: '1rem' }}>The map is unclaimed. Add your first Quest to summon a Tower.</p>
          <button onClick={() => setShowOnboarding(true)} className="btn-primary" style={{ background: '#8b5cf6', color: 'black', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
            Add Your First Quest
          </button>
        </div>
      )}

      {showOnboarding && (
        <OnboardingModal
          realms={REALMS.map(r => ({ id: r.id, name: r.name, themeColor: r.themeColor }))}
          onClose={() => setShowOnboarding(false)}
          onSaved={async () => {
            setShowOnboarding(false);
            if (user) await loadActiveRealms(user.id);
          }}
        />
      )}
    </div>
  );
}
