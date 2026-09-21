import { drainBatteryWattDays,batteryQuanta } from '../src/sim/power-battery';
import { furnitureDelay,navigationCosts } from '../src/sim/furniture-travel';
import { expect,test } from 'vitest';
import { applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index';
import { flameBurst,startFire,attachPawnFire,attachAnimalFire,advanceFires,extinguishFire } from '../src/sim/fire';
import { fireDanger,fireNavigationPenalty,attachFireChance,ensureFireState } from '../src/sim/fire-rules';
import { fireTouch,applyExtinguish } from '../src/sim/firefighting';
import { damageResource,damagePile,damageStructure } from '../src/sim/thing-damage';
import { structureMaxHp,structureFlammability,mergeThingDamage } from '../src/sim/thing-damage-rules';
import { validateFires,validateThingDamage } from '../src/sim/fire-save';
import { reconcileTemperature } from '../src/sim/temperature';
import { addGroundMaterial,refreshStock } from '../src/sim/materials';
import { fixtureBuilding } from './scenarios/deconstruction';
import { fireCamp,woodFire } from './scenarios/fire';
import { burnPawn } from '../src/sim/fire-damage';
import { injuryBleed,medicalPain } from '../src/sim/injury-state';
import { newPowerState } from '../src/sim/power-rules';
import { newBuildingFuel } from '../src/sim/fuel';
import { withoutV90 } from './scenarios/legacy-skills';
import { footprintCells } from '../src/sim/definitions';
import { BATTERIES_RESEARCH_COST } from '../src/sim/research';
import { validateMedicalRecord } from '../src/sim/injury-validation';
import type { World,Structure } from '../src/sim/types';
const same=(a:{x:number;z:number},b:{x:number;z:number})=>a.x===b.x&&a.z===b.z;
function until(w:World,condition:()=>boolean,limit=250){let n=0;while(!condition()&&n++<limit)stepWorld(w);expect(condition()).toBe(true);expect(validateWorld(w)).toEqual([]);}
function replay(w:World,ticks=30){const copy=deserializeWorld(serializeWorld(w));stepWorld(w,ticks);stepWorld(copy,ticks);expect(validateWorld(w)).toEqual([]);expect(serializeWorld(copy)).toBe(serializeWorld(w));}

test('firefighting is real ranked work, acts on home fires and forced orders reach fires outside home',()=>{
  const w=fireCamp(),p=w.pawns[0]!,target={x:p.x+5,z:p.z};p.priorities.firefight=3;p.priorities.patient=1;
  const id=woodFire(w,target,.6),initial=w.piles.find(i=>i.item==='wood')!.quantity;
  stepWorld(w,30);expect(p.firefighting).toBeUndefined();expect(w.fires!.items.some(f=>f.id===id)).toBe(true);
  expect(applyCommand(w,{type:'area',action:'home',from:target,to:target}).ok).toBe(true);
  until(w,()=>!!p.firefighting);expect(p.firefighting!.forced).toBe(false);replay(w,4);
  until(w,()=>!w.fires!.items.some(f=>f.id===id));expect(w.piles.find(i=>i.item==='wood')!.quantity).toBe(initial);expect(w.fires!.ledger.extinguished).toBe(1);
  const remote={x:p.x+4,z:p.z+3},second=woodFire(w,remote,.5);p.priorities.firefight=0;
  expect(applyCommand(w,{type:'order-extinguish',pawnId:p.id,fireId:second}).ok).toBe(true);
  until(w,()=>!w.fires!.items.some(f=>f.id===second));expect(p.firefighting).toBeUndefined();expect(w.fires!.ledger.extinguished).toBe(2);
  // During a sleep slot a rested pawn can work, while after-work recreation
  // may start. A newly selected firefighting task must dispatch before that fallback.
  const night=fireCamp(),n=night.pawns[0]!;night.tick=1000;n.schedule.fill('sleep');n.recreation.level=10;n.needCooldown=0;n.planCooldown=0;n.priorities.firefight=1;
  const close={x:n.x+1,z:n.z},near=woodFire(night,close,.6);night.home=[close.z*night.width+close.x];
  stepWorld(night);expect(n.firefighting?.phase).toBe('beat');expect(n.recreation.task).toBeNull();expect(night.fires!.items.find(f=>f.id===near)!.size).toBeCloseTo(.28);expect(validateWorld(night)).toEqual([]);
});

test('extinguishing a shared target releases approaching firefighters without losing their captured edge',()=>{
  const w=fireCamp(),p=w.pawns[0]!,target={x:p.x+5,z:p.z};
  const id=woodFire(w,target,.6);w.home=[target.z*w.width+target.x];p.priorities.firefight=1;
  until(w,()=>!!p.firefighting&&p.moveCooldown>0);
  const motion=structuredClone(p.motion),cooldown=p.moveCooldown;
  extinguishFire(w,id,1000);
  expect(p.firefighting).toBeUndefined();expect(p.path).toEqual([]);expect(p.state).toBe('idle');
  expect(p.motion).toEqual(motion);expect(p.moveCooldown).toBe(cooldown);
  expect(validateWorld(w)).toEqual([]);replay(w,10);
});

test('fire spread, rain, burning material and derived path penalties preserve saved fire clocks',()=>{
  const dry=fireCamp(),wet=fireCamp();dry.pawns=[];wet.pawns=[];
  woodFire(dry,{x:12,z:12},1.5);woodFire(wet,{x:12,z:12},1.5);
  for(const w of [dry,wet])for(let z=10;z<=14;z++)for(let x=10;x<=14;x++)if(x!==12||z!==12)addGroundMaterial(w,'wood',10,{x,z},'wood');
  const frame=reconcileTemperature(dry),wetFrame=reconcileTemperature(wet);
  for(let n=0;n<150;n++){dry.tick++;wet.tick++;advanceFires(dry,{rainRate:0},frame);advanceFires(wet,{rainRate:1},wetFrame);}
  expect(dry.fires!.ledger.ignitions).toBeGreaterThan(1);expect(fireDanger(dry)).toBeGreaterThan(fireDanger(wet));expect(validateFires(dry,87)).toEqual([]);
  const f=dry.fires!.items[0]!;expect(fireNavigationPenalty(dry,f)).toBeGreaterThanOrEqual(1000);expect(fireNavigationPenalty(dry,{x:f.x+1,z:f.z})).toBeGreaterThanOrEqual(150);
  const copy=structuredClone(dry);for(let n=0;n<30;n++){dry.tick++;copy.tick++;advanceFires(dry,{rainRate:0},reconcileTemperature(dry));advanceFires(copy,{rainRate:0},reconcileTemperature(copy));}expect(copy).toEqual(dry);
});

test('object profiles, plant death, damaged stack averaging and destruction are conservative',()=>{
  const w=fireCamp(),p=w.pawns[0]!;
  expect(structureMaxHp({kind:'bed',material:'wood'})).toBe(91);expect(structureFlammability({kind:'wall',material:'granite-blocks'})).toBe(0);expect(structureFlammability({kind:'wall',material:'steel'})).toBe(.4);
  const tree={id:w.nextId++,kind:'tree' as const,x:20,z:20,amount:30};w.resources.push(tree);expect(damageResource(w,tree,199)).toBe(true);expect(w.resources).toContain(tree);expect(damageResource(w,tree,1)).toBe(true);expect(w.resources).not.toContain(tree);expect(w.fires!.ledger.resources.tree).toBe(1);expect(w.fires!.ledger.woodPotentialLost).toBe(30);expect(w.piles).toHaveLength(0);
  addGroundMaterial(w,'wood',20,{x:p.x+2,z:p.z},'wood');const wood=w.piles[0]!;damagePile(w,wood,100);expect(wood.damage).toBe(100);
  const merged={item:'wood' as const,kind:'wood' as const,quantity:20,damage:100};mergeThingDamage(merged,10,0);expect(merged.damage).toBe(66);
  damagePile(w,wood,50);expect(w.piles).toHaveLength(0);expect(w.fires!.ledger.items.wood).toBe(20);expect(validateThingDamage(w,87)).toEqual([]);
  const stool=fixtureBuilding(w,'stool',p.x+3,p.z);expect(damageStructure(w,stool,structureMaxHp(stool))).toBe(true);expect(w.structures).not.toContain(stool);expect(w.fires!.ledger.structures).toBe(1);
  const returned=w.piles.filter(i=>i.item==='wood').reduce((n,i)=>n+i.quantity,0);expect(returned+(w.destroyed!.lost.wood??0)).toBe(25);expect(validateWorld(w)).toEqual([]);
});

test('new building damage is repaired by construction without material duplication',()=>{
  const w=fireCamp(),p=w.pawns[0]!,stool:Structure=fixtureBuilding(w,'stool',p.x+2,p.z);p.priorities.build=1;
  damageStructure(w,stool,8);expect(applyCommand(w,{type:'area',action:'home',from:stool,to:stool}).ok).toBe(true);until(w,()=>!!p.jobId);
  const piles=JSON.stringify(w.piles);replay(w,4);until(w,()=>!stool.damage);expect(JSON.stringify(w.piles)).toBe(piles);expect(w.fires?.ledger.structures??0).toBe(0);
});

test('fatal structure damage places retained cargo and salvage in one atomic floor plan',()=>{
  const w=fireCamp(),p=w.pawns[0]!;p.x=20;p.z=19;p.priorities.haul=1;
  const generator:Structure={...fixtureBuilding(w,'wood-generator',20,20),material:'steel',power:newPowerState('wood-generator'),fuel:newBuildingFuel('wood-generator')};
  w.structures=[generator];addGroundMaterial(w,'wood',10,{x:20,z:18},'wood');
  expect(applyCommand(w,{type:'order-haul',pawnId:p.id,target:{type:'fuel',structureId:generator.id},queue:false}).ok).toBe(true);
  until(w,()=>p.haul?.phase==='deliver'&&p.x===20&&p.z===19);
  const cargo=w.piles.find(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id)!,cargoBefore=structuredClone(cargo),motion=structuredClone(p.motion),cooldown=p.moveCooldown;
  ensureFireState(w).rng=1;const before=serializeWorld(w),copy=deserializeWorld(before);
  expect(damageStructure(w,generator,structureMaxHp(generator))).toBe(true);
  expect(w.structures).not.toContain(generator);expect(p.haul).toBeNull();expect(p.motion).toEqual(motion);expect(p.moveCooldown).toBe(cooldown);
  expect(w.piles.find(i=>i.id===cargo.id)).toEqual({...cargoBefore,owner:{type:'ground',x:p.x,z:p.z}});
  expect(w.piles.filter(i=>i.item==='steel').reduce((n,i)=>n+i.quantity,0)+(w.destroyed!.lost.steel??0)).toBe(100);
  expect(w.piles.filter(i=>i.item==='component').reduce((n,i)=>n+i.quantity,0)+(w.destroyed!.lost.component??0)).toBe(2);
  expect(damageStructure(copy,copy.structures.find(s=>s.id===generator.id)!,structureMaxHp(generator))).toBe(true);
  expect(validateWorld(w)).toEqual([]);expect(serializeWorld(copy)).toBe(serializeWorld(w));replay(w,10);

  for(const packed of [false,true]){
    const tight=fireCamp();tight.pawns=[];tight.tiles.forEach(t=>t.terrain='water');
    tight.research={project:null,points:0,batteries:{points:BATTERIES_RESEARCH_COST,completedAt:tight.tick}};
    const battery:Structure={...fixtureBuilding(tight,'battery',20,20),material:'steel',power:newPowerState('battery'),battery:{stored:0}};
    tight.structures=[battery];for(const c of footprintCells(battery))tight.tiles[c.z*tight.width+c.x]!.terrain='grass';
    if(packed){tight.structures=[];tight.packed=[{building:battery,owner:{type:'ground',x:20,z:20}}];}
    expect(validateWorld(tight)).toEqual([]);expect(damageStructure(tight,battery,structureMaxHp(battery))).toBe(true);
    expect(tight.structures).toHaveLength(0);expect(tight.packed).toHaveLength(0);expect(validateWorld(tight)).toEqual([]);
    expect(tight.piles.filter(i=>i.item==='steel').reduce((n,i)=>n+i.quantity,0)+(tight.destroyed!.lost.steel??0)).toBe(70);
  }
  const full=fireCamp();full.pawns=[];full.tiles.forEach(t=>t.terrain='water');full.tiles[20*full.width+20]!.terrain='grass';
  const stool=fixtureBuilding(full,'stool',20,20);addGroundMaterial(full,'food',75,stool,'rice');
  expect(validateWorld(full)).toEqual([]);const unchanged=serializeWorld(full);
  expect(damageStructure(full,stool,structureMaxHp(stool))).toBe(false);expect(serializeWorld(full)).toBe(unchanged);
});

test('external plant death releases only its clearance claim and preserves construction, queues and a captured edge',()=>{
  for(const mode of ['direct','queued','transit'] as const){
    const w=fireCamp(),p=w.pawns[0]!;p.priorities.build=1;p.priorities.gather=1;
    const tree={id:w.nextId++,kind:'tree' as const,x:p.x+5,z:p.z,amount:30};w.resources.push(tree);
    addGroundMaterial(w,'wood',10,{x:p.x,z:p.z-2},'wood');
    expect(applyCommand(w,{type:'designate',kind:'wall',x:tree.x,z:tree.z}).ok).toBe(true);
    const plan=w.jobs[0]!;
    if(mode==='queued'){
      const activeTree={id:w.nextId++,kind:'tree' as const,x:p.x-1,z:p.z,amount:12};w.resources.push(activeTree);
      expect(applyCommand(w,{type:'designate',kind:'chop',x:activeTree.x,z:activeTree.z}).ok).toBe(true);
      expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:w.jobs.at(-1)!.id,queue:false}).ok).toBe(true);
    }
    expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:plan.id,queue:mode==='queued'}).ok).toBe(true);
    const otherTree={id:w.nextId++,kind:'tree' as const,x:p.x-2,z:p.z+2,amount:12};w.resources.push(otherTree);
    expect(applyCommand(w,{type:'designate',kind:'chop',x:otherTree.x,z:otherTree.z}).ok).toBe(true);
    const other=w.jobs.at(-1)!;expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:other.id,queue:true}).ok).toBe(true);
    if(mode==='transit')until(w,()=>p.moveCooldown>0,10);
    expect(plan.clearance?.resourceId).toBe(tree.id);expect(validateWorld(w)).toEqual([]);
    const before=structuredClone({plan,piles:w.piles,other,orders:p.orders,motion:p.motion,moveCooldown:p.moveCooldown,priorityWork:p.priorityWork,jobId:p.jobId});
    expect(damageResource(w,tree,200,mode==='queued'?'frost':mode==='transit'?'age':'fire')).toBe(true);
    expect(w.resources).not.toContain(tree);expect(w.jobs).toContain(plan);expect(plan.clearance).toBeUndefined();
    const expectedPlan=structuredClone(before.plan);delete expectedPlan.clearance;
    expect(plan).toEqual({...expectedPlan,reservedBy:null,status:'pending'});expect(w.piles).toEqual(before.piles);expect(other).toEqual(before.other);
    expect(p.orders.queue).toEqual(before.orders.queue.filter(id=>id!==plan.id));expect(p.priorityWork).toEqual(before.priorityWork);
    expect(p.motion).toEqual(before.motion);expect(p.moveCooldown).toBe(before.moveCooldown);
    expect(p.jobId).toBe(mode==='queued'?before.jobId:null);expect(p.orders.active).toBe(mode==='queued'?before.orders.active:null);
    expect(validateWorld(w)).toEqual([]);replay(w,30);
  }
});

