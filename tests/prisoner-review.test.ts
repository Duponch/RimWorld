import { expect,test } from 'vitest';
import { prisonerUiFixture,recruitmentUiFixture } from './scenarios/prison-camp.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { reconcilePawnHealth } from '../src/sim/health.ts';
import { processRescue } from '../src/sim/rescue.ts';
import { exitRaider } from '../src/sim/raids.ts';
import { addGroundMaterial } from '../src/sim/materials.ts';
import { groundCapacity,groundPile,nearbyGround } from '../src/sim/ground-placement.ts';
import { planCommandDrops } from '../src/sim/work-release.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { TICKS_PER_DAY,type Command,type World } from '../src/sim/types.ts';

const valid=(world:World)=>expect(validateWorld(world),`tick ${world.tick}`).toEqual([]);
function command(world:World,value:Command):void {
  expect(applyCommand(world,value)).toMatchObject({ok:true});valid(world);
}
function until(world:World,done:()=>boolean,max=700):void {
  for(let n=0;n<max&&!done();n++){stepWorld(world);valid(world);}
  expect(done(),`condition not reached at ${world.tick}`).toBe(true);
}

test('admission of a recovered carried captive stays valid for either actor ID order and either bed role',()=>{
  for(const medical of [false,true])for(const reverseIds of [false,true]){
    const {world,bedId}=prisonerUiFixture(),actor=world.pawns[0]!,patient=world.pawns[2]!;
    if(reverseIds)[actor.id,patient.id]=[patient.id,actor.id];
    command(world,{type:'prison-bed',bedId,enabled:true});
    if(medical)command(world,{type:'medical-bed',bedId,enabled:true});
    command(world,{type:'order-capture',pawnId:actor.id,patientId:patient.id,queue:false});
    until(world,()=>actor.rescue?.phase==='carry');
    patient.health!.bloodLoss=0;reconcilePawnHealth(world,patient);valid(world);
    expect(patient.state).not.toBe('downed');expect(patient.prisoner).toBeUndefined();
    until(world,()=>!!patient.prisoner);
    expect(actor.rescue).toBeUndefined();expect(patient.state).not.toBe('downed');
    if(medical)expect(patient.bedId).toBeNull();
    const copy=deserializeWorld(serializeWorld(world));
    stepWorld(world,30);stepWorld(copy,30);valid(world);
    expect(serializeWorld(copy)).toBe(serializeWorld(world));
  }
});

test('a recovered retreating raider at the border cannot depart while physically carried',()=>{
  const {world,bedId}=prisonerUiFixture(),actor=world.pawns[0]!,patient=world.pawns[2]!;
  // Boundary checkpoint: an old defeated raid and pickup at a map edge. The
  // no-op mover models a navigation-budget wait after the actual pickup.
  actor.x=patient.x=0;actor.z=patient.z=16;
  patient.raid={group:1,exiting:true,goal:null};
  world.raids={profile:'camp-raids-v1',rng:1,nextCheck:world.tick+6*TICKS_PER_DAY,serial:1,completed:1,departed:[],
    last:{id:1,tick:world.tick,reason:'defended',killed:0,downed:1,escaped:0}};
  command(world,{type:'prison-bed',bedId,enabled:true});
  command(world,{type:'order-capture',pawnId:actor.id,patientId:patient.id,queue:false});
  processRescue(world,actor,{search:()=>null,move:()=>{},release:()=>false,event:()=>{}});
  expect(actor.rescue).toMatchObject({phase:'carry',capture:true});valid(world);
  patient.health!.bloodLoss=0;reconcilePawnHealth(world,patient);valid(world);
  const before=serializeWorld(world),copy=deserializeWorld(before),restored=copy.pawns.find(p=>p.id===patient.id)!;
  expect(exitRaider(world,patient)).toBe(false);expect(exitRaider(copy,restored)).toBe(false);
  expect(serializeWorld(world)).toBe(before);expect(serializeWorld(copy)).toBe(before);
  command(world,{type:'clear-orders',pawnId:actor.id});
  expect(patient.x).toBe(0);expect(patient.z).toBe(16);expect(patient.prisoner).toBeUndefined();
  expect(exitRaider(world,patient)).toBe(true);expect(world.raids!.departed.map(d=>d.pawnId)).toEqual([patient.id]);valid(world);
});

test('an escape blocked by a full floor preserves and finishes the engaged meal before departure',()=>{
  const {world,patientId}=recruitmentUiFixture(),patient=world.pawns.find(p=>p.id===patientId)!;
  patient.hunger=20;
  addGroundMaterial(world,'food',1,{x:9,z:9},'survival-meal');
  until(world,()=>patient.need?.kind==='eat'&&patient.need.phase==='ingest');
  if(patient.need?.kind!=='eat')throw Error('An actual meal must be engaged.');
  const mealId=patient.need.carryPileId!,initialProgress=patient.need.progress;
  const door=world.structures.find(s=>s.kind==='door')!;
  // Opening and saturation are boundary preparation. The pickup, ingestion,
  // failed drop, route and eventual escape use the ordinary game processors.
  world.structures=world.structures.filter(s=>s!==door);
  for(const cell of nearbyGround(world,patient))if(!groundPile(world,cell)&&groundCapacity(world,cell,'wood')>0)addGroundMaterial(world,'wood',1,cell);
  expect(planCommandDrops(world,{type:'clear-orders',pawnId:patient.id})).toBeNull();
  const foodBefore=world.piles.filter(p=>p.kind==='food').reduce((sum,p)=>sum+p.quantity,0),hungerBefore=patient.hunger;
  stepWorld(world);valid(world);
  expect(patient.need).toMatchObject({kind:'eat',phase:'ingest',carryPileId:mealId});
  expect(patient.need?.kind==='eat'&&patient.need.progress).toBeGreaterThan(initialProgress);
  expect(patient.prisoner?.escape).toBeUndefined();expect(patient.hunger).toBeLessThan(hungerBefore);
  expect(world.piles.find(p=>p.id===mealId)?.owner).toEqual({type:'pawn',pawnId:patient.id});
  const copy=deserializeWorld(serializeWorld(world));
  stepWorld(world,8);stepWorld(copy,8);valid(world);expect(serializeWorld(copy)).toBe(serializeWorld(world));
  expect(world.piles.filter(p=>p.kind==='food').reduce((sum,p)=>sum+p.quantity,0)).toBe(foodBefore);
  until(world,()=>!world.piles.some(p=>p.id===mealId),80);
  expect(patient.hunger).toBeGreaterThan(50);
  expect(world.piles.filter(p=>p.kind==='food').reduce((sum,p)=>sum+p.quantity,0)).toBe(foodBefore-1);
  until(world,()=>!!patient.prisoner?.escape,30);
  expect(patient.need).toBeNull();expect(world.events.some(e=>e.message.includes('s’échappe'))).toBe(true);
});
