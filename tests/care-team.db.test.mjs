// Database integration test for the care-team migration.
// Runs every Supabase migration, in order, against an in-process Postgres (PGlite) with minimal
// stand-ins for Supabase's auth and storage schemas. All accounts and records are fictional.
// This checks SQL logic and access rules; it does not replace a check against the live project.
import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const dir = new URL('../supabase/migrations/', import.meta.url);
const U = n => `10000000-0000-4000-8000-00000000000${n}`;
const OWNER = U(1), CARER = U(2), NURSE = U(3), VIEWER = U(4), OUTSIDER = U(5), PATIENT = U(6);
const email = id => `vessel-test-${id.slice(-1)}@example.invalid`;
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
const write = (access, kind, entry, previous = null) => call('select public.vessel_care_write($1,$2,$3::jsonb,$4::jsonb) r', [access, kind, JSON.stringify(entry), previous === null ? null : JSON.stringify(previous)]);
const profiles = () => call('select public.vessel_care_profiles() r');
const invite = (profile, to, label, role) => call('select public.vessel_care_change($1,null,$2,$3,$4,$5) r', ['invite', profile, to, label, role]);
const change = (action, access, role = null) => call('select public.vessel_care_change($1,$2,null,null,null,$3) r', [action, access, role]);
const fileInfo = id => call('select public.vessel_file_info($1) r', [id]);

const reading = (id, value) => ({id, type: 'Blood pressure', value, unit: 'mmHg', date: '2026-01-05T08:00', note: '', author: 'Account owner'});
const state = {profiles: [
  {id: 'self', name: 'Fictional Owner', dob: '', relationship: 'You', role: 'Owner', monitoring: false,
    records: [{id: 'own-doc', category: 'Laboratory', title: 'SECRET_MARKER', date: '', facility: '', notes: '', labs: [], reviewed: true, fileId: '20000000-0000-4000-8000-000000000002'}],
    history: [], medicines: [], readings: [], vaccines: []},
  {id: 'elder', name: 'Fictional Elder', dob: '1940-01-01', relationship: 'Parent', role: 'Managed', monitoring: true,
    details: {preferredName: '', sex: '', bloodType: 'O+', phone: 'PRIVATE_PHONE', email: '', address: '', emergencyName: 'Fictional Emergency', emergencyRelationship: 'Grandchild', emergencyPhone: '+63 900 000 0000', allergyStatus: 'Listed', medicineStatus: 'Listed'},
    contacts: [{id: 'c1', name: 'Dr. Fictional', specialty: 'Nephrology', secretary: '', phone: '+63 2 0000 0000', address: '', hours: ''}],
    records: [{id: 'elder-doc', category: 'Laboratory', title: 'Fictional CBC', date: '2026-01-02', facility: '', notes: '', labs: [], reviewed: true, fileId: '20000000-0000-4000-8000-000000000001'}],
    history: [{id: 'h-allergy', kind: 'Allergy', title: 'Fictional allergen', details: '', date: '', facility: '', source: 'Patient reported'},
      {id: 'h-condition', kind: 'Condition', title: 'Fictional condition', details: '', date: '', facility: '', source: 'Patient reported'}],
    medicines: [{id: 'm1', name: 'Fictional medicine', dose: '1 tablet', frequency: 'daily', start: '', end: '', kind: 'Maintenance', status: 'Current'}],
    readings: [reading('r-owner', '120/80')], vaccines: []},
]};
const hash = 'a'.repeat(64);
async function upload(user, id) {
  await as(user, async () => {
    await db.query('select public.vessel_reserve_file($1,$2,$3,$4,$5)', [id, 'fictional.pdf', 'application/pdf', 1000, hash]);
    await db.query(`insert into storage.objects(bucket_id,name) values('vessel-records',$1)`, [`${user}/${id}`]);
    await db.query('select public.vessel_finish_file($1)', [id]);
  });
}
const access = {};

before(async () => {
  db = new PGlite();
  await db.exec(bootstrap);
  for (const name of (await readdir(dir)).filter(n => n.endsWith('.sql')).sort()) {
    try { await db.exec(await readFile(new URL(name, dir), 'utf8')); } catch (e) { throw new Error(`Migration ${name} failed: ${e.message}`); }
  }
  for (const id of [OWNER, CARER, NURSE, VIEWER, OUTSIDER, PATIENT]) {
    await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())', [id, email(id)]);
    await db.query('insert into public.pilot_members(user_id) values($1)', [id]);
  }
  await upload(OWNER, '20000000-0000-4000-8000-000000000001');
  await upload(OWNER, '20000000-0000-4000-8000-000000000002');
  await as(OWNER, () => db.query('select public.vessel_save($1::jsonb,0)', [JSON.stringify(state)]));
});

