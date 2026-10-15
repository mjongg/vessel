import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parseEntry,labFlag,dateText} from '../app/health-data.ts';
test('quick entry parses a complete blood pressure sentence',()=>assert.deepEqual(parseEntry('My BP right now is 120/70'),{type:'Blood pressure',value:'120/70',unit:'mmHg'}));
test('ambiguous and contradictory text is not silently saved',()=>{for(const s of ['BP is 70/120','BP is 500/30','BP 120/70 yesterday','My BP is 120/70 and glucose is 50','Glucose is 110','I feel unwell','Temperature is 100 F'])assert.equal(parseEntry(s),null,s)});
test('glucose units are required and preserved',()=>assert.deepEqual(parseEntry('Glucose is 5.6 mmol/L'),{type:'Glucose',value:'5.6',unit:'mmol/L'}));
test('flags preserve qualitative results and missing ranges',()=>{const l={name:'Test',value:'11.6',unit:'g/dL',low:'12',high:'16'};assert.equal(labFlag(l),'↓ Low');assert.equal(labFlag({...l,value:'17'}),'↑ High');assert.equal(labFlag({...l,value:'12'}),'Within range');assert.equal(labFlag({...l,value:'Negative'}),'Text result');assert.equal(labFlag({...l,low:'',high:''}),'Range incomplete');});
test('dates use Philippine time consistently',()=>assert.match(dateText('2026-09-27T23:00:00Z'),/Sep 28, 2026/));
