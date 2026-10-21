import {isSchema271OrLater} from './schema-compatibility-257.ts';
import {isSchema256Or257} from './schema-compatibility-257.ts';
/** DefeatedInsectHive is intrinsic Pawn memory, never a map/Lord owner. XML:
 * ten days, +4, stackLimit5; ThoughtDef's ordinary stack multiplier is .75. */
import {isColonist} from './affiliation.ts';
import {carrierOf} from './rescue-state.ts';
import {foggedCell256} from './exploration-state-256.ts';
import type {Pawn,World} from './types.ts';
import type {MoodThought} from './mood.ts';
export interface HiveMemoryPawn256 {hiveDefeats?:number[];hiveDefeatSuspendedTicks271?:number[];cryptosleepHeldAt271?:number}
export function validHiveDefeatMemory256(v:unknown,version:number,tick:number):boolean {
 if(!v||typeof v!=='object')return false;const d=Object.getOwnPropertyDescriptor(v,'hiveDefeats'),held=Object.getOwnPropertyDescriptor(v,'hiveDefeatSuspendedTicks271');if(!d)return !('hiveDefeats'in v)&&!('hiveDefeatSuspendedTicks271'in v);
 if(held||'hiveDefeatSuspendedTicks271'in v){
  if(!isSchema271OrLater(version)||!held||!Object.hasOwn(held,'value')||!held.enumerable||!Array.isArray(held.value)||!Array.isArray(d.value)||held.value.length!==d.value.length||Reflect.ownKeys(held.value).length!==held.value.length+1)return false;
  for(let i=0;i<held.value.length;i++){const e=Object.getOwnPropertyDescriptor(held.value,String(i));if(!e||!Object.hasOwn(e,'value')||!e.enumerable||!Number.isSafeInteger(e.value)||e.value<0||e.value>tick-d.value[i])return false;}
 }
 if(!isSchema256Or257(version)||!Object.hasOwn(d,'value')||!d.enumerable||!Array.isArray(d.value)||Object.getPrototypeOf(d.value)!==Array.prototype||d.value.length>5||Reflect.ownKeys(d.value).length!==d.value.length+1)return false;
 for(let i=0;i<d.value.length;i++){const e=Object.getOwnPropertyDescriptor(d.value,String(i));if(!e||!Object.hasOwn(e,'value')||!e.enumerable||!Number.isSafeInteger(e.value)||e.value<0||e.value>tick||i>0&&e.value<d.value[i-1])return false;}
 return true;
}
/** AFTER the actual DeSpawn. Hidden surviving Hives do not suppress the Core
 * celebration; contained/not-spawned colonists do not gain a local memory. */
export function notifyHiveDefeated256(w:World):void {
 if(!isSchema256Or257(w.schemaVersion)||w.structures.some(s=>s.kind==='insect-hive'&&!foggedCell256(w,s.z*w.width+s.x)))return;
 for(const p of w.pawns)if(isColonist(p)&&!p.prisoner&&!p.visitor&&p.state!=='dead'&&!carrierOf(w,p.id)){
  const actor=p as Pawn&HiveMemoryPawn256,active=(actor.hiveDefeats??[]).map((at,i)=>({at,held:actor.hiveDefeatSuspendedTicks271?.[i]??0})).filter(m=>m.at+m.held+60000>w.tick);if(active.length>=5)active.shift();active.push({at:w.tick,held:0});actor.hiveDefeats=active.map(m=>m.at);if(actor.hiveDefeatSuspendedTicks271)actor.hiveDefeatSuspendedTicks271=active.map(m=>m.held);
 }
}
export function hiveDefeatThoughts256(p:HiveMemoryPawn256,tick:number):MoodThought[] {
 tick=Math.min(tick,p.cryptosleepHeldAt271??tick);
 const active=(p.hiveDefeats??[]).map((at,i)=>at+(p.hiveDefeatSuspendedTicks271?.[i]??0)).filter(at=>at+60000>tick);if(!active.length)return [];
 const offset=active.reduce((sum,_at,index)=>sum+4*.75**index,0);
 return [{id:'defeated-insect-hive',label:'Ruche d’insectes vaincue',offset,kind:'memory',description:'La dernière ruche visible de cette carte a disparu.',expiresAt:active[0]!+60000}];
}
