import { encounterDecisions } from './scenarios/colony-player';
import type { Command } from '../src/sim/types';
import { clearQueuedOrders } from '../src/sim/player-orders';
import { test,expect } from 'vitest';
import { applyCommand,createWorld,stepWorld,validateWorld,serializeWorld,deserializeWorld } from '../src/sim/index';
import { encounterCamp,rescueEncounter } from './scenarios/encounter';
import { medicalCarrier,controlledInjury } from './scenarios/health';
import { startingPawn } from '../src/sim/starting-pawns';
import { isColonist,hostileTo } from '../src/sim/affiliation';
import { setupEncounter } from '../src/sim/encounter-scenario';
import { blockedCells,canStep,reachableCells,routeToCell } from '../src/sim/pathfinding';
import { candidateAccess } from '../src/sim/candidate-access';
import { readyDoorEntry } from '../src/sim/doors';
import { newDoorState } from '../src/sim/door-rules';
import { startTravel } from '../src/sim/movement';
import { fixtureBuilding } from './scenarios/deconstruction';
import { threatQueries,considerFlee } from '../src/sim/threats';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots';

test('autonomous sentry fires with real anatomy, hostile XP, captured relations and exact phase continuation',()=>{
  const w=encounterCamp(),enemy=w.pawns[3],xp=enemy.skills.shooting.xp,encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  stepWorld(w);expect(enemy.shooting?.order?.targetId).toBe(w.pawns[0].id);
  const copies=[deserializeWorld(serializeWorld(w))];let injury=false,emitted=false;
  for(let i=0;i<28;i++){
    stepWorld(w);for(const c of copies){stepWorld(c);expect(c).toEqual(w);}
    expect(validateWorld(w)).toEqual([]);
    const message=decoder.adopt(structuredClone(encoder.encode(w,0,6)));expect(message.status).toBe('applied');if(message.status==='applied')expect(message.world).toEqual(w);
    if(i<8)copies.push(deserializeWorld(serializeWorld(w)));
    if(enemy.skills.shooting.xp>xp){emitted=true;expect((enemy.skills.shooting.xp-xp)%323000).toBe(0);}
    injury ||= !!w.pawns[0].health;
  }
  expect(emitted).toBe(true);expect(injury).toBe(true);expect(enemy.draft).toBeUndefined();
});

test('affiliation does not grant player control, colony services or friendly targets; direct refusals remain atomic',()=>{
  const w=encounterCamp(),enemy=w.pawns[3];expect(hostileTo(w.pawns[0],enemy)).toBe(true);expect(hostileTo(enemy,{faction:'outlaws'})).toBe(false);
  for(const c of [{type:'draft',pawnIds:[enemy.id],enabled:true},{type:'priority',pawnId:enemy.id,work:'mine',value:1},{type:'hostility-response',pawnId:enemy.id,response:'ignore'},{type:'shoot',pawnIds:[enemy.id],targetId:w.pawns[0].id}] as Command[]){const before=serializeWorld(w);expect(applyCommand(w,c).ok).toBe(false);expect(serializeWorld(w)).toBe(before);}
  controlledInjury(w,enemy,'left-leg',30000);controlledInjury(w,enemy,'right-leg',30000);w.pawns[1].priorities.doctor=1;
  const bed=fixtureBuilding(w,'bed',4,25);Object.assign(bed,{medical:true});
  expect(applyCommand(w,{type:'order-rescue',pawnId:w.pawns[1].id,patientId:enemy.id,queue:false}).ok).toBe(false);
  stepWorld(w,20);expect(w.pawns[1].rescue).toBeUndefined();expect(validateWorld(w)).toEqual([]);
});

