-- Populate the live realms table with attribute descriptions, used both as
-- the classification signal for the Groq AI intake and as normal in-app
-- flavor text. This makes Supabase the single source of truth for what the
-- AI classifies against, instead of a hardcoded list drifting from it.
update public.realms set description = 'Strength — physical effort, exercise, fitness' where slug = 'enchanted_woods';
update public.realms set description = 'Vitality — health, rest, self-care, sleep' where slug = 'celestial_kingdom';
update public.realms set description = 'Intellect — study, focused work, reading, research' where slug = 'astral_library';
update public.realms set description = 'Connection — people, relationships, social, communication' where slug = 'neo_mystica';
update public.realms set description = 'Exploration — learning, new experiences, curiosity' where slug = 'xyran_frontier';
update public.realms set description = 'Discipline — recurring admin tasks, chores, upkeep' where slug = 'timeless_realm';
update public.realms set description = 'Creativity — art, writing, music, personal expression' where slug = 'dreaming_isles';

-- The 8th Realm: an honest, first-class catch-all for anything that doesn't
-- clearly fit one of the 7 life-attribute Realms — a one-off errand, life
-- admin that isn't recurring "Discipline" upkeep, or anything genuinely
-- miscellaneous. Behaves identically to every other Realm for XP/leveling.
insert into public.realms (slug, name, guardian, accent_color, description)
values (
  'wandering_isles',
  'The Wandering Isles',
  'The Wayfinder',
  '#94a3b8',
  'Miscellany — one-off errands and anything that does not clearly belong to another Realm'
)
on conflict (slug) do nothing;

-- Focus Session mechanic: a timed ritual before a quest resolves. Session
-- state lives on the quest row itself since only one session is allowed
-- active per user at a time — no need for a separate history table yet.
alter table public.quests add column if not exists session_started_at timestamptz;
alter table public.quests add column if not exists session_duration_minutes int;

-- Begin a focus session on a quest. Enforces exactly one active session per
-- user (returns ok:false with the conflicting quest's info instead of
-- silently overwriting it).
create or replace function start_focus_session(p_quest_id uuid, p_duration_minutes int)
returns json
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing record;
  v_quest record;
begin
  if p_duration_minutes is null or p_duration_minutes < 1 or p_duration_minutes > 180 then
    return json_build_object('ok', false, 'reason', 'invalid_duration');
  end if;

  select q.id, q.title, r.name as realm_name
  into v_existing
  from public.quests q
  join public.realms r on r.id = q.realm_id
  where q.user_id = v_user_id
    and q.session_started_at is not null
    and q.is_completed = false
    and now() < q.session_started_at + (q.session_duration_minutes || ' minutes')::interval
    and q.id != p_quest_id
  limit 1;

  if found then
    return json_build_object(
      'ok', false, 'reason', 'active_session_exists',
      'quest_id', v_existing.id, 'quest_title', v_existing.title, 'realm_name', v_existing.realm_name
    );
  end if;

  select id, user_id, is_completed into v_quest from public.quests where id = p_quest_id for update;
  if not found or v_quest.user_id != v_user_id then
    return json_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_quest.is_completed then
    return json_build_object('ok', false, 'reason', 'already_completed');
  end if;

  update public.quests
  set session_started_at = now(), session_duration_minutes = p_duration_minutes
  where id = p_quest_id;

  return json_build_object('ok', true, 'started_at', now(), 'duration_minutes', p_duration_minutes);
end;
$$;

-- Abandon an active session without completing the quest.
create or replace function cancel_focus_session(p_quest_id uuid)
returns json
language plpgsql
security definer
as $$
begin
  update public.quests
  set session_started_at = null, session_duration_minutes = null
  where id = p_quest_id and user_id = auth.uid() and is_completed = false;
  return json_build_object('ok', true);
end;
$$;

-- Finds this user's current focus session (if any). If server time shows
-- the duration has elapsed, auto-completes it via the existing
-- complete_quest RPC (same XP/shard/streak/void logic, unchanged) and
-- reports it as 'completed'; otherwise reports it as 'active' with enough
-- info to resume the orbit exactly where it should be. Server `now()` is
-- authoritative, so a manipulated device clock can't fast-forward this.
create or replace function get_active_focus_session()
returns json
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_session record;
  v_completion json;
begin
  select q.id as quest_id, q.title, q.session_started_at, q.session_duration_minutes,
         r.id as realm_id, r.slug as realm_slug, r.name as realm_name, r.accent_color
  into v_session
  from public.quests q
  join public.realms r on r.id = q.realm_id
  where q.user_id = v_user_id
    and q.session_started_at is not null
    and q.is_completed = false
  order by q.session_started_at desc
  limit 1;

  if not found then
    return json_build_object('status', 'none');
  end if;

  if now() >= v_session.session_started_at + (v_session.session_duration_minutes || ' minutes')::interval then
    update public.quests set session_started_at = null, session_duration_minutes = null where id = v_session.quest_id;
    select public.complete_quest(v_session.quest_id) into v_completion;
    return json_build_object(
      'status', 'completed',
      'quest_id', v_session.quest_id,
      'quest_title', v_session.title,
      'realm_id', v_session.realm_id,
      'realm_slug', v_session.realm_slug,
      'realm_name', v_session.realm_name,
      'accent_color', v_session.accent_color,
      'completion', v_completion
    );
  end if;

  return json_build_object(
    'status', 'active',
    'quest_id', v_session.quest_id,
    'quest_title', v_session.title,
    'realm_id', v_session.realm_id,
    'realm_slug', v_session.realm_slug,
    'realm_name', v_session.realm_name,
    'accent_color', v_session.accent_color,
    'started_at', v_session.session_started_at,
    'duration_minutes', v_session.session_duration_minutes
  );
end;
$$;
