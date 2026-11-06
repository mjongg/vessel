create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create table public.vessel_family_access (
 id uuid primary key default gen_random_uuid(),
 owner uuid not null references auth.users(id),
 recipient uuid not null references auth.users(id),
 recipient_email text not null,
 family_label text not null check(length(family_label) between 1 and 80),
 status text not null default 'pending' check(status in ('pending','accepted','revoked')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '7 days',
 accepted_at timestamptz,
 unique(owner,recipient), check(owner<>recipient)
);
alter table public.vessel_family_access enable row level security;
revoke all on public.vessel_family_access from anon, authenticated;
create index vessel_family_access_recipient on public.vessel_family_access(recipient);
-- A narrow privileged boundary is required to project another owner's overview.
-- No direct read or write privileges are granted on sharing rows.
create function private.family_access_list() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_pilot_member() then raise exception 'Sign in required' using errcode='42501'; end if;
 return jsonb_build_object(
 'sent',coalesce((select jsonb_agg(jsonb_build_object('id',id,'email',recipient_email,'label',family_label,'status',case when status='pending' and expires_at<=now() then 'expired' else status end,'expiresAt',expires_at) order by created_at desc) from public.vessel_family_access where owner=auth.uid()),'[]'::jsonb),
 'received',coalesce((select jsonb_agg(jsonb_build_object('id',id,'label',family_label,'status',status,'expiresAt',expires_at) order by created_at desc) from public.vessel_family_access where recipient=auth.uid() and (status='accepted' or (status='pending' and expires_at>now()))),'[]'::jsonb));
end $$;
create function private.family_access_change(action text, invitation uuid default null, email text default null, label text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid; row public.vessel_family_access; actor uuid:=auth.uid();
begin
 if actor is null or not public.is_pilot_member() then raise exception 'Sign in required' using errcode='42501';end if;
 if action='invite' then
  if not exists(select 1 from auth.users where id=actor and raw_app_meta_data->>'vessel_family_dashboard'='admin') then raise exception 'Family admin required' using errcode='42501';end if;
  if email is null or length(email)>254 or email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or label is null or length(trim(label)) not between 1 and 80 then raise exception 'Invalid invitation' using errcode='22023';end if;
  select u.id into target from auth.users u join public.pilot_members m on m.user_id=u.id where lower(u.email)=lower(trim(email)) and u.email_confirmed_at is not null;
  if target is null or target=actor then raise exception 'Use another confirmed, invited Vessel account' using errcode='22023';end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,11));
  if (select count(*) from public.vessel_family_access where owner=actor)>=30 and not exists(select 1 from public.vessel_family_access where owner=actor and recipient=target) then raise exception 'Invitation limit reached' using errcode='22023';end if;
  if exists(select 1 from public.vessel_family_access where owner=actor and recipient=target and status='accepted') then raise exception 'This member already has access' using errcode='22023';end if;
  insert into public.vessel_family_access(owner,recipient,recipient_email,family_label) values(actor,target,lower(trim(email)),trim(label)) on conflict(owner,recipient) do update set status='pending',recipient_email=excluded.recipient_email,family_label=excluded.family_label,created_at=now(),expires_at=now()+interval '7 days',accepted_at=null returning * into row;
 elsif action in ('accept','decline','leave','revoke') then
  select * into row from public.vessel_family_access where id=invitation for update;
  if not found then raise exception 'Invitation unavailable' using errcode='42501';end if;
  if action='revoke' then
   if row.owner<>actor then raise exception 'Not permitted' using errcode='42501';end if;
  else
   if row.recipient<>actor then raise exception 'Not permitted' using errcode='42501';end if;
   if action in ('accept','decline') and (row.status<>'pending' or row.expires_at<=now()) then raise exception 'Invitation expired or unavailable' using errcode='22023';end if;
   if action='leave' and row.status<>'accepted' then raise exception 'Access unavailable' using errcode='22023';end if;
  end if;
  update public.vessel_family_access set status=case when action='accept' then 'accepted' else 'revoked' end,accepted_at=case when action='accept' then now() else accepted_at end where id=row.id;
 else raise exception 'Invalid action' using errcode='22023';
 end if;
 insert into public.vessel_audit(owner,action) values(actor,'family_'||action);
 return jsonb_build_object('ok',true);
end $$;
create function private.family_overview(invitation uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare family public.vessel_family_access; result jsonb;
begin
 if auth.uid() is null or not public.is_pilot_member() then raise exception 'Sign in required' using errcode='42501';end if;
 select * into family from public.vessel_family_access where id=invitation and recipient=auth.uid() and status='accepted';
 if not found or not exists(select 1 from public.pilot_members where user_id=family.owner) then raise exception 'Shared overview unavailable' using errcode='42501';end if;
 select jsonb_build_object('label',family.family_label,'profiles',coalesce(jsonb_agg(jsonb_build_object('name',p.details->>'name','relationship',p.details->>'relationship','monitoring',coalesce(p.details->'monitoring','false'::jsonb),'documents',(select count(*) from public.vessel_entries e where e.owner=family.owner and e.profile_id=p.id and e.kind='records')) order by p.position),'[]'::jsonb)) into result from public.vessel_profiles p where p.owner=family.owner;
 return result;
end $$;
create function public.vessel_family_access_list() returns jsonb language sql security invoker set search_path='' as $$select private.family_access_list()$$;
create function public.vessel_family_access_change(action text, invitation uuid default null,email text default null,label text default null) returns jsonb language sql security invoker set search_path='' as $$select private.family_access_change(action,invitation,email,label)$$;
create function public.vessel_family_overview(invitation uuid) returns jsonb language sql security invoker set search_path='' as $$select private.family_overview(invitation)$$;
revoke all on function private.family_access_list(),private.family_access_change(text,uuid,text,text),private.family_overview(uuid),public.vessel_family_access_list(),public.vessel_family_access_change(text,uuid,text,text),public.vessel_family_overview(uuid) from public,anon,authenticated;
grant execute on function private.family_access_list(),private.family_access_change(text,uuid,text,text),private.family_overview(uuid),public.vessel_family_access_list(),public.vessel_family_access_change(text,uuid,text,text),public.vessel_family_overview(uuid) to authenticated;
