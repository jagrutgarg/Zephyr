-- Aetheria Database Schema for Phase 4

-- 1. Realms reference table (static data, seed once)
create table if not exists public.realms (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  guardian text not null,
  accent_color text not null,
  description text
);

-- 2. Quests table
create table if not exists public.quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  realm_id uuid references public.realms not null,
  title text not null,
  description text,
  difficulty text not null default 'normal', -- 'easy' | 'normal' | 'hard'
  xp_value int not null default 10,
  shard_value int not null default 5,
  due_date timestamptz,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- 3. Per-user, per-realm progress
create table if not exists public.user_realm_progress (
  user_id uuid references auth.users not null,
  realm_id uuid references public.realms not null,
  current_xp int not null default 0,
  current_level int not null default 1,
  primary key (user_id, realm_id)
);

-- 4. Global user stats
create table if not exists public.user_stats (
  user_id uuid references auth.users primary key,
  total_shards int not null default 0,
  void_percentage numeric not null default 0,
  streak_count int not null default 0,
  last_active_date date
);

-- RLS Enforcement
alter table public.realms enable row level security;
alter table public.quests enable row level security;
alter table public.user_realm_progress enable row level security;
alter table public.user_stats enable row level security;

-- Policies
create policy "Realms read access" on public.realms for select using (true);
create policy "Quests CRUD for owners" on public.quests for all using (auth.uid() = user_id);
create policy "User realm progress for owners" on public.user_realm_progress for all using (auth.uid() = user_id);
create policy "User stats for owners" on public.user_stats for all using (auth.uid() = user_id);

-- Complete Quest RPC Function
create or replace function complete_quest(p_quest_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_realm_id uuid;
  v_xp_val int;
  v_shard_val int;
  v_cur_xp int;
  v_cur_lvl int;
  v_new_lvl int;
  v_last_active date;
  v_streak int;
  v_today date := current_date;
  res json;
begin
  -- 1. Get and lock quest
  select user_id, realm_id, xp_value, shard_value
  into v_user_id, v_realm_id, v_xp_val, v_shard_val
  from public.quests
  where id = p_quest_id and is_completed = false
  for update;

  if not found then
    raise exception 'Quest not found or already completed';
  end if;

  -- 2. Verify ownership
  if v_user_id != auth.uid() then
    raise exception 'Unauthorized';
  end if;

  -- 3. Mark completed
  update public.quests
  set is_completed = true, completed_at = now()
  where id = p_quest_id;

  -- 4. & 5. Update Realm Progress
  insert into public.user_realm_progress (user_id, realm_id, current_xp, current_level)
  values (v_user_id, v_realm_id, v_xp_val, 1)
  on conflict (user_id, realm_id) do update 
  set current_xp = public.user_realm_progress.current_xp + excluded.current_xp
  returning current_xp, current_level into v_cur_xp, v_cur_lvl;

  -- Recalculate level: Level = floor((XP / 100)^(2/3)) + 1
  -- Or strictly following prompt: xp_required_for_level(n) = 100 * (n ^ 1.5)
  -- Since we just add XP, we find max n where 100 * (n ^ 1.5) <= current_xp
  -- Because level 1 requires 0 XP technically (or 100). Assuming level N starts at XP = 100 * (N-1)^1.5
  -- A simpler pure formula: new level = floor( power((current_xp/100.0), 2.0/3.0) ) + 1
  v_new_lvl := floor(power(v_cur_xp / 100.0, 2.0/3.0)) + 1;
  
  if v_new_lvl > v_cur_lvl then
    update public.user_realm_progress
    set current_level = v_new_lvl
    where user_id = v_user_id and realm_id = v_realm_id;
  end if;

  -- 6. Update Shards, Streak, and Void
  -- Fetch current stats
  select last_active_date, streak_count into v_last_active, v_streak
  from public.user_stats where user_id = v_user_id for update;

  if not found then
    v_streak := 1;
    v_last_active := v_today;
    insert into public.user_stats (user_id, total_shards, void_percentage, streak_count, last_active_date)
    values (v_user_id, v_shard_val, 0, 1, v_today);
  else
    if v_last_active = v_today - interval '1 day' then
      v_streak := v_streak + 1;
    elsif v_last_active < v_today - interval '1 day' then
      v_streak := 1; -- Reset streak
    end if;
    v_last_active := v_today;

    update public.user_stats
    set total_shards = total_shards + v_shard_val,
        void_percentage = greatest(0, void_percentage - 2),
        streak_count = v_streak,
        last_active_date = v_last_active
    where user_id = v_user_id;
  end if;

  -- Build response JSON
  select json_build_object(
    'quest_id', p_quest_id,
    'current_xp', v_cur_xp,
    'new_level', v_new_lvl,
    'leveled_up', (v_new_lvl > v_cur_lvl),
    'streak', v_streak
  ) into res;

  return res;
end;
$$;
