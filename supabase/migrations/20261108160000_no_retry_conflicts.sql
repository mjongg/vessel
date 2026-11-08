-- Stop conflict errors from being retried forever.
-- 40001 (serialization_failure) tells PostgREST to retry the whole transaction. A stale revision or a changed entry
-- can never succeed on retry, so PostgREST looped hundreds of times a second (seen live on 2026-11-08 as high CPU).
-- PT409 is PostgREST's way to answer HTTP 409 Conflict directly, with no retry. Function bodies are otherwise unchanged.
begin;
create or replace function public.vessel_save(state jsonb,expected_revision bigint) returns bigint language plpgsql security definer set search_path='' as $$
declare current_revision bigint; p jsonb; e jsonb; k text; pi integer:=0; ei integer;begin
 if not public.is_pilot_member() then raise exception 'Not invited';end if;
 if octet_length(state::text)>8000000 or jsonb_typeof(state->'profiles') is distinct from 'array' or jsonb_array_length(state->'profiles') not between 1 and 30 then raise exception 'Record capacity exceeded';end if;
 insert into public.vessel_accounts(owner) values(auth.uid()) on conflict do nothing;
 select revision into current_revision from public.vessel_accounts where owner=auth.uid() for update;
 if current_revision<>expected_revision then raise exception 'Revision conflict' using errcode='PT409';end if;
 -- Atomic replacement, with separate rows for profiles and entries. Later clients can page these tables.
 delete from public.vessel_profiles where owner=auth.uid();
 for p in select value from jsonb_array_elements(state->'profiles') loop
  insert into public.vessel_profiles values(auth.uid(),p->>'id',pi,p-array['id','records','history','medicines','readings','vaccines']);pi:=pi+1;
  foreach k in array array['records','history','medicines','readings','vaccines'] loop
   ei:=0;for e in select value from jsonb_array_elements(coalesce(p->k,'[]'::jsonb)) loop
    insert into public.vessel_entries values(auth.uid(),p->>'id',k,e->>'id',ei,e);ei:=ei+1;
   end loop;
  end loop;
 end loop;
 update public.vessel_accounts set revision=revision+1,updated_at=now() where owner=auth.uid();
 insert into public.vessel_audit(owner,action,revision) values(auth.uid(),'records_saved',current_revision+1);
 return current_revision+1;end$$;
create or replace function private.care_write(access uuid, kind text, entry jsonb, previous jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); a public.vessel_care_access; existing jsonb; saved jsonb; rev bigint; file_ref text; lim integer;
begin
 if actor is null or not public.is_pilot_member() then raise exception 'Sign in required' using errcode='42501';end if;
 select * into a from public.vessel_care_access x where x.id=access and x.member=actor and x.status='accepted';
 if not found or not exists(select 1 from public.pilot_members m where m.user_id=a.owner) then raise exception 'Access unavailable' using errcode='42501';end if;
 if kind is null or kind not in ('records','history','medicines','readings','vaccines') then raise exception 'Invalid entry' using errcode='22023';end if;
 if a.role='viewer' or (a.role='contributor' and kind not in ('readings','medicines','records')) then raise exception 'Not permitted for this role' using errcode='42501';end if;
 if entry is null or jsonb_typeof(entry)<>'object' or jsonb_typeof(entry->'id') is distinct from 'string' or length(entry->>'id') not between 1 and 100 or octet_length(entry::text)>300000 then raise exception 'Invalid entry' using errcode='22023';end if;
 insert into public.vessel_accounts(owner) values(a.owner) on conflict do nothing;
 select revision into rev from public.vessel_accounts c where c.owner=a.owner for update;
 if not exists(select 1 from public.vessel_profiles p where p.owner=a.owner and p.id=a.profile_id) then raise exception 'Access unavailable' using errcode='42501';end if;
 select e.data into existing from public.vessel_entries e where e.owner=a.owner and e.profile_id=a.profile_id and e.kind=care_write.kind and e.id=entry->>'id';
 file_ref:=entry->>'fileId';
 -- A new or changed attachment must be the member's own confirmed upload: nobody can point a record at someone else's file.
 if file_ref is not null and (existing is null or existing->>'fileId' is distinct from file_ref) then
  if file_ref !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or not exists(select 1 from public.vessel_files f where f.id=file_ref::uuid and f.owner=actor and f.status='ready') then raise exception 'Attachment unavailable' using errcode='22023';end if;
 end if;
 -- Attribution is set here, never taken from the client.
 entry:=entry-array['addedBy','addedById','addedAt','editedBy','editedById','editedAt'];
 if existing is not null then
  if a.role<>'caregiver' and existing->>'addedById' is distinct from actor::text then raise exception 'Not permitted for this role' using errcode='42501';end if;
  if previous is null or existing<>previous then raise exception 'Entry changed' using errcode='PT409';end if;
  saved:=entry
   ||coalesce((select jsonb_object_agg(s.key,s.value) from jsonb_each(existing) s where s.key in ('addedBy','addedById','addedAt')),'{}'::jsonb)
   ||jsonb_build_object('editedBy',a.member_label,'editedById',actor::text,'editedAt',private.care_stamp());
  update public.vessel_entries e set data=saved where e.owner=a.owner and e.profile_id=a.profile_id and e.kind=care_write.kind and e.id=entry->>'id';
 else
  lim:=case when kind='readings' then 3000 else 1000 end;
  if (select count(*) from public.vessel_entries e where e.owner=a.owner and e.profile_id=a.profile_id and e.kind=care_write.kind)>=lim then raise exception 'Record capacity exceeded' using errcode='22023';end if;
  saved:=entry||jsonb_build_object('addedBy',a.member_label,'addedById',actor::text,'addedAt',private.care_stamp());
  if kind='readings' then saved:=saved||jsonb_build_object('author',a.member_label);end if;
  insert into public.vessel_entries(owner,profile_id,kind,id,position,data)
   values(a.owner,a.profile_id,kind,entry->>'id',coalesce((select max(e.position)+1 from public.vessel_entries e where e.owner=a.owner and e.profile_id=a.profile_id and e.kind=care_write.kind),0),saved);
 end if;
 update public.vessel_accounts set revision=revision+1,updated_at=now() where owner=a.owner;
 insert into public.vessel_audit(owner,action,revision,actor,profile_id) values(a.owner,'care_entry_saved',rev+1,actor,a.profile_id);
 return jsonb_build_object('revision',rev+1,'entry',saved);
end $$;
commit;
-- One-off, live project only (2026-11-08): end the two data-service connections stuck retrying since 06:13 UTC.
-- No-op anywhere else. The data service reconnects by itself; no record is lost.
select pg_terminate_backend(pid) from pg_stat_activity where pid in (2421552,2421601) and usename='authenticator';
