import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotValidationContext} from '../src/bridge/snapshots.ts';
import {PowerParentValidationCache,type PowerParentIndex} from '../src/sim/power-parent-validation.ts';
import {createOwnedValidationGeometry} from '../src/sim/owned-validation-geometry.ts';
import {validateCooking,validBiofuelProductionTransport} from '../src/sim/cooking-save.ts';
import {groundCapacity} from '../src/sim/ground-placement.ts';
import {applyCommand} from '../src/sim/index.ts';
import {addGroundMaterial} from '../src/sim/materials.ts';
import {planCookingOrder} from '../src/sim/player-cooking.ts';
import type {CookingOrder} from '../src/sim/order-types.ts';
import type {World} from '../src/sim/types.ts';
import {biofuelCamp} from './helpers/biofuel-v283.ts';

// Differential query fixture only: the real MAIN ownership boundary is checked
// separately with its native Worker/client and fixed consumers.
class QueryDecoder extends SnapshotDecoder {
  protected override createValidationContext(next:World):SnapshotValidationContext {
    const raw=new PowerParentValidationCache();let parents:PowerParentIndex|undefined;
    return {powerParents:{read(world){return world===next?parents??=raw.read(world):raw.read(world);}},geometry:createOwnedValidationGeometry(next)};
  }
}
function preparedTask(){
  const {world:w,refineryId}=biofuelCamp(),p=w.pawns[0]!;
  for(const pawn of w.pawns)pawn.priorities.haul=0;
  p.priorities.craft=1;addGroundMaterial(w,'wood',70,{x:8,z:11},'wood');
  expect(applyCommand(w,{type:'bill-add',structureId:refineryId,recipe:'chemfuel-from-wood'}).ok).toBe(true);
  w.structures.find(s=>s.id===refineryId)!.bills![0]!.destination='drop';
  const order=planCookingOrder(w,p,refineryId).order as CookingOrder;
  p.cooking=structuredClone(order.cooking);p.orders.active='cook';
  return {w,p,c:p.cooking};
}

test('one-adoption queries preserve checkpoint, refusal, stale and replacement with retained Worlds',()=>{
  const {world:w,startGeneratorId}=biofuelCamp(),encoder=new SnapshotEncoder(),a=new SnapshotDecoder(),b=new QueryDecoder();
  const compare=(packet:ReturnType<SnapshotEncoder['encode']>)=>{
    const left=a.adopt(structuredClone(packet)),right=b.adopt(structuredClone(packet));expect(right).toEqual(left);return right;
  };
  const first=compare(encoder.encode(w,0,6));expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('first');
  const held=structuredClone(first.world);
  w.tick++;const good=structuredClone(encoder.encode(w,0,6)),bad=structuredClone(good);
  bad.world.structures=bad.world.structures.filter(s=>s.id!==startGeneratorId);
  expect(compare(bad).status).toBe('resync');expect(compare(good).status).toBe('applied');expect(compare(good).status).toBe('stale');
  const replacement=structuredClone(w),checkpoint=structuredClone(encoder.encode(replacement,0,6)),invalid=structuredClone(checkpoint);
  Object.assign(invalid.world.structures.find(s=>s.id===startGeneratorId)!,{x:31,z:31});
  expect(compare(invalid).status).toBe('resync');expect(compare(checkpoint).status).toBe('applied');expect(first.world).toEqual(held);
});

test('shared geometry preserves per-portion errors, quotas and original first refusals',()=>{
  const {w,c}=preparedTask();
  const compare=()=>{
    const historical=validateCooking(w,w.schemaVersion,new Set(),true,true);
    expect(validateCooking(w,w.schemaVersion,new Set(),true,true,createOwnedValidationGeometry(w))).toEqual(historical);
    expect(validBiofuelProductionTransport(w,w.schemaVersion,true,true,createOwnedValidationGeometry(w))).toBe(validBiofuelProductionTransport(w,w.schemaVersion,true,true));
    return historical;
  };
  expect(compare()).toEqual([]);
  w.resources.push({id:w.nextId++,kind:'tree',amount:25,...c.ingredients[0]!.cell});expect(compare().length).toBeGreaterThan(0);
  w.resources=[];w.piles.find(p=>p.id===c.ingredients[0]!.pileId)!.quantity=69;
  expect(compare().filter(e=>e==='Invalid ground ingredient reservation.')).toHaveLength(7);
});

test('capacity remains live for queued claims, foreign items and changed quantities',()=>{
  const {w,p,c}=preparedTask(),cell=c.ingredients[0]!.cell,reader=createOwnedValidationGeometry(w);
  const compare=()=>{const value=groundCapacity(w,cell,'wood',p.id);expect(groundCapacity(w,cell,'wood',p.id,reader)).toBe(value);return value;};
  const free=compare();
  const queued={type:'cook',cooking:structuredClone(c)} as CookingOrder;
  w.pawns[1]!.orders.queue.push(queued);expect(compare()).toBeLessThan(free);
  w.pawns[1]!.orders.queue=[];
  // Direct fixture: normal placement would move steel away from the existing
  // cooking reservation, which would not exercise this refusal boundary.
  const pile={id:w.nextId++,item:'steel' as const,kind:'steel' as const,quantity:1,owner:{type:'ground' as const,...cell}};
  w.piles.push(pile);expect(compare()).toBe(0);
  w.piles.pop();w.piles.push({...pile,item:'wood',kind:'wood',quantity:10});expect(compare()).toBe(free-10);
});
