import type {CampaignState} from './world-map-state.ts';
import type {WorldPawnOwner256,WorldPawnsState256} from './world-pawn-state-256.ts';
import type {EncounterGroup261} from './caravan-encounter-state-261.ts';
import {worldGroupContext} from './world-map-context.ts';
import {actualCampRemovalAbsCore256} from './world-pawn-map-removed-256.ts';
import {preparePassedToWorld256,type WorldPawnFactionCondition256} from './world-pawn-transition-256.ts';
import {suspendWorldPawnGoods259} from './world-pawn-held-259.ts';
import {WORLD_FACTION_TECH_LEVEL_259} from './world-faction-catalog.ts';
import {worldPawnActiveBoundary256} from './world-pawn-life-256.ts';
import {healthRandom} from './health.ts';
import {nativeWorldPawnOrderCurrent256,commitNativeWorldPawnOrder256} from './world-pawn-native-order-256.ts';
import {cancelWorldPawnGC256} from './world-pawn-gc-256.ts';
import {passNativeWorldPawnOrder256} from './native-world-pawn-order-256.ts';
import type {PreparedCaravanCession261} from './caravan-captivity-261.ts';

export type ForeignWorldPlan261={ok:true;nextRng:number;current():boolean;commit(captive?:PreparedCaravanCession261):void}|{ok:false;reason:string};
/** New foreign originals really enter WorldPawns at Continue/Give. Full entry
 * effects run once on a private candidate; the pending owner keeps them until
 * the whole transaction has validated. Their finite stocks follow their holders. */
export function prepareEncounterForeignWorld261(root:CampaignState,record:EncounterGroup261,initialRng=root.rng):ForeignWorldPlan261 {
 const pending=record.pending261,state=root.worldPawns,factions=root.worldFactions,context=worldGroupContext(root,record.state.id),group=record.state;
 if((Number(root.schemaVersion)!==261&&(Number(root.schemaVersion)!==262&&Number(root.schemaVersion)!==263))||!pending||pending.animalAmbush261||!state||!factions||!context||!('members'in group)||state.atCore!==root.tick*10||!nativeWorldPawnOrderCurrent256(state,state.nativeOrder))return {ok:false,reason:'Les destinataires mondiaux de la rencontre sont indisponibles.'};
 const tick=root.tick,rng=root.rng,before=JSON.stringify(pending),membership=state.owners.slice(),nativeBefore=state.nativeOrder;
 const staged:WorldPawnsState256={...state,owners:state.owners.slice()},random={rng:initialRng};
 const conditions:WorldPawnFactionCondition256[]=[];
 for(const faction of factions.factions){if(!faction.lifecycle259)return {ok:false,reason:'Une instance de faction ne possède pas son autorité de cycle de vie.'};conditions.push({factionId:faction.id,...faction.lifecycle259,techLevel:WORLD_FACTION_TECH_LEVEL_259[faction.def]});}
 const abs=actualCampRemovalAbsCore256(root,context),prepared:{original:WorldPawnOwner256['actor'];row:WorldPawnOwner256}[]=[];
 for(const actor of [...pending.people,...pending.animals]){
  if(state.owners.some(r=>r.actor===actor||r.actor.id===actor.id))return {ok:false,reason:'Un étranger possède déjà un autre propriétaire mondial.'};
  const items=pending.items.filter(p=>'pawnId'in p.owner&&p.owner.pawnId===actor.id),packed=pending.packed.filter(p=>p.owner.type!=='ground'&&p.owner.pawnId===actor.id);
  const common={factionId:pending.factionId,originMapId:null,context:record.context,clockCore:tick*10,enteredAtAbsCore:abs,mode:'active' as const,items:structuredClone(items),packed:structuredClone(packed),
   encounterBirth261:{groupId:group.id,tile:group.tile,atCore:pending.atCore,kind:pending.kind}};
  const row:WorldPawnOwner256='species'in actor?{...common,kind:'animal',actor:structuredClone(actor)}:{...common,kind:'human',actor:structuredClone(actor)};
  suspendWorldPawnGoods259(row,tick*10);
  const boundary=worldPawnActiveBoundary256(row,root.schemaVersion,tick*10);if(boundary)return {ok:false,reason:boundary};
  const entry=preparePassedToWorld256(staged,row,factions,{float:(min,max)=>min+healthRandom(random)*(max-min)},{version:root.schemaVersion,situation:'Free',conditions});
  if(!entry.ok)return {ok:false,reason:entry.reason};entry.commit();prepared.push({original:actor,row:entry.row});
 }
 const current=()=>root.tick===tick&&root.rng===rng&&record.pending261===pending&&JSON.stringify(pending)===before&&root.worldPawns===state&&root.worldFactions===factions&&state.owners.length===membership.length&&state.owners.every((r,i)=>r===membership[i])&&nativeWorldPawnOrderCurrent256(state,nativeBefore);
 let used=false;
 return {ok:true,nextRng:random.rng,current,commit(captive){
  if(used||!current()||captive&&(captive.state!==state||!captive.current()))throw Error('Stale actual foreign WorldPawn transfer');
  let combined=captive?captive.nativeAfter:staged.nativeOrder;
  if(captive&&combined)for(const {row} of prepared)combined=passNativeWorldPawnOrder256(combined,row.actor.id,false);
  used=true;if(captive)captive.commit();cancelWorldPawnGC256(state);
  for(const {original,row} of prepared){
   const draft=row.actor as unknown as Record<string,unknown>,target=original as unknown as Record<string,unknown>;
   for(const key of Object.keys(target))if(!Object.hasOwn(draft,key))delete target[key];
   for(const key of Object.keys(draft))if(JSON.stringify(target[key])!==JSON.stringify(draft[key]))target[key]=draft[key];
   row.actor=original as never;row.items=pending.items.filter(p=>'pawnId'in p.owner&&p.owner.pawnId===original.id);row.packed=pending.packed.filter(p=>p.owner.type!=='ground'&&p.owner.pawnId===original.id);suspendWorldPawnGoods259(row,tick*10);state.owners.push(row);
  }
  commitNativeWorldPawnOrder256(state,captive?captive.nativeAfter:nativeBefore,combined);root.rng=random.rng;
 }};
}
