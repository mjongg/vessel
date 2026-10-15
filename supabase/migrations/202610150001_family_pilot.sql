-- Apply to a NEW project. Do not import demo records or alter existing user data.
begin;
create table public.pilot_members(user_id uuid primary key references auth.users(id), added_at timestamptz not null default now());
alter table public.pilot_members enable row level security;
create policy own_membership on public.pilot_members for select to authenticated using(user_id=auth.uid());
grant select on public.pilot_members to authenticated;
create function public.is_pilot_member() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.pilot_members where user_id=auth.uid())$$;
revoke all on function public.is_pilot_member() from public;grant execute on function public.is_pilot_member() to authenticated;
create table public.vessel_accounts(owner uuid primary key references auth.users(id), revision bigint not null default 0, updated_at timestamptz not null default now());
create table public.vessel_profiles(owner uuid not null references auth.users(id),id text not null,position integer not null,details jsonb not null,primary key(owner,id));
create table public.vessel_entries(owner uuid not null,profile_id text not null,kind text not null check(kind in ('records','history','medicines','readings','vaccines')),id text not null,position integer not null,data jsonb not null,primary key(owner,profile_id,kind,id),foreign key(owner,profile_id) references public.vessel_profiles(owner,id) on delete cascade);
create table public.vessel_files(owner uuid not null references auth.users(id),id uuid primary key,name text not null,mime text not null,size bigint not null check(size between 1 and 10000000),sha256 text not null,status text not null default 'pending' check(status in ('pending','ready')),created_at timestamptz not null default now());
create index vessel_files_owner on public.vessel_files(owner);
create table public.vessel_audit(id bigint generated always as identity primary key,owner uuid not null references auth.users(id),action text not null,revision bigint,created_at timestamptz not null default now());
create table public.vessel_ai_usage(owner uuid not null references auth.users(id),hour timestamptz not null,requests integer not null,primary key(owner,hour));
do $$declare t text;begin foreach t in array array['vessel_accounts','vessel_profiles','vessel_entries','vessel_files','vessel_audit'] loop execute format('alter table public.%I enable row level security',t);execute format('create policy own_data on public.%I for select to authenticated using(owner=auth.uid() and public.is_pilot_member())',t);execute format('grant select on public.%I to authenticated',t);end loop;end$$;
alter table public.vessel_ai_usage enable row level security;
-- All mutations go through transactions. Clients cannot bypass revision checks or quotas.
create function public.vessel_load() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 if not public.is_pilot_member() then raise exception 'Not invited';end if;
 select jsonb_build_object('revision',coalesce((select revision from public.vessel_accounts where owner=auth.uid()),0),'state',jsonb_build_object('profiles',coalesce(jsonb_agg(p.details||jsonb_build_object('id',p.id)||coalesce((select jsonb_object_agg(k.kind,k.items) from (select kind,jsonb_agg(data order by position) items from public.vessel_entries where owner=auth.uid() and profile_id=p.id group by kind) k),'{}'::jsonb) order by p.position),'[]'::jsonb))) into result from public.vessel_profiles p where p.owner=auth.uid();
 return result;end$$;
create function public.vessel_save(state jsonb,expected_revision bigint) returns bigint language plpgsql security definer set search_path='' as $$
declare current_revision bigint; p jsonb; e jsonb; k text; pi integer:=0; ei integer;begin
 if not public.is_pilot_member() then raise exception 'Not invited';end if;
 if octet_length(state::text)>8000000 or jsonb_typeof(state->'profiles') is distinct from 'array' or jsonb_array_length(state->'profiles') not between 1 and 30 then raise exception 'Record capacity exceeded';end if;
 insert into public.vessel_accounts(owner) values(auth.uid()) on conflict do nothing;
 select revision into current_revision from public.vessel_accounts where owner=auth.uid() for update;
 if current_revision<>expected_revision then raise exception 'Revision conflict' using errcode='40001';end if;
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
create function public.vessel_reserve_file(file_id uuid,file_name text,file_mime text,file_size bigint,file_hash text) returns void language plpgsql security definer set search_path='' as $$begin
 if not public.is_pilot_member() then raise exception 'Not invited';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if file_mime not in ('application/pdf','image/jpeg','image/png','image/webp') or length(file_name)>180 or file_hash!~'^[a-f0-9]{64}$' then raise exception 'Invalid attachment';end if;
 if (select coalesce(sum(size),0) from public.vessel_files where owner=auth.uid())+file_size>1000000000 then raise exception 'Storage limit reached';end if;
 insert into public.vessel_files(owner,id,name,mime,size,sha256) values(auth.uid(),file_id,file_name,file_mime,file_size,file_hash);end$$;
create function public.vessel_finish_file(file_id uuid) returns void language plpgsql security definer set search_path='' as $$begin
 if not public.is_pilot_member() then raise exception 'Not invited';end if;
 if not exists(select 1 from storage.objects where bucket_id='vessel-records' and name=auth.uid()::text||'/'||file_id::text) then raise exception 'File not uploaded';end if;
 update public.vessel_files set status='ready' where owner=auth.uid() and id=file_id;
 insert into public.vessel_audit(owner,action) values(auth.uid(),'file_uploaded');end$$;
create function public.vessel_cancel_file(file_id uuid) returns void language sql security definer set search_path='' as $$delete from public.vessel_files where owner=auth.uid() and id=file_id and status='pending' and public.is_pilot_member()$$;
create function public.vessel_use_ai() returns boolean language plpgsql security definer set search_path='' as $$declare n integer;begin
 if not public.is_pilot_member() then return false;end if;
 insert into public.vessel_ai_usage values(auth.uid(),date_trunc('hour',now()),1) on conflict(owner,hour) do update set requests=public.vessel_ai_usage.requests+1 returning requests into n;return n<=10;end$$;
create function public.vessel_storage_usage() returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object('files',count(*),'bytes',coalesce(sum(size),0)) from public.vessel_files where owner=auth.uid() and public.is_pilot_member()$$;
do $$declare f record;begin for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'vessel_%' loop execute 'revoke all on function '||f.signature||' from public';execute 'grant execute on function '||f.signature||' to authenticated';end loop;end$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('vessel-records','vessel-records',false,10000000,array['application/pdf','image/jpeg','image/png','image/webp']);
create policy own_file_read on storage.objects for select to authenticated using(bucket_id='vessel-records' and (storage.foldername(name))[1]=auth.uid()::text and public.is_pilot_member());
create policy reserved_file_upload on storage.objects for insert to authenticated with check(bucket_id='vessel-records' and (storage.foldername(name))[1]=auth.uid()::text and public.is_pilot_member() and exists(select 1 from public.vessel_files f where f.owner=auth.uid() and storage.objects.name=f.owner::text||'/'||f.id::text and f.status='pending'));
commit;
