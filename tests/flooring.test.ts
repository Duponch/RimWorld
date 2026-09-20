import { expect,test } from 'vitest';
import { cleanlinessCamp } from './scenarios/cleanliness';
import { applyCommand,stepWorld,validateWorld,serializeWorld,deserializeWorld,addGroundMaterial,refreshStock } from '../src/sim/index';
import { FLOOR_KINDS,FLOOR_DEFINITIONS,removeFloor,burnFloor } from '../src/sim/flooring';
import { constructionRecipe } from '../src/sim/construction-materials';
import { frameAt } from '../src/sim/construction-costs';
import { canStandAt,navigationCosts,terrainTravelDelay } from '../src/sim/furniture-travel';
import { scheduleGrowing,growingJobValid } from '../src/sim/farming';
import { addFilth } from '../src/sim/filth';
import { ensureFireState } from '../src/sim/fire-rules';
import { validateFlooring } from '../src/sim/flooring-save';
import { startFire,advanceFires } from '../src/sim/fire';
import { reconcileTemperature } from '../src/sim/temperature';
import type { World,Job } from '../src/sim/types';
function until(w:World,predicate:()=>boolean,limit=800){for(let i=0;i<limit&&!predicate();i++)stepWorld(w);expect(predicate(),JSON.stringify({tick:w.tick,jobs:w.jobs,p:w.pawns.map(p=>({state:p.state,job:p.jobId,haul:p.haul}))})).toBe(true);expect(validateWorld(w)).toEqual([]);}
function removal(w:World,x:number,z:number):Job {return {id:w.nextId++,kind:'remove-floor',floor:w.tiles[z*w.width+x]!.floor,x,z,orientation:0,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}};}

test('seven recipes have independent material/work/skill requirements and real research gates',()=>{
  const w=cleanlinessCamp();
  expect(FLOOR_KINDS).toHaveLength(7);
  for(const floor of FLOOR_KINDS){const d=FLOOR_DEFINITIONS[floor],recipe=constructionRecipe({kind:'lay-floor',floor});expect(recipe.ingredients).toEqual([{item:d.item,quantity:floor==='wood-planks'?3:floor==='steel-tile'?7:4}]);expect(recipe.coreWork).toBe(floor==='wood-planks'?85:floor==='steel-tile'?800:1100);}
  expect(applyCommand(w,{type:'designate',kind:'lay-floor',floor:'granite-tile',x:20,z:20}).ok).toBe(false);
  expect(applyCommand(w,{type:'designate',kind:'lay-floor',floor:'steel-tile',x:20,z:20}).ok).toBe(false);
  expect(applyCommand(w,{type:'designate',kind:'lay-floor',floor:'wood-planks',x:20,z:20}).ok).toBe(true);
  expect(applyCommand(w,{type:'designate',kind:'lay-floor',floor:'wood-planks',material:'wood',x:21,z:20}).ok).toBe(false);
  expect(constructionRecipe({kind:'grave'})).toEqual({ingredients:[],work:80,coreWork:800});
  expect(applyCommand(w,{type:'designate',kind:'grave',x:23,z:20}).ok).toBe(true);
  expect(applyCommand(w,{type:'designate',kind:'lay-floor',floor:'wood-planks',x:23,z:21}).ok).toBe(false);
});

