import { createMedicalRecord,addResolvedInjury,reconcileMedicalDeath } from '../src/sim/injury-state';
import { reconcileAnimalHealth } from '../src/sim/wildlife-health';
import { reconcilePawnHealth } from '../src/sim/health';
import { BLOOD_UNIT } from '../src/sim/injury-rules';
import { considerFlee,threatQueries } from '../src/sim/threats';
import { considerAutomaticCombat } from '../src/sim/automatic-combat';
import { expect,test,vi } from 'vitest';
import * as shotCapture from '../src/sim/combat-world';
import { huntingProposal } from '../src/sim/hunting';
import { candidateAccess } from '../src/sim/candidate-access';
import { blockedCells } from '../src/sim/pathfinding';
import { applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index';
import { huntingCamp } from './scenarios/hunting';
import { addMaterial,refreshStock } from '../src/sim/materials';
import type { World,Command,Structure } from '../src/sim/types';

function command(w:World,c:Command){expect(applyCommand(w,c),JSON.stringify(c)).toMatchObject({ok:true});expect(validateWorld(w)).toEqual([]);}
function until(w:World,predicate:()=>boolean,max=3000){for(let i=0;i<max&&!predicate();i++){stepWorld(w);expect(validateWorld(w),JSON.stringify({tick:w.tick,pawns:w.pawns.map(p=>({id:p.id,state:p.state,hunt:p.hunting,shoot:p.shooting,haul:p.haul})),animals:w.wildlife?.animals.map(a=>({id:a.id,state:a.state,x:a.x,z:a.z}))})).toEqual([]);}expect(predicate(),`condition at ${w.tick}`).toBe(true);}
const units=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);

test('bounded hunting decisions preserve the full-map oracle at range, lean corners and map edges',()=>{
  const fullCapture=shotCapture.captureWorldShotGrid;
  for(const [hunterX,hunterZ,preyX,preyZ,corner] of [[1,1,25,1,false],[1,1,26,1,false],[50,30,74,30,true],[1,62,25,62,true],[85,4,12,4,false]] as const){
    const w=huntingCamp(),p=w.pawns[0]!,a=w.wildlife!.animals[0]!;
    // Geometry-only arena: retain the real weapon/profile, isolate the shot
    // window from generation and compare against an unbounded capture oracle.
    w.width=96;w.height=64;w.tiles=Array.from({length:w.width*w.height},()=>({terrain:'grass'}));w.resources=[];w.structures=[];w.jobs=[];
    Object.assign(p,{x:hunterX,z:hunterZ});Object.assign(a,{x:preyX,z:preyZ});w.hunting={targets:[a.id],completed:0};
    if(corner){w.tiles[hunterZ*w.width+hunterX+1]={terrain:'rock'};w.tiles[(hunterZ-1)*w.width+hunterX+1]={terrain:'rock'};}
    const plan=()=>huntingProposal(w,p,candidateAccess(w,p,blockedCells(w),new Set()));
    const spy=vi.spyOn(shotCapture,'captureWorldShotGrid');
    try {
      const bounded=plan();expect(bounded).toBeDefined();expect(spy.mock.calls.some(c=>!!c[1])).toBe(true);
      spy.mockImplementation(world=>fullCapture(world));expect(plan()).toEqual(bounded);
      if(hunterX===1&&preyX===26)expect(bounded!.path.length).toBeGreaterThan(0);
      if(hunterX===50||hunterZ===62)expect(bounded!.path).toEqual([]); // A legal side lean survives clipping.
    } finally {spy.mockRestore();}
  }
});

