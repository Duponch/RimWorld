import type {CampaignState} from '../../src/sim/world-map-state.ts';
import {expect} from 'vitest';
import {registryCamp} from './world-maps-v255.ts';
import {applyCommand,stepWorld,serializeCampaign,deserializeCampaign,validateWorld} from '../../src/sim/index.ts';
import {registeredMap,flushRegisteredMap} from '../../src/sim/world-map-context.ts';
import {GroupCampaignRuntime256} from '../../src/sim/group-campaign-runtime-256.ts';
import {GroupCaravanPhysical256} from '../../src/sim/group-caravan-physical-256.ts';
import {createGroupCampaignGeometry256} from '../../src/sim/group-campaign-geometry-256.ts';
import {createMedicalRecord,addResolvedInjury,medicalStatus} from '../../src/sim/injury-state.ts';
import {addMaterial,refreshStock} from '../../src/sim/materials.ts';
import {writeTestFileSync} from '../test-output.ts';
import type {Command,World,Pawn,Cell} from '../../src/sim/types.ts';

export const contact=(a:Cell,b:Cell)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z)<=1;
export function harness(w=registryCamp()){
 const runtime=new GroupCampaignRuntime256(createGroupCampaignGeometry256(w),new GroupCaravanPhysical256());runtime.bootstrap(w);
 const map=registeredMap(w,w.worldMaps!.rootMapId!)!;
 const command=(c:Command)=>{const result=applyCommand(w,c,runtime);expect(result.ok,result.reason??JSON.stringify(c)).toBe(true);};
 const step=()=>stepWorld(w,1,undefined,runtime);
 const until=(predicate:()=>boolean,limit=1600)=>{for(let i=0;i<limit&&!predicate();i++)step();expect(predicate(),JSON.stringify({tick:w.tick,groups:w.worldGroups!.groups.map(r=>({id:r.state.id,phase:r.state.phase})),events:w.worldGroups!.events.slice(-3)})).toBe(true);};
 const start=(members:readonly Pawn[],quantity=4)=>{const food=map.piles.find(p=>p.item==='survival-meal'&&p.owner.type==='ground'&&p.quantity>=quantity);if(!food)throw Error('Declared finite rations absent');command({type:'group-start',originMapId:w.worldMaps!.rootMapId!,memberIds:members.map(p=>p.id),sources:[{pileId:food.id,quantity}],destination:52});return w.worldGroups!.selectedGroupId!;};
 return {w,map,runtime,command,step,until,start};
}
export type Harness=ReturnType<typeof harness>;
export function group(f:Harness,id:number){const r=f.w.worldGroups!.groups.find(r=>r.state.id===id);if(!r)throw Error('Actual group absent');return r.state;}
export function preparing(f:Harness,id:number){const g=group(f,id);if(!('manifest'in g))throw Error('Actual local preparation absent');return g;}
export function away(f:Harness,id:number){const g=group(f,id);if(!('members'in g))throw Error('Actual away owner absent');return g;}
export function reachCarry(f:Harness,id:number,patient:Pawn,carrier:Pawn){
 let pickup=false;
 for(let n=0;n<600;n++){
  const row=preparing(f,id).humanPreparation!.passengers.find(r=>r.pawnId===patient.id)!;
  const before={phase:row.phase,tick:f.w.tick,carrier:{x:carrier.x,z:carrier.z},patient:{x:patient.x,z:patient.z},carrierEnd:carrier.motion?.end??0,patientEnd:patient.motion?.end??0};
  f.step();const next=preparing(f,id).humanPreparation!.passengers.find(r=>r.pawnId===patient.id)!;
  if(before.phase==='approach'&&next.phase==='carry'){pickup=true;expect(contact(before.carrier,before.patient)).toBe(true);expect(before.carrierEnd).toBeLessThanOrEqual(f.w.tick);expect(before.patientEnd).toBeLessThanOrEqual(f.w.tick);}
  if(next.phase==='carry'&&carrier.motion&&carrier.motion.end>f.w.tick){expect(pickup).toBe(true);return;}
 }
 throw Error('Actual contact pickup and carry edge not reached inside600 ticks');
}
export function exact(w:CampaignState,name:string){
 // Preserve complete evidence before assertions; these writes happen only when ROOT executes.
 writeTestFileSync(`artifacts/group-admission-v412/${name}.json`,JSON.stringify(w));
 if(!('pawns'in w))throw Error('This admission checkpoint requires its actual loaded map');
 expect(validateWorld(w)).toEqual([]);const raw=serializeCampaign(w),copy=deserializeCampaign(raw);
 expect(serializeCampaign(copy)).toBe(raw);return copy;
}
export function resumed(w:World){const loaded=deserializeCampaign(serializeCampaign(w));if(!('pawns'in loaded))throw Error('Carry replay requires its actual loaded map');return harness(loaded);}
/** Declared initial medical preparation, no injury/treatment chronology claimed. */
export function downed(f:Harness){
 const patient=f.map.pawns[1]!;patient.health=createMedicalRecord(f.w.tick);
 for(const part of ['left-arm','right-arm','left-leg','right-leg'] as const)addResolvedInjury(patient.health,part,'bruise',16000,()=>.9);
 addResolvedInjury(patient.health,'torso','bruise',8000,()=>.9);expect(medicalStatus(patient.health)).toBe('downed');patient.state='downed';
 addMaterial(f.map,'silver',7,{type:'inventory',pawnId:patient.id},'silver');const silver=f.map.piles.at(-1)!;
 flushRegisteredMap(f.map);return {patient,carrier:f.map.pawns[0]!,silver};
}
/** Finite prepared wood/storage; the task, pickup and captured edge are REAL. */
export function carryingWork(){
 const f=harness(),p=f.map.pawns[0]!;
 addMaterial(f.map,'wood',20,{type:'ground',x:4,z:23},'wood');const source=f.map.piles.at(-1)!,sourceCell={x:4,z:23};refreshStock(f.map);flushRegisteredMap(f.map);
 f.command({type:'priority',pawnId:p.id,work:'haul',value:1});
 f.command({type:'stockpile',x:27,z:23,enabled:true,capacity:75,filters:{wood:true,food:false}});
 f.command({type:'order-haul',pawnId:p.id,target:{type:'pile',pileId:source.id},queue:false});
 f.until(()=>f.map.piles.some(i=>i.item==='wood'&&i.owner.type==='pawn'&&i.owner.pawnId===p.id),250);
 expect(contact(p,sourceCell)).toBe(true);
 const cargo=f.map.piles.find(i=>i.item==='wood'&&i.owner.type==='pawn'&&i.owner.pawnId===p.id)!;
 f.until(()=>!!p.motion&&p.motion.end>f.w.tick&&p.moveCooldown>0,40);
 expect(p.haul?.phase).toBe('deliver');expect(cargo.owner).toEqual({type:'pawn',pawnId:p.id});
 return {...f,p,cargo,source};
}
