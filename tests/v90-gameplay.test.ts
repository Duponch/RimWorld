import { expect,test } from 'vitest';
import { createScenarioWorld } from '../src/sim/new-game.ts';
import { complexFurnitureUnlocked } from '../src/sim/research.ts';
import { createFlowerPotState } from '../src/sim/flower-pot.ts';
import { nearbyGround } from '../src/sim/ground-placement.ts';
import { addMaterial } from '../src/sim/materials.ts';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index.ts';
import type { MaterialPile,World } from '../src/sim/types.ts';
import { equipmentCamp } from './scenarios/equipment.ts';
import { advanceWorldApparelWear } from '../src/sim/apparel-system.ts';
import { comfortableTemperature,apparelInsulation } from '../src/sim/heat-rules.ts';

const valid=(world:World)=>expect(validateWorld(world),JSON.stringify({tick:world.tick,pawns:world.pawns,piles:world.piles,jobs:world.jobs})).toEqual([]);
function until(world:World,predicate:()=>boolean,limit=2_000):void {
  for(let i=0;i<limit&&!predicate();i++)stepWorld(world);
  expect(predicate(),JSON.stringify({tick:world.tick,pawn:world.pawns[0],jobs:world.jobs,structures:world.structures.filter(s=>s.kind==='flower-pot')})).toBe(true);valid(world);
}
function untilEqual(a:World,b:World,predicate:()=>boolean,limit=2_000):void {
  for(let i=0;i<limit&&!predicate();i++){
    stepWorld(a);stepWorld(b);
    expect(serializeWorld(b)).toBe(serializeWorld(a));
  }
  expect(predicate()).toBe(true);valid(a);valid(b);
}
const addApparel=(world:World,item:MaterialPile['item'],owner:MaterialPile['owner']):MaterialPile=>{
  addMaterial(world,'apparel',1,owner,item);
  return world.piles.at(-1)!;
};

test('Crashlanded V90 starts at revision 5 with complex furniture genuinely known',()=>{
  const world=createScenarioWorld(0x90cafe,32,'crashlanded');
  expect(world.scenario).toMatchObject({id:'crashlanded',revision:5});
  expect(complexFurnitureUnlocked(world)).toBe(true);
  expect(world.research?.complexFurniture).toMatchObject({completedAt:0});
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  valid(world);
});

test('maintained apparel uses physical remove and wear work, resumes exactly, and respects a later manual forced choice',()=>{
  const world=equipmentCamp(1),pawn=world.pawns[0]!;
  world.piles=[];pawn.hunger=100;pawn.rest=100;pawn.recreation.level=100;
  const worn=addApparel(world,'cloth-shirt',{type:'apparel',pawnId:pawn.id});
  worn.apparel!.hitPoints=20;
  const replacement=addApparel(world,'light-leather-shirt',{type:'ground',x:pawn.x+1,z:pawn.z});
  expect(applyCommand(world,{type:'stockpile',x:pawn.x+1,z:pawn.z,enabled:true,filters:{wood:false,food:false,apparel:true}}).ok).toBe(true);
  expect(applyCommand(world,{type:'apparel-policy-assign',pawnId:pawn.id,policyId:2,automatic:true}).ok).toBe(true);

  until(world,()=>pawn.equipmentTask?.automatic===true&&pawn.equipmentTask.action==='remove'&&pawn.equipmentTask.progress>=2);
  const resumed=deserializeWorld(serializeWorld(world)),resumedPawn=resumed.pawns[0]!;
  untilEqual(world,resumed,()=>worn.owner.type==='ground'&&resumed.piles.find(p=>p.id===worn.id)?.owner.type==='ground');
  expect(worn.apparel!.forbidden).toBe(true);

  for(const target of [world,resumed])expect(applyCommand(target,{type:'apparel-policy-assign',pawnId:pawn.id,policyId:2,automatic:true}).ok).toBe(true);
  untilEqual(world,resumed,()=>replacement.owner.type==='apparel'&&resumed.piles.find(p=>p.id===replacement.id)?.owner.type==='apparel');
  expect(replacement.owner).toEqual({type:'apparel',pawnId:pawn.id});
  expect(replacement.apparel!.forced).toBeUndefined();

  const manualCell=nearbyGround(world,pawn).find(cell=>!world.piles.some(p=>p.owner.type==='ground'&&p.owner.x===cell.x&&p.owner.z===cell.z));
  expect(manualCell).toBeDefined();
  const manual=addApparel(world,'cloth-shirt',{type:'ground',...manualCell!});
  expect(applyCommand(world,{type:'order-equipment',pawnId:pawn.id,itemId:manual.id,action:'wear',queue:false}).ok).toBe(true);
  until(world,()=>manual.owner.type==='apparel');
  expect(manual.apparel!.forced).toBe(true);
  manual.apparel!.hitPoints=1;
  expect(applyCommand(world,{type:'apparel-policy-assign',pawnId:pawn.id,policyId:2,automatic:true}).ok).toBe(true);
  stepWorld(world);
  expect(manual.owner).toEqual({type:'apparel',pawnId:pawn.id});
  expect(pawn.equipmentTask).toBeUndefined();
  valid(world);
});

