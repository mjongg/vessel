-- Live isolation check for the care-team migration. Safe on a real project:
-- it runs as ONE statement that always ends by raising an exception, so every fixture is rolled back.
-- A pass ends with: ERROR "CARE CHECKS PASSED: 21 of 21". Anything else is a failure. Accounts are fictional.
do $t$
declare o uuid:='10000000-0000-4000-8000-000000000001'; c uuid:='10000000-0000-4000-8000-000000000002'; n uuid:='10000000-0000-4000-8000-000000000003'; x uuid:='10000000-0000-4000-8000-000000000005';
 f1 uuid:='20000000-0000-4000-8000-000000000001'; fn uuid:='20000000-0000-4000-8000-000000000003'; ac uuid; an uuid; r jsonb; passed int:=0; who uuid;
begin
 insert into auth.users(id,email,email_confirmed_at) values(o,'vessel-t1@example.invalid',now()),(c,'vessel-t2@example.invalid',now()),(n,'vessel-t3@example.invalid',now()),(x,'vessel-t5@example.invalid',now());
 insert into public.pilot_members(user_id) values(o),(c),(n),(x);
 insert into public.vessel_accounts(owner) values(o);
 insert into public.vessel_profiles values(o,'self',0,'{"name":"Fictional Owner"}'),(o,'elder',1,'{"name":"Fictional Elder","dob":"1940-01-01","monitoring":true,"details":{"phone":"PRIVATE_PHONE","bloodType":"O+"}}');
 insert into public.vessel_entries values(o,'self','records','own-doc',0,'{"id":"own-doc","title":"SECRET_MARKER"}'),(o,'elder','records','elder-doc',0,jsonb_build_object('id','elder-doc','title','Fictional CBC','fileId',f1)),(o,'elder','history','h1',0,'{"id":"h1","kind":"Allergy"}'),(o,'elder','history','h2',1,'{"id":"h2","kind":"Condition"}'),(o,'elder','readings','r1',0,'{"id":"r1","value":"120/80"}');
 insert into public.vessel_files(owner,id,name,mime,size,sha256,status) values(o,f1,'f.pdf','application/pdf',10,repeat('a',64),'ready'),(n,fn,'n.pdf','application/pdf',10,repeat('a',64),'ready');
 perform set_config('role','authenticated',true);

 who:=x; perform set_config('request.jwt.claim.sub',who::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',who,'role','authenticated')::text,true);
 begin perform public.vessel_care_change('invite',null,'elder','vessel-t2@example.invalid','Intruder','caregiver'); raise exception 'FAIL: outsider invited'; exception when insufficient_privilege then passed:=passed+1; end;

 who:=o; perform set_config('request.jwt.claim.sub',who::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',who,'role','authenticated')::text,true);
 perform public.vessel_care_change('invite',null,'elder','vessel-t2@example.invalid','Fictional Carer','caregiver');
 perform public.vessel_care_change('invite',null,'elder','vessel-t3@example.invalid','Fictional Nurse','contributor');
 r:=public.vessel_care_list()->'team';
 select (m->>'id')::uuid into ac from jsonb_array_elements(r) m where m->>'role'='caregiver';
 select (m->>'id')::uuid into an from jsonb_array_elements(r) m where m->>'role'='contributor';
 if ac is null or an is null then raise exception 'FAIL: invitations missing'; end if; passed:=passed+1;

 who:=c; perform set_config('request.jwt.claim.sub',who::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',who,'role','authenticated')::text,true);
 if public.vessel_care_profiles()<>'[]'::jsonb then raise exception 'FAIL: pending invitation exposed a profile'; end if; passed:=passed+1;
 begin perform public.vessel_care_write(ac,'readings','{"id":"early","value":"1/1"}'); raise exception 'FAIL: pending member wrote'; exception when insufficient_privilege then passed:=passed+1; end;

 who:=x; perform set_config('request.jwt.claim.sub',who::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',who,'role','authenticated')::text,true);
 begin perform public.vessel_care_change('accept',ac); raise exception 'FAIL: outsider accepted'; exception when insufficient_privilege then passed:=passed+1; end;

 who:=c; perform set_config('request.jwt.claim.sub',who::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',who,'role','authenticated')::text,true);
 perform public.vessel_care_change('accept',ac);
 r:=public.vessel_care_profiles();
 if jsonb_array_length(r)<>1 or r#>>'{0,profile,id}'<>'elder' or r::text like '%SECRET_MARKER%' or r::text not like '%PRIVATE_PHONE%' or jsonb_array_length(r#>'{0,profile,history}')<>2 then raise exception 'FAIL: caregiver view wrong'; end if; passed:=passed+1;
 r:=public.vessel_care_write(ac,'readings','{"id":"r2","value":"130/85","addedBy":"Forged","addedById":"forged"}');
 if r#>>'{entry,addedBy}'<>'Fictional Carer' or r#>>'{entry,addedById}'<>c::text or (r->>'revision')::int<>1 then raise exception 'FAIL: attribution or revision wrong'; end if; passed:=passed+1;
 if public.vessel_file_info(f1)->>'owner'<>o::text then raise exception 'FAIL: caregiver cannot read record file'; end if; passed:=passed+1;
 begin perform public.vessel_care_write(ac,'records',jsonb_build_object('id','steal','title','x','fileId',fn)); raise exception 'FAIL: foreign file attached'; exception when invalid_parameter_value then passed:=passed+1; end;

 who:=o; perform set_config('request.jwt.claim.sub',who::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',who,'role','authenticated')::text,true);
 begin perform public.vessel_save('{"profiles":[{"id":"self","name":"Fictional Owner"}]}'::jsonb,0); raise exception 'FAIL: stale owner save overwrote a member entry'; exception when serialization_failure then passed:=passed+1; end;
 if public.vessel_file_info(fn) is not null then raise exception 'FAIL: unattached member file visible to owner'; end if; passed:=passed+1;

 who:=n; perform set_config('request.jwt.claim.sub',who::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',who,'role','authenticated')::text,true);
 perform public.vessel_care_change('accept',an);
 r:=public.vessel_care_profiles();
 if r::text like '%PRIVATE_PHONE%' or jsonb_array_length(r#>'{0,profile,history}')<>1 or jsonb_array_length(r#>'{0,profile,records}')<>0 or jsonb_array_length(r#>'{0,profile,readings}')<>2 then raise exception 'FAIL: contributor view wrong'; end if; passed:=passed+1;
 begin perform public.vessel_care_write(an,'history','{"id":"h9","kind":"Condition"}'); raise exception 'FAIL: contributor wrote history'; exception when insufficient_privilege then passed:=passed+1; end;
 begin perform public.vessel_care_write(an,'readings','{"id":"r2","value":"1/1"}',(select e.data from public.vessel_entries e where e.owner=o and e.id='r2')); raise exception 'FAIL: contributor edited another member entry'; exception when insufficient_privilege then passed:=passed+1; end;
 perform public.vessel_care_write(an,'records',jsonb_build_object('id','nurse-doc','title','Fictional upload','fileId',fn));
 if public.vessel_file_info(f1) is not null then raise exception 'FAIL: contributor read a record file'; end if; passed:=passed+1;

 who:=o; perform set_config('request.jwt.claim.sub',who::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',who,'role','authenticated')::text,true);
 if public.vessel_file_info(fn)->>'owner'<>n::text then raise exception 'FAIL: owner cannot read team upload'; end if; passed:=passed+1;
 who:=c; perform set_config('request.jwt.claim.sub',who::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',who,'role','authenticated')::text,true);
 begin perform public.vessel_care_change('revoke',an); raise exception 'FAIL: member revoked another member'; exception when insufficient_privilege then passed:=passed+1; end;
 who:=o; perform set_config('request.jwt.claim.sub',who::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',who,'role','authenticated')::text,true);
 perform public.vessel_care_change('revoke',ac);
 who:=c; perform set_config('request.jwt.claim.sub',who::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',who,'role','authenticated')::text,true);
 if public.vessel_care_profiles()<>'[]'::jsonb or public.vessel_file_info(f1) is not null then raise exception 'FAIL: revoked member still has access'; end if; passed:=passed+1;
 begin perform public.vessel_care_write(ac,'readings','{"id":"late","value":"1/1"}'); raise exception 'FAIL: revoked member wrote'; exception when insufficient_privilege then passed:=passed+1; end;

 who:=x; perform set_config('request.jwt.claim.sub',who::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',who,'role','authenticated')::text,true);
 if public.vessel_care_profiles()<>'[]'::jsonb or public.vessel_file_info(f1) is not null or public.vessel_file_info(fn) is not null then raise exception 'FAIL: outsider has access'; end if; passed:=passed+1;

 perform set_config('role','anon',true),set_config('request.jwt.claim.sub','',true),set_config('request.jwt.claims','{"role":"anon"}',true);
 begin perform public.vessel_care_profiles(); raise exception 'FAIL: signed-out caller ran a care function'; exception when insufficient_privilege then passed:=passed+1; end;

 raise exception 'CARE CHECKS PASSED: % of 21',passed;
end $t$;