test('burn attachment, outside injuries, bleeding, self-extinction and animal reaction persist',()=>{
  const w=fireCamp(),p=w.pawns[0]!;expect(attachFireChance(.7)).toBe(1);expect(attachFireChance(.1,60)).toBeCloseTo(.07);
  burnPawn(w,p,2);expect(p.health!.injuries.every(i=>i.kind==='burn')).toBe(true);expect(p.health!.injuries.every(i=>injuryBleed(p.health!,i)===0)).toBe(true);expect(medicalPain(p.health!)).toBeGreaterThan(0);
  expect(attachPawnFire(w,p.id,.2)).toBe(true);p.burning={phase:'extinguish',remainingCore:150};replay(w,6);until(w,()=>!p.burning,20);expect(w.fires!.items).toHaveLength(0);
  w.wildlife={profile:'temperate-hares-v1',rng:43,eatenPlants:0,eatenNutrition:0,eatenItems:0,animals:[{id:w.nextId++,species:'hare',sex:'female',x:p.x+3,z:p.z,food:.2,rest:1,state:'idle',path:[],nextDecision:w.tick}]};
  const a=w.wildlife.animals[0]!;expect(attachAnimalFire(w,a.id,.2)).toBe(true);a.burning={phase:'extinguish',remainingCore:150};replay(w,6);until(w,()=>!a.burning,20);expect(w.fires!.items).toHaveLength(0);
  expect(attachPawnFire(w,p.id,.2)).toBe(true);p.path=[{x:p.x+1,z:p.z}];p.burning={phase:'panic',remainingCore:0,target:{x:p.x+1,z:p.z}};
  const motion=p.motion,cooldown=p.moveCooldown;extinguishFire(w,w.fires!.items[0]!.id,1000);expect(p.path).toEqual([]);expect(p.motion).toEqual(motion);expect(p.moveCooldown).toBe(cooldown);expect(validateWorld(w)).toEqual([]);
});

