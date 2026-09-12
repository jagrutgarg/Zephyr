-- Recurring quests: 'none' | 'daily' | 'weekly:mon,wed,fri'
alter table public.quests add column if not exists repeat_rule text not null default 'none';

-- Computes the next due date for a recurring quest given its rule and the
-- date it was just due (or completion time if it had no due date).
create or replace function next_recurrence_date(p_repeat_rule text, p_from timestamptz)
returns timestamptz
language plpgsql
immutable
as $$
declare
  v_days text[];
  v_day text;
  v_target_dow int;
  v_from_dow int;
  v_offset int;
  v_min_offset int := null;
  v_dow_map jsonb := '{"sun":0,"mon":1,"tue":2,"wed":3,"thu":4,"fri":5,"sat":6}';
begin
  if p_repeat_rule = 'daily' then
    return p_from + interval '1 day';
  elsif p_repeat_rule like 'weekly:%' then
    v_days := string_to_array(substring(p_repeat_rule from 8), ',');
    v_from_dow := extract(dow from p_from)::int;
    foreach v_day in array v_days loop
      v_target_dow := (v_dow_map ->> lower(trim(v_day)))::int;
      if v_target_dow is not null then
        v_offset := ((v_target_dow - v_from_dow + 7) % 7);
        if v_offset = 0 then v_offset := 7; end if;
        if v_min_offset is null or v_offset < v_min_offset then
          v_min_offset := v_offset;
        end if;
      end if;
    end loop;
    if v_min_offset is null then
      return p_from + interval '7 days';
    end if;
    return p_from + (v_min_offset || ' days')::interval;
  else
    return null;
  end if;
end;
$$;

-- Rewrites complete_quest to also: apply a real Void penalty to awarded
-- XP/shards at 60%+ Void (scaling to -50% at 100%), and spawn the next
-- occurrence of a recurring quest. Same core flow/signature as before.
create or replace function complete_quest(p_quest_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_realm_id uuid;
  v_title text;
  v_description text;
  v_difficulty text;
  v_repeat_rule text;
  v_due_date timestamptz;
  v_xp_val int;
  v_shard_val int;
  v_awarded_xp int;
  v_awarded_shards int;
  v_penalty_pct numeric;
  v_current_void numeric;
  v_cur_xp int;
  v_cur_lvl int;
  v_new_lvl int;
  v_last_active date;
  v_streak int;
  v_today date := current_date;
  v_next_due timestamptz;
  v_spawned boolean := false;
  res json;
begin
  select user_id, realm_id, title, description, difficulty, repeat_rule, due_date, xp_value, shard_value
  into v_user_id, v_realm_id, v_title, v_description, v_difficulty, v_repeat_rule, v_due_date, v_xp_val, v_shard_val
  from public.quests
  where id = p_quest_id and is_completed = false
  for update;

  if not found then
    raise exception 'Quest not found or already completed';
  end if;

  if v_user_id != auth.uid() then
    raise exception 'Unauthorized';
  end if;

  update public.quests
  set is_completed = true, completed_at = now()
  where id = p_quest_id;

  -- Void penalty: reduces rewards once Void crosses 60%, up to -50% at 100%.
  select void_percentage into v_current_void from public.user_stats where user_id = v_user_id;
  v_current_void := coalesce(v_current_void, 0);
  v_penalty_pct := least(50, greatest(0, v_current_void - 60));
  v_awarded_xp := round(v_xp_val * (1 - v_penalty_pct / 100.0));
  v_awarded_shards := round(v_shard_val * (1 - v_penalty_pct / 100.0));

  insert into public.user_realm_progress (user_id, realm_id, current_xp, current_level)
  values (v_user_id, v_realm_id, v_awarded_xp, 1)
  on conflict (user_id, realm_id) do update
  set current_xp = public.user_realm_progress.current_xp + excluded.current_xp
  returning current_xp, current_level into v_cur_xp, v_cur_lvl;

  v_new_lvl := floor(power(v_cur_xp / 100.0, 2.0/3.0)) + 1;

  if v_new_lvl > v_cur_lvl then
    update public.user_realm_progress
    set current_level = v_new_lvl
    where user_id = v_user_id and realm_id = v_realm_id;
  end if;

  select last_active_date, streak_count into v_last_active, v_streak
  from public.user_stats where user_id = v_user_id for update;

  if not found then
    v_streak := 1;
    v_last_active := v_today;
    insert into public.user_stats (user_id, total_shards, void_percentage, streak_count, last_active_date)
    values (v_user_id, v_awarded_shards, 0, 1, v_today);
  else
    if v_last_active = v_today - interval '1 day' then
      v_streak := v_streak + 1;
    elsif v_last_active < v_today - interval '1 day' then
      v_streak := 1;
    end if;
    v_last_active := v_today;

    update public.user_stats
    set total_shards = total_shards + v_awarded_shards,
        void_percentage = greatest(0, void_percentage - 2),
        streak_count = v_streak,
        last_active_date = v_last_active
    where user_id = v_user_id;
  end if;

  -- Recurring quest: spawn the next occurrence instead of letting it vanish.
  if v_repeat_rule is not null and v_repeat_rule != 'none' then
    v_next_due := next_recurrence_date(v_repeat_rule, coalesce(v_due_date, now()));
    if v_next_due is not null then
      insert into public.quests (user_id, realm_id, title, description, difficulty, xp_value, shard_value, due_date, repeat_rule, is_completed)
      values (v_user_id, v_realm_id, v_title, v_description, v_difficulty, v_xp_val, v_shard_val, v_next_due, v_repeat_rule, false);
      v_spawned := true;
    end if;
  end if;

  select json_build_object(
    'quest_id', p_quest_id,
    'current_xp', v_cur_xp,
    'new_level', v_new_lvl,
    'leveled_up', (v_new_lvl > v_cur_lvl),
    'streak', v_streak,
    'awarded_xp', v_awarded_xp,
    'awarded_shards', v_awarded_shards,
    'void_penalty_pct', v_penalty_pct,
    'next_occurrence_created', v_spawned
  ) into res;

  return res;
end;
$$;