test('civilian hunt reserves live prey, shoots, saves, collects without Haul, then butchers and cooks its real meat',()=>{
  const w=huntingCamp(),hunter=w.pawns[0]!,cook=w.pawns[1]!,animal=w.wildlife!.animals[0]!,id=animal.id;
  expect(animal.health).toBeUndefined();expect(w.piles.some(p=>p.kind==='corpse'||p.item==='hare-meat')).toBe(false);
  command(w,{type:'hunt',animalId:id,enabled:true});until(w,()=>!!hunter.shooting?.stance||!!w.projectiles?.length);
  expect(hunter.draft).toBeUndefined();expect(hunter.hunting?.animalId).toBe(id);expect(hunter.priorities.haul).toBe(0);
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,25);stepWorld(copy,25);expect(copy).toEqual(w);
  until(w,()=>w.piles.some(p=>p.id===id&&p.owner.type==='ground'&&p.owner.x===8&&p.owner.z===8)&&!hunter.haul&&!hunter.hunting);
  expect(w.hunting).toMatchObject({completed:1,targets:[]});expect(w.wildlife!.animals).toHaveLength(0);expect(w.piles.find(p=>p.id===id)?.corpse?.health.death).toBeDefined();expect(hunter.skills.shooting.xp).toBeGreaterThan(0);
  command(w,{type:'designate',kind:'butcher-spot',x:8,z:10});const spot=w.structures.find(s=>s.kind==='butcher-spot')!;command(w,{type:'bill-add',structureId:spot.id});
  until(w,()=>!!w.butchery&&!cook.cooking);expect(w.butchery!.completed).toBe(1);expect(units(w,'hare-meat')).toBe(w.butchery!.meat);expect(units(w,'light-leather')).toBe(w.butchery!.leather);expect(units(w,'hare-meat')).toBeGreaterThanOrEqual(10);
  command(w,{type:'priority',pawnId:cook.id,work:'build',value:1});command(w,{type:'designate',kind:'campfire',x:12,z:10});until(w,()=>w.structures.some(s=>s.kind==='campfire'));
  command(w,{type:'priority',pawnId:cook.id,work:'build',value:0});const fire=w.structures.find(s=>s.kind==='campfire')!;command(w,{type:'bill-add',structureId:fire.id});const bill=fire.bills![0]!;command(w,{type:'bill-update',structureId:fire.id,billId:bill.id,settings:{...bill,filters:{rice:false,berries:false,'hare-meat':true},destination:'drop'}});
  until(w,()=>units(w,'simple-meal')===1&&!cook.cooking);expect(units(w,'hare-meat')+10).toBe(w.butchery!.meat);expect(units(w,'light-leather')).toBe(w.butchery!.leather);expect(cook.skills.cooking!.xp).toBeGreaterThan(0);
});

test('hunt permissions, cancellation and exclusive target reservations preserve in-flight consequences',()=>{
  const w=huntingCamp(),p=w.pawns[0]!,other=w.pawns[1]!,a=w.wildlife!.animals[0]!;
  command(w,{type:'hunt',animalId:a.id,enabled:true});p.priorities.hunt=0;stepWorld(w,25);expect(w.pawns.some(p=>p.hunting)).toBe(false);
  command(w,{type:'priority',pawnId:p.id,work:'hunt',value:1});command(w,{type:'priority',pawnId:other.id,work:'hunt',value:1});addMaterial(w,'weapon',1,{type:'equipment',pawnId:other.id},'revolver');
  until(w,()=>!!p.hunting||!!other.hunting);expect(w.pawns.filter(p=>p.hunting)).toHaveLength(1);
  until(w,()=>!!w.projectiles?.length);const projectiles=structuredClone(w.projectiles),rng=w.rng;
  command(w,{type:'hunt',animalId:a.id,enabled:false});expect(w.pawns.every(p=>!p.hunting)).toBe(true);expect(w.projectiles).toEqual(projectiles);expect(w.rng).toBe(rng);
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,50);stepWorld(copy,50);expect(copy).toEqual(w);
  const unarmed=huntingCamp();unarmed.piles=unarmed.piles.filter(i=>i.kind!=='weapon');refreshStock(unarmed);command(unarmed,{type:'hunt',animalId:unarmed.wildlife!.animals[0]!.id,enabled:true});stepWorld(unarmed,60);expect(unarmed.pawns.some(p=>p.hunting)).toBe(false);expect(validateWorld(unarmed)).toEqual([]);
});


