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
  
  setStats: (stats) => set({ stats }),
  
  setRealmProgress: (progressArray) => set((state) => {
    const map: Record<string, RealmProgress> = {};
    progressArray.forEach(p => map[p.realm_id] = p);
    return { realmProgress: map };
  }),

  addShards: (amount) => set((state) => ({
    stats: { ...state.stats, total_shards: state.stats.total_shards + amount }
  })),
  
  reduceVoid: (amount) => set((state) => ({
    stats: { ...state.stats, void_percentage: Math.max(0, state.stats.void_percentage - amount) }
  })),

  incrementStreak: () => set((state) => ({
    stats: { ...state.stats, streak_count: state.stats.streak_count + 1 }
  })),

  gainRealmXP: (realmId, xpAmount, levelUp, newLevel) => set((state) => {
    const prev = state.realmProgress[realmId] || { realm_id: realmId, current_level: 1, current_xp: 0 };
    return {
      realmProgress: {
        ...state.realmProgress,
        [realmId]: {
          ...prev,
          current_xp: prev.current_xp + xpAmount,
          current_level: levelUp ? newLevel : prev.current_level
        }
      }
    };
  })
}));
