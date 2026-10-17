import {expect,test} from 'vitest';
import {localMapInit256} from '../src/sim/local-map-init-256.ts';
import {validateCapturedGeographicMapInit256} from '../src/sim/geographic-map-init-context-256.ts';
import {assembleEncounterCamp256,type CampMapInputs256} from '../src/sim/camp-map-assembly-256.ts';

test('captured Init validates the real GasGrid draw without consuming the captured stream',()=>{
 const init=localMapInit256(-13245789,200,200),before=init.random.state;
 expect(()=>validateCapturedGeographicMapInit256(init,-13245789,200,200)).not.toThrow();expect(init.random.state).toEqual(before);
 expect(()=>validateCapturedGeographicMapInit256({...init,gasDiffusionCycleIndex:(init.gasDiffusionCycleIndex+1)%20000},-13245789,200,200)).toThrow();expect(init.random.state).toEqual(before);
});
test('stale Init or missing provenance is refused before any further captured-stream draw',()=>{
 const init=localMapInit256(87431,200,200);init.random.value();const before=init.random.state;
 expect(()=>validateCapturedGeographicMapInit256(init,87431,200,200)).toThrow();expect(init.random.state).toEqual(before);
 const fresh=localMapInit256(87431,200,200),snapshot=fresh.random.state;
 expect(()=>validateCapturedGeographicMapInit256({...fresh,provenance:{...fresh.provenance,source:''}},87431,200,200)).toThrow();expect(fresh.random.state).toEqual(snapshot);
});
test('malformed captured campaign produces a blocked result with no map, prefix or accessor execution',()=>{
 let reads=0;const campaign=Object.defineProperty({},'schemaVersion',{enumerable:true,get(){reads++;return 256;}});
 // Deliberate malformed admission, not a fake World used by a producer.
 const iterator=assembleEncounterCamp256({campaign} as CampMapInputs256),first=iterator.next();
 expect(first.done).toBe(true);expect(first.value).toMatchObject({status:'blocked',phase:'preflight'});expect(first.value).not.toHaveProperty('world');expect(reads).toBe(0);
});
