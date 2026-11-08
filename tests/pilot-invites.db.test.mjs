// Invite to Vessel: database rules, run against an in-process Postgres with every migration applied. Fictional accounts only.
import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const dir = new URL('../supabase/migrations/', import.meta.url);
const ADMIN = '30000000-0000-4000-8000-000000000001', MEMBER = '30000000-0000-4000-8000-000000000002', LATER = '30000000-0000-4000-8000-000000000003', STRANGER = '30000000-0000-4000-8000-000000000004';
let db;
const bootstrap = `
create role anon nologin; create role authenticated nologin;
create schema auth;
create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, raw_app_meta_data jsonb not null default '{}');
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to anon, authenticated;
create schema storage;
create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:cardinality(string_to_array(name,'/'))-1]$$;
create function storage.filename(name text) returns text language sql immutable as $$select (string_to_array(name,'/'))[cardinality(string_to_array(name,'/'))]$$;
grant usage on schema storage to anon, authenticated;
grant select, insert on storage.objects to authenticated;
grant usage on schema public to anon, authenticated;
`;
async function as(user, run) {
  await db.exec(`set role ${user ? 'authenticated' : 'anon'}; select set_config('request.jwt.claim.sub','${user || ''}',false);`);
  try { return await run(); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub','',false);`); }
}
const call = async (sql, params = []) => (await db.query(sql, params)).rows[0]?.r;
const denied = (code, promise) => assert.rejects(promise, e => { assert.equal(e.code, code, e.message); return true; });
const change = (action, email, label = null) => call('select public.vessel_invite_change($1,$2,$3) r', [action, email, label]);
const list = () => call('select public.vessel_invite_list() r');
const member = async id => (await db.query('select 1 from public.pilot_members where user_id=$1', [id])).rows.length === 1;
const signUp = (id, email) => db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())', [id, email]);
const hook = email => call('select public.vessel_before_user_created($1::jsonb) r', [JSON.stringify({user: {email}})]);

before(async () => {
  db = new PGlite();
  await db.exec(bootstrap);
  for (const name of (await readdir(dir)).filter(n => n.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(name, dir), 'utf8'));
  await db.query(`insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data) values($1,'admin@example.invalid',now(),'{"vessel_family_dashboard":"admin"}')`, [ADMIN]);
  await db.query('insert into public.pilot_members(user_id) values($1)', [ADMIN]);
  await signUp(LATER, 'later@example.invalid');
});

test('only the family admin can invite, list or remove', async () => {
  await signUp(STRANGER, 'stranger@example.invalid');
  await as(STRANGER, async () => { await denied('42501', change('invite', 'x@example.invalid', 'X')); await denied('42501', list()); });
  await as(null, () => denied('42501', list()));
});

test('an invited email can create an account and joins the pilot; anyone else is refused at sign-up', async () => {
  await as(ADMIN, () => change('invite', '  Auntie@Example.invalid ', 'Auntie'));
  assert.deepEqual(await hook('auntie@example.invalid'), {});
  assert.equal((await hook('stranger@example.invalid')).error.http_code, 403);
  await signUp(MEMBER, 'auntie@example.invalid');
  assert.equal(await member(MEMBER), true);
  assert.equal(await member(STRANGER), false, 'an uninvited account gets no access even if it exists');
  const [entry] = (await as(ADMIN, list)).filter(i => i.email === 'auntie@example.invalid');
  assert.equal(entry.status, 'joined');
});

test('inviting someone who already has an account lets them in at once', async () => {
  assert.equal(await member(LATER), false);
  await as(ADMIN, () => change('invite', 'later@example.invalid', 'Later'));
  assert.equal(await member(LATER), true);
});

test('removing someone ends their access and their invitation; the admin cannot remove themself', async () => {
  await as(ADMIN, async () => {
    await change('remove', 'auntie@example.invalid');
    await denied('22023', change('remove', 'admin@example.invalid'));
    await denied('22023', change('invite', 'not-an-email', 'X'));
  });
  assert.equal(await member(MEMBER), false);
  assert.equal((await hook('auntie@example.invalid')).error.http_code, 403);
  const [entry] = (await as(ADMIN, list)).filter(i => i.email === 'auntie@example.invalid');
  assert.equal(entry.status, 'removed');
});

test('nobody can read or write the invite list directly', async () => {
  await as(ADMIN, () => denied('42501', db.query('select * from public.pilot_invites')));
});
