import { expect,test } from 'vitest';
import { applyCommand,canDesignate,stepWorld } from '../src/sim/engine.ts';
import { addMaterial,addGroundMaterial,refreshStock,transferPile } from '../src/sim/materials.ts';
import { constructionRecipe,constructionSkillRequired,deliveredMaterial,requiredMaterial,validConstructionMaterial } from '../src/sim/construction-materials.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { footprintCells } from '../src/sim/definitions.ts';
import { ITEM_DEFINITIONS,type ItemId } from '../src/sim/items.ts';
import { groundOccupancyAllows,storageOccupancyAllows } from '../src/sim/occupancy.ts';
import { constructionObstruction } from '../src/sim/construction-rules.ts';
import { canStandAt } from '../src/sim/furniture-travel.ts';
import { damageStructure } from '../src/sim/thing-damage.ts';
import { structureMaxHp } from '../src/sim/thing-damage-rules.ts';
import { finishDeconstruction } from '../src/sim/deconstruction.ts';
import { equippedWeapon } from '../src/sim/equipment-rules.ts';
import { dropIncapacitatedEquipment } from '../src/sim/equipment-state.ts';
import { advanceHumanCorpses,pawnBodyLocation } from '../src/sim/human-corpses.ts';
import { nearbyGround } from '../src/sim/ground-placement.ts';
import { deconstructionCamp } from './scenarios/deconstruction.ts';
import { equipmentCamp } from './scenarios/equipment.ts';
import { controlledInjury } from './scenarios/health.ts';
import type { Cell,Structure,World } from '../src/sim/types.ts';

const site={x:17,z:18};
function camp(){const w=deconstructionCamp(1);w.stockpiles=[];w.growingZones=[];delete w.home;w.pawns[0]!.schedule.fill('work');return w;}
function until(w:World,done:()=>boolean,limit=1800){
  for(let n=0;n<limit&&!done();n++){stepWorld(w);expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}
  expect(done(),JSON.stringify({tick:w.tick,jobs:w.jobs,pawns:w.pawns.map(p=>({id:p.id,state:p.state,job:p.jobId,haul:p.haul})),packed:w.packed})).toBe(true);
}
function exact(w:World){
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const result=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)));expect(result.status).toBe('applied');if(result.status==='applied')expect(result.world).toEqual(w);
}
function home(w:World,cell:Cell,on:boolean){expect(applyCommand(w,{type:'area',action:on?'home':'remove-home',from:cell,to:cell}).ok).toBe(true);}
function place(w:World,cell=site,material:Structure['material']='wood'){
  expect(applyCommand(w,{type:'designate',kind:'spike-trap',material,...cell,orientation:0}).ok).toBe(true);return w.jobs.at(-1)!;
}
function installed(w:World,cell=site):Structure {
  const s:Structure={id:w.nextId++,kind:'spike-trap',...cell,orientation:0,footprint:'standard',material:'wood',spikeTrap:{autoRebuild:true,touching:[]}};
  w.structures.push(s);return s;
}
const quantity=(w:World,item:ItemId)=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
const embedded=(w:World,item:ItemId)=>w.structures.reduce((n,s)=>n+requiredMaterial(s,item),0)+w.packed.reduce((n,p)=>n+requiredMaterial(p.building,item),0);

test.each([
  ['wood',224,26],['steel',320,40],['granite-blocks',1934,68],['limestone-blocks',1934,62],['marble-blocks',1774,48],['sandstone-blocks',1614,56],['slate-blocks',1934,52],
] as const)('%s spike trap requires 45 actual stuff units, Construction3 and local material work', (material,work,hp)=>{
  const recipe=constructionRecipe({kind:'spike-trap',material});expect(recipe.ingredients).toEqual([{item:material,quantity:45}]);expect(recipe.work).toBe(work);
  expect(constructionSkillRequired('spike-trap')).toBe(3);expect(validConstructionMaterial('spike-trap',material,226)).toBe(true);expect(validConstructionMaterial('spike-trap',material,225)).toBe(false);
  expect(structureMaxHp({kind:'spike-trap',material})).toBe(hp);
});