test('only the profile owner can invite, and only to a profile they hold', async () => {
  await as(OUTSIDER, () => denied('42501', invite('elder', email(CARER), 'Intruder', 'caregiver')));
  await as(OWNER, () => denied('42501', invite('missing', email(CARER), 'Carer', 'caregiver')));
  await as(OWNER, () => denied('22023', invite('elder', email(CARER), 'Carer', 'admin')));
  await as(OWNER, async () => {
    await invite('elder', email(CARER), 'Fictional Carer', 'caregiver');
    await invite('elder', email(NURSE), 'Fictional Nurse', 'contributor');
    await invite('elder', email(VIEWER), 'Fictional Viewer', 'viewer');
    await invite('elder', email(PATIENT), 'Fictional Elder', 'patient');
    await denied('22023', invite('elder', email(OUTSIDER), 'Second patient', 'patient'));
    const team = (await call('select public.vessel_care_list() r')).team;
    assert.equal(team.length, 4);
    for (const m of team) access[m.email] = m.id;
  });
});

test('a pending invitation grants nothing, and only its recipient can accept it', async () => {
  await as(CARER, async () => {
    assert.deepEqual(await profiles(), []);
    await denied('42501', write(access[email(CARER)], 'readings', reading('r-early', '1/1')));
    assert.equal((await call('select public.vessel_care_list() r')).invitations.length, 1);
  });
  await as(OUTSIDER, () => denied('42501', change('accept', access[email(CARER)])));
  for (const id of [CARER, NURSE, VIEWER, PATIENT]) await as(id, () => change('accept', access[email(id)]));
});

test('a caregiver sees the one shared profile in full and nothing else in the account', async () => {
  await as(CARER, async () => {
    const shared = await profiles();
    assert.equal(shared.length, 1);
    assert.equal(shared[0].profile.id, 'elder');
    assert.equal(shared[0].role, 'caregiver');
    assert.equal(shared[0].profile.history.length, 2);
    assert.equal(shared[0].profile.records.length, 1);
    assert.equal(shared[0].profile.details.phone, 'PRIVATE_PHONE');
    assert.ok(!JSON.stringify(shared).includes('SECRET_MARKER'));
  });
});

test('a contributor sees readings, medicines and allergies only, with contact details withheld', async () => {
  await as(NURSE, async () => {
    const [{profile}] = await profiles();
    assert.equal(profile.readings.length, 1);
    assert.equal(profile.medicines.length, 1);
    assert.deepEqual(profile.history.map(h => h.kind), ['Allergy']);
    assert.deepEqual(profile.records, []);
    assert.deepEqual(profile.vaccines, []);
    assert.equal(profile.details.bloodType, 'O+');
    assert.ok(!JSON.stringify(profile).includes('PRIVATE_PHONE'));
    assert.equal(profile.contacts[0].name, 'Dr. Fictional', 'the nurse can call the doctors');
    assert.equal(profile.details.emergencyName, 'Fictional Emergency');
  });
});

const today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
const mark = (accessId, profile, medicine, day, slot, status) => call('select public.vessel_dose_mark($1,$2,$3,$4::date,$5,$6) r', [accessId, profile, medicine, day, slot, status]);
const doses = (accessId, profile) => call('select public.vessel_dose_list($1,$2,$3::date,$4::date) r', [accessId, profile, today, today]);

test('the owner and a nurse can tick off a dose, attributed by the server; a viewer can only read', async () => {
  await as(OWNER, () => mark(null, 'elder', 'm1', today, 'Morning', 'given'));
  await as(NURSE, () => mark(access[email(NURSE)], null, 'm1', today, 'Evening', 'skipped'));
  await as(VIEWER, async () => {
    await denied('42501', mark(access[email(VIEWER)], null, 'm1', today, 'Noon', 'given'));
    const list = await doses(access[email(VIEWER)], null);
    assert.deepEqual(list.map(d => [d.slot, d.status, d.by]), [['Evening', 'skipped', 'Fictional Nurse'], ['Morning', 'given', 'Admin']]);
  });
});

