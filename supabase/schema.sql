-- Aetheria Database Schema and Roles Setup

-- 1. Create Realms Master Table
CREATE TABLE public.realms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    guardian TEXT NOT NULL,
    color_theme TEXT NOT NULL,
    description TEXT
);

-- Note: We expect the app to handle most realm data as constants, but the schema allows expansion.
-- Insert default realms
INSERT INTO public.realms (id, name, guardian, color_theme, description) VALUES
('enchanted_woods', 'The Enchanted Woods', 'The Fairy Keeper', 'green', 'Personal tasks, habits, self-care.'),
('celestial_kingdom', 'The Celestial Kingdom', 'The Royal Dragon', 'gold', 'Major responsibilities, academics.'),
('astral_library', 'The Astral Library', 'The Archivist', 'blue', 'Studying, research, assignments.'),
('neo_mystica', 'Neo-Mystica', 'AX-7 the Ancient Machine', 'purple', 'Projects, coding, work/productivity.'),
('xyran_frontier', 'Xyran Frontier', 'The Star Wanderer', 'dark-purple', 'Long-term goals, ambitions, new challenges.'),
('timeless_realm', 'The Timeless Realm', 'The Chronomancer', 'teal', 'Deadlines, scheduling, time management.'),
('dreaming_isles', 'The Dreaming Isles', 'The Dream Weaver', 'pink', 'Creative hobbies, personal projects.');

-- 2. Create User Stats
CREATE TABLE public.user_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    void_percentage INTEGER DEFAULT 0 CHECK(void_percentage >= 0 AND void_percentage <= 100),
    streak_count INTEGER DEFAULT 0,
    last_active_date DATE DEFAULT CURRENT_DATE,
    total_shards INTEGER DEFAULT 0
);

-- 3. Create User Realm Progress
CREATE TABLE public.user_realm_progress (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    realm_id TEXT REFERENCES public.realms(id) ON DELETE CASCADE,
    current_xp INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    PRIMARY KEY(user_id, realm_id)
);

-- 4. Create Quests
CREATE TABLE public.quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    realm_id TEXT NOT NULL REFERENCES public.realms(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    xp_value INTEGER DEFAULT 50,
    shard_value INTEGER DEFAULT 10
);

-- Row Level Security (RLS)
ALTER TABLE public.realms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_realm_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

-- Realm policies: Everyone can read realms
CREATE POLICY "Realms are viewable by everyone" ON public.realms FOR SELECT USING (true);

-- User Stats policies
CREATE POLICY "Users can view their own stats" ON public.user_stats FOR SELECT USING (auth.uid() = user_id);
-- (Insert handled via trigger on user signup normally, but omitting for brevity. Using upserts in RPC).

-- User Realm Progress policies
CREATE POLICY "Users can view their own progress" ON public.user_realm_progress FOR SELECT USING (auth.uid() = user_id);

-- Quests policies
CREATE POLICY "Users can perform CRUD on their own quests" ON public.quests
    FOR ALL USING (auth.uid() = user_id);

-- Triggers or RPC to complete quest
CREATE OR REPLACE FUNCTION complete_quest(p_quest_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_realm_id TEXT;
    v_xp_val INTEGER;
    v_shard_val INTEGER;
    v_cur_xp INTEGER;
    v_cur_level INTEGER;
    v_new_level INTEGER;
    v_req_xp FLOAT;
BEGIN
    -- Get quest details & lock row
    SELECT user_id, realm_id, xp_value, shard_value INTO v_user_id, v_realm_id, v_xp_val, v_shard_val
    FROM public.quests
    WHERE id = p_quest_id AND NOT completed
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Quest not found or already completed.';
    END IF;

    IF v_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Mark completed
    UPDATE public.quests SET completed = TRUE, completed_at = NOW() WHERE id = p_quest_id;

    -- Update shards and streak (simplified)
    INSERT INTO public.user_stats (user_id, total_shards)
    VALUES (v_user_id, v_shard_val)
    ON CONFLICT (user_id) DO UPDATE SET total_shards = public.user_stats.total_shards + EXCLUDED.total_shards, last_active_date = CURRENT_DATE;

    -- Update Realm Progress
    INSERT INTO public.user_realm_progress (user_id, realm_id, current_xp, current_level)
    VALUES (v_user_id, v_realm_id, v_xp_val, 1)
    ON CONFLICT (user_id, realm_id) DO UPDATE SET current_xp = public.user_realm_progress.current_xp + EXCLUDED.current_xp
    RETURNING current_xp, current_level INTO v_cur_xp, v_cur_level;

    -- Calculate level (XP = 100 * Level ^ 1.5) => roughly Level = (XP/100)^(2/3)
    v_new_level := FLOOR(POWER(v_cur_xp / 100.0, 2.0/3.0)) + 1;
    IF v_new_level > v_cur_level THEN
        UPDATE public.user_realm_progress SET current_level = v_new_level 
        WHERE user_id = v_user_id AND realm_id = v_realm_id;
    END IF;

    -- Reduce void % (simplistic rule: -2% per quest)
    UPDATE public.user_stats SET void_percentage = GREATEST(0, void_percentage - 2) WHERE user_id = v_user_id;
END;
$$;
