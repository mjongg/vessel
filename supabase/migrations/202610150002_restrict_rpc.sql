-- Supabase default privileges can grant anon EXECUTE directly, independently of PUBLIC.
do $$declare f record;begin for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and (p.proname like 'vessel_%' or p.proname='is_pilot_member') loop execute 'revoke all on function '||f.signature||' from anon';end loop;end$$;
revoke all on public.vessel_ai_usage from anon, authenticated;
