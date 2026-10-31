import {expect,test} from 'vitest';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {addMaterial,refreshStock} from '../src/sim/materials.ts';
import {validateWorld} from '../src/sim/serialization.ts';
import {effectiveCore297} from '../src/sim/core-phase-297.ts';
import {SHIP_COMPUTER_CONTENT_298} from '../src/sim/ship-computer-sensors-content-298.ts';
import {damageStructure,structureMaxHp} from '../src/sim/thing-damage.ts';
import {captureShipRootDestruction298,releaseShipRootDestruction298,wasShipRootDestroyed298} from '../src/sim/ship-root-destruction-proof-298.ts';
import {initialWorldRegistry,registeredMapForValidation,registeredMapId,isActualMapMutationContext298} from '../src/sim/world-map-context.ts';
import {prepareShipEscapeDueRoot298} from '../src/sim/ship-escape-due-root-298.ts';
import type {ShipEscapeLaunchCapture298} from '../src/sim/ship-escape-physical-298.ts';
import type {World} from '../src/sim/types.ts';
import {declaredFixture,PLAN298} from './helpers/declared-ship-content298.ts';

// Fixture function below is copied BYTE-EXACT from the qualified a5d7 suite.
// The shaped captures are DECLARED selection inputs, not WeakSet-issued launch
// captures or proof of a due token, launch permission, finalizer or Native play.
function preparedComputer(){
 const owner=declaredFixture(),p=owner.pawns[0]!;
 p.x=19;p.z=20;p.path=[];p.moveCooldown=0;p.planCooldown=0;p.jobId=null;p.state='idle';delete p.motion;delete p.draft;
 owner.piles=owner.piles.filter(q=>q.item==='survival-meal');refreshStock(owner);
 expect(applyCommand(owner,PLAN298).ok).toBe(true);
 const frame=owner.jobs.find(j=>j.kind==='ship-computer')!;expect(frame).toBeDefined();frame.construction='frame';frame.progress=SHIP_COMPUTER_CONTENT_298.work-1;
 for(const row of SHIP_COMPUTER_CONTENT_298.ingredients)addMaterial(owner,row.item,row.quantity,{type:'job',jobId:frame.id},row.item);
 refreshStock(owner);expect(validateWorld(owner)).toEqual([]);
 for(let n=0;n<20&&!owner.structures.some(s=>s.kind==='ship-computer');n++)stepWorld(owner);
 const original=owner.structures.find(s=>s.kind==='ship-computer')!;expect(original).toBeDefined();expect(owner.jobs).not.toContain(frame);expect(validateWorld(owner)).toEqual([]);
 // Real ordinary registry initialization, no fabricated map/history record.
 initialWorldRegistry(owner);expect(validateWorld(owner)).toEqual([]);
 expect(isActualMapMutationContext298(owner,owner)).toBe(true);
 return {owner,world:owner,original,p};
}

function declaredCapture(owner:World,originalRoot:World['structures'][number],world:World=owner):ShipEscapeLaunchCapture298 {
 const mapId=registeredMapId(owner)!,record=owner.worldMaps!.sites.find(row=>row.id===mapId)!;
 return Object.freeze({owner,world,originalRoot,mapId,computerId:originalRoot.id,startedAt:owner.tick,startedAtCore298:effectiveCore297(owner),originKind298:'registered-map',originTile298:record.tile});
}

test('due network uses the real captured map and original even from another selected view, and its seal does not refresh',()=>{
 const {owner,world,original}=preparedComputer(),proof=captureShipRootDestruction298(world,original,owner),capture=declaredCapture(owner,original),core=effectiveCore297(owner);
 owner.worldMaps!.selectedMapId=null; // World view, never a fallback source map.
 const result=prepareShipEscapeDueRoot298(owner,capture,proof,core);
 expect(result.ok).toBe(true);if(!result.ok)throw Error(result.reason);
 expect(result.source.kind).toBe('network');if(result.source.kind!=='network')throw Error('Expected original network source');
 expect(result.source.originalRoot).toBe(original);expect(registeredMapId(result.source.world)).toBe(capture.mapId);
 expect(isActualMapMutationContext298(owner,result.source.world)).toBe(true);expect(result.source.current()).toBe(true);
 expect(prepareShipEscapeDueRoot298(owner,capture,proof,core+1).ok).toBe(false);
 const selected=result.source.world,structures=selected.structures;
 selected.structures=[...structures]; // Declared identity fault, no played Core.
 const replacement=selected.structures;
 expect(result.source.current()).toBe(false);expect(selected.structures).not.toBe(structures);
 expect(selected.structures).toBe(replacement); // Read-only seal, no repair write.
 releaseShipRootDestruction298(proof);
});

test('a real observed fatal computer commit selects known-destroyed before map resolution and seals only fact plus frontier',()=>{
 const {owner,world,original}=preparedComputer(),proof=captureShipRootDestruction298(world,original,owner),capture=declaredCapture(owner,original),core=effectiveCore297(owner);
 expect(damageStructure(world,original,structureMaxHp(original),'bullet')).toBe(true);expect(wasShipRootDestroyed298(owner,proof)).toBe(true);
 // The same declared metadata-detachment fault as a5d7, not a played map
 // retirement or a claim that the temporary fixture is a reloadable campaign.
 owner.worldMaps!.sites=[];
 const result=prepareShipEscapeDueRoot298(owner,capture,proof,core);
 expect(result.ok).toBe(true);if(!result.ok)throw Error(result.reason);
 expect(result.source.kind).toBe('known-destroyed');expect(result.source.current()).toBe(true);
 expect(prepareShipEscapeDueRoot298(owner,capture,proof,core+1).ok).toBe(false);
 releaseShipRootDestruction298(proof);expect(result.source.current()).toBe(false);
});

test('absence or an ID-equivalent replacement never becomes destroyed and copied or validation witnesses cannot supply the source',()=>{
 const {owner,world,original}=preparedComputer(),proof=captureShipRootDestruction298(world,original,owner),core=effectiveCore297(owner);
 const validation=registeredMapForValidation(owner,registeredMapId(owner)!)!;
 expect(isActualMapMutationContext298(owner,validation)).toBe(false);
 const staleCopy={...world,structures:[...world.structures]};
 const capture=declaredCapture(owner,original,staleCopy);
 owner.structures=owner.structures.filter(s=>s!==original); // Declared despawn fault, NOT a destruction producer.
 owner.worldMaps!.selectedMapId=null;
 expect(wasShipRootDestroyed298(owner,proof)).toBe(false);
 expect(prepareShipEscapeDueRoot298(owner,capture,proof,core).ok).toBe(false);
 owner.structures.push({...original}); // Declared same-ID/different-original fault.
 expect(prepareShipEscapeDueRoot298(owner,capture,proof,core).ok).toBe(false);
 const validationCapture=Object.freeze({...capture,world:validation});
 expect(prepareShipEscapeDueRoot298(owner,validationCapture,proof,core).ok).toBe(false);
 expect(wasShipRootDestroyed298(owner,proof)).toBe(false);
 expect(prepareShipEscapeDueRoot298({...owner},capture,proof,core).ok).toBe(false);
 expect(prepareShipEscapeDueRoot298(owner,capture,{original:{...original}},core).ok).toBe(false);
 releaseShipRootDestruction298(proof);
});
