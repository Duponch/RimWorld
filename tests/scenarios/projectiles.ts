import type { ProjectileScene,ProjectileTarget } from '../../src/sim/projectile-rules.ts';
import type { Cell } from '../../src/sim/types.ts';
import { healthRandom } from '../../src/sim/health.ts';

/** Explicit ballistic scene fixture, not yet a World actor/faction adapter. */
export function projectileScene(width=40,height=40) {
  const targets=new Map<string,ProjectileTarget>(),cells=new Map<number,ProjectileTarget[]>();let reads=0;
  const remove=(key:string)=>{const old=targets.get(key);if(!old)return;targets.delete(key);const i=old.cell.z*width+old.cell.x;cells.set(i,(cells.get(i)??[]).filter(t=>t.key!==key));};
  const set=(target:ProjectileTarget)=>{remove(target.key);targets.set(target.key,target);const i=target.cell.z*width+target.cell.x;cells.set(i,[...cells.get(i)??[],target]);};
  const scene:ProjectileScene={width,height,friendlyFireFactor:.4,target:key=>targets.get(key),at(c:Cell){reads++;return cells.get(c.z*width+c.x)??[];}};
  return {scene,targets,set,remove,reads:()=>reads};
}
export function projectileRandom(seed=9173) {
  const state={rng:seed};let draws=0;return {state,draw:()=>{draws++;return healthRandom(state);},draws:()=>draws};
}
export function ballisticPawn(key:string,x:number,z:number):ProjectileTarget {
  return {key,cell:{x,z},kind:'pawn',bodySize:1,standing:true,friendly:false,fill:0,covered:false,openDoor:false};
}
export function ballisticObject(key:string,x:number,z:number,fill=.5,openDoor=false):ProjectileTarget {
  return {key,cell:{x,z},kind:'object',fill,covered:false,openDoor};
}