test('dose marks stay inside one record: wrong medicine, other profiles, outsiders and old days are refused', async () => {
  await as(OWNER, async () => {
    await denied('22023', mark(null, 'elder', 'not-a-medicine', today, 'Morning', 'given'));
    await denied('22023', mark(null, 'elder', 'm1', '2020-01-01', 'Morning', 'given'));
    await denied('22023', mark(null, 'elder', 'm1', today, 'Lunchtime', 'given'));
    await denied('42501', mark(null, 'someone-else', 'm1', today, 'Morning', 'given'));
  });
  await as(OUTSIDER, async () => {
    await denied('42501', mark(access[email(NURSE)], null, 'm1', today, 'Morning', 'given'));
    await denied('42501', doses(null, 'elder'));
  });
  await as(NURSE, () => denied('42501', mark(null, 'elder', 'm1', today, 'Morning', 'given')));
});

test('clearing a mark removes it, and nobody can read or write the dose table directly', async () => {
  await as(OWNER, async () => {
    await mark(null, 'elder', 'm1', today, 'Morning', null);
    assert.deepEqual((await doses(null, 'elder')).map(d => d.slot), ['Evening']);
  });
  await as(NURSE, () => denied('42501', db.query('select * from public.vessel_dose_log')));
  await as(null, () => denied('42501', doses(null, 'elder')));
});

test('a caregiver entry is attributed by the server and the owner’s stale save is rejected, not overwritten', async () => {
  const out = await as(CARER, () => write(access[email(CARER)], 'readings', {...reading('r-carer', '130/85'), addedBy: 'Forged name', addedById: OWNER}));
  assert.equal(out.entry.addedBy, 'Fictional Carer');
  assert.equal(out.entry.addedById, CARER);
  assert.equal(out.entry.author, 'Fictional Carer');
  assert.equal(out.revision, 2);
  await as(OWNER, async () => {
    await denied('PT409', db.query('select public.vessel_save($1::jsonb,1)', [JSON.stringify(state)]));
    const loaded = await call('select public.vessel_load() r');
    assert.equal(loaded.revision, 2);
    assert.deepEqual(loaded.state.profiles[1].readings.map(r => r.id), ['r-owner', 'r-carer']);
  });
});

test('role limits hold on writes', async () => {
  await as(VIEWER, () => denied('42501', write(access[email(VIEWER)], 'readings', reading('r-viewer', '1/1'))));
  await as(NURSE, async () => {
    const id = access[email(NURSE)];
    await denied('42501', write(id, 'history', {id: 'h-nurse', kind: 'Condition', title: 'x', details: '', date: '', facility: '', source: 'Caregiver reported'}));
    await denied('42501', write(id, 'vaccines', {id: 'v-nurse', name: 'x'}));
    const mine = (await write(id, 'readings', reading('r-nurse', '118/76'))).entry;
    const theirs = (await profiles())[0].profile.readings.find(r => r.id === 'r-carer');
    await denied('42501', write(id, 'readings', {...theirs, value: '1/1'}, theirs));
    await denied('PT409', write(id, 'readings', {...mine, value: '119/77'}, {...mine, value: 'stale'}));
    await denied('PT409', write(id, 'readings', {...mine, value: '119/77'}));
    const edited = (await write(id, 'readings', {...mine, value: '119/77'}, mine)).entry;
    assert.equal(edited.value, '119/77');
    assert.equal(edited.addedById, NURSE);
    assert.equal(edited.editedBy, 'Fictional Nurse');
    await denied('22023', write(id, 'unknown', reading('r-x', '1/1')));
    await denied('22023', write(id, 'readings', {value: 'no id'}));
  });
  await as(PATIENT, async () => {
    const id = access[email(PATIENT)];
    const [{profile}] = await profiles();
    assert.equal(profile.history.length, 2);
    await write(id, 'history', {id: 'h-patient', kind: 'Surgery', title: 'Fictional surgery', details: '', date: '', facility: '', source: 'Patient reported'});
    const med = profile.medicines[0];
    await denied('42501', write(id, 'medicines', {...med, dose: '2 tablets'}, med));
  });
  await as(CARER, async () => {
    const med = (await profiles())[0].profile.medicines[0];
    const edited = (await write(access[email(CARER)], 'medicines', {...med, dose: 'half tablet'}, med)).entry;
    assert.equal(edited.editedBy, 'Fictional Carer');
    assert.equal(edited.addedById, undefined);
  });
  await as(OUTSIDER, () => denied('42501', write(access[email(CARER)], 'readings', reading('r-out', '1/1'))));
});

