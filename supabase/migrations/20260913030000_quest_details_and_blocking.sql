alter table public.quests
add column notes text,
add column checklist jsonb default '[]'::jsonb,
add column blocked_by uuid references public.quests(id) on delete set null;
