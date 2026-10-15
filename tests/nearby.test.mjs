import {test} from 'node:test';
import assert from 'node:assert/strict';
import {distanceKm,phoneLink,normalizePlaces} from '../app/nearby-data.ts';
test('distance and phone links are validated',()=>{assert.equal(distanceKm(0,0,0,0),0);assert.ok(Math.abs(distanceKm(0,0,0,1)-111.195)<.01);assert.equal(phoneLink('+63 (2) 8123-4567'), 'tel:+63281234567');assert.equal(phoneLink('javascript:alert(1)'),null);assert.equal(phoneLink(''),null)});
test('directory preserves numbers and orders results by distance',()=>{const rows=normalizePlaces([{type:'node',id:1,lat:14.6,lon:121,tags:{name:'Far clinic',amenity:'clinic'}},{type:'way',id:2,center:{lat:14.5,lon:121},tags:{name:'Near pharmacy',amenity:'pharmacy','contact:phone':'+63 2 8123 4567'}}],14.5,121);assert.equal(rows[0].kind,'Pharmacy');assert.equal(rows[0].phone,'+63 2 8123 4567');assert.equal(rows[1].phone,'');assert.equal(rows[0].source,'https://www.openstreetmap.org/way/2')});