test('downed prey needs eighteen real contact ticks; recovery, cancellation, incapacity and natural death remain distinct',()=>{
  const make=()=>{
    const w=huntingCamp(),p=w.pawns[0]!,a=w.wildlife!.animals[0]!;p.x=9;p.z=10;
    a.health={...createMedicalRecord(w.tick),body:'hare',bloodLoss:BLOOD_UNIT*.7};addResolvedInjury(a.health,'left-rear-leg','cut',1000,()=>.99);reconcileAnimalHealth(w,a);expect(a.state).toBe('downed');
    command(w,{type:'hunt',animalId:a.id,enabled:true});until(w,()=>p.hunting?.phase==='finish'&&p.hunting.progress===1);return {w,p,a};
  };
  const {w,p,a}=make();stepWorld(w,8);expect(p.hunting?.progress).toBe(9);expect(a.health!.death).toBeUndefined();const saved=serializeWorld(w),copy=deserializeWorld(saved);
  stepWorld(w,8);expect(p.hunting?.progress).toBe(17);expect(a.health!.death).toBeUndefined();stepWorld(w);stepWorld(copy,9);expect(copy).toEqual(w);
  const body=w.piles.find(i=>i.id===a.id)!;expect(body.corpse!.health.death?.cause).toBe('execution');expect(body.corpse!.health.injuries.find(i=>i.kind==='execution-cut')).toMatchObject({part:'neck',severity:1000});expect(body.corpse!.health.missing.some(i=>i.part==='neck')).toBe(false);expect(validateWorld(w)).toEqual([]);
  until(w,()=>p.haul?.phase==='deliver');const carried=serializeWorld(w);command(w,{type:'priority',pawnId:p.id,work:'hunt',value:0});expect(p.haul).toBeNull();expect(w.piles.find(i=>i.id===a.id)?.owner.type).toBe('ground');expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(carried).pawns[0]!.haul?.destination).toMatchObject({forHunting:true});
  const recovered=make();recovered.a.health!.bloodLoss=0;reconcileAnimalHealth(recovered.w,recovered.a);stepWorld(recovered.w);expect(recovered.p.hunting?.phase).not.toBe('finish');expect(recovered.a.health!.death).toBeUndefined();expect(recovered.a.health!.injuries.some(i=>i.kind==='execution-cut')).toBe(false);expect(validateWorld(recovered.w)).toEqual([]);
  const canceled=make();command(canceled.w,{type:'hunt',animalId:canceled.a.id,enabled:false});stepWorld(canceled.w,25);expect(canceled.p.hunting).toBeUndefined();expect(canceled.a.health!.death).toBeUndefined();expect(canceled.a.health!.injuries.some(i=>i.kind==='execution-cut')).toBe(false);
  const stopped=make();stopped.p.health={...createMedicalRecord(stopped.w.tick),bloodLoss:BLOOD_UNIT*.7};reconcilePawnHealth(stopped.w,stopped.p);stepWorld(stopped.w,25);expect(stopped.p.hunting).toBeUndefined();expect(stopped.p.state).toBe('downed');expect(stopped.a.health!.death).toBeUndefined();expect(validateWorld(stopped.w)).toEqual([]);
  const natural=make();natural.a.health!.bloodLoss=BLOOD_UNIT;reconcileMedicalDeath(natural.a.health!);reconcileAnimalHealth(natural.w,natural.a);stepWorld(natural.w);expect(natural.w.piles.find(i=>i.id===natural.a.id)?.corpse!.health.death?.cause).toBe('blood-loss');expect(validateWorld(natural.w)).toEqual([]);
  const trauma=huntingCamp(),h=trauma.pawns[0]!,prey=trauma.wildlife!.animals[0]!;h.x=9;h.z=10;prey.health={...createMedicalRecord(trauma.tick),body:'hare'};
  for(const [part,damage] of [['torso',15000],['neck',7000],['left-rear-leg',1000],['left-front-leg',7000],['right-front-leg',7000],['head',9000],['skull',7500],['left-ear',3000],['right-ear',3000]] as const)addResolvedInjury(prey.health,part,'bruise',damage,()=>.99);
  reconcileAnimalHealth(trauma,prey);expect(prey.state).toBe('downed');command(trauma,{type:'hunt',animalId:prey.id,enabled:true});until(trauma,()=>trauma.piles.some(i=>i.id===prey.id));expect(trauma.piles.find(i=>i.id===prey.id)!.corpse!.health.death?.cause).toBe('trauma');expect(validateWorld(trauma)).toEqual([]);
});

