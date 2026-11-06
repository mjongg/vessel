-- Care team: scoped, revocable access to ONE managed profile held in another account.
-- The profile's account owner is its admin. Members never receive the owner's other profiles.
-- Roles
--   caregiver   view the whole profile; add entries; edit any entry
--   patient     the person the record is about: view the whole profile; add entries; edit only their own
--   contributor view readings, medicines, allergy history and their own uploads; add readings,
--               medicines and documents; edit only their own
--   viewer      view the whole profile; no changes
-- Nobody but the owner can delete entries, edit profile details, or manage the team.
begin;

alter table public.vessel_audit add column actor uuid references auth.users(id), add column profile_id text;

create table public.vessel_care_access (
 id uuid primary key default gen_random_uuid(),
 owner uuid not null references auth.users(id),
 profile_id text not null,
 member uuid not null references auth.users(id),
 member_email text not null,
 member_label text not null check(length(member_label) between 1 and 80),
 role text not null check(role in ('caregiver','patient','contributor','viewer')),
 status text not null default 'pending' check(status in ('pending','accepted','revoked')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '7 days',
 accepted_at timestamptz,
 revoked_at timestamptz,
 unique(owner,profile_id,member), check(owner<>member)
);
-- No policies and no direct grants: only the checked functions below can touch access rows.
alter table public.vessel_care_access enable row level security;
revoke all on public.vessel_care_access from anon, authenticated;
create index vessel_care_access_member on public.vessel_care_access(member);

create function private.care_stamp() returns text language sql stable set search_path='' as $$select to_char(now() at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS"Z"')$$;

create function private.care_list() returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or not public.is_pilot_member() then raise exception 'Sign in required' using errcode='42501';end if;
 return jsonb_build_object(
 'team',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'profileId',a.profile_id,'profileName',p.details->>'name','email',a.member_email,'label',a.member_label,'role',a.role,'status',case when a.status='pending' and a.expires_at<=now() then 'expired' else a.status end,'expiresAt',a.expires_at) order by a.created_at desc)
   from public.vessel_care_access a join public.vessel_profiles p on p.owner=a.owner and p.id=a.profile_id where a.owner=actor and a.status<>'revoked'),'[]'::jsonb),
 'invitations',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'role',a.role,'status',a.status,'expiresAt',a.expires_at,'from',u.email,'profileName',p.details->>'name','label',a.member_label) order by a.created_at desc)
   from public.vessel_care_access a join public.vessel_profiles p on p.owner=a.owner and p.id=a.profile_id join auth.users u on u.id=a.owner join public.pilot_members m on m.user_id=a.owner
   where a.member=actor and (a.status='accepted' or (a.status='pending' and a.expires_at>now()))),'[]'::jsonb));
end $$;