test('wood floor uses physical deliveries, preserves a food pile and zone, and saves exactly through frame and removal',()=>{
  const w=cleanlinessCamp(),p=w.pawns[0]!,target={x:p.x+3,z:p.z};p.priorities.clean=0;p.priorities.build=1;
  addGroundMaterial(w,'wood',3,{x:p.x-1,z:p.z},'wood');addGroundMaterial(w,'food',7,target,'rice');const rice=w.piles.find(p=>p.item==='rice')!.id;
  expect(applyCommand(w,{type:'area',action:'growing',from:target,to:target}).ok).toBe(true);const zone=w.growingZones[0]!.id;
  expect(applyCommand(w,{type:'designate',kind:'lay-floor',floor:'wood-planks',...target}).ok).toBe(true);
  until(w,()=>w.jobs.some(j=>j.kind==='lay-floor'&&j.construction==='frame'));
  expect(frameAt(w,target)).toBe(false);expect(canStandAt(w,target)).toBe(true);
  const saved=deserializeWorld(serializeWorld(w)),at=w.tick;
  until(w,()=>w.tiles[target.z*w.width+target.x]!.floor==='wood-planks');stepWorld(saved,w.tick-at);expect(saved).toEqual(w);
  expect(w.piles.find(p=>p.id===rice)).toMatchObject({quantity:7,owner:{type:'ground',...target}});expect(w.stock.wood).toBe(0);
  expect(w.growingZones.find(z=>z.id===zone)?.cells).toContain(target.z*w.width+target.x);
  scheduleGrowing(w);expect(w.jobs.some(j=>j.kind==='sow'&&j.x===target.x&&j.z===target.z)).toBe(false);
  expect(growingJobValid(w,{...removal(w,target.x,target.z),kind:'sow',floor:undefined,growingZoneId:zone})).toBe(false);
  expect(terrainTravelDelay(w,target.z*w.width+target.x)).toBe(0);
  expect(applyCommand(w,{type:'designate',kind:'remove-floor',...target}).ok).toBe(true);until(w,()=>!w.tiles[target.z*w.width+target.x]!.floor);
  expect(w.tiles[target.z*w.width+target.x]!.terrain).toBe('grass');expect(w.stock.wood+w.deconstructed.lostWood).toBe(3);expect(w.deconstructed.count).toBe(1);
});

test('floor removal preflights saturation and reservations before terrain, ledgers or RNG; successful removal clears only local traces',()=>{
  const w=cleanlinessCamp(),target={x:16,z:16};w.tiles[target.z*w.width+target.x]!.floor='wood-planks';const job=removal(w,target.x,target.z);w.jobs.push(job);
  for(let z=4;z<=28;z++)for(let x=4;x<=28;x++)addGroundMaterial(w,'wood',75,{x,z},'wood');refreshStock(w);
  const before=serializeWorld(w);expect(removeFloor(w,job)).toBe(false);expect(serializeWorld(w)).toBe(before);
  const pile=w.piles.find(p=>p.owner.type==='ground'&&p.owner.x===16&&p.owner.z===16)!;pile.quantity=73;refreshStock(w);
  addFilth(w,target,'blood');addFilth(w,{x:17,z:16},'blood');const remote=w.filth!.items.find(f=>f.x===17)!.id;
  expect(removeFloor(w,job)).toBe(true);w.jobs=[];expect(w.filth!.items.map(f=>f.id)).toEqual([remote]);expect(w.tiles[target.z*w.width+target.x]!.floor).toBeUndefined();expect(validateWorld(w)).toEqual([]);
});

test('burned planks cannot refund wood twice, have distinct passage and remain a strict optional terrain layer',()=>{
  const w=cleanlinessCamp(),cell={x:18,z:18},index=cell.z*w.width+cell.x;w.tiles[index]!.floor='wood-planks';ensureFireState(w);
  expect(burnFloor(w,cell)).toBe(true);expect(burnFloor(w,cell)).toBe(false);expect(w.fires!.ledger.items.wood).toBe(3);
  expect(terrainTravelDelay(w,index)).toBe(.1);expect(navigationCosts(w).floors.get(index)).toBe(33);
  const job=removal(w,cell.x,cell.z),rng=w.rng;expect(removeFloor(w,job)).toBe(true);expect(w.piles).toHaveLength(0);expect(w.rng).toBe(rng);expect(w.deconstructed.lostWood).toBe(0);
  w.tiles[index]!.floor='steel-tile';expect(validateFlooring(w,88)).toContain('Invalid constructed floor.');w.tiles[index]!.terrain='water';expect(validateFlooring(w,89)).toContain('Invalid constructed floor.');
});

test('a ground fire really uses wooden flooring as fuel and only burns its layer at the 7500-Core boundary',()=>{
  const w=cleanlinessCamp();w.pawns=[];const cell={x:18,z:18},index=cell.z*w.width+cell.x;w.tiles[index]!.floor='wood-planks';
  expect(startFire(w,cell,.6)).toBe(true);
  for(let n=0;n<749;n++){w.tick++;advanceFires(w,{rainRate:0},reconcileTemperature(w));}
  expect(w.tiles[index]!.floor).toBe('wood-planks');expect(w.fires!.ledger.items.wood??0).toBe(0);
  w.tick++;advanceFires(w,{rainRate:0},reconcileTemperature(w));expect(w.tiles[index]!.floor).toBe('burned-wood');expect(w.fires!.ledger.items.wood).toBe(3);
});