test('civilian flees from visible proximity, preserves a moving load, continues after save and returns to work eligibility',()=>{
  const w=medicalCarrier(),p=w.pawns[0],enemy=startingPawn(w.nextId++,'Menace',p.x+6,p.z,0,100);enemy.faction='outlaws';w.pawns.push(enemy);
  const carried=w.piles.find(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id)!;expect(carried).toBeDefined();
  const amount=w.piles.filter(i=>i.item===carried.item).reduce((a,b)=>a+b.quantity,0);
  clearQueuedOrders(w,p);p.orders.active=null;delete p.priorityWork;expect(startTravel(w,p,{x:p.x,z:p.z+1})).toBe(true);const motion=structuredClone(p.motion);
  stepWorld(w);expect(p.flee).toBeDefined();expect(p.interruptedCargo).toBe(true);expect(p.motion).toEqual(motion);expect(carried.owner).toEqual({type:'pawn',pawnId:p.id});
  const copy=deserializeWorld(serializeWorld(w));let moved=false,ended=false;
  for(let i=0;i<280;i++){stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);expect(validateWorld(w)).toEqual([]);moved ||= p.x!==motion!.to.x||p.z!==motion!.to.z;ended ||= !p.flee;}
  expect(moved).toBe(true);expect(ended).toBe(true);expect(w.piles.filter(i=>i.item===carried.item).reduce((a,b)=>a+b.quantity,0)).toBe(amount);
});

test('visibility, forced work and ignore suppress automatic fleeing; room refuge is preferred to open ground',()=>{
  const w=encounterCamp(),p=w.pawns[0],enemy=w.pawns[3];delete p.draft;enemy.x=12;
  fixtureBuilding(w,'wall',9,10);considerFlee(w,p,threatQueries(w));expect(p.flee).toBeUndefined();w.structures=[];
  p.orders.active=1;considerFlee(w,p,threatQueries(w));expect(p.flee).toBeUndefined();p.orders.active=null;
  applyCommand(w,{type:'hostility-response',pawnId:p.id,response:'ignore'});considerFlee(w,p,threatQueries(w));expect(p.flee).toBeUndefined();
  applyCommand(w,{type:'hostility-response',pawnId:p.id,response:'flee'});considerFlee(w,p,threatQueries(w));expect(p.flee).toBeDefined();
  applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:true});expect(p.flee).toBeUndefined();expect(validateWorld(w)).toEqual([]);
  applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:false});
  for(let z=7;z<=13;z++)for(let x=1;x<=5;x++)if(x===1||x===5||z===7||z===13){
    const b=fixtureBuilding(w,x===5&&z===10?'door':'wall',x,z);if(b.kind==='door')Object.assign(b,{material:'wood',door:newDoorState(w.tick)});
  }
  stepWorld(w);expect(p.flee?.target.x).toBeLessThan(5);expect(p.flee?.target.x).toBeGreaterThan(1);
  expect(validateWorld(w)).toEqual([]);
  // A newly accepted direct job overrides fleeing, including an engaged edge.
  w.resources.push({id:w.nextId++,kind:'tree',x:6,z:11,amount:12});
  expect(applyCommand(w,{type:'designate',kind:'chop',x:6,z:11}).ok).toBe(true);p.priorities.gather=1;
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:w.jobs.at(-1)!.id,queue:false}).ok).toBe(true);
  expect(p.flee).toBeUndefined();expect(validateWorld(w)).toEqual([]);

});

