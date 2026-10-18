import {CARAVAN_FACTION_DATA_261} from './caravan-faction-data-261.ts';
const f=Math.fround;
/** Actual faction-instance capture in manager order. Hostility must be read
 * from the real relation with the player, not inferred from Def or goodwill0. */
export interface CaravanFactionCapture261 {id:number;def:string;player:boolean;hidden:boolean;hostileToPlayer:boolean;lifecycle259?:{revision:1;defeated:boolean;temporary:boolean}}
export type CaravanFactionSelection261={ok:true;factionId:number}|{ok:false;reason:string};
export function caravanFactionCandidates261(factions:readonly CaravanFactionCapture261[],kind:'combat'|'meeting',points:number):{ok:true;choices:readonly {factionId:number;weight:number}[]}|{ok:false;reason:string} {
 if(!Number.isFinite(points)||points<0)return {ok:false,reason:'Missing actual combat points'};
 const choices:{factionId:number;weight:number}[]=[];
 for(const a of factions){
  if(a.player||a.hidden||kind==='combat'&&!a.hostileToPlayer||kind==='meeting'&&a.hostileToPlayer)continue;
  if(!a.lifecycle259)return {ok:false,reason:`Missing actual faction lifecycle ${a.id}`};
  if(a.lifecycle259.temporary||kind==='combat'&&a.lifecycle259.defeated)continue;
  const d=Object.hasOwn(CARAVAN_FACTION_DATA_261,a.def)?CARAVAN_FACTION_DATA_261[a.def as keyof typeof CARAVAN_FACTION_DATA_261]:undefined;
  if(!d)return {ok:false,reason:`Missing native faction eligibility facts ${a.def}`};
  // These six admitted human Defs are humanlike. Meeting deliberately has no
  // defeated predicate; native TryFindFaction has none either.
  if(kind==='meeting'){if(d.hasCaravanTraders&&d.hasPawnGroupMakers)choices.push({factionId:a.id,weight:1});continue;}
  if(d.raidsForbidden||points<d.combatMinimum)continue;
  // Resolved no-expansion curves: absent =>1, tribe curve(0,1)=>1.
  choices.push({factionId:a.id,weight:1});
 }
 return {ok:true,choices};
}
/** Call separately at native CanFire and at GeneratePawns when required. Uses
 * the operation's speculative RNG callback. No lastRaidFaction0.4 penalty:
 * that belongs to the different native Weighted method. */
export function selectCaravanFaction261(factions:readonly CaravanFactionCapture261[],kind:'combat'|'meeting',points:number,draw:()=>number):CaravanFactionSelection261 {
 const result=caravanFactionCandidates261(factions,kind,points);if(!result.ok)return result;
 if(!result.choices.length)return {ok:false,reason:'No eligible actual faction'};
 const n=draw();if(!Number.isFinite(n)||n<0||n>=1)return {ok:false,reason:'Invalid faction random draw'};
 let total=f(0);for(const a of result.choices)total=f(total+f(a.weight));let pick=f(f(n)*total);
 for(const a of result.choices){pick=f(pick-f(a.weight));if(pick<0)return {ok:true,factionId:a.factionId};}
 return {ok:false,reason:'Faction weighted selection precision boundary'};
}
