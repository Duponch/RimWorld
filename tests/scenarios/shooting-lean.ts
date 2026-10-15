/* PRIVATE adoption destination: tests/scenarios/shooting-lean.ts.
 * Declared32² unit fixtures; never mutate a campaign save. */
import {expect} from 'vitest';
import {firingCamp} from './shooting';
import {fixtureBuilding} from './deconstruction';
import {addMaterial} from '../../src/sim/materials';
import {applyCommand,stepWorld} from '../../src/sim/engine';
import {serializeWorld,deserializeWorld,validateWorld} from '../../src/sim/serialization';
import type {World,Pawn} from '../../src/sim/types';

export type LeanWeapon='revolver'|'bolt-action-rifle'|'emp-launcher';
export function leanScene(item:LeanWeapon='bolt-action-rifle',layout:'lean'|'direct'|'positive'='lean',seed=81733){
 const w=firingCamp(),[p,target,third]=w.pawns;w.rng=seed;w.piles=[];
 addMaterial(w,'weapon',1,{type:'equipment',pawnId:p!.id},item);const weapon=w.piles.find(i=>i.owner.type==='equipment'&&i.owner.pawnId===p!.id)!;
 // These are initial fixture placements before the action under test.
 if(layout==='positive'){target!.x=7;target!.z=14;fixtureBuilding(w,'wall',4,11);}
 else if(layout==='lean')fixtureBuilding(w,'wall',5,10);
 expect(validateWorld(w)).toEqual([]);return {w,p:p!,target:target!,third:third!,weapon};
}
export type LeanScene=ReturnType<typeof leanScene>;
export const shoot=(s:LeanScene)=>applyCommand(s.w,{type:'shoot',pawnIds:[s.p.id],targetId:s.target.id});
export function firstFlight(s:LeanScene,max=35){
 for(let n=0;n<max;n++){stepWorld(s.w);const flight=s.w.projectiles?.find(p=>p.flight.launcherKey===`pawn:${s.p.id}`);if(flight)return flight;}
 throw Error('No actual emitted projectile within bounded fixture');
}
export function roundtrip(w:World){expect(validateWorld(w)).toEqual([]);const copy=deserializeWorld(serializeWorld(w));expect(copy).toEqual(w);return copy;}
export const stationary=(w:World,p:Pawn)=>p.moveCooldown===0&&(p.motion?.end??w.tick)<=w.tick;