create function private.care_change(action text, access uuid default null, profile text default null, email text default null, label text default null, new_role text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid; row public.vessel_care_access; actor uuid:=auth.uid();
begin
 if actor is null or not public.is_pilot_member() then raise exception 'Sign in required' using errcode='42501';end if;
 if action='invite' then
  if profile is null or not exists(select 1 from public.vessel_profiles p where p.owner=actor and p.id=profile) then raise exception 'Profile unavailable' using errcode='42501';end if;
  if email is null or length(email)>254 or email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or label is null or length(trim(label)) not between 1 and 80 or new_role is null or new_role not in ('caregiver','patient','contributor','viewer') then raise exception 'Invalid invitation' using errcode='22023';end if;
  select u.id into target from auth.users u join public.pilot_members m on m.user_id=u.id where lower(u.email)=lower(trim($4)) and u.email_confirmed_at is not null;
  if target is null or target=actor then raise exception 'Use another confirmed, invited Vessel account' using errcode='22023';end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,12));
  if (select count(*) from public.vessel_care_access a where a.owner=actor and a.profile_id=profile and a.status<>'revoked')>=20 and not exists(select 1 from public.vessel_care_access a where a.owner=actor and a.profile_id=profile and a.member=target and a.status<>'revoked') then raise exception 'Care team limit reached' using errcode='22023';end if;
  if exists(select 1 from public.vessel_care_access a where a.owner=actor and a.profile_id=profile and a.member=target and a.status='accepted') then raise exception 'This person already has access' using errcode='22023';end if;
  if new_role='patient' and exists(select 1 from public.vessel_care_access a where a.owner=actor and a.profile_id=profile and a.member<>target and a.role='patient' and a.status<>'revoked') then raise exception 'This record already has a patient sign-in' using errcode='22023';end if;
  insert into public.vessel_care_access(owner,profile_id,member,member_email,member_label,role) values(actor,profile,target,lower(trim($4)),trim(label),new_role)
   on conflict(owner,profile_id,member) do update set status='pending',member_email=excluded.member_email,member_label=excluded.member_label,role=excluded.role,created_at=now(),expires_at=now()+interval '7 days',accepted_at=null,revoked_at=null returning * into row;
 elsif action in ('accept','decline','leave','revoke','role') then
  select * into row from public.vessel_care_access a where a.id=access for update;
  if not found then raise exception 'Access unavailable' using errcode='42501';end if;
  if action in ('revoke','role') then
   if row.owner<>actor then raise exception 'Not permitted' using errcode='42501';end if;
   if row.status='revoked' then raise exception 'Access unavailable' using errcode='22023';end if;
   if action='role' then
    if new_role is null or new_role not in ('caregiver','patient','contributor','viewer') then raise exception 'Invalid role' using errcode='22023';end if;
    if new_role='patient' and exists(select 1 from public.vessel_care_access a where a.owner=row.owner and a.profile_id=row.profile_id and a.id<>row.id and a.role='patient' and a.status<>'revoked') then raise exception 'This record already has a patient sign-in' using errcode='22023';end if;
    update public.vessel_care_access set role=new_role where id=row.id;
   end if;
  else
   if row.member<>actor then raise exception 'Not permitted' using errcode='42501';end if;
   if action in ('accept','decline') and (row.status<>'pending' or row.expires_at<=now()) then raise exception 'Invitation expired or unavailable' using errcode='22023';end if;
   if action='leave' and row.status<>'accepted' then raise exception 'Access unavailable' using errcode='22023';end if;
  end if;
  if action='accept' then update public.vessel_care_access set status='accepted',accepted_at=now() where id=row.id;
  elsif action<>'role' then update public.vessel_care_access set status='revoked',revoked_at=now() where id=row.id;
  end if;
 else raise exception 'Invalid action' using errcode='22023';
 end if;
 insert into public.vessel_audit(owner,action,actor,profile_id) values(row.owner,'care_'||action,actor,row.profile_id);
 return jsonb_build_object('ok',true);
end $$;

