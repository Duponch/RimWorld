import {expect,test} from 'vitest';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {addMaterial,refreshStock} from '../src/sim/materials.ts';
import {validateWorld,serializeWorld} from '../src/sim/serialization.ts';
import {SHIP_COMPUTER_CONTENT_298} from '../src/sim/ship-computer-sensors-content-298.ts';
import {damageStructure,structureMaxHp} from '../src/sim/thing-damage.ts';
import {finishDeconstruction} from '../src/sim/deconstruction.ts';
import {captureShipRootDestruction298,notifyShipRootDestruction298,releaseShipRootDestruction298,wasShipRootDestroyed298} from '../src/sim/ship-root-destruction-proof-298.ts';
import {initialWorldRegistry,registeredMap,registeredMapForValidation,registeredMapId,registeredCampaign,isActualMapMutationContext298} from '../src/sim/world-map-context.ts';
import {declaredFixture,PLAN298} from './helpers/declared-ship-content298.ts';

/* Declared Source10 engineering fixture, never an acquired AI or mission.
 * Reuses the existing32² finite/researched/healthy-adult fixture. One paid
 * computer frame is explicitly staged one work unit before completion, then
 * completed by the ordinary engine. No new World property or test-only src API.
 * These contracts test destruction commits/owner proof, not construction pacing,
 * launch permission, a Native countdown or a physical departure. */
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

test('only a real successful fatal computer damage commit establishes the weak original proof',()=>{
 const {owner,world,original}=preparedComputer(),proof=captureShipRootDestruction298(world,original,owner);
 expect(wasShipRootDestroyed298(world,proof)).toBe(false);
 expect(damageStructure(world,original,0,'bullet')).toBe(false);
 expect(wasShipRootDestroyed298(world,proof)).toBe(false);expect(world.structures).toContain(original);
 expect(damageStructure(world,original,1,'bullet')).toBe(true);
 expect(wasShipRootDestroyed298(world,proof)).toBe(false);expect(world.structures).toContain(original);
 expect(damageStructure(world,original,structureMaxHp(original),'bullet')).toBe(true);
 expect(world.structures).not.toContain(original);expect(wasShipRootDestroyed298(world,proof)).toBe(true);
 expect(wasShipRootDestroyed298(world,{original})).toBe(false);
 // Declared metadata-detachment fault AFTER the true destruction. This is not
 // a played map abandonment or a claim that this temporary fixture is a save.
 const sites=owner.worldMaps!.sites;owner.worldMaps!.sites=[];
 expect(isActualMapMutationContext298(owner,world)).toBe(false);
 expect(wasShipRootDestroyed298(owner,proof)).toBe(true);
 owner.worldMaps!.sites=sites;
 releaseShipRootDestruction298(proof);expect(wasShipRootDestroyed298(world,proof)).toBe(false);
});

test('shared-original clones and a genuinely branded validation view cannot claim a destruction commit or retain an old epoch',()=>{
 const {owner,world,original}=preparedComputer(),old=captureShipRootDestruction298(world,original,owner),proof=captureShipRootDestruction298(world,original,owner);
 expect(wasShipRootDestroyed298(world,old)).toBe(false);
 expect(wasShipRootDestroyed298({...owner},proof)).toBe(false);
 const copy={...world},mapId=registeredMapId(world)!;
 const validation=registeredMapForValidation(owner,mapId)!;expect(validation).toBeDefined();expect(registeredCampaign(validation)).toBe(owner);
 expect(isActualMapMutationContext298(owner,copy)).toBe(false);expect(isActualMapMutationContext298(owner,validation)).toBe(false);
 expect(()=>captureShipRootDestruction298(copy,original,owner)).toThrow();
 expect(()=>captureShipRootDestruction298(validation,original,owner)).toThrow();
 const before=serializeWorld(owner);
 notifyShipRootDestruction298(copy,original);notifyShipRootDestruction298(validation,original);
 notifyShipRootDestruction298(world,{...original});
 expect(wasShipRootDestroyed298(world,proof)).toBe(false);expect(serializeWorld(owner)).toBe(before);
 const actual=registeredMap(owner,mapId)!;expect(isActualMapMutationContext298(owner,actual)).toBe(true);
 // Canonical context creation does not turn the older validation object genuine.
 expect(isActualMapMutationContext298(owner,validation)).toBe(false);
 releaseShipRootDestruction298(old);expect(wasShipRootDestroyed298(world,proof)).toBe(false);
 releaseShipRootDestruction298(proof);notifyShipRootDestruction298(actual,original);
 expect(wasShipRootDestroyed298(world,proof)).toBe(false);
});

test('the ordinary designated computer deconstruction committer establishes proof only on its real owner',()=>{
 const {owner,world,original,p}=preparedComputer(),proof=captureShipRootDestruction298(world,original,owner);
 expect(applyCommand(world,{type:'designate',kind:'deconstruct',x:original.x,z:original.z}).ok).toBe(true);
 const job=world.jobs.find(j=>j.deconstruction?.structureId===original.id)!;expect(job).toBeDefined();
 expect(wasShipRootDestroyed298(world,proof)).toBe(false);
 // This exercises the real finishing committer, not the duration of its work.
 expect(finishDeconstruction(world,p,job)).toBe(true);
 expect(world.structures).not.toContain(original);expect(world.jobs).not.toContain(job);
 expect(wasShipRootDestroyed298(world,proof)).toBe(true);
 releaseShipRootDestruction298(proof);expect(wasShipRootDestroyed298(world,proof)).toBe(false);
});
