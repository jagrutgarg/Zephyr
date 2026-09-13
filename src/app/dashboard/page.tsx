"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { MapParallax } from "@/components/MapComponents";
import { OnboardingModal } from "@/components/OnboardingModal";
import { LogOut, Plus } from "lucide-react";
import { useGameStore } from "@/store/useGameStore";
import { ThematicClock } from "@/components/Clock";
import { REALMS } from "@/lib/realms";
import { Swords, ListChecks } from "lucide-react";
import { DashboardMapBackground } from "@/components/three/DashboardMapBackground";
import { Canvas3DErrorBoundary } from "@/components/three/Canvas3DErrorBoundary";
import { useWebGLSupport } from "@/hooks/useWebGLSupport";
import { AetheriaRestoredOverlay } from "@/components/AetheriaRestoredOverlay";
import { DailyGreeting } from "@/components/DailyGreeting";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const webglSupported = useWebGLSupport();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRealmSlugs, setActiveRealmSlugs] = useState<Set<string>>(new Set());
  const [realmIdToSlug, setRealmIdToSlug] = useState<Record<string, string>>({});
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [focusNotice, setFocusNotice] = useState<{ type: "active" | "completed"; realmSlug: string; realmName: string; questTitle: string } | null>(null);
  const [showRestored, setShowRestored] = useState(false);
  const [greeting, setGreeting] = useState<{ mode: "new_day" | "same_day_pending" | "same_day_clear"; openCount: number } | null>(null);

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

      // Pick up the display name chosen at signup if email confirmation delayed saving it
      const pendingDisplayName = typeof window !== "undefined" ? sessionStorage.getItem("pendingDisplayName") : null;
      if (pendingDisplayName && !user.user_metadata?.display_name) {
        await supabase.auth.updateUser({ data: { display_name: pendingDisplayName } });
        sessionStorage.removeItem("pendingDisplayName");
        const { data: { user: refreshedUser } } = await supabase.auth.getUser();
        if (refreshedUser) setUser(refreshedUser);
      } else {
        setUser(user);
      }

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

      // Map realm uuid -> slug once, so progress rows (keyed by uuid) can be
      // matched against REALMS (keyed by slug) to know which Towers have awakened.
      const { data: realmRows } = await supabase.from('realms').select('id, slug');
      if (realmRows) {
        setRealmIdToSlug(Object.fromEntries(realmRows.map((r: any) => [r.id, r.slug])));
      }

      const slugs = await loadActiveRealms(user.id);
      if (slugs.size === 0) {
        setShowOnboarding(true);
      }

      // Surface a focus session that finished (or is still running) elsewhere
      const { data: session } = await supabase.rpc('get_active_focus_session');
      if (session && session.status !== 'none') {
        setFocusNotice({ type: session.status, realmSlug: session.realm_slug, realmName: session.realm_name, questTitle: session.quest_title });
        if (session.status === 'completed') {
          // Rewards were already applied server-side — refresh the numbers shown here.
          const { data: freshStats } = await supabase.from('user_stats').select('*').eq('user_id', user.id).single();
          if (freshStats) setStats(freshStats);
          const { data: freshProgress } = await supabase.from('user_realm_progress').select('*').eq('user_id', user.id);
          if (freshProgress) setRealmProgress(freshProgress);
        }
      }

      // Daily greeting: a fresh prompt the first time you land here on a
      // given day, a different nudge if you're already back the same day.
      const todayStr = new Date().toDateString();
      const lastGreetDate = typeof window !== "undefined" ? localStorage.getItem("lastGreetDate") : todayStr;
      if (lastGreetDate !== todayStr) {
        setGreeting({ mode: "new_day", openCount: 0 });
      } else {
        const { count } = await supabase
          .from("quests")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_completed", false);
        setGreeting({ mode: count && count > 0 ? "same_day_pending" : "same_day_clear", openCount: count || 0 });
      }
      if (typeof window !== "undefined") localStorage.setItem("lastGreetDate", todayStr);

      setLoading(false);
    }
    loadData();
  }, [router, supabase, setStats, setRealmProgress]);

  // "Aetheria Restored" milestone: all 8 Realms at level 10+, Void at 0%.
  // Shown once per browser via localStorage — reaching it again doesn't renag.
  useEffect(() => {
    if (Object.keys(realmIdToSlug).length === 0) return;
    const levelsBySlug: Record<string, number> = {};
    Object.values(realmProgress).forEach((p: any) => {
      const s = realmIdToSlug[p.realm_id];
      if (s) levelsBySlug[s] = p.current_level;
    });
    const allRestored = REALMS.every((r) => (levelsBySlug[r.id] || 0) >= 10);
    const voidClear = (Number(stats.void_percentage) || 0) === 0;
    if (allRestored && voidClear) {
      const alreadySeen = typeof window !== "undefined" && localStorage.getItem("aetheriaRestoredSeen") === "true";
      if (!alreadySeen) setShowRestored(true);
    }
  }, [realmProgress, realmIdToSlug, stats.void_percentage]);

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

  // Progress keyed by slug (progress rows are keyed by realm uuid in the DB)
  const progressBySlug: Record<string, { current_xp: number; current_level: number }> = {};
  Object.values(realmProgress).forEach((p: any) => {
    const slug = realmIdToSlug[p.realm_id];
    if (slug) progressBySlug[slug] = p;
  });
  const awakenedSlugs = new Set(Object.entries(progressBySlug).filter(([, p]) => (p.current_xp || 0) > 0).map(([slug]) => slug));
  // The Astral Library's tower model is ready to show off regardless of
  // progress (a deliberate exception to the "awaken via first quest" rule,
  // for demo purposes) — other realms still follow the normal gate.
  const ALWAYS_VISIBLE_TOWERS = new Set(["astral_library", "enchanted_woods"]);
  const visibleTowerSlugs = new Set([...awakenedSlugs, ...ALWAYS_VISIBLE_TOWERS]);

  return (
    <div className="relative w-full h-[100vh]" style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: '#020617', perspective: 1400 }}>
      {webglSupported !== false && (
        <Canvas3DErrorBoundary>
          <DashboardMapBackground awakenedSlugs={visibleTowerSlugs} voidPercentage={Number(stats.void_percentage) || 0} />
        </Canvas3DErrorBoundary>
      )}
      <MapParallax />

      {/* HUD (Heads Up Display) */}
      <div style={{ position: 'absolute', top: '1rem', left: '1rem', right: '1rem', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.85rem', fontSize: '0.85rem', background: 'rgba(15,23,42,0.8)', padding: '0.4rem 0.85rem', borderRadius: '0.85rem', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {user?.user_metadata?.display_name && (
              <div style={{color: '#c4b5fd', fontWeight: 'bold'}}>👋 {user.user_metadata.display_name}</div>
            )}
            <div style={{color: 'white', fontWeight: 'bold'}}>✨ Rank: {aetherRank || 1}</div>
            <div style={{color: '#34d399', fontWeight: 'bold'}}>💎 Shards: {stats.total_shards}</div>
            <div style={{color: '#fb923c', fontWeight: 'bold'}}>🔥 Streak: {stats.streak_count}</div>
            <div style={{color: '#ef4444', fontWeight: 'bold'}}>🌑 Void: {Number(stats.void_percentage) || 0}%</div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.85rem' }}>
            <button
              onClick={() => router.push('/quest-walker')}
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: 'none', borderRadius: '999px', padding: '0.6rem 1rem', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', gap: '0.4rem', alignItems: 'center', boxShadow: '0 4px 20px rgba(139,92,246,0.5)', fontSize: 'inherit' }}
            >
              <Swords size={16} /> Begin Today's Quest
            </button>
            <button
              onClick={() => router.push('/today')}
              aria-label="Today's List"
              title="Today"
              style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: '50%', padding: '0.6rem', color: '#c4b5fd', cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(10px)' }}
            >
              <ListChecks size={18} />
            </button>
            <ThematicClock />
            <button
              onClick={() => setShowOnboarding(true)}
              aria-label="Add Quest"
              style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: '50%', padding: '0.6rem', color: '#c4b5fd', cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(10px)' }}
            >
               <Plus size={18} />
            </button>
            <button onClick={handleSignOut} style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '50%', padding: '0.6rem', color: '#fca5a5', cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(10px)' }} aria-label="Sign Out">
               <LogOut size={18} />
            </button>
        </div>
      </div>

      {focusNotice && (
          <div style={{ position: 'absolute', top: '4.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 10, background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: '999px', padding: '0.5rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', backdropFilter: 'blur(10px)', fontSize: '0.85rem' }}>
              <span>
                  {focusNotice.type === 'completed'
                    ? `🏆 "${focusNotice.questTitle}" completed in ${focusNotice.realmName}!`
                    : `⏳ A focus session for "${focusNotice.questTitle}" is running in ${focusNotice.realmName}.`}
              </span>
              <button onClick={() => router.push(`/realms/${focusNotice.realmSlug}`)} style={{ background: 'transparent', border: 'none', color: '#c4b5fd', cursor: 'pointer', fontWeight: 'bold' }}>
                  {focusNotice.type === 'active' ? 'Resume' : 'View'}
              </button>
              <button onClick={() => setFocusNotice(null)} aria-label="Dismiss" style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>×</button>
          </div>
      )}

      {greeting && !focusNotice && (
          <DailyGreeting
              mode={greeting.mode}
              openCount={greeting.openCount}
              displayName={user?.user_metadata?.display_name}
              onBeginQuest={() => { setGreeting(null); router.push('/quest-walker'); }}
              onViewToday={() => { setGreeting(null); router.push('/today'); }}
              onDismiss={() => setGreeting(null)}
          />
      )}

      {/* Realm nodes have been replaced by the 3D RealmLabels that are clickable */}
      <div style={{ position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 1, color: '#64748b', fontSize: '0.8rem', pointerEvents: 'none' }}>
        Drag to explore the map · Scroll to zoom · ← → to tour landmarks
      </div>

      {/* Empty-map prompt */}
      {activeRealmSlugs.size === 0 && !showOnboarding && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 6, textAlign: 'center', color: '#cbd5e1', maxWidth: '360px' }}>
          <p style={{ marginBottom: '1rem' }}>The map is unclaimed. Add your first Quest to summon a Tower.</p>
          <button onClick={() => setShowOnboarding(true)} className="btn-primary" style={{ background: '#8b5cf6', color: 'black', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
            Add Your First Quest
          </button>
        </div>
      )}

      {showOnboarding && (
        <OnboardingModal
          onClose={() => setShowOnboarding(false)}
          onSaved={async () => {
            if (user) await loadActiveRealms(user.id);
          }}
        />
      )}

      {showRestored && (
        <AetheriaRestoredOverlay
          onDismiss={() => {
            localStorage.setItem("aetheriaRestoredSeen", "true");
            setShowRestored(false);
          }}
        />
      )}
    </div>
  );
}
