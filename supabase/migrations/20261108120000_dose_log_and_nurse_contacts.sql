-- 1. Medicine tick-off: who marked which dose of which medicine as given or skipped, and when.
--    The owner (admin) and care-team members who can add entries may mark; viewers can only read.
--    A mark records what someone reported. It is not a prescription and never changes the medicine itself.
-- 2. Contributors (for example a nurse) now also see the doctors' phone book and the emergency contact.
begin;

create table public.vessel_dose_log(
 owner uuid not null references auth.users(id),
 profile_id text not null,
 medicine_id text not null,
 day date not null,
 slot text not null check(slot in ('Morning','Noon','Evening','Bedtime','As needed')),
 status text not null check(status in ('given','skipped')),
 marked_by uuid not null references auth.users(id),
 marked_label text not null check(length(marked_label) between 1 and 80),
 marked_at timestamptz not null default now(),
 primary key(owner,profile_id,medicine_id,day,slot)
);
-- No policies and no direct grants: only the checked functions below can touch dose rows.
alter table public.vessel_dose_log enable row level security;
revoke all on public.vessel_dose_log from anon, authenticated;

-- Resolves whose record is meant and what the caller may do: the owner names one of their own profiles;
-- a team member names their accepted access row. Returns owner, profile and a label, or raises.
create function private.dose_target(access uuid, profile text, for_write boolean, out t_owner uuid, out t_profile text, out t_label text) language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); a public.vessel_care_access;
begin
 if actor is null or not public.is_pilot_member() then raise exception 'Sign in required' using errcode='42501';end if;
 if access is null then
  if profile is null or not exists(select 1 from public.vessel_profiles p where p.owner=actor and p.id=profile) then raise exception 'Access unavailable' using errcode='42501';end if;
  t_owner:=actor;t_profile:=profile;t_label:='Admin';
 else
  select * into a from public.vessel_care_access x where x.id=access and x.member=actor and x.status='accepted';
  if not found or not exists(select 1 from public.pilot_members m where m.user_id=a.owner) then raise exception 'Access unavailable' using errcode='42501';end if;
  if for_write and a.role='viewer' then raise exception 'Not permitted for this role' using errcode='42501';end if;
  t_owner:=a.owner;t_profile:=a.profile_id;t_label:=a.member_label;
 end if;
end $$;