test('armor fire losses reserve integer capacity before health, durability or random state changes',()=>{
  const fixture=(counter:number,hitPoints=1)=>{
    const w=fireCamp(),p=w.pawns[0]!;
    addGroundMaterial(w,'apparel',1,p,'cloth-shirt');const shirt=w.piles.find(i=>i.item==='cloth-shirt')!;
    shirt.owner={type:'apparel',pawnId:p.id};shirt.apparel!.hitPoints=hitPoints;
    const state=ensureFireState(w);state.rng=1;if(counter)state.ledger.items['cloth-shirt']=counter;
    expect(validateWorld(w)).toEqual([]);return {w,p,shirt};
  };
  const capped=fixture(Number.MAX_SAFE_INTEGER),before=serializeWorld(capped.w);
  // Seed 1 selects the covered torso; damage 4 consumes exactly 1 armor HP.
  expect(burnPawn(capped.w,capped.p,4)).toBe(false);
  expect(serializeWorld(capped.w)).toBe(before);expect(validateWorld(capped.w)).toEqual([]);
  const boundary=fixture(Number.MAX_SAFE_INTEGER-1),ordinary=fixture(0);
  expect(burnPawn(boundary.w,boundary.p,4)).toBe(true);expect(burnPawn(ordinary.w,ordinary.p,4)).toBe(true);
  expect(boundary.w.piles).not.toContain(boundary.shirt);expect(ordinary.w.piles).not.toContain(ordinary.shirt);
  expect(boundary.w.fires!.ledger.items['cloth-shirt']).toBe(Number.MAX_SAFE_INTEGER);
  expect(ordinary.w.fires!.ledger.items['cloth-shirt']).toBe(1);
  expect(validateWorld(boundary.w)).toEqual([]);expect(validateWorld(ordinary.w)).toEqual([]);
  // Normalize only the historical loss counter: the whole continuation state,
  // including RNG and injury, must agree for ordinary and near-boundary inputs.
  ordinary.w.fires!.ledger.items['cloth-shirt']=Number.MAX_SAFE_INTEGER;
  expect(serializeWorld(ordinary.w)).toBe(serializeWorld(boundary.w));
  const nonfatal=fixture(Number.MAX_SAFE_INTEGER,100);
  expect(burnPawn(nonfatal.w,nonfatal.p,4)).toBe(true);expect(nonfatal.shirt.apparel!.hitPoints).toBe(95);
  expect(nonfatal.w.fires!.ledger.items['cloth-shirt']).toBe(Number.MAX_SAFE_INTEGER);expect(validateWorld(nonfatal.w)).toEqual([]);
});

