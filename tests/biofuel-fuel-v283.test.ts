import { expect,test } from 'vitest';
import { biofuelCamp } from './helpers/biofuel-v283.ts';
import { addGroundMaterial,refreshStock } from '../src/sim/materials.ts';
import { burnFuel,fuelCapacity,fuelItem,fuelLimit,newBuildingFuel,FUEL_UNIT_TICKS } from '../src/sim/fuel.ts';
import { advancePower,reconcilePower } from '../src/sim/power.ts';
import { powerWatts } from '../src/sim/power-rules.ts';
import { planServiceHaul } from '../src/sim/player-service-hauling.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots.ts';
import { lightSources } from '../src/sim/light-sources.ts';
import { releaseWork } from '../src/sim/work-release.ts';
import type { World } from '../src/sim/types.ts';
const camp=()=>{const f=biofuelCamp();refreshStock(f.world);return {...f,w:f.world,p:f.world.pawns[0]!,g:f.world.structures.find(s=>s.id===f.generatorId)!};};
function until(w:World,done:()=>boolean,limit=900){for(let i=0;i<limit&&!done();i++)stepWorld(w);expect(done()).toBe(true);expect(validateWorld(w)).toEqual([]);}

test('a6000-tick local day burns exactly4.5chemfuel, retaining fractional reserve across a strict checkpoint',()=>{
  const {w,g}=camp();g.fuel!.ticks=18000;
  for(let i=0;i<13;i++){w.tick++;burnFuel(w);}
  expect(g.fuel).toMatchObject({ticks:17995,burned:5,burnRemainder:17});
  const peer=deserializeWorld(serializeWorld(w));
  for(let i=13;i<6000;i++){w.tick++;peer.tick++;burnFuel(w);burnFuel(peer);}
  expect(g.fuel).toEqual({ticks:15300,burned:2700,burnRemainder:0,autoRefuel:true});expect(peer).toEqual(w);
  expect(fuelLimit('chemfuel-generator')).toBe(30*FUEL_UNIT_TICKS);expect(newBuildingFuel('chemfuel-generator').ticks).toBe(0);
});

test('empty generator sheds its real network; a physical refill restarts1000W with the blue Coreglower',()=>{
  const {w,p,g}=camp();w.structures=w.structures.filter(s=>s.kind!=='wood-generator');g.fuel!.ticks=1;g.power!.on=true;g.fuel!.autoRefuel=false;
  reconcilePower(w);expect(powerWatts(g,w)).toBe(1000);expect(lightSources(w).find(l=>l.cell===g.z*w.width+g.x)).toMatchObject({radius:6,red:80,green:112,blue:180});
  for(let i=0;i<3;i++){w.tick++;burnFuel(w);advancePower(w);}
  expect(g.fuel!.ticks).toBe(0);expect(g.power!.on).toBe(false);expect(powerWatts(g,w)).toBe(0);
  addGroundMaterial(w,'chemfuel',10,{x:17,z:13},'chemfuel');
  expect(applyCommand(w,{type:'order-haul',pawnId:p.id,target:{type:'fuel',structureId:g.id},queue:false}).ok).toBe(true);
  until(w,()=>g.fuel!.ticks>0&&g.power!.on);
  expect(g.fuel!.ticks+g.fuel!.burned).toBe(6001);expect(w.piles.some(s=>s.item==='chemfuel')).toBe(false);
});

test('correct fuel, whole-item capacity and exclusive station claims apply to forced and automatic refuels',()=>{
  const {w,p,g}=camp();addGroundMaterial(w,'wood',70,{x:10,z:13},'wood');
  expect(fuelItem(g.kind)).toBe('chemfuel');expect(planServiceHaul(w,p,{type:'fuel',structureId:g.id}).task).toBeUndefined();
  addGroundMaterial(w,'chemfuel',10,{x:17,z:13},'chemfuel');
  expect(planServiceHaul(w,p,{type:'fuel',structureId:g.id}).task?.quantity).toBe(10);
  g.fuel!.ticks=fuelLimit(g.kind)-599;expect(fuelCapacity(w,g.id,undefined,true)).toBe(0);
  g.fuel!.ticks=0;expect(applyCommand(w,{type:'order-haul',pawnId:p.id,target:{type:'fuel',structureId:g.id},queue:false}).ok).toBe(true);
  expect(planServiceHaul(w,w.pawns[1]!,{type:'fuel',structureId:g.id}).task).toBeUndefined();
});

test('native transport ownership and interaction progress resume exactly; interruption preserves physicalchemfuel',()=>{
  const {w,p,g}=camp();w.pawns[1]!.priorities.haul=0;g.fuel!.autoRefuel=false;
  addGroundMaterial(w,'chemfuel',10,{x:12,z:15},'chemfuel');
  expect(applyCommand(w,{type:'order-haul',pawnId:p.id,target:{type:'fuel',structureId:g.id},queue:false}).ok).toBe(true);
  until(w,()=>p.haul?.phase==='deliver');
  const carry=w.piles.find(pile=>pile.owner.type==='pawn'&&pile.owner.pawnId===p.id)!;expect(carry.item).toBe('chemfuel');
  const peer=deserializeWorld(serializeWorld(w));const held=structuredClone(w);releaseWork(held,held.pawns[0]!);
  expect(held.piles.filter(pile=>pile.item==='chemfuel').reduce((n,pile)=>n+pile.quantity,0)).toBe(10);
  until(w,()=>!!p.haul?.serviceProgress);stepWorld(peer,w.tick-peer.tick);expect(peer).toEqual(w);
  const decoder=new SnapshotDecoder();expect(decoder.adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)))).toMatchObject({status:'applied',world:w});
  const contact=deserializeWorld(serializeWorld(w));until(w,()=>g.fuel!.ticks>0);stepWorld(contact,w.tick-contact.tick);expect(contact).toEqual(w);
  expect(g.fuel!.ticks+g.fuel!.burned).toBe(6000);expect(w.piles.some(pile=>pile.item==='chemfuel')).toBe(false);
});

test('switch and breakdown pause chemical fuel without rewriting the historicalwood generator rate',()=>{
  const {w,g}=camp(),wood=w.structures.find(s=>s.kind==='wood-generator')!;g.fuel!.ticks=18000;g.power!.switchOn=false;
  for(let i=0;i<20;i++){w.tick++;burnFuel(w);}expect(g.fuel!.burned).toBe(0);expect(wood.fuel!.burned).toBe(44);
  g.power!.switchOn=true;g.breakdown={brokenAt:w.tick};
  for(let i=0;i<20;i++){w.tick++;burnFuel(w);}expect(g.fuel!.burned).toBe(0);
  delete g.breakdown;for(let i=0;i<20;i++){w.tick++;burnFuel(w);}expect(g.fuel!.burned).toBe(9);
});
