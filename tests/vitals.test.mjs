import test from 'node:test';
import assert from 'node:assert/strict';
import {checkReading,vitalsToSave} from '../app/entry-helpers.ts';

const empty={systolic:'',diastolic:'',pulse:'',temperature:'',oxygen:'',glucose:'',glucoseUnit:'mg/dL'};

test('blank vitals are skipped, never saved as a value',()=>{
 assert.deepEqual(vitalsToSave(empty),[]);
 assert.deepEqual(vitalsToSave({...empty,pulse:' 72 '}),[{type:'Pulse',value:'72',unit:'bpm'}]);
});

test('one round saves each measured vital with its own unit',()=>{
 const saved=vitalsToSave({...empty,systolic:'130',diastolic:'80',temperature:'36.8',oxygen:'97',glucose:'6.1',glucoseUnit:'mmol/L'});
 assert.deepEqual(saved.map(r=>[r.type,r.value,r.unit]),[['Blood pressure','130/80','mmHg'],['Temperature','36.8','°C'],['Oxygen saturation','97','%'],['Glucose','6.1','mmol/L']]);
});

test('half a blood pressure is refused rather than guessed',()=>{
 const [bp]=vitalsToSave({...empty,systolic:'130'});
 assert.equal(bp.value,'130/');
 assert.match(checkReading(bp.type,bp.value),/Check the blood pressure/);
});

test('typing slips are caught and valid readings pass',()=>{
 assert.equal(checkReading('Blood pressure','120/70'),'');
 assert.match(checkReading('Blood pressure','70/120'),/Check/);
 assert.match(checkReading('Temperature','98.6'),/°C/);
 assert.match(checkReading('Oxygen saturation','101'),/100%/);
 assert.match(checkReading('Pulse','abc'),/positive number/);
 assert.equal(checkReading('Symptom','Headache'),'');
});

import {dialLink} from '../app/entry-helpers.ts';
test('hospital locals dial after a pause, never glued onto the trunk line',()=>{
 assert.equal(dialLink('+63 2 8723 0101 local 6519'),'tel:+63287230101,6519');
 assert.equal(dialLink('+63 8-789-7700 loc 7310'),'tel:+63878977000,7310'.replace('878977000','87897700'));
 assert.equal(dialLink('+63 2 8723 0101 L6521'),'tel:+63287230101,6521');
 assert.equal(dialLink('+63 956 639 9960'),'tel:+639566399960');
});
