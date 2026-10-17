import {ANCIENT_TEMPLE_LOOT_OPTIONS_256,ANCIENT_TEMPLE_SUPPORTED_LOOT_256,type AncientTempleLootOption256} from './ancient-temple-loot-data-256.ts';
import {ITEM_DEFINITIONS} from './items.ts';
import type {MaterialPile} from './types.ts';
import {WorldGenerationRandom} from './world-generation-random.ts';

export type AncientTempleLootThing256=Omit<MaterialPile,'owner'>;
export interface AncientTempleLootReady256 {
 status:'ready';fromNextId:number;nextId:number;
 /** Same newly made originals in ThingSetMaker output order. */
 things:AncientTempleLootThing256[];
 /** SortByDescending(value*count), then LIFO symbol resolution. */
 spawnOrder:AncientTempleLootThing256[];
 optionOrder:AncientTempleLootOption256[];
}
export interface AncientTempleLootBlocked256 {
 status:'blocked';producer:AncientTempleLootOption256|'namespace';reason:string;
 /** This is the actual STOP frontier; it is not a completed Core counter. */
 random:Readonly<{seed:number;counter:number}>;fromNextId:number;nextId:number;
}
/** Only the real private Shrine750 stream may be passed. A blocked result
 * discards the ENTIRE unpublished map, including its stream. Never reroll,
 * continue with partial loot or publish a successful empty replacement.
 * This deliberately does not expose a callback that could suppress a branch. */
export function generateAncientTempleLoot256(fromNextId:number,random:WorldGenerationRandom):AncientTempleLootReady256|AncientTempleLootBlocked256 {
 if(!(random instanceof WorldGenerationRandom)||!Number.isSafeInteger(fromNextId)||fromNextId<1)throw Error('Actual private temple namespace/stream required');
 const order=[...ANCIENT_TEMPLE_LOOT_OPTIONS_256],things:AncientTempleLootThing256[]=[],values=new Map<number,number>();let nextId=fromNextId;
 for(let i=order.length-1;i>0;i--){const j=random.integer(0,i+1);[order[i],order[j]]=[order[j]!,order[i]!];}
 const blocked=(producer:AncientTempleLootBlocked256['producer'],reason:string):AncientTempleLootBlocked256=>({status:'blocked',producer,reason,fromNextId,nextId,random:random.state});
 for(const option of order){
  if(random.value()>=option.chance)continue;
  // Core-only research definitions have no positive techprintCount. The
  // Chance above still happened; CanGenerate then returns false, draw-free.
  if(option.kind==='techprints')continue;
  if(option.kind==='artifacts')return blocked(option.kind,'Artifacts AllowedThingDefs/MakeThing and their real uses are not composed');
  if(option.kind==='misc')return blocked(option.kind,'The full explicit Def/tag pool, Stuff, Reward quality and actual consumers are not composed');
  if(option.kind==='luciferium')return blocked(option.kind,'Luciferium ingestion/dependency/health owner is not composed; no substitute');
  const definition=ANCIENT_TEMPLE_SUPPORTED_LOOT_256[option.kind],item=ITEM_DEFINITIONS[definition.item];
  const quantity=random.integer(definition.min,definition.max+1);
  // TryGetRandomThingWhichCanWeighNoMoreThan chooses from the REAL singleton
  // IEnumerable converted to a list. Even Range(0,1) consumes its integer.
  random.integer(0,1);
  if(!Number.isSafeInteger(nextId+1))return blocked('namespace','Temple MakeThing identity exhausted');
  const thing:AncientTempleLootThing256={id:nextId++,kind:item.kind,item:definition.item,quantity};
  things.push(thing);values.set(thing.id,Math.fround(definition.marketValue*quantity));
 }
 const sorted=[...things];
 // At most TWO Things exist in the supported subset. The delivered Mono
 // ArraySortHelper size2 branch swaps only when comparator>0; ties stay in
 // original order. Do not extend this into an invented general stable sort.
 if(sorted.length===2&&values.get(sorted[0]!.id)!<values.get(sorted[1]!.id)!)[sorted[0],sorted[1]]=[sorted[1]!,sorted[0]!];
 return {status:'ready',fromNextId,nextId,things,spawnOrder:sorted.reverse(),optionOrder:order.map(o=>o.kind)};
}
