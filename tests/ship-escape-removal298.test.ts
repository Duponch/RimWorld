import {expect,test} from 'vitest';
import {applyCommand} from '../src/sim/engine.ts';
import {effectiveCore297} from '../src/sim/core-phase-297.ts';
import {initialWorldRegistry,registeredMap,registeredMapForValidation,isActualMapMutationContext298} from '../src/sim/world-map-context.ts';
import {newShipCasketHolder277,type ShipCasket277} from '../src/sim/ship-casket-state-277.ts';
import {reconcileRepairs} from '../src/sim/repairs.ts';
import {refreshStock} from '../src/sim/materials.ts';
import {prepareShipPhysicalRemoval298} from '../src/sim/ship-escape-removal-298.ts';
import {declaredFixture} from './helpers/declared-ship-content298.ts';
import type {Structure,World} from '../src/sim/types.ts';

/* Finite32² Source10 engineering fixture, followed by EXPLICITLY DECLARED
 * installed parts and an optional occupied holder. Neither construction nor
 * capture/acquisition, launch permission, a complete archive/Whole or Native
 * departure is claimed. The actual service transaction is exercised against
 * these same originals, including the real registered-map view/body route. */
function scene(cached=false,occupied=false){
 const owner=declaredFixture();expect(owner.schemaVersion).toBe(298);
 const kinds=['ship-beam','ship-engine','ship-reactor','ship-computer','ship-sensors','ship-cryptosleep-casket'] as const;
 const parts:Structure[]=kinds.map((kind,i)=>({id:owner.nextId++,kind,x:10+(i%3)*4,z:10+Math.floor(i/3)*8,orientation:0,footprint:'standard',material:'steel',power:{on:kind==='ship-reactor',parentId:null},
  ...kind==='ship-cryptosleep-casket'?{shipCryptosleep277:newShipCasketHolder277(owner.tick)}:{}}));
 const casket=parts[5] as ShipCasket277;
 if(occupied){
  const original=owner.pawns[0]!,item=owner.piles.find(p=>p.item==='survival-meal')!;expect(item).toBeDefined();
  original.bedId=null;delete original.bedSlot;original.shipCryptosleepHeldAt277=owner.tick;
  casket.shipCryptosleep277={revision:1,heldAt:owner.tick,heldAtCore297:effectiveCore297(owner),occupant:{kind:'human',pawn:original},items:[item],packed:[]};
  item.owner={type:'inventory',pawnId:original.id};owner.pawns=owner.pawns.filter(p=>p!==original);owner.piles=owner.piles.filter(p=>p!==item);
 }
 const lamp:Structure={id:owner.nextId++,kind:'standing-lamp',x:23,z:18,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:casket.id}};
 owner.structures.push(...parts,lamp);owner.roofing={constructed:[1],build:[],remove:[],cursor:0};refreshStock(owner);
 initialWorldRegistry(owner);const world=cached?registeredMap(owner,0)!:owner;
 expect(isActualMapMutationContext298(owner,world)).toBe(true);return {owner,world,parts,casket,lamp};
}
const quantities=(w:World)=>Object.fromEntries([...new Set(w.piles.map(p=>p.item))].sort().map(item=>[item,w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0)]));

test('real view/body adoption removes exactly the six selected originals, preserves held payload and roof and reconciles remaining power once',()=>{
 const {owner,world,parts,casket,lamp}=scene(true,true),holder=casket.shipCryptosleep277,occupant=holder.occupant,heldItem=holder.items[0]!,roof=world.roofing;
 const contents=JSON.stringify(parts),held=JSON.stringify(holder),before=JSON.stringify(owner),rng=owner.rng,id=owner.nextId,core=effectiveCore297(owner),piles=[...owner.piles];
 const plan=prepareShipPhysicalRemoval298(owner,world,parts,core);expect(plan.ok).toBe(true);if(!plan.ok)throw Error(plan.reason);
 expect(JSON.stringify(owner)).toBe(before);expect(JSON.stringify(parts)).toBe(contents);expect(plan.current()).toBe(true);
 // Presentation choice does not change this actual map's mutation authority.
 owner.worldMaps!.selectedMapId=null;expect(plan.current()).toBe(true);
 expect(plan.adopt()).toBe(true);expect(plan.current()).toBe(false);expect(plan.adopt()).toBe(false);
 for(const part of parts){expect(world.structures).not.toContain(part);expect(owner.structures).not.toContain(part);}
 expect(world.structures).toBe(owner.structures);expect(owner.structures).toContain(lamp);expect(lamp.power).toEqual({on:false,parentId:null});
 expect(world.roofing).toEqual(roof);expect(owner.roofing).toEqual(roof);expect(casket.shipCryptosleep277).toBe(holder);expect(holder.occupant).toBe(occupant);expect(holder.items[0]).toBe(heldItem);
 expect(JSON.stringify(holder)).toBe(held);expect(JSON.stringify(parts)).toBe(contents);for(const p of piles)expect(owner.piles).toContain(p);
 expect(owner.rng).toBe(rng);expect(owner.nextId).toBe(id);expect(effectiveCore297(owner)).toBe(core);
});

