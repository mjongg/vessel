create or replace function private.family_access_change(action text, invitation uuid default null, email text default null, label text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid; row public.vessel_family_access; actor uuid:=auth.uid();
begin
 if actor is null or not public.is_pilot_member() then raise exception 'Sign in required' using errcode='42501';end if;
 if action='invite' then
  if not exists(select 1 from auth.users where id=actor and raw_app_meta_data->>'vessel_family_dashboard'='admin') then raise exception 'Family admin required' using errcode='42501';end if;
  if email is null or length(email)>254 or email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or label is null or length(trim(label)) not between 1 and 80 then raise exception 'Invalid invitation' using errcode='22023';end if;
  select u.id into target from auth.users u join public.pilot_members m on m.user_id=u.id where lower(u.email)=lower(trim($3)) and u.email_confirmed_at is not null;
  if target is null or target=actor then raise exception 'Use another confirmed, invited Vessel account' using errcode='22023';end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,11));
  if (select count(*) from public.vessel_family_access where owner=actor)>=30 and not exists(select 1 from public.vessel_family_access where owner=actor and recipient=target) then raise exception 'Invitation limit reached' using errcode='22023';end if;
  if exists(select 1 from public.vessel_family_access where owner=actor and recipient=target and status='accepted') then raise exception 'This member already has access' using errcode='22023';end if;
  insert into public.vessel_family_access(owner,recipient,recipient_email,family_label) values(actor,target,lower(trim($3)),trim(label)) on conflict(owner,recipient) do update set status='pending',recipient_email=excluded.recipient_email,family_label=excluded.family_label,created_at=now(),expires_at=now()+interval '7 days',accepted_at=null returning * into row;
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