test('attachments follow the record: team uploads reach the owner, foreign files cannot be claimed', async () => {
  const nurseFile = '20000000-0000-4000-8000-000000000003', ownerElder = '20000000-0000-4000-8000-000000000001', ownerSelf = '20000000-0000-4000-8000-000000000002';
  await upload(NURSE, nurseFile);
  const doc = id => ({id, category: 'Laboratory', title: 'Fictional upload', date: '', facility: '', notes: '', labs: [], reviewed: false, fileId: nurseFile, fileName: 'fictional.pdf'});
  await as(OWNER, async () => assert.equal(await fileInfo(nurseFile), null));
  await as(CARER, () => denied('22023', write(access[email(CARER)], 'records', doc('steal'))));
  await as(CARER, () => denied('22023', write(access[email(CARER)], 'records', {...doc('steal'), fileId: 'not-a-uuid'})));
  await as(NURSE, async () => {
    await write(access[email(NURSE)], 'records', doc('nurse-doc'));
    assert.deepEqual((await profiles())[0].profile.records.map(r => r.id), ['nurse-doc']);
    assert.equal(await fileInfo(ownerElder), null);
  });
  const visible = async (user, id, owner) => as(user, async () => ({info: await fileInfo(id), object: (await db.query('select count(*)::int n from storage.objects where name=$1', [`${owner}/${id}`])).rows[0].n}));
  for (const user of [OWNER, CARER, VIEWER, PATIENT]) {
    const seen = await visible(user, nurseFile, NURSE);
    assert.equal(seen.info?.owner, NURSE, 'team upload readable');
    assert.equal(seen.object, 1);
    assert.equal((await visible(user, ownerElder, OWNER)).info?.owner, OWNER);
  }
  for (const [user, id, owner] of [[OUTSIDER, nurseFile, NURSE], [OUTSIDER, ownerElder, OWNER], [CARER, ownerSelf, OWNER], [NURSE, ownerSelf, OWNER]]) {
    const seen = await visible(user, id, owner);
    assert.equal(seen.info, null);
    assert.equal(seen.object, 0);
  }
});

test('the owner can change a role, and revoking or leaving ends access immediately', async () => {
  await as(CARER, () => denied('42501', change('role', access[email(VIEWER)], 'caregiver')));
  await as(OWNER, () => change('role', access[email(VIEWER)], 'caregiver'));
  await as(VIEWER, () => write(access[email(VIEWER)], 'readings', reading('r-promoted', '110/70')));
  await as(OWNER, () => denied('22023', change('role', access[email(VIEWER)], 'patient')));
  await as(CARER, () => denied('42501', change('revoke', access[email(NURSE)])));
  await as(OWNER, () => change('revoke', access[email(CARER)]));
  await as(CARER, async () => {
    assert.deepEqual(await profiles(), []);
    await denied('42501', write(access[email(CARER)], 'readings', reading('r-after', '1/1')));
    assert.equal(await fileInfo('20000000-0000-4000-8000-000000000001'), null);
    await denied('22023', change('accept', access[email(CARER)]));
  });
  await as(PATIENT, async () => { await change('leave', access[email(PATIENT)]); assert.deepEqual(await profiles(), []); });
  await as(OWNER, () => change('revoke', access[email(NURSE)]));
  await as(OWNER, async () => assert.equal((await fileInfo('20000000-0000-4000-8000-000000000003'))?.owner, NURSE, 'a former member’s upload stays with the record'));
});

test('signed-out callers cannot run any care function and every change is audited with its actor', async () => {
  await as(null, async () => {
    await denied('42501', profiles());
    await denied('42501', call('select public.vessel_care_list() r'));
    await denied('42501', write(access[email(NURSE)], 'readings', reading('r-anon', '1/1')));
    await denied('42501', fileInfo('20000000-0000-4000-8000-000000000001'));
  });
  const audit = (await db.query(`select action,count(*)::int n from public.vessel_audit where actor is not null group by action`)).rows;
  const count = a => audit.find(r => r.action === a)?.n || 0;
  assert.equal(count('care_invite'), 4);
  assert.equal(count('care_accept'), 4);
  assert.ok(count('care_entry_saved') >= 6);
  assert.equal(count('care_revoke'), 2);
  const stray = await db.query(`select 1 from public.vessel_audit where action like 'care_%' and owner<>$1`, [OWNER]);
  assert.equal(stray.rows.length, 0);
});
