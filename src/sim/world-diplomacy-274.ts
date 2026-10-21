import {isSchema274OrLater} from './schema-compatibility-257.ts';
import {WORLD_FACTION_DEFINITIONS_256,initialWorldGoodwill256,worldRelationKind256,type WorldFactionRelationKind256} from './world-faction-catalog.ts';
import type {WorldFactionInstance256,WorldFactionRegistry256,WorldFactionRelation256} from './world-faction-state.ts';

/** Core's mutation thresholds depend on the persisted previous kind. The
 * separate initial -10/75 classification remains literal for old schemas. */
export function worldRelationAfterChange274(previous:WorldFactionRelationKind256,goodwill:number):WorldFactionRelationKind256 {
 let kind=previous;
 if(kind!=='hostile'&&goodwill<=-75)kind='hostile';
 if(kind!=='ally'&&goodwill>=75)kind='ally';
 if(kind==='hostile'&&goodwill>=0)kind='neutral';
 if(kind==='ally'&&goodwill<=0)kind='neutral';
 return kind;
}

/** Overlapping ranges are intentional: goodwill alone cannot reconstruct the
 * previous history. Zero is neutral, and +/-75 must have crossed a threshold. */
export function validWorldRelationKind274(goodwill:number,kind:unknown,version:number):boolean {
 if(!Number.isSafeInteger(goodwill)||goodwill< -100||goodwill>100)return false;
 if(version>=256&&version<=273)return kind===worldRelationKind256(goodwill);
 if(!isSchema274OrLater(version))return false;
 return kind==='hostile'?goodwill<0:kind==='ally'?goodwill>0:kind==='neutral'&&goodwill> -75&&goodwill<75;
}

/** Resolved Core situations without expansions: NaturalEnemy contributes
 * -130, otherwise the natural target is zero. Hidden/permanent/attack states
 * are separately refused by the actual gift admission below. */
export function worldNaturalGoodwill274(faction:Pick<WorldFactionInstance256,'def'>):0|-130|undefined {
 const definition=WORLD_FACTION_DEFINITIONS_256[faction.def];
 return definition?definition.naturalEnemy?-130:0:undefined;
}

export interface WorldGoodwillChange274 {adjustedGain:number;appliedGain:number;goodwillAfter:number;kindAfter:WorldFactionRelationKind256}
/** Faction.CalculateAdjustedGoodwillChange, followed by the bounded base
 * change and Core hysteresis. The current admitted gift context has no
 * effective-goodwill cap below100. A receipt records its natural target so
 * its arithmetic remains checkable without consulting a later relationship. */
export function worldGoodwillChange274(before:number,previousKind:WorldFactionRelationKind256,naturalGoodwill:number,requestedGain:number):WorldGoodwillChange274|undefined {
 const maxInt=2147483647;
 if(!validWorldRelationKind274(before,previousKind,274)||(naturalGoodwill!==0&&naturalGoodwill!==-130)||!Number.isSafeInteger(requestedGain)||Math.abs(requestedGain)>maxInt)return;
 let bonus=0;
 if(naturalGoodwill<before&&requestedGain<0||naturalGoodwill>before&&requestedGain>0){
  // This distance is at most230 in the closed Core context. Multiplication
  // by0.25 is exact in Float32; only Unity's midpoint-to-even needs applying.
  const quarter=Math.min(Math.abs(before-naturalGoodwill),Math.abs(requestedGain))*.25,lower=Math.floor(quarter);
  bonus=(quarter-lower===.5?lower+lower%2:Math.round(quarter))*(requestedGain<0?-1:1);
 }
 const adjustedGain=requestedGain+bonus,rawAfter=before+adjustedGain;
 if(!Number.isSafeInteger(adjustedGain)||!Number.isSafeInteger(rawAfter)||Math.abs(adjustedGain)>maxInt||Math.abs(rawAfter)>maxInt)return;
 const goodwillAfter=Math.max(-100,Math.min(100,rawAfter));
 return {adjustedGain,appliedGain:goodwillAfter-before,goodwillAfter,kindAfter:worldRelationAfterChange274(previousKind,goodwillAfter)};
}

export type DiplomaticGiftFaction274={ok:false;reason:string}|{ok:true;faction:WorldFactionInstance256;relation:WorldFactionRelation256};
/** Quote and confirmation both resolve the current campaign authority. This
 * only admits the nonhostile gift channel; actual visited-post ownership and
 * carried goods remain the caller's transaction, never inferred here. */
export function diplomaticGiftFaction274(registry:WorldFactionRegistry256,factionId:number,version:number):DiplomaticGiftFaction274 {
 const no=(reason:string):DiplomaticGiftFaction274=>({ok:false,reason});
 if(!isSchema274OrLater(version)||!Number.isSafeInteger(factionId)||factionId<1)return no('Les dons exigent le contrat diplomatique courant.');
 const player=registry.factions.find(f=>f.id===registry.playerFactionId),faction=registry.factions.find(f=>f.id===factionId);
 if(!player||!faction||player===faction)return no('La faction destinataire réelle est absente.');
 const p=WORLD_FACTION_DEFINITIONS_256[player.def],f=WORLD_FACTION_DEFINITIONS_256[faction.def];
 if(!p?.player||f?.player||!p.humanlike||!f?.humanlike||player.hidden||faction.hidden||p.hidden||f.hidden)return no('Cette faction ne peut pas recevoir ce don diplomatique.');
 // The resolved Def helper already includes BOTH permanent flags and their
 // exceptions; naturalEnemy starts at -80, never the permanent -100 sentinel.
 if(player.lifecycle259?.temporary||faction.lifecycle259?.temporary||player.lifecycle259?.defeated||faction.lifecycle259?.defeated||initialWorldGoodwill256(player.def,faction.def)===-100)return no('Cette faction ne peut pas modifier ses relations.');
 // A migrated historical attack may still have a neutral relation. It does
 // not grant the positive-goodwill channel while its actual map is retained.
 if(registry.settlements.some(s=>s.factionId===faction.id&&s.attack263&&s.attack263.mapId!==null))return no('Un établissement de cette faction est actuellement attaqué.');
 const a=Math.min(player.id,faction.id),b=Math.max(player.id,faction.id),pairs=registry.relations.filter(r=>r.aId===a&&r.bId===b);
 if(pairs.length!==1||!validWorldRelationKind274(pairs[0]!.goodwill,pairs[0]!.kind,version))return no('La vraie relation de faction est absente ou invalide.');
 const relation=pairs[0]!;if(relation.kind==='hostile')return no('Ce comptoir doit appartenir à une faction non hostile.');
 return {ok:true,faction,relation};
}