test('one collision contract for queries and following: enemies, moving endpoints, diagonals and door permission',()=>{
  const w=encounterCamp(),p=w.pawns[0],enemy=w.pawns[3];enemy.x=7;enemy.z=10;
  let blocked=blockedCells(w);const occupied=new Set<number>();expect(canStep(w,p,enemy,blocked,occupied)).toBe(false);expect(startTravel(w,p,enemy)).toBe(false);
  expect(candidateAccess(w,p,blocked,occupied).has(enemy.z*w.width+enemy.x)).toBe(false);
  expect(routeToCell(w,enemy,reachableCells(w,p,blocked,occupied))).toBeNull();
  expect(canStep(w,p,{x:7,z:11},blocked,occupied)).toBe(false);
  expect(applyCommand(w,{type:'shoot',pawnIds:[p.id],targetId:enemy.id})).toMatchObject({ok:false,reason:expect.stringContaining('adjacent')});
  enemy.x=10;enemy.z=12;const door={...fixtureBuilding(w,'door',10,11),door:newDoorState(w.tick)};w.structures[w.structures.length-1]=door;
  expect(readyDoorEntry(w,enemy,door)).toBe(false);expect(door.door.open).toBe(false);
  expect(candidateAccess(w,enemy,blockedCells(w),occupied).has(11*w.width+10)).toBe(false);
  Object.assign(door.door,{open:true,from:1,forbidden:true,changedAt:w.tick});blocked=blockedCells(w);
  expect(candidateAccess(w,enemy,blocked,occupied).has(11*w.width+10)).toBe(true);expect(canStep(w,enemy,door,blocked,occupied)).toBe(true);expect(readyDoorEntry(w,enemy,door)).toBe(true);
  p.x=10;p.z=10;expect(readyDoorEntry(w,p,door)).toBe(false);
  enemy.x=13;enemy.z=10;expect(startTravel(w,enemy,{x:12,z:10})).toBe(true);p.x=14;
  expect(canStep(w,p,{x:13,z:10},blocked,occupied)).toBe(false);
  // A downed enemy can recover while somebody crosses its cell. That does not
  // revoke a captured edge or make the continuation unloadable.
  const waking=encounterCamp(),civil=waking.pawns[0],other=waking.pawns[3];
  other.x=civil.x+1;other.state='downed';
  expect(startTravel(waking,civil,{x:other.x,z:other.z})).toBe(true);civil.state='moving';
  other.state='idle';expect(validateWorld(waking)).toEqual([]);expect(deserializeWorld(serializeWorld(waking))).toEqual(waking);

});

test('new encounter is reproducible, opt-in and separated from strict V57 migration',()=>{
  const w=createWorld(42,64,64),same=createWorld(42,64,64);setupEncounter(w);setupEncounter(same);expect(w).toEqual(same);expect(validateWorld(w)).toEqual([]);expect(w.pawns.filter(isColonist)).toHaveLength(3);
  const legacy=structuredClone(createWorld()) as any;legacy.schemaVersion=57;const skills=legacy.pawns.map((p:any)=>structuredClone(p.skills));for(const p of legacy.pawns)delete p.skills.melee;const migrated=deserializeWorld(JSON.stringify(legacy));expect(migrated).toEqual({...legacy,schemaVersion:59,pawns:legacy.pawns.map((p:any,i:number)=>({...p,skills:skills[i]}))});
  legacy.pawns[0].faction='outlaws';expect(()=>deserializeWorld(JSON.stringify(legacy))).toThrow(/version 57/);
  for(const bad of [null,{}, {target:{x:1,z:1},until:-1},{target:{x:1,z:1},until:w.tick+999}]){const invalid=structuredClone(w);(invalid.pawns[0] as any).flee=bad;expect(validateWorld(invalid).length).toBeGreaterThan(0);}
});


test('player encounter → downed ally → directed defense → physical rescue and medicine, then one day of recovery',()=>{
  const w=rescueEncounter(),patient=w.pawns[0],doctor=w.pawns[2];
  Object.assign(fixtureBuilding(w,'bed',5,25),{medical:true});
  Object.assign(fixtureBuilding(w,'bed',8,25),{medical:true});
  let copy:typeof w|undefined,carried=false,treated=false,defended=false;
  for(let i=0;i<6200;i++){
    for(const decision of encounterDecisions(w)){expect(applyCommand(w,decision.command),decision.reason).toEqual({ok:true});if(copy)expect(applyCommand(copy,decision.command)).toEqual({ok:true});defended=true;}
    stepWorld(w);if(copy){stepWorld(copy);expect(JSON.stringify(copy)).toBe(JSON.stringify(w));}
    if(doctor.rescue?.phase==='carry'){carried=true;if(!copy)copy=deserializeWorld(serializeWorld(w));}
    treated ||= !!patient.health?.injuries.some(j=>j.tended!==undefined);
    if(i%50===0)expect(validateWorld(w)).toEqual([]);
    // Keep an exact checkpoint through rescue/treatment, then sample a day independently.
    if(copy&&treated&&i>500)copy=undefined;
  }
  expect(defended).toBe(true);expect(carried).toBe(true);expect(treated).toBe(true);
  expect(patient.state).not.toBe('dead');expect(doctor.skills.medicine.xp).toBeGreaterThan(0);
  expect(w.pawns[3].rescue).toBeUndefined();expect(validateWorld(w)).toEqual([]);
});