test('daily wear destroys only the exhausted worn identity and never duplicates the stored garment',()=>{
  const base=equipmentCamp(1),pawn=base.pawns[0]!;
  base.piles=[];pawn.apparelAutomation=false;
  const doomed=addApparel(base,'cloth-shirt',{type:'apparel',pawnId:pawn.id});doomed.apparel!.hitPoints=1;
  const stored=addApparel(base,'cloth-shirt',{type:'ground',x:pawn.x+1,z:pawn.z});
  let destroyed:World|undefined;
  for(let rng=0;rng<64&&!destroyed;rng++){
    const attempt=structuredClone(base);attempt.apparelWear={nextWearAt:attempt.tick+1,rng};stepWorld(attempt);
    if(!attempt.piles.some(p=>p.id===doomed.id))destroyed=attempt;
  }
  expect(destroyed).toBeDefined();
  expect(destroyed!.piles.filter(p=>p.kind==='apparel').map(p=>p.id)).toEqual([stored.id]);
  expect(destroyed!.piles.find(p=>p.id===stored.id)?.owner).toEqual(stored.owner);
  expect(deserializeWorld(serializeWorld(destroyed!))).toEqual(destroyed);
  valid(destroyed!);
});

test('new apparel changes thermal limits, preserves legacy insulation and stops daily wear after death',()=>{
  const world=equipmentCamp(1),pawn=world.pawns[0]!;world.piles=[];
  const parka=addApparel(world,'cloth-parka',{type:'apparel',pawnId:pawn.id});
  expect(comfortableTemperature(world,pawn)).toMatchObject({min:-20,max:26});
  parka.apparel!.quality='legendary';
  expect(apparelInsulation(parka)).toEqual({cold:64.8,heat:0});
  const vest=addApparel(world,'flak-vest',{type:'apparel',pawnId:pawn.id});
  expect(apparelInsulation(vest)).toEqual({cold:1,heat:0});
  const shirt=addApparel(world,'cloth-shirt',{type:'ground',x:pawn.x+1,z:pawn.z});
  shirt.apparel!.quality='legendary';expect(apparelInsulation(shirt).heat).toBeCloseTo(3.24);
  pawn.state='dead';
  const before=structuredClone(world.piles);
  world.apparelWear={nextWearAt:world.tick,rng:42};advanceWorldApparelWear(world);
  expect(world.piles).toEqual(before);
  expect(applyCommand(world,{type:'apparel-policy-assign',pawnId:pawn.id,policyId:1,automatic:true}).ok).toBe(false);
});

test('a flower pot is sown and a dead daylily is cut through ordinary Grow jobs',()=>{
  const world=equipmentCamp(1),pawn=world.pawns[0]!;
  world.piles=[];pawn.hunger=100;pawn.rest=100;pawn.recreation.level=100;pawn.priorities.grow=1;
  const pot={id:world.nextId++,kind:'flower-pot' as const,x:pawn.x+1,z:pawn.z,orientation:0 as const,footprint:'standard' as const,material:'wood' as const,quality:'normal' as const,flower:createFlowerPotState()};
  world.structures.push(pot);valid(world);

  until(world,()=>!!pot.flower?.plant);
  expect(world.jobs.some(job=>job.flowerPotId===pot.id)).toBe(false);
  expect(pot.flower!.plant!.sownAt).toBeGreaterThan(3000);

  pot.flower={...pot.flower!,plant:{...pot.flower!.plant!,hitPoints:0,lastTick:world.tick}};
  until(world,()=>pot.flower?.plant===undefined);
  expect(world.jobs.some(job=>job.flowerPotId===pot.id)).toBe(false);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  valid(world);
});