test.each(['wood','steel'] as const)('ordinary %s construction waits for the 45th unit, consumes it and replays unfinished work exactly',material=>{
  const w=camp();addGroundMaterial(w,ITEM_DEFINITIONS[material].kind,44,{x:12,z:16},material);const job=place(w,site,material);
  until(w,()=>deliveredMaterial(w,job,material)===44);stepWorld(w,20);expect(job.progress).toBe(0);expect(w.structures).toEqual([]);expect(quantity(w,material)).toBe(44);
  addGroundMaterial(w,ITEM_DEFINITIONS[material].kind,1,{x:12,z:17},material);until(w,()=>job.progress>0);exact(w);
  const copy=deserializeWorld(serializeWorld(w));until(w,()=>w.structures.some(s=>s.kind==='spike-trap'));stepWorld(copy,w.tick-copy.tick);expect(copy).toEqual(w);
  const trap=w.structures.find(s=>s.kind==='spike-trap')!;expect(trap).toMatchObject({material,orientation:0,footprint:'standard',spikeTrap:{autoRebuild:false,touching:[]}});
  expect(quantity(w,material)).toBe(0);expect(embedded(w,material)).toBe(45);expect(footprintCells(trap)).toEqual([site]);expect(Object.hasOwn(trap,'quality')).toBe(false);exact(w);
});

test('a supplied ordinary frame waits at Construction2 and resumes at the real Construction3 threshold',()=>{
  const w=camp(),p=w.pawns[0]!;p.skills.construction={level:2,xp:0,dailyXp:0,passion:0};addGroundMaterial(w,'wood',45,{x:12,z:16},'wood');const job=place(w);
  until(w,()=>deliveredMaterial(w,job,'wood')===45);stepWorld(w,30);expect(job.progress).toBe(0);expect(w.structures).toEqual([]);exact(w);
  p.skills.construction.level=3;p.planCooldown=0;until(w,()=>w.structures.some(s=>s.kind==='spike-trap'));expect(quantity(w,'wood')).toBe(0);exact(w);
});

test.each(['stockpile','growing'] as const)('trap construction preserves the %s cell and its original ground pile',zone=>{
  const w=camp();expect(applyCommand(w,{type:'area',action:zone,from:site,to:site}).ok).toBe(true);
  addMaterial(w,'steel',1,{type:'ground',...site},'steel');const pile=w.piles.find(p=>p.item==='steel')!,zones=structuredClone(zone==='stockpile'?w.stockpiles:w.growingZones);
  addGroundMaterial(w,'wood',45,{x:12,z:16},'wood');const job=place(w);expect(constructionObstruction(w,job).pile).toBeUndefined();
  until(w,()=>w.structures.some(s=>s.kind==='spike-trap'));expect(zone==='stockpile'?w.stockpiles:w.growingZones).toEqual(zones);
  expect(w.piles.find(p=>p.id===pile.id)).toBe(pile);expect(pile.owner).toEqual({type:'ground',...site});expect(pile.quantity).toBe(1);
  expect(canStandAt(w,site)&&groundOccupancyAllows(w,site)&&storageOccupancyAllows(w,site)).toBe(true);exact(w);
});

test('all eight neighbours of an installed trap, blueprint or supplied frame refuse another trap atomically',()=>{
  for(const kind of ['installed','blueprint','frame'] as const)for(const [dx,dz] of [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]]){
    const w=camp(),neighbour={x:site.x+dx!,z:site.z+dz!};
    if(kind==='installed')installed(w,neighbour);else {const j=place(w,neighbour);if(kind==='frame'){addMaterial(w,'wood',45,{type:'job',jobId:j.id},'wood');j.construction='frame';}}
    const before=serializeWorld(w),command={type:'designate' as const,kind:'spike-trap' as const,material:'wood' as const,...site,orientation:0 as const};
    expect(canDesignate(w,command).ok,`${kind} ${dx},${dz}`).toBe(false);expect(applyCommand(w,command).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
    expect(canDesignate(w,{...command,x:site.x+4}).ok).toBe(true);
  }
});