-- Profiles shared WITH the caller, already filtered to what the caller's role may see.
create function private.care_profiles() returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or not public.is_pilot_member() then raise exception 'Sign in required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
   'access',a.id,'role',a.role,'label',a.member_label,'sharedBy',u.email,
   'revision',coalesce((select revision from public.vessel_accounts c where c.owner=a.owner),0),
   'profile',
    (case when a.role='contributor'
      then jsonb_build_object('name',p.details->>'name','dob',coalesce(p.details->>'dob',''),'relationship','','role','','monitoring',coalesce(p.details->'monitoring','false'::jsonb),
        'details',jsonb_build_object('preferredName',coalesce(p.details#>>'{details,preferredName}',''),'sex',coalesce(p.details#>>'{details,sex}',''),'bloodType',coalesce(p.details#>>'{details,bloodType}',''),'phone','','email','','address','','emergencyName','','emergencyRelationship','','emergencyPhone','','allergyStatus',coalesce(p.details#>>'{details,allergyStatus}','Unknown'),'medicineStatus',coalesce(p.details#>>'{details,medicineStatus}','Unknown')))
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

-- One entry at a time. Serialized with the owner's whole-account save through the account row lock,
-- and bumps the owner's revision so a stale owner snapshot is rejected and merged, never overwritten.
create function private.care_write(access uuid, kind text, entry jsonb, previous jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
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
  if previous is null or existing<>previous then raise exception 'Entry changed' using errcode='40001';end if;
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

-- File visibility follows the record that references the file.
--  own file; or
--  a file uploaded by a (current or former) team member into a profile the caller owns; or
--  a file referenced in a profile the caller has accepted, non-contributor access to, uploaded by its owner or a team member.
create function private.care_can_read_file(file_owner text, file_id text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.vessel_files f where f.owner::text=file_owner and f.id::text=file_id and f.status='ready') and (
  file_owner=auth.uid()::text
  or exists(select 1 from public.vessel_entries e join public.vessel_care_access u on u.owner=e.owner and u.profile_id=e.profile_id and u.member::text=file_owner and u.status in ('accepted','revoked')
     where e.owner=auth.uid() and e.kind in ('records','vaccines') and e.data->>'fileId'=file_id)
  or exists(select 1 from public.vessel_entries e join public.vessel_care_access mine on mine.owner=e.owner and mine.profile_id=e.profile_id and mine.member=auth.uid() and mine.status='accepted' and mine.role<>'contributor'
     where e.kind in ('records','vaccines') and e.data->>'fileId'=file_id
      and (e.owner::text=file_owner or exists(select 1 from public.vessel_care_access u where u.owner=e.owner and u.profile_id=e.profile_id and u.member::text=file_owner and u.status in ('accepted','revoked'))))
 )$$;
create function private.file_info(file_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare f public.vessel_files;
begin
 if auth.uid() is null or not public.is_pilot_member() then raise exception 'Sign in required' using errcode='42501';end if;
 select * into f from public.vessel_files x where x.id=file_id and x.status='ready';
 if not found or not private.care_can_read_file(f.owner::text,f.id::text) then return null;end if;
 return jsonb_build_object('owner',f.owner,'name',f.name,'mime',f.mime,'size',f.size,'sha256',f.sha256);
end $$;

create function public.vessel_care_list() returns jsonb language sql security invoker set search_path='' as $$select private.care_list()$$;
create function public.vessel_care_change(action text, access uuid default null, profile text default null, email text default null, label text default null, new_role text default null) returns jsonb language sql security invoker set search_path='' as $$select private.care_change(action,access,profile,email,label,new_role)$$;
create function public.vessel_care_profiles() returns jsonb language sql security invoker set search_path='' as $$select private.care_profiles()$$;
create function public.vessel_care_write(access uuid, kind text, entry jsonb, previous jsonb default null) returns jsonb language sql security invoker set search_path='' as $$select private.care_write(access,kind,entry,previous)$$;
create function public.vessel_file_info(file_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.file_info(file_id)$$;

revoke all on function private.care_stamp(),private.care_list(),private.care_change(text,uuid,text,text,text,text),private.care_profiles(),private.care_write(uuid,text,jsonb,jsonb),private.care_can_read_file(text,text),private.file_info(uuid),
 public.vessel_care_list(),public.vessel_care_change(text,uuid,text,text,text,text),public.vessel_care_profiles(),public.vessel_care_write(uuid,text,jsonb,jsonb),public.vessel_file_info(uuid) from public,anon,authenticated;
grant execute on function private.care_stamp(),private.care_list(),private.care_change(text,uuid,text,text,text,text),private.care_profiles(),private.care_write(uuid,text,jsonb,jsonb),private.care_can_read_file(text,text),private.file_info(uuid),
 public.vessel_care_list(),public.vessel_care_change(text,uuid,text,text,text,text),public.vessel_care_profiles(),public.vessel_care_write(uuid,text,jsonb,jsonb),public.vessel_file_info(uuid) to authenticated;

-- Storage follows the same rule. The existing own-folder policy is unchanged; this adds team reads only.
create policy care_file_read on storage.objects for select to authenticated using(bucket_id='vessel-records' and public.is_pilot_member() and private.care_can_read_file((storage.foldername(name))[1],storage.filename(name)));
commit;
