-- Invite to Vessel: the family admin adds an email; that person can then create their own account by
-- requesting a sign-in email, and becomes a pilot member automatically. Nobody else can join.
--   * public sign-ups stay closed to everyone not on the list (the "before user created" hook below);
--   * an invited person who already has an account becomes a member at once;
--   * the admin can withdraw an invitation, or remove a member's access to Vessel (never their own).
begin;

create table public.pilot_invites(
 email text primary key check(email=lower(email) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' and length(email)<=254),
 label text not null check(length(label) between 1 and 80),
 invited_by uuid not null references auth.users(id),
 invited_at timestamptz not null default now(),
 joined_at timestamptz,
 revoked_at timestamptz
);
alter table public.pilot_invites enable row level security;
revoke all on public.pilot_invites from anon, authenticated;

create function private.is_family_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u join public.pilot_members m on m.user_id=u.id where u.id=auth.uid() and u.raw_app_meta_data->>'vessel_family_dashboard'='admin')
$$;

-- Joins an invited person to the pilot. Used when their account is created and when an existing account is invited.
create function private.join_invited(target uuid, target_email text) returns void language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.pilot_invites i where i.email=lower(trim(target_email)) and i.revoked_at is null) then
  insert into public.pilot_members(user_id) values(target) on conflict do nothing;
  update public.pilot_invites set joined_at=coalesce(joined_at,now()) where email=lower(trim(target_email));
 end if;
end $$;

create function private.on_auth_user_created() returns trigger language plpgsql security definer set search_path='' as $$
begin perform private.join_invited(new.id,new.email); return new; end $$;
create trigger vessel_join_invited after insert on auth.users for each row execute function private.on_auth_user_created();

create function private.invite_list() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not private.is_family_admin() then raise exception 'Family admin required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('email',i.email,'label',i.label,'invitedAt',i.invited_at,
   'status',case when i.revoked_at is not null then 'removed' when exists(select 1 from auth.users u join public.pilot_members m on m.user_id=u.id where lower(u.email)=i.email) then 'joined' else 'pending' end)
   order by i.revoked_at nulls first,i.invited_at desc) from public.pilot_invites i),'[]'::jsonb);
end $$;

create function private.invite_change(action text, target_email text, target_label text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); e text:=lower(trim(target_email)); existing uuid;
begin
 if not private.is_family_admin() then raise exception 'Family admin required' using errcode='42501';end if;
 if e is null or length(e)>254 or e !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid email' using errcode='22023';end if;
 select u.id into existing from auth.users u where lower(u.email)=e;
 if action='invite' then
  if target_label is null or length(trim(target_label)) not between 1 and 80 then raise exception 'Invalid name' using errcode='22023';end if;
  if (select count(*) from public.pilot_invites where revoked_at is null)>=50 then raise exception 'Invitation limit reached' using errcode='22023';end if;
  insert into public.pilot_invites(email,label,invited_by) values(e,trim(target_label),actor)
   on conflict(email) do update set label=excluded.label,invited_by=excluded.invited_by,invited_at=now(),revoked_at=null;
  if existing is not null then perform private.join_invited(existing,e);end if;
 elsif action='remove' then
  if existing=actor then raise exception 'You cannot remove yourself' using errcode='22023';end if;
  update public.pilot_invites set revoked_at=now() where email=e;
  if not found and existing is null then raise exception 'Not invited' using errcode='22023';end if;
  if existing is not null then delete from public.pilot_members where user_id=existing;end if;
 else raise exception 'Unknown action' using errcode='22023';end if;
 insert into public.vessel_audit(owner,action,actor) values(actor,'pilot_'||action,actor);
 return jsonb_build_object('ok',true);
end $$;

-- Supabase Auth "Before User Created" hook: refuses any new account whose email is not on the active invite list.
create function public.vessel_before_user_created(event jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if exists(select 1 from public.pilot_invites i where i.email=lower(trim(event->'user'->>'email')) and i.revoked_at is null) then return '{}'::jsonb;end if;
 return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','This email has not been invited to Vessel.'));
end $$;

create function public.vessel_invite_list() returns jsonb language sql security invoker set search_path='' as $$select private.invite_list()$$;
create function public.vessel_invite_change(action text, target_email text, target_label text default null) returns jsonb language sql security invoker set search_path='' as $$select private.invite_change(action,target_email,target_label)$$;

revoke all on function private.is_family_admin(),private.join_invited(uuid,text),private.on_auth_user_created(),private.invite_list(),private.invite_change(text,text,text),public.vessel_invite_list(),public.vessel_invite_change(text,text,text),public.vessel_before_user_created(jsonb) from public,anon,authenticated;
grant execute on function private.is_family_admin(),private.invite_list(),private.invite_change(text,text,text),private.join_invited(uuid,text),public.vessel_invite_list(),public.vessel_invite_change(text,text,text) to authenticated;
do $$begin
 if exists(select 1 from pg_roles where rolname='supabase_auth_admin') then
  grant execute on function public.vessel_before_user_created(jsonb) to supabase_auth_admin;
  grant usage on schema private to supabase_auth_admin;
  grant execute on function private.on_auth_user_created(),private.join_invited(uuid,text) to supabase_auth_admin;
 end if;
end$$;

commit;
