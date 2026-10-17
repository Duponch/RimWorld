/** Original playable ancient loot v1. This prospective table is deliberately
 * distinct from the preserved Core loot table and its dependency STOPs. */
import {ITEM_DEFINITIONS} from './items.ts';
import {WorldGenerationRandom} from './world-generation-random.ts';
import type {AncientTempleLootThing256,AncientTempleLootBlocked256} from './ancient-temple-loot-256.ts';

export const FUNCTIONAL_ANCIENT_LOOT_256='playable-ancient-loot-v1' as const;
export const PLAYABLE_ANCIENT_LOOT_OPTIONS_256=Object.freeze([
 Object.freeze({kind:'advanced-components' as const,item:'advanced-component' as const,min:1,max:4,chance:Math.fround(.35),marketValue:200}),
 Object.freeze({kind:'ultratech-medicine' as const,item:'glitterworld-medicine' as const,min:2,max:8,chance:Math.fround(.35),marketValue:50}),
 Object.freeze({kind:'gold' as const,item:'gold' as const,min:20,max:50,chance:Math.fround(.5),marketValue:10}),
 Object.freeze({kind:'plasteel' as const,item:'plasteel' as const,min:30,max:60,chance:Math.fround(.5),marketValue:9}),
]);
export interface PlayableAncientLootReady256 {
 status:'ready';fromNextId:number;nextId:number;things:AncientTempleLootThing256[];spawnOrder:AncientTempleLootThing256[];
 optionOrder:typeof PLAYABLE_ANCIENT_LOOT_OPTIONS_256[number]['kind'][];
}
/** One real750 stream, one shuffle, one admission draw per ORIGINAL option.
 * There is no native artifact/Luciferium draw to discard or replace afterwards.
 * All-false is a legitimate empty result, never a forced minimum or reroll. */
export function generatePlayableAncientLoot256(fromNextId:number,random:WorldGenerationRandom):PlayableAncientLootReady256|AncientTempleLootBlocked256 {
 if(!(random instanceof WorldGenerationRandom)||!Number.isSafeInteger(fromNextId)||fromNextId<1)throw Error('Actual playable ancient loot allocator/stream required');
 const options=[...PLAYABLE_ANCIENT_LOOT_OPTIONS_256],things:AncientTempleLootThing256[]=[],values=new Map<number,number>();let nextId=fromNextId;
 for(let i=options.length-1;i>0;i--){const j=random.integer(0,i+1);[options[i],options[j]]=[options[j]!,options[i]!];}
 for(const option of options){
  if(random.value()>=option.chance)continue;
  const quantity=random.integer(option.min,option.max+1),definition=ITEM_DEFINITIONS[option.item];
  if(quantity>definition.stackLimit)throw Error('Original playable loot exceeds the actual item stack limit');
  if(!Number.isSafeInteger(nextId+1))return {status:'blocked',producer:'namespace',reason:'Actual playable loot Thing identity exhausted',fromNextId,nextId,random:random.state};
  const thing:AncientTempleLootThing256={id:nextId++,kind:definition.kind,item:option.item,quantity};things.push(thing);values.set(thing.id,option.marketValue*quantity);
 }
 // This table defines stable decreasing-value order, then the existing LIFO
 // placement. It does not claim Mono ArraySortHelper tie/PRNG equivalence.
 const spawnOrder=[...things].sort((a,b)=>values.get(b.id)!-values.get(a.id)!).reverse();
 return {status:'ready',fromNextId,nextId,things,spawnOrder,optionOrder:options.map(o=>o.kind)};
}