test('canonical context, immutable recipient and phase-only stale refusals leave every actual source untouched',()=>{
 const first=scene(),before=JSON.stringify(first.owner),core=effectiveCore297(first.owner);
 expect(prepareShipPhysicalRemoval298(first.owner,{...first.world},first.parts,core).ok).toBe(false);
 const validation=registeredMapForValidation(first.owner,0)!;expect(isActualMapMutationContext298(first.owner,validation)).toBe(false);
 expect(prepareShipPhysicalRemoval298(first.owner,validation,first.parts,core).ok).toBe(false);
 expect(prepareShipPhysicalRemoval298(first.owner,first.world,[{...first.parts[0]!}],core).ok).toBe(false);expect(JSON.stringify(first.owner)).toBe(before);
 const immutable=scene();Object.defineProperty(immutable.world,'structures',{value:immutable.world.structures,enumerable:true,writable:false,configurable:false});
 const frozenBefore=JSON.stringify(immutable.owner);expect(prepareShipPhysicalRemoval298(immutable.owner,immutable.world,immutable.parts,effectiveCore297(immutable.owner)).ok).toBe(false);expect(JSON.stringify(immutable.owner)).toBe(frozenBefore);
 const stale=scene(),plan=prepareShipPhysicalRemoval298(stale.owner,stale.world,stale.parts,effectiveCore297(stale.owner));expect(plan.ok).toBe(true);if(!plan.ok)throw Error(plan.reason);
 stale.owner.phaseCore297=1; // Explicit stale-frontier diagnostic, NOT a played Core or admitted save.
 const afterFault=JSON.stringify(stale.owner);expect(plan.current()).toBe(false);expect(plan.adopt()).toBe(false);expect(JSON.stringify(stale.owner)).toBe(afterFault);
 for(const part of stale.parts)expect(stale.owner.structures).toContain(part);
});

test('an ordinary repair job and declared finite cargo retire through the real transaction without cancelling unrelated queued work or losing identities',()=>{
 const {owner,world,parts}=scene(),worker=world.pawns[0]!,target=parts[0]!;
 target.damage=1;world.home=[target.z*world.width+target.x];reconcileRepairs(world);
 const job=world.jobs.find(j=>j.repair?.structureId===target.id)!;expect(job).toBeDefined();
 expect(applyCommand(world,{type:'designate',kind:'wall',x:4,z:4}).ok).toBe(true);const kept=world.jobs.find(j=>j.kind==='wall')!;expect(kept).toBeDefined();
 // The job was produced normally. These worker/cargo associations alone are
 // declared diagnostic inputs; no time, hauling trip or repair is credited.
 const delivered=world.piles.find(p=>p.item==='steel')!,carried=world.piles.find(p=>p.item==='gold')!;expect(delivered).toBeDefined();expect(carried).toBeDefined();
 delivered.owner={type:'job',jobId:job.id};carried.owner={type:'pawn',pawnId:worker.id};
 worker.jobId=job.id;worker.state='working';worker.orders.active=job.id;worker.orders.queue=[job.id,kept.id];
 worker.haul={sourcePileId:carried.id,carryPileId:carried.id,quantity:carried.quantity,phase:'deliver',destination:{type:'job',jobId:job.id}};job.reservedBy=worker.id;job.status='active';refreshStock(world);
 const totals=quantities(world),cargoIds=[delivered.id,carried.id],skills=JSON.stringify(worker.skills),rng=world.rng,id=world.nextId,core=effectiveCore297(world),before=JSON.stringify(owner),keptBefore=JSON.stringify(kept);
 const plan=prepareShipPhysicalRemoval298(owner,world,parts,core);expect(plan.ok).toBe(true);if(!plan.ok)throw Error(plan.reason);expect(JSON.stringify(owner)).toBe(before);
 expect(plan.adopt()).toBe(true);expect(world.pawns[0]).toBe(worker);expect(world.jobs).not.toContain(job);expect(world.jobs).toContain(kept);expect(JSON.stringify(kept)).toBe(keptBefore);
 expect(worker.jobId).toBeNull();expect(worker.haul).toBeNull();expect(worker.orders.queue).toEqual([kept.id]);
 expect(world.piles.find(p=>p.id===cargoIds[0])).toBe(delivered);expect(world.piles.find(p=>p.id===cargoIds[1])).toBe(carried);expect(delivered.owner.type).toBe('ground');expect(carried.owner.type).toBe('ground');
 expect(quantities(world)).toEqual(totals);expect(JSON.stringify(worker.skills)).toBe(skills);expect(world.rng).toBe(rng);expect(world.nextId).toBe(id);expect(effectiveCore297(world)).toBe(core);
});
