import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeRecords} from '../app/merge-records.ts';
const base={profiles:[{id:'a',name:'Demo',readings:[{id:'1',value:'120/70',note:''}]}]};
test('independent record additions survive a concurrent save',()=>{const local=structuredClone(base),remote=structuredClone(base);local.profiles[0].readings.push({id:'2',value:'121/71'});remote.profiles[0].readings.push({id:'3',value:'122/72'});assert.equal(mergeRecords(base,local,remote).profiles[0].readings.length,3)});
test('competing measurement changes are rejected',()=>{const local=structuredClone(base),remote=structuredClone(base);local.profiles[0].readings[0].value='121/71';remote.profiles[0].readings[0].value='122/72';assert.throws(()=>mergeRecords(base,local,remote),/same detail changed/)});
test('independent fields merge without overwriting remote changes',()=>{const local=structuredClone(base),remote=structuredClone(base);local.profiles[0].name='Edited';remote.profiles[0].readings[0].note='Before breakfast';const result=mergeRecords(base,local,remote);assert.equal(result.profiles[0].name,'Edited');assert.equal(result.profiles[0].readings[0].note,'Before breakfast')});
