-- Permanently removes the Neo-Mystica and Wandering Isles Realms per
-- explicit request. Deletes dependent rows first since quests.realm_id
-- and user_realm_progress.realm_id have no ON DELETE CASCADE — a plain
-- delete on realms would otherwise fail with a foreign key violation.
-- This is destructive: any existing quests/progress in these two Realms
-- are gone, not archived.
delete from public.quests
where realm_id in (select id from public.realms where slug in ('neo_mystica', 'wandering_isles'));

delete from public.user_realm_progress
where realm_id in (select id from public.realms where slug in ('neo_mystica', 'wandering_isles'));

delete from public.realms
where slug in ('neo_mystica', 'wandering_isles');