test('strict fire/HP migration rejects old burns and malformed phases or duplicate identities',()=>{
  const w=fireCamp();woodFire(w,{x:10,z:10});expect(validateFires(w,87)).toEqual([]);
  for(const mutate of [(v:World)=>{v.fires!.items[0]!.nextPulseCore++;},(v:World)=>{v.fires!.items.push({...v.fires!.items[0]!});},(v:World)=>{v.fires!.rng=0;},(v:World)=>{v.piles[0]!.damage=150;}]){const copy=structuredClone(w);mutate(copy);expect([...validateFires(copy,87),...validateThingDamage(copy,87)]).not.toEqual([]);}
  expect(validateFires(w,86)).not.toEqual([]);
  const record={tick:0,nextInjuryId:2,injuries:[{id:1,part:'torso',kind:'burn',severity:1000,bornAt:0}],missing:[],bloodLoss:0};
  expect(validateMedicalRecord(record,true,true,true,true,false,false,true,true,false)).not.toBeNull();expect(validateMedicalRecord(record,true,true,true,true,false,false,true,true,true)).toBeNull();
  const old=withoutV90(fireCamp()) as unknown as Record<string,unknown>;old.schemaVersion=86;for(const p of (old as unknown as World).pawns)delete (p.priorities as Partial<typeof p.priorities>).clean;for(const p of (old as unknown as World).pawns)delete (p.priorities as Partial<typeof p.priorities>).firefight;
  const loaded=deserializeWorld(JSON.stringify(old));expect(loaded.fires).toBeUndefined();expect(loaded.pawns[0]!.priorities.firefight).toBe(1);
  const capped=fireCamp(),id=woodFire(capped,{x:10,z:10});addGroundMaterial(capped,'wood',10,{x:12,z:10},'wood');
  capped.fires!.ledger.ignitions=Number.MAX_SAFE_INTEGER;capped.fires!.ledger.extinguished=Number.MAX_SAFE_INTEGER-1;
  expect(validateFires(capped,87)).toEqual([]);const before=JSON.stringify(capped);
  expect(startFire(capped,{x:12,z:10})).toBe(false);expect(JSON.stringify(capped)).toBe(before);
  const invalid=structuredClone(capped);invalid.fires!.ledger.extinguished=Number.MAX_SAFE_INTEGER;
  expect(validateFires(invalid,87)).toContain('Inconsistent fire ignition and extinction ledger.');
  expect(extinguishFire(capped,id,1000)).toBe(true);expect(capped.fires!.ledger.extinguished).toBe(Number.MAX_SAFE_INTEGER);expect(validateFires(capped,87)).toEqual([]);
});