test('civilian hunting yields to hunger, sleep and danger, without overlapping recreation or recalling fired bullets',()=>{
  const aiming=()=>{const w=huntingCamp(),p=w.pawns[0]!;command(w,{type:'hunt',animalId:w.wildlife!.animals[0]!.id,enabled:true});until(w,()=>p.shooting?.stance?.phase==='aim');return {w,p};};
  const leisure=aiming();leisure.p.schedule.fill('recreation');leisure.p.recreation.level=0;leisure.p.needCooldown=0;
  stepWorld(leisure.w);expect(leisure.p.hunting).toBeDefined();expect(leisure.p.recreation.task).toBeNull();expect(validateWorld(leisure.w)).toEqual([]);
  const sleep=aiming();sleep.p.schedule.fill('sleep');sleep.p.rest=20;sleep.p.needCooldown=0;
  stepWorld(sleep.w);expect(sleep.p.need?.kind).toBe('sleep');expect(sleep.p.hunting).toBeUndefined();expect(sleep.p.shooting).toBeUndefined();expect(validateWorld(sleep.w)).toEqual([]);
  const food=aiming();food.p.hunger=20;food.p.needCooldown=0;addMaterial(food.w,'food',1,{type:'ground',x:food.p.x,z:food.p.z},'simple-meal');
  stepWorld(food.w);expect(food.p.need?.kind).toBe('eat');expect(food.p.hunting).toBeUndefined();expect(units(food.w,'simple-meal')).toBe(1);expect(validateWorld(food.w)).toEqual([]);
  for(const fired of [false,true]){
    const {w,p}=aiming();if(fired)until(w,()=>!!w.projectiles?.length);
    const enemy=structuredClone(w.pawns[1]!);enemy.id=w.nextId++;enemy.name='Menace';enemy.faction='outlaws';enemy.x=p.x+1;enemy.z=p.z;w.pawns.push(enemy);
    const projectiles=structuredClone(w.projectiles),rng=w.rng,cooldown=p.shooting?.stance?.phase==='cooldown'?structuredClone(p.shooting.stance):undefined;
    p.hostilityResponse='ignore';considerFlee(w,p,threatQueries(w));expect(p.flee).toBeUndefined();expect(p.hunting).toBeDefined();delete p.hostilityResponse;
    considerFlee(w,p,threatQueries(w));expect(p.flee).toBeDefined();expect(p.hunting).toBeUndefined();expect(p.shooting?.order??null).toBeNull();expect(w.projectiles).toEqual(projectiles);expect(w.rng).toBe(rng);
    if(cooldown)expect(p.shooting?.stance).toEqual(cooldown);else expect(p.shooting).toBeUndefined();
    expect(validateWorld(w)).toEqual([]);const copy=deserializeWorld(serializeWorld(w));stepWorld(w,10);stepWorld(copy,10);expect(copy).toEqual(w);expect(validateWorld(w)).toEqual([]);
  }
  const attack=aiming();attack.p.hostilityResponse='attack';
  considerAutomaticCombat(attack.w,attack.p,{remaining:4,pairs:32768});expect(attack.p.hunting).toBeDefined();
  const enemy=structuredClone(attack.w.pawns[1]!);enemy.id=attack.w.nextId++;enemy.name='Menace';enemy.faction='outlaws';enemy.x=attack.p.x;enemy.z=attack.p.z+4;attack.w.pawns.push(enemy);
  considerAutomaticCombat(attack.w,attack.p,{remaining:4,pairs:32768});expect(attack.p.hunting).toBeUndefined();expect(attack.p.shooting?.order).toMatchObject({targetId:enemy.id,auto:{kind:'response'}});expect(validateWorld(attack.w)).toEqual([]);
});
