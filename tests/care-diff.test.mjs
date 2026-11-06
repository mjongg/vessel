import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planSharedSave} from '../app/care-diff.ts';

const reading=(id,value)=>({id,type:'Blood pressure',value,unit:'mmHg',date:'2026-01-05T08:00',note:'',author:'Account owner'});
const base={id:'care:x',name:'Fictional Elder',dob:'',relationship:'',role:'',monitoring:true,records:[],history:[],medicines:[],readings:[reading('a','120/80'),reading('b','118/76')],vaccines:[]};

test('a new entry is sent alone, with no previous version',()=>{
 const writes=planSharedSave(base,{...base,readings:[...base.readings,reading('c','130/85')]});
 assert.deepEqual(writes,[{kind:'readings',entry:reading('c','130/85'),previous:null}]);
});
test('a corrected entry carries the version it was loaded with; untouched entries are not resent',()=>{
 const writes=planSharedSave(base,{...base,readings:[reading('a','121/80'),base.readings[1]]});
 assert.deepEqual(writes,[{kind:'readings',entry:reading('a','121/80'),previous:reading('a','120/80')}]);
});
test('removing an entry is refused',()=>{
 assert.throws(()=>planSharedSave(base,{...base,readings:[base.readings[0]]}),/admin can remove/);
});
test('profile detail changes are refused, and an unchanged profile sends nothing',()=>{
 assert.throws(()=>planSharedSave(base,{...base,monitoring:false}),/admin can change/);
 assert.deepEqual(planSharedSave(base,{...base}),[]);
});
