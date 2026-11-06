import {test} from 'node:test';
import assert from 'node:assert/strict';
import {splitPhone,joinPhone,composeHistory,toggleInList,splitList,countryCodes,reportedNone} from '../app/entry-helpers.ts';

test('phone numbers keep their country code, and an empty number stores nothing',()=>{
 assert.deepEqual(splitPhone('+63 917 123 4567'),{code:'+63',number:'917 123 4567'});
 assert.deepEqual(splitPhone('+852 5555 0000'),{code:'+852',number:'5555 0000'});
 assert.deepEqual(splitPhone('+1 415 555 0100'),{code:'+1',number:'415 555 0100'});
 assert.deepEqual(splitPhone('0917 123 4567'),{code:'+63',number:'0917 123 4567'},'a number saved before country codes keeps its digits');
 assert.deepEqual(splitPhone(''),{code:'+63',number:''});
 assert.equal(joinPhone('+63','917 123 4567'),'+63 917 123 4567');
 assert.equal(joinPhone('+63','   '),'');
 assert.equal(countryCodes[0][0],'+63');
 assert.equal(new Set(countryCodes.map(c=>c[0])).size,countryCodes.length,'no duplicate codes');
});
test('tapped choices are stored as a list and can be untapped',()=>{
 let v=toggleInList(undefined,'Hives');v=toggleInList(v,'Swelling of lips, face or eyes');
 assert.deepEqual(splitList(v),['Hives','Swelling of lips, face or eyes']);
 assert.deepEqual(splitList(toggleInList(v,'Hives')),['Swelling of lips, face or eyes']);
});
const base={id:'x',title:'Penicillin',details:'',date:'',facility:'',source:'Patient reported'};
test('the readable description is rebuilt from the tapped choices plus the note',()=>{
 assert.equal(composeHistory({...base,kind:'Allergy',category:'Drug',reactions:'Rash; Hives',severity:'Severe',note:'In 2019'}).details,'Drug allergy · Reaction: Rash; Hives · Severity: Severe · In 2019');
 assert.equal(composeHistory({...base,kind:'Allergy',severity:'Unknown',note:''}).details,'','an unknown severity is not written as a finding');
 assert.equal(composeHistory({...base,kind:'Condition',title:'Hypertension',status:'Controlled',year:'2015',note:''}).details,'Status: Controlled · Since 2015');
 assert.equal(composeHistory({...base,kind:'Family history',title:'Breast cancer',relative:'Mother; Aunt',note:'Mother at 48'}).details,'Relative: Mother; Aunt · Mother at 48');
 assert.equal(composeHistory({...base,kind:'Surgery',title:'Appendectomy',year:'2010',note:''}).details,'Year: 2010');
});
test('an entry written before structured fields keeps its description as the note',()=>{
 const legacy={...base,kind:'Allergy',details:'Hives within an hour, treated at the ER'};
 const next=composeHistory({...legacy,severity:'Moderate'});
 assert.equal(next.note,'Hives within an hour, treated at the ER');
 assert.equal(next.details,'Severity: Moderate · Hives within an hour, treated at the ER');
 assert.equal(composeHistory(next).details,next.details,'recomposing does not duplicate text');
});
test('a none answer is distinct from unanswered, and never survives a later entry',()=>{
 const person={history:[],details:{allergyStatus:'Unknown'}};
 assert.equal(reportedNone(person,'Allergy'),false,'unanswered is not none');
 assert.equal(reportedNone(person,'Condition'),false);
 assert.equal(reportedNone({...person,details:{allergyStatus:'None known'}},'Allergy'),true);
 const none={...person,details:{allergyStatus:'Unknown',noneReported:'Condition; Surgery'}};
 assert.equal(reportedNone(none,'Surgery'),true);
 assert.equal(reportedNone(none,'Hospitalization'),false);
 assert.equal(reportedNone({...none,history:[{id:'a',kind:'Condition',title:'Asthma'}]},'Condition'),false,'a later entry wins');
});