test('extinguish contact includes accessible diagonals and refused cargo orders are byte-neutral',()=>{
  const w=fireCamp(),p=w.pawns[0]!,target={x:p.x+1,z:p.z+1};const f=woodFire(w,target);
  expect(fireTouch(w,p,target)).toBe(true);fixtureBuilding(w,'wall',p.x+1,p.z);expect(fireTouch(w,p,target)).toBe(false);
  addGroundMaterial(w,'wood',5,p,'wood');const pile=w.piles.find(i=>i.owner.type==='ground'&&same(i.owner,p))!;pile.owner={type:'pawn',pawnId:p.id};p.interruptedCargo=true;
  // Real retained cargo in a fully occupied finite floor: no legal drop exists.
  w.tiles.forEach((t,i)=>{if(i!==p.z*w.width+p.x)t.terrain='water';});addGroundMaterial(w,'food',75,p,'rice');refreshStock(w);
  const before=JSON.stringify(w);expect(applyExtinguish(w,{pawnId:p.id,fireId:f})).not.toBeNull();expect(JSON.stringify(w)).toBe(before);
});

test('battery fuse honors the strict 500 Wd threshold, survives extinguishing, and drains only remaining energy',()=>{
  for(const half of [false,true]){
    const w=fireCamp();w.pawns=[];
    const battery:Structure={id:w.nextId++,kind:'battery',x:20,z:20,orientation:0,footprint:'standard',power:newPowerState('battery'),battery:{stored:500*120000,...half?{half:true as const}:{}}};w.structures.push(battery);ensureFireState(w).rng=1;
    flameBurst(w,battery,.1);expect(w.fires!.batteryWicks.length).toBe(half?1:0);if(!half)continue;
    const expiry=w.fires!.batteryWicks[0]!.endCore;expect(expiry).toBeGreaterThanOrEqual(70);expect(expiry).toBeLessThan(150);
    for(const f of [...w.fires!.items])extinguishFire(w,f.id,1000);expect(w.fires!.batteryWicks).toHaveLength(1);
    drainBatteryWattDays(battery.battery!,480);const remaining=batteryQuanta(battery.battery!);expect(remaining).toBe(20*120000+.5);
    while(w.tick*10<expiry){w.tick++;advanceFires(w,{rainRate:0},reconcileTemperature(w));}
    expect(w.fires!.batteryWicks).toHaveLength(0);expect(batteryQuanta(battery.battery!)).toBe(0);expect(w.fires!.ledger.batteryEnergyLost).toBe(remaining);expect(validateFires(w,87)).toEqual([]);
  }
});

