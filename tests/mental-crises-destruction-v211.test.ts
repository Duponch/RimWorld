import { expect,test } from 'vitest';
import { damageStructure,structureMaxHp } from '../src/sim/thing-damage.ts';
import { ensureFireState } from '../src/sim/fire-rules.ts';
import { damageBarrier } from '../src/sim/barriers.ts';
import { newBuildingFuel } from '../src/sim/fuel.ts';
import { newPowerState } from '../src/sim/power-rules.ts';
import { addGroundMaterial } from '../src/sim/materials.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { BATTERIES_RESEARCH_COST,selectResearch } from '../src/sim/research.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import { mentalCrisesCamp } from './helpers/mental-crises-v211.ts';
import type { Structure,World } from '../src/sim/types.ts';

const quantity=(w:World,item:string)=>w.piles.filter(i=>i.item===item).reduce((sum,i)=>sum+i.quantity,0);

test('neutral damage conserves fuel, battery halves and salvage without creating or advancing a fire ledger',()=>{
  const w=mentalCrisesCamp(1),generator:Structure=fixtureBuilding(w,'wood-generator',20,20);
  generator.material='steel';generator.power=newPowerState('wood-generator');generator.fuel={...newBuildingFuel('wood-generator'),ticks:123,burned:456};
  const fire=ensureFireState(w),before=structuredClone(fire);fire.rng=15123;before.rng=15123;
  expect(damageStructure(w,generator,1,'melee',7)).toBe(true);expect(w.rng).toBe(7);expect(w.fires).toEqual(before);expect(w.destroyed).toBeUndefined();
  expect(damageStructure(w,generator,structureMaxHp(generator),'melee',1)).toBe(true);
  expect(w.fires).toEqual(before);expect(w.destroyed).toMatchObject({count:1,fuelTicksLost:123,fuelTicksBurned:456});
  expect(quantity(w,'steel')+(w.destroyed!.lost.steel??0)).toBe(100);expect(quantity(w,'component')+(w.destroyed!.lost.component??0)).toBe(2);
  expect(selectResearch(w,null).ok).toBe(true);w.research!.batteries={points:BATTERIES_RESEARCH_COST,completedAt:w.tick};
  const battery:Structure=fixtureBuilding(w,'battery',22,20);battery.material='steel';battery.power=newPowerState('battery');battery.battery={stored:7,half:true};
  expect(damageStructure(w,battery,structureMaxHp(battery),'melee',1)).toBe(true);
  expect(w.destroyed).toMatchObject({count:2,fuelTicksLost:123,fuelTicksBurned:456,batteryEnergyLost:7.5});expect(w.fires).toEqual(before);
  const wall:Structure=fixtureBuilding(w,'wall',24,20);expect(damageBarrier(w,wall,1000)).toBe(true);
  expect(w.destroyed).toMatchObject({count:3,fuelTicksLost:123,fuelTicksBurned:456,batteryEnergyLost:7.5});expect(w.fires).toEqual(before);
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const absent=mentalCrisesCamp(1),stool:Structure=fixtureBuilding(absent,'stool',20,20);
  expect(damageStructure(absent,stool,structureMaxHp(stool),'melee',1)).toBe(true);expect(absent.fires).toBeUndefined();
});

test('fatal neutral refusal at full floor, identity boundary or ledger limit is an atomic no-op',()=>{
  for(const cause of ['floor','identity','ledger'] as const){
    const w=mentalCrisesCamp(1),stool:Structure=fixtureBuilding(w,'stool',20,20);ensureFireState(w);
    if(cause==='floor'){
      w.pawns=[];w.tiles.forEach(t=>t.terrain='water');w.tiles[20*w.width+20]!.terrain='grass';addGroundMaterial(w,'food',75,stool,'rice');
    }
    if(cause==='identity')w.nextId=Number.MAX_SAFE_INTEGER;
    if(cause==='ledger')w.destroyed={count:Number.MAX_SAFE_INTEGER,lost:{}};
    const before=JSON.stringify(w);expect(damageStructure(w,stool,structureMaxHp(stool),'melee',1)).toBe(false);expect(JSON.stringify(w)).toBe(before);
  }
});

test('neutral fatal damage releases its real fuel delivery and deposits cargo before recipe salvage',()=>{
  const w=mentalCrisesCamp(1),p=w.pawns[0]!;p.x=20;p.z=19;p.priorities.haul=1;
  const generator:Structure=fixtureBuilding(w,'wood-generator',20,20);generator.material='steel';generator.power=newPowerState('wood-generator');generator.fuel=newBuildingFuel('wood-generator');
  addGroundMaterial(w,'wood',10,{x:20,z:18},'wood');
  expect(applyCommand(w,{type:'order-haul',pawnId:p.id,target:{type:'fuel',structureId:generator.id},queue:false}).ok).toBe(true);
  for(let i=0;i<150&&!(p.haul?.phase==='deliver'&&p.x===20&&p.z===19);i++)stepWorld(w);
  expect(p.haul?.phase).toBe('deliver');const cargo=w.piles.find(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id)!;expect(cargo).toBeDefined();
  const held=structuredClone(cargo),motion=structuredClone(p.motion),cooldown=p.moveCooldown,fire=structuredClone(w.fires);
  const peer=deserializeWorld(serializeWorld(w)),peerTarget=peer.structures.find(s=>s.id===generator.id)!;
  expect(damageStructure(w,generator,structureMaxHp(generator),'melee',1)).toBe(true);
  expect(damageStructure(peer,peerTarget,structureMaxHp(peerTarget),'melee',1)).toBe(true);
  expect(w).toEqual(peer);expect(w.fires).toEqual(fire);expect(p.haul).toBeNull();expect(p.motion).toEqual(motion);expect(p.moveCooldown).toBe(cooldown);
  expect(w.piles.find(i=>i.id===cargo.id)).toEqual({...held,owner:{type:'ground',x:p.x,z:p.z}});
  expect(quantity(w,'steel')+(w.destroyed!.lost.steel??0)).toBe(100);expect(quantity(w,'component')+(w.destroyed!.lost.component??0)).toBe(2);expect(validateWorld(w)).toEqual([]);
});
