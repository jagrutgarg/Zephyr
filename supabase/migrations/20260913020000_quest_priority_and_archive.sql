-- Add priority ('low' | 'medium' | 'high'), is_archived, and tags columns to public.quests
alter table public.quests add column if not exists priority text not null default 'medium';
alter table public.quests add column if not exists is_archived boolean not null default false;
alter table public.quests add column if not exists tags text[] not null default '{}';