test('fire heats a real enclosed volume and its perceived costs do not change physical furniture delay',()=>{
  const w=fireCamp();w.pawns=[];
  const coldLayout=reconcileTemperature(w),cold=new Proxy(w,{get(target,key,receiver){if(key==='resources')throw Error('Cold fire-free tick must not enumerate resources');return Reflect.get(target,key,receiver);}});
  advanceFires(cold,{rainRate:0},coldLayout);expect(w.fires).toBeUndefined();
  for(let z=18;z<=22;z++)for(let x=18;x<=22;x++)if(x===18||x===22||z===18||z===22)fixtureBuilding(w,'wall',x,z);
  const cells=[];for(let z=19;z<=21;z++)for(let x=19;x<=21;x++)cells.push(z*w.width+x);w.roofing={constructed:cells,build:[],remove:[],cursor:0};
  const target={x:20,z:20},layout=reconcileTemperature(w),id=layout.indices[target.z*w.width+target.x]!;expect(id).toBeGreaterThanOrEqual(0);
  const before=w.thermal!.regions[id]!.temperature;woodFire(w,target,1.5);
  const delay=furnitureDelay(w,{x:19,z:20},target),costs=navigationCosts(w);expect(costs.costs!.get(20*w.width+20)).toBe(33333);expect(costs.floors.get(20*w.width+19)).toBe(5000);
  for(let i=0;i<15;i++){w.tick++;advanceFires(w,{rainRate:0},layout);}
  expect(w.thermal!.regions[id]!.temperature).toBeGreaterThan(before+20);expect(furnitureDelay(w,{x:19,z:20},target)).toBe(delay);
});