test('rotation and unavailable materials refuse both preview and command without mutating a plan or existing object',()=>{
  const w=camp();for(const orientation of [1,2,3] as const){const before=serializeWorld(w),c={type:'designate' as const,kind:'spike-trap' as const,material:'wood' as const,...site,orientation};expect(canDesignate(w,c).ok).toBe(false);expect(applyCommand(w,c).ok).toBe(false);expect(serializeWorld(w)).toBe(before);}
  for(const material of ['cloth','light-leather','plasteel','future']){const before=serializeWorld(w),c={type:'designate',kind:'spike-trap',material,...site,orientation:0} as never;expect(canDesignate(w,c).ok).toBe(false);expect(applyCommand(w,c).ok).toBe(false);expect(serializeWorld(w)).toBe(before);}
  const trap=installed(w);for(const orientation of [1,2,3] as const){const before=serializeWorld(w);expect(applyCommand(w,{type:'install',structureId:trap.id,x:23,z:21,orientation}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);}
});

test('installation excludes exactly its original trap and still refuses an adjacent different trap',()=>{
  const w=camp(),source=installed(w),destination={x:site.x+1,z:site.z};
  expect(applyCommand(w,{type:'install',structureId:source.id,...destination,orientation:0}).ok).toBe(true);expect(w.jobs[0]!.furniture!.structureId).toBe(source.id);exact(w);
  const blocked=camp(),moving=installed(blocked);installed(blocked,{x:site.x+2,z:site.z});
  const before=serializeWorld(blocked);expect(applyCommand(blocked,{type:'install',structureId:moving.id,...destination,orientation:0}).ok).toBe(false);expect(serializeWorld(blocked)).toBe(before);
});

test('real construction defaults from Home, while manual switch and reload retain the saved Boolean after Home shrinks',()=>{
  const w=camp();home(w,site,true);addGroundMaterial(w,'wood',45,{x:12,z:16},'wood');place(w);until(w,()=>w.structures.some(s=>s.kind==='spike-trap'));
  const trap=w.structures.find(s=>s.kind==='spike-trap')!;expect(trap.spikeTrap!.autoRebuild).toBe(true);home(w,site,false);expect(trap.spikeTrap!.autoRebuild).toBe(true);
  const rng=w.rng;expect(applyCommand(w,{type:'spike-trap-auto-rebuild',structureId:trap.id,on:false}).ok).toBe(true);expect(trap.spikeTrap!.autoRebuild).toBe(false);expect(w.rng).toBe(rng);exact(w);
  expect(applyCommand(w,{type:'spike-trap-auto-rebuild',structureId:trap.id,on:true}).ok).toBe(true);exact(w);expect(trap.spikeTrap!.autoRebuild).toBe(true);
});

test('ordinary minification and installation keep the same damaged ID without another material payment and redefault Home at the new site',()=>{
  const w=camp(),destination={x:23,z:21};home(w,site,true);addGroundMaterial(w,'wood',45,{x:12,z:16},'wood');place(w);until(w,()=>w.structures.some(s=>s.kind==='spike-trap'));
  const trap=w.structures.find(s=>s.kind==='spike-trap')!,id=trap.id;trap.damage=1;
  expect(applyCommand(w,{type:'designate',kind:'uninstall',...site}).ok).toBe(true);until(w,()=>w.packed.some(p=>p.building.id===id));expect(trap.spikeTrap).toEqual({autoRebuild:true,touching:[]});expect(w.packed[0]!.building).toBe(trap);exact(w);
  expect(applyCommand(w,{type:'install',structureId:id,...destination,orientation:0}).ok).toBe(true);until(w,()=>w.packed[0]?.owner.type==='pawn');
  const copy=deserializeWorld(serializeWorld(w));until(w,()=>w.structures.some(s=>s.id===id));stepWorld(copy,w.tick-copy.tick);expect(copy).toEqual(w);
  expect(w.structures.find(s=>s.id===id)).toBe(trap);expect(trap).toMatchObject({...destination,damage:1,material:'wood',spikeTrap:{autoRebuild:false,touching:[]}});
  expect(quantity(w,'wood')).toBe(0);expect(embedded(w,'wood')).toBe(45);expect(w.deconstructed.count).toBe(0);expect(w.destroyed?.count??0).toBe(0);exact(w);
});

test('hostile destruction keeps its salvage but auto-rebuild is only an empty new blueprint requiring a full second payment',()=>{
  const w=camp(),trap=installed(w);expect(damageStructure(w,trap,structureMaxHp(trap),'melee')).toBe(true);
  expect(w.structures).toEqual([]);const job=w.jobs.find(j=>j.kind==='spike-trap')!;
  expect(job).toMatchObject({...site,material:'wood',orientation:0,construction:'blueprint',progress:0,status:'pending',reservedBy:null,escrow:{wood:0,food:0}});
  expect(job.id).not.toBe(trap.id);expect(Object.hasOwn(job,'spikeTrap')).toBe(false);expect(deliveredMaterial(w,job,'wood')).toBe(0);
  const returned=quantity(w,'wood');expect([11,12]).toContain(returned);expect(returned+(w.destroyed?.lost.wood??0)).toBe(45);expect(w.deconstructed.count).toBe(0);exact(w);
  stepWorld(w,80);expect(job.progress).toBe(0);expect(w.structures).toEqual([]);expect(quantity(w,'wood')).toBe(returned);
  addGroundMaterial(w,'wood',45-returned,{x:12,z:16},'wood');until(w,()=>w.structures.some(s=>s.kind==='spike-trap'));
  expect(w.structures[0]!.id).not.toBe(trap.id);expect(w.structures[0]!.spikeTrap!.autoRebuild).toBe(false);expect(quantity(w,'wood')).toBe(0);exact(w);
});

test('external destruction with auto-rebuild off and voluntary deconstruction never create replacement plans',()=>{
  const off=camp(),spent=installed(off);spent.spikeTrap!.autoRebuild=false;expect(damageStructure(off,spent,structureMaxHp(spent),'bullet')).toBe(true);expect(off.jobs).toEqual([]);exact(off);
  const w=camp(),trap=installed(w),p=w.pawns[0]!;Object.assign(p,{x:site.x-1,z:site.z});expect(applyCommand(w,{type:'designate',kind:'deconstruct',...site}).ok).toBe(true);
  expect(finishDeconstruction(w,p,w.jobs[0]!)).toBe(true);expect(w.structures).toEqual([]);expect(w.jobs).toEqual([]);expect(w.deconstructed.count).toBe(1);expect(w.destroyed?.count??0).toBe(0);exact(w);expect(trap.spikeTrap!.autoRebuild).toBe(true);
});

test('a saturated forced weapon drop remains attached after real death, corpse materialization and movement, then replays exactly',()=>{
  const w=equipmentCamp(1),p=w.pawns[0]!,weapon=w.piles[0]!;
  expect(applyCommand(w,{type:'order-equipment',pawnId:p.id,itemId:weapon.id,action:'equip',queue:false}).ok).toBe(true);until(w,()=>equippedWeapon(w,p)===weapon);
  for(const cell of nearbyGround(w,p))addMaterial(w,'wood',75,{type:'ground',...cell},'wood');
  controlledInjury(w,p,'heart',15000);expect(p.state).toBe('dead');expect(p.equipmentDropPending).toBe(true);expect(weapon.owner).toEqual({type:'equipment',pawnId:p.id});
  advanceHumanCorpses(w);expect(p.body?.pileId).toBeUndefined();exact(w);
  const blocker=w.piles.find(i=>i.owner.type==='ground'&&i.owner.x===p.x&&i.owner.z===p.z)!;expect(transferPile(w,blocker,{type:'ground',x:24,z:24})).toBe(true);
  advanceHumanCorpses(w);const corpse=w.piles.find(i=>i.humanCorpse?.pawnId===p.id)!;expect(corpse).toBeDefined();expect(p.body!.pileId).toBe(corpse.id);expect(p.equipmentDropPending).toBe(true);
  expect(transferPile(w,corpse,{type:'ground',x:25,z:24})).toBe(true);refreshStock(w);expect(pawnBodyLocation(w,p)).toEqual({type:'ground',x:25,z:24});exact(w);
  const copy=deserializeWorld(serializeWorld(w)),oldPosition={x:p.x,z:p.z},rng=w.rng;
  const ticks=20+(p.id-w.tick%20+20)%20;stepWorld(w,ticks);stepWorld(copy,ticks);dropIncapacitatedEquipment(w,p,true);
  expect(copy).toEqual(w);expect(weapon.owner).toEqual({type:'equipment',pawnId:p.id});expect(p.equipmentDropPending).toBe(true);
  expect(w.piles.find(i=>i.id===corpse.id)!.owner).toEqual({type:'ground',x:25,z:24});expect({x:p.x,z:p.z}).toEqual(oldPosition);expect(w.rng).toBe(rng);exact(w);
});
