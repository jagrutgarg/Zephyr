import { create } from 'zustand';

export type UserStats = {
  total_shards: number;
  void_percentage: number;
  streak_count: number;
  last_active_date?: string;
};

export type RealmProgress = {
  realm_id: string;
  current_xp: number;
  current_level: number;
};

interface GameState {
  stats: UserStats;
  realmProgress: Record<string, RealmProgress>;
  
  // Actions to hydration
  setStats: (stats: UserStats) => void;
  setRealmProgress: (progressArray: RealmProgress[]) => void;
  
  // Optimistic UI Actions
  addShards: (amount: number) => void;
  reduceVoid: (amount: number) => void;
  incrementStreak: () => void;
  gainRealmXP: (realmId: string, xpAmount: number, levelUp: boolean, newLevel: number) => void;
}

export const useGameStore = create<GameState>((set) => ({
  stats: {
    total_shards: 0,
    void_percentage: 15, // fallback MVP
    streak_count: 0
  },
  realmProgress: {},
  
  setStats: (stats) => set({
    stats: {
      total_shards: Number(stats?.total_shards) || 0,
      void_percentage: Math.min(100, Math.max(0, Number(stats?.void_percentage) || 0)),
      streak_count: Number(stats?.streak_count) || 0,
      last_active_date: stats?.last_active_date
    }
  }),
  
  setRealmProgress: (progressArray) => set(() => {
    const map: Record<string, RealmProgress> = {};
    (progressArray || []).forEach(p => {
      if (p && p.realm_id) {
        map[p.realm_id] = {
          realm_id: p.realm_id,
          current_xp: Number(p.current_xp) || 0,
          current_level: Number(p.current_level) || 1
        };
      }
    });
    return { realmProgress: map };
  }),

  addShards: (amount) => set((state) => ({
    stats: { ...state.stats, total_shards: (Number(state.stats.total_shards) || 0) + (Number(amount) || 0) }
  })),
  
  reduceVoid: (amount) => set((state) => ({
    stats: { ...state.stats, void_percentage: Math.max(0, (Number(state.stats.void_percentage) || 0) - (Number(amount) || 0)) }
  })),

  incrementStreak: () => set((state) => ({
    stats: { ...state.stats, streak_count: (Number(state.stats.streak_count) || 0) + 1 }
  })),

  gainRealmXP: (realmId, xpAmount, levelUp, newLevel) => set((state) => {
    const prev = state.realmProgress[realmId] || { realm_id: realmId, current_level: 1, current_xp: 0 };
    const xp = (Number(prev.current_xp) || 0) + (Number(xpAmount) || 0);
    const lvl = levelUp ? (Number(newLevel) || 1) : (Number(prev.current_level) || 1);
    return {
      realmProgress: {
        ...state.realmProgress,
        [realmId]: {
          realm_id: realmId,
          current_xp: xp,
          current_level: lvl
        }
      }
    };
  })
}));
