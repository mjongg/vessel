import {test} from 'node:test';
import assert from 'node:assert/strict';
import {forSex,suggestedMedicines,conditionGroups,familyIllnessGroups,medicineGroups,commonHistory,commonAllergies,allergyGroups,surgeryGroups,hospitalizationGroups} from '../app/pick-lists.ts';
import {splitPhone,joinPhone,composeHistory,toggleInList,splitList,countryCodes,reportedNone,splitDose,joinDose,doseNeedsUnit,historyFacts} from '../app/entry-helpers.ts';

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
test('a note keeps its spaces while it is being typed',()=>{
 let entry={...base,kind:'Surgery',title:'Appendectomy',note:''};
 for(const key of 's/p Laparoscopic ')entry=composeHistory({...entry,note:entry.note+key});
 assert.equal(entry.note,'s/p Laparoscopic ');
 assert.equal(entry.details,'s/p Laparoscopic','the displayed description is still tidy');
});
test('a dose keeps its unit, and a bare number is flagged rather than assumed',()=>{
 assert.deepEqual(splitDose('50 mg'),{amount:'50',unit:'mg'});
 assert.deepEqual(splitDose('5/160 mg'),{amount:'5/160',unit:'mg'});
 assert.deepEqual(splitDose('1 tablet(s)'),{amount:'1',unit:'tablet(s)'});
 assert.deepEqual(splitDose('1 tablet after breakfast'),{amount:'1 tablet after breakfast',unit:''},'older wording is kept whole');
 assert.equal(joinDose('50','mg'),'50 mg');assert.equal(joinDose(' ','mg'),'');assert.equal(joinDose('50',''),'50');
 assert.equal(doseNeedsUnit('50'),true);assert.equal(doseNeedsUnit('5/160'),true);assert.equal(doseNeedsUnit('50 mg'),false);assert.equal(doseNeedsUnit(''),false);assert.equal(doseNeedsUnit('half tablet'),false);
});
test('suggestions follow the record, and every short-list item exists in its full list',()=>{
 assert.ok(suggestedMedicines(['Hypertension']).slice(0,2).includes('Amlodipine'));
 assert.ok(suggestedMedicines(['Type 2 diabetes mellitus']).includes('Insulin'));
 assert.ok(!suggestedMedicines([],'Male').includes('Prenatal vitamins'));
 assert.ok(suggestedMedicines([],'Female').includes('Prenatal vitamins'));
 const has=(groups,item)=>groups.some(g=>g.items.includes(item));
 assert.ok(!forSex(medicineGroups,'Male').some(g=>g.group==='Women’s health'));
 assert.ok(!has(forSex(conditionGroups,'Male'),'PCOS / PMOS (polycystic ovary syndrome)'));
 assert.ok(!has(forSex(conditionGroups,'Female'),'Benign prostatic hyperplasia'));
 assert.equal(forSex(conditionGroups,''),conditionGroups,'an unrecorded sex hides nothing');
 assert.ok(has(forSex(medicineGroups,'Male'),'Metformin'),'shared medicines stay in their own group');
 const lists={Condition:conditionGroups,Surgery:surgeryGroups,Hospitalization:hospitalizationGroups,'Family history':familyIllnessGroups};
 for(const [kind,groups] of Object.entries(lists))for(const item of commonHistory[kind])assert.ok(has(groups,item),kind+': '+item);
 for(const g of allergyGroups)for(const item of commonAllergies[g.group])assert.ok(g.items.includes(item),item);
 for(const item of suggestedMedicines(['Hypertension','diabetes','cholesterol','stroke','heart failure','atrial fibrillation','asthma','thyroid','gout','kidney','GERD','epilepsy','depression','tuberculosis']))assert.ok(has(medicineGroups,item),item);
});
test('history reads as labelled facts, leaving out what is unknown',()=>{
 assert.deepEqual(historyFacts({...base,kind:'Allergy',category:'Drug',reactions:'Rash; Hives',severity:'Unknown'}),[['Type','Drug'],['Reaction','Rash, Hives']]);
 assert.deepEqual(historyFacts({...base,kind:'Condition',status:'Controlled',year:'2015'}),[['Status','Controlled'],['Since','2015']]);
 assert.deepEqual(historyFacts({...base,kind:'Allergy'}),[]);
});
