-- Integration test: run with a privileged test connection. All fixtures roll back.
begin;
insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data) values
 ('10000000-0000-4000-8000-000000000001','vessel-owner-test@example.invalid',now(),'{"vessel_family_dashboard":"admin"}'),
 ('10000000-0000-4000-8000-000000000002','vessel-member-test@example.invalid',now(),'{}'),
 ('10000000-0000-4000-8000-000000000003','vessel-outsider-test@example.invalid',now(),'{}');
insert into public.pilot_members(user_id) values('10000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000002'),('10000000-0000-4000-8000-000000000003');
insert into public.vessel_profiles values('10000000-0000-4000-8000-000000000001','test-person',0,'{"name":"Fictional Member","relationship":"Parent","monitoring":true,"dob":"1950-01-01","details":{"phone":"SECRET_MARKER"}}');
insert into public.vessel_entries values('10000000-0000-4000-8000-000000000001','test-person','records','test-doc',0,'{"title":"SECRET_MARKER","labs":[]}');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.vessel_family_access_change('invite',null,'vessel-member-test@example.invalid','Fictional Family');
-- Preserve invitation ID in this transaction only.
select set_config('vessel.test_invitation',(public.vessel_family_access_list()->'sent'->0->>'id'),true);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
do $$begin
 assert jsonb_array_length(public.vessel_family_access_list()->'received')=0;
 begin perform public.vessel_family_access_change('accept',current_setting('vessel.test_invitation')::uuid);raise exception 'Outsider accepted invitation';exception when insufficient_privilege then null;end;
 begin perform public.vessel_family_access_change('invite',null,'vessel-member-test@example.invalid','Unauthorized');raise exception 'Non-admin created invitation';exception when insufficient_privilege then null;end;
 begin perform public.vessel_family_overview(current_setting('vessel.test_invitation')::uuid);raise exception 'Outsider read overview';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$begin
 assert jsonb_array_length(public.vessel_family_access_list()->'received')=1;
 begin perform public.vessel_family_overview(current_setting('vessel.test_invitation')::uuid);raise exception 'Pending invitation read overview';exception when insufficient_privilege then null;end;
end $$;
reset role;
update public.vessel_family_access set expires_at=now()-interval '1 second' where id=current_setting('vessel.test_invitation')::uuid;
set local role authenticated;
do $$begin
 begin perform public.vessel_family_access_change('accept',current_setting('vessel.test_invitation')::uuid);raise exception 'Expired invitation accepted';exception when invalid_parameter_value then null;end;
end $$;
reset role;
update public.vessel_family_access set expires_at=now()+interval '1 day' where id=current_setting('vessel.test_invitation')::uuid;
set local role authenticated;
select public.vessel_family_access_change('accept',current_setting('vessel.test_invitation')::uuid);
do $$declare result jsonb;begin
 result:=public.vessel_family_overview(current_setting('vessel.test_invitation')::uuid);
 assert result->>'label'='Fictional Family';
 assert result->'profiles'->0->>'name'='Fictional Member';
 assert (result->'profiles'->0->>'documents')::integer=1;
 assert (select count(*) from jsonb_object_keys(result->'profiles'->0))=4;
 assert result::text not like '%SECRET_MARKER%';
 assert jsonb_array_length(public.vessel_load()->'state'->'profiles')=0;
 assert not exists(select 1 from public.vessel_profiles where owner='10000000-0000-4000-8000-000000000001');
 assert not exists(select 1 from public.vessel_entries where owner='10000000-0000-4000-8000-000000000001');
 assert not has_table_privilege('authenticated','public.vessel_family_access','UPDATE');
 assert not has_function_privilege('anon','public.vessel_family_overview(uuid)','EXECUTE');
 begin perform public.vessel_family_access_change('revoke',current_setting('vessel.test_invitation')::uuid);raise exception 'Recipient revoked as owner';exception when insufficient_privilege then null;end;
end $$;
select public.vessel_family_access_change('leave',current_setting('vessel.test_invitation')::uuid);
do $$begin
 begin perform public.vessel_family_overview(current_setting('vessel.test_invitation')::uuid);raise exception 'Former member read overview';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.vessel_family_access_change('invite',null,'vessel-member-test@example.invalid','Fictional Family');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select public.vessel_family_access_change('decline',current_setting('vessel.test_invitation')::uuid);
do $$begin
 assert jsonb_array_length(public.vessel_family_access_list()->'received')=0;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.vessel_family_access_change('invite',null,'vessel-member-test@example.invalid','Fictional Family');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select public.vessel_family_access_change('accept',current_setting('vessel.test_invitation')::uuid);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.vessel_family_access_change('revoke',current_setting('vessel.test_invitation')::uuid);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$begin
 begin perform public.vessel_family_overview(current_setting('vessel.test_invitation')::uuid);raise exception 'Revoked member read overview';exception when insufficient_privilege then null;end;
 assert jsonb_array_length(public.vessel_family_access_list()->'received')=0;
end $$;
rollback;
select 'PASS: invitation consent, expiry, role checks, projection, isolation, revocation; fixtures rolled back' as result;
