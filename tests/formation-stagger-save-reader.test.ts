import {expect,test} from 'vitest';
import {prepareGroupScenario} from '../src/sim/group-scenario.ts';
import {applyCommand,advanceWorldCore297} from '../src/sim/engine.ts';
import {GroupCampaignRuntime256} from '../src/sim/group-campaign-runtime-256.ts';
import {createGroupCampaignGeometry256} from '../src/sim/group-campaign-geometry-256.ts';
import {GroupCaravanPhysical256} from '../src/sim/group-caravan-physical-256.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {effectiveCore297} from '../src/sim/core-phase-297.ts';
import {applyBulletStagger} from '../src/sim/stagger.ts';
import {groupHumanAdmissionReason257,previewGroupHumanPreparation257,validGroupHumanPreparation257} from '../src/sim/group-human-admission-257.ts';
import type {PreparingGroup} from '../src/sim/group-capture.ts';
import type {World,Pawn} from '../src/sim/types.ts';

/* DECLARED diagnostic32x32 ordinary formation, not a mission/recovery import.
 * Real planet-adopt/group-start commands are admitted before any fault; the
 * requested9(or19) physical Core really run. Then a declared diagnostic bullet
 * stagger is applied by the actual producer, without projectile/damage/RNG claim.
 * No actual mission state, skill/health grant, RAW schema renumbering or frame
 * rewind. Portable imports must all resolve in ONE selected product graph. */
function preparedFormation(cores=9){
 const w=prepareGroupScenario();
 expect(applyCommand(w,{type:'planet-adopt'}).ok).toBe(true);
 const runtime=new GroupCampaignRuntime256(createGroupCampaignGeometry256(w),new GroupCaravanPhysical256());runtime.bootstrap(w);
 w.home=[...new Set(w.piles.flatMap(p=>p.owner.type==='ground'?[p.owner.z*w.width+p.owner.x]:[]))].sort((a,b)=>a-b);
 expect(validateWorld(w)).toEqual([]);
 const p=w.pawns[0]!,food=w.piles.find(q=>q.owner.type==='ground'&&q.item==='survival-meal'&&q.quantity>=6)!;
 expect(food).toBeDefined();const destination=w.planet!.civilianTile;if(destination===null||destination===undefined)throw Error('Declared actual destination missing');
 expect(applyCommand(w,{type:'group-start',originMapId:0,memberIds:[p.id],sources:[{pileId:food.id,quantity:6}],destination},runtime).ok).toBe(true);
 const id=w.worldGroups!.selectedGroupId!;expect(id).not.toBeNull();
 expect(effectiveCore297(w)).toBe(0);
 for(let n=0;n<cores;n++)expect(advanceWorldCore297(w,undefined,runtime).core).toBe(n+1);
 const row=w.worldGroups!.groups.find(g=>g.state.id===id);expect(row).toBeDefined();
 if(!row||!('manifest'in row.state))throw Error('Ordinary preparing original missing');const g=row.state as PreparingGroup;
 expect(g.humanPreparation).toBeDefined();expect(g.memberIds).toEqual([p.id]);expect(w.pawns).toContain(p);expect(validateWorld(w)).toEqual([]);
 return {w,p,g};
}
function faultCurrentStagger(w:World,p:Pawn){const now=effectiveCore297(w),rng=w.rng,next=w.nextId;applyBulletStagger(w,p,now,1);expect(p.stagger).toEqual({sinceCore:now,untilCore:now+95});expect(w.rng).toBe(rng);expect(w.nextId).toBe(next);}
const validHuman=(w:World,g:PreparingGroup)=>validGroupHumanPreparation257(g.humanPreparation,w,g,w.schemaVersion);

test('a real admitted formation at playedCore9 saves and owns-reloads the exact current-window stagger while fresh admission still refuses',()=>{
 const {w,p,g}=preparedFormation();expect(w.phaseCore297).toBe(9);faultCurrentStagger(w,p);
 const observed=JSON.stringify(w),core=effectiveCore297(w),rng=w.rng,next=w.nextId,edge=JSON.stringify(p.motion),path=JSON.stringify(p.path);
 expect(groupHumanAdmissionReason257(w,p,true)).toBeDefined();expect(previewGroupHumanPreparation257(w,[p],()=>true).ok).toBe(false);
 expect(validHuman(w,g)).toBe(true);expect(validateWorld(w)).toEqual([]);expect(serializeWorld(w)).toBe(observed);
 expect(JSON.stringify(w)).toBe(observed);expect(w.pawns).toContain(p);expect(w.worldGroups!.groups.some(row=>row.state===g)).toBe(true);
 expect(JSON.stringify(p.motion)).toBe(edge);expect(JSON.stringify(p.path)).toBe(path);
 const loaded=deserializeWorld(observed);expect(serializeWorld(loaded)).toBe(observed);expect(effectiveCore297(loaded)).toBe(core);expect(loaded.rng).toBe(rng);expect(loaded.nextId).toBe(next);
 expect(loaded.pawns.find(q=>q.id===p.id)?.stagger).toEqual(p.stagger);expect(effectiveCore297(w)).toBe(core);
});

test('phase0, a macro-born or older stagger, future birth and expired timers never gain the saved fine-window exception',()=>{
 const cases:[string,(w:World,p:Pawn)=>void,number][]=[
  ['phase0',()=>{},0],
  ['born-at-macro',(w,p)=>{p.stagger={sinceCore:w.tick*10,untilCore:w.tick*10+95};},9],
  ['older-than-macro',(w,p)=>{p.stagger={sinceCore:w.tick*10-1,untilCore:w.tick*10+94};},19],
  ['future-birth',(w,p)=>{const core=effectiveCore297(w);p.stagger={sinceCore:core+1,untilCore:core+96};},9],
  ['expired-at-current',(w,p)=>{const core=effectiveCore297(w);p.stagger={sinceCore:core-95,untilCore:core};},99],
 ];
 for(const [label,mutate,cores]of cases){const {w,p,g}=preparedFormation(cores);faultCurrentStagger(w,p);mutate(w,p);const before=JSON.stringify(w);
  expect(validHuman(w,g),label).toBe(false);expect(validateWorld(w).length,label).toBeGreaterThan(0);expect(()=>deserializeWorld(before),label).toThrow();expect(JSON.stringify(w),label).toBe(before);
 }
});

test('a current-window stagger does not mask combined stun, cargo/combat, missing ownership or malformed passenger formation',()=>{
 const cases:[string,(w:World,p:Pawn,g:PreparingGroup)=>void][]=[
  ['stun',(w,p)=>{Object.assign(p,{stun:{sinceCore:effectiveCore297(w),untilCore:effectiveCore297(w)+30}});}],
  ['cargo',(_w,p)=>{p.equipmentDropPending=true;}],
  ['combat',(_w,p)=>{Object.assign(p,{melee:{}});}],
  ['owner-absent',(w,p)=>{w.pawns=w.pawns.filter(q=>q!==p);}],
  ['self-passenger',(_w,p,g)=>{g.humanPreparation!.passengers=[{pawnId:p.id,carrierId:p.id,phase:'carry'}];}],
 ];
 for(const [label,mutate]of cases){const {w,p,g}=preparedFormation();faultCurrentStagger(w,p);mutate(w,p,g);const before=JSON.stringify(w);
  expect(validHuman(w,g),label).toBe(false);expect(validateWorld(w).length,label).toBeGreaterThan(0);expect(()=>deserializeWorld(before),label).toThrow();expect(JSON.stringify(w),label).toBe(before);
 }
});