create function private.dose_list(access uuid, profile text, from_day date, to_day date) returns jsonb language plpgsql security definer set search_path='' as $$
declare t record;
begin
 if from_day is null or to_day is null or to_day<from_day or to_day-from_day>62 then raise exception 'Invalid range' using errcode='22023';end if;
 select * into t from private.dose_target(access,profile,false);
 return coalesce((select jsonb_agg(jsonb_build_object('medicineId',d.medicine_id,'day',d.day,'slot',d.slot,'status',d.status,'by',d.marked_label,'at',to_char(d.marked_at at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS"Z"')) order by d.day,d.slot)
  from public.vessel_dose_log d where d.owner=t.t_owner and d.profile_id=t.t_profile and d.day between from_day and to_day),'[]'::jsonb);
end $$;

-- status null clears a mark.
create function private.dose_mark(m_access uuid, m_profile text, m_medicine text, m_day date, m_slot text, m_status text) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); t record; today date:=(now() at time zone 'Asia/Manila')::date;
begin
 select * into t from private.dose_target(m_access,m_profile,true);
 if m_medicine is null or not exists(select 1 from public.vessel_entries e where e.owner=t.t_owner and e.profile_id=t.t_profile and e.kind='medicines' and e.id=m_medicine) then raise exception 'Medicine not found' using errcode='22023';end if;
 if m_day is null or m_day>today+1 or m_day<today-31 then raise exception 'Choose a day within the last month' using errcode='22023';end if;
 if m_slot is null or m_slot not in ('Morning','Noon','Evening','Bedtime','As needed') then raise exception 'Invalid time' using errcode='22023';end if;
 if m_status is null then
  delete from public.vessel_dose_log d where d.owner=t.t_owner and d.profile_id=t.t_profile and d.medicine_id=m_medicine and d.day=m_day and d.slot=m_slot;
 elsif m_status in ('given','skipped') then
  insert into public.vessel_dose_log as d(owner,profile_id,medicine_id,day,slot,status,marked_by,marked_label)
   values(t.t_owner,t.t_profile,m_medicine,m_day,m_slot,m_status,actor,t.t_label)
   on conflict on constraint vessel_dose_log_pkey do update set status=excluded.status,marked_by=excluded.marked_by,marked_label=excluded.marked_label,marked_at=now();
 else raise exception 'Invalid status' using errcode='22023';end if;
 insert into public.vessel_audit(owner,action,actor,profile_id) values(t.t_owner,'dose_marked',actor,t.t_profile);
 return jsonb_build_object('ok',true);
end $$;

create function public.vessel_dose_list(access uuid, profile text, from_day date, to_day date) returns jsonb language sql security invoker set search_path='' as $$select private.dose_list(access,profile,from_day,to_day)$$;
create function public.vessel_dose_mark(access uuid, profile text, medicine text, day date, slot text, status text) returns jsonb language sql security invoker set search_path='' as $$select private.dose_mark(access,profile,medicine,day,slot,status)$$;
revoke all on function private.dose_target(uuid,text,boolean),private.dose_list(uuid,text,date,date),private.dose_mark(uuid,text,text,date,text,text),public.vessel_dose_list(uuid,text,date,date),public.vessel_dose_mark(uuid,text,text,date,text,text) from public,anon,authenticated;
grant execute on function private.dose_target(uuid,text,boolean),private.dose_list(uuid,text,date,date),private.dose_mark(uuid,text,text,date,text,text),public.vessel_dose_list(uuid,text,date,date),public.vessel_dose_mark(uuid,text,text,date,text,text) to authenticated;

-- 2. Contributors: same shape as before, plus contacts and the emergency contact.
create or replace function private.care_profiles() returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or not public.is_pilot_member() then raise exception 'Sign in required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
   'access',a.id,'role',a.role,'label',a.member_label,'sharedBy',u.email,
   'revision',coalesce((select revision from public.vessel_accounts c where c.owner=a.owner),0),
   'profile',
    (case when a.role='contributor'
      then jsonb_build_object('name',p.details->>'name','dob',coalesce(p.details->>'dob',''),'relationship','','role','','monitoring',coalesce(p.details->'monitoring','false'::jsonb),'contacts',coalesce(p.details->'contacts','[]'::jsonb),
        'details',jsonb_build_object('preferredName',coalesce(p.details#>>'{details,preferredName}',''),'sex',coalesce(p.details#>>'{details,sex}',''),'bloodType',coalesce(p.details#>>'{details,bloodType}',''),'phone','','email','','address','','emergencyName',coalesce(p.details#>>'{details,emergencyName}',''),'emergencyRelationship',coalesce(p.details#>>'{details,emergencyRelationship}',''),'emergencyPhone',coalesce(p.details#>>'{details,emergencyPhone}',''),'allergyStatus',coalesce(p.details#>>'{details,allergyStatus}','Unknown'),'medicineStatus',coalesce(p.details#>>'{details,medicineStatus}','Unknown')))
      else p.details end)
    ||jsonb_build_object('id',p.id)
    ||jsonb_build_object('records','[]'::jsonb,'history','[]'::jsonb,'medicines','[]'::jsonb,'readings','[]'::jsonb,'vaccines','[]'::jsonb)
    ||coalesce((select jsonb_object_agg(k.kind,k.items) from (
        select e.kind,jsonb_agg(e.data order by e.position) items from public.vessel_entries e
        where e.owner=a.owner and e.profile_id=a.profile_id
         and (a.role<>'contributor' or e.kind in ('readings','medicines') or (e.kind='history' and e.data->>'kind'='Allergy') or (e.kind='records' and e.data->>'addedById'=actor::text))
        group by e.kind) k),'{}'::jsonb)
  ) order by a.accepted_at)
  from public.vessel_care_access a
   join public.vessel_profiles p on p.owner=a.owner and p.id=a.profile_id
   join auth.users u on u.id=a.owner
   join public.pilot_members m on m.user_id=a.owner
  where a.member=actor and a.status='accepted'),'[]'::jsonb);
end $$;

commit;
