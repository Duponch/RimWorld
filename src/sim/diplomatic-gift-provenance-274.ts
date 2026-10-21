import {worldNaturalGoodwill274} from './world-diplomacy-274.ts';
import {WORLD_FACTION_DEFINITIONS_256,initialWorldGoodwill256} from './world-faction-catalog.ts';
import type {CivilianPost} from './commercial-state.ts';
import type {WorldFactionRegistry256} from './world-faction-state.ts';

const positive=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>0;
/** Called after ordinary post/registry shapes. Historical receipts describe
 * their immutable recipient, not its present life, goodwill or caravan. Index
 * only on the first real gift; ordinary posts require one own-field lookup. */
export function createGiftReceiptProvenance274(registry:WorldFactionRegistry256|undefined,version:number):(post:CivilianPost|undefined,postId?:number)=>boolean {
 let factions:Map<number,WorldFactionRegistry256['factions'][number]>|undefined;
 let settlements:Map<number,WorldFactionRegistry256['settlements'][number]>|undefined;
 return (post,postId)=>{
  if(!post||!Object.hasOwn(post,'gifts274'))return true;
  const history=post.gifts274;
  if(version!==274||!registry||!history||!Array.isArray(history.recent)||!history.recent.length||history.recent.length>32)return false;
  // A legacy civilianPost alias has no transported external postId. Its
  // receipts must agree internally; actual post rows supply their own ID.
  const actualPostId=postId??history.recent[0]?.postId;
  if(!positive(actualPostId))return false;
  factions??=new Map(registry.factions.map(f=>[f.id,f]));
  settlements??=new Map(registry.settlements.map(s=>[s.id,s]));
  const player=factions.get(registry.playerFactionId);
  if(!player||!WORLD_FACTION_DEFINITIONS_256[player.def]?.player)return false;
  for(const receipt of history.recent){
   if(!receipt||receipt.postId!==actualPostId||!positive(receipt.factionId)||!positive(receipt.settlementId)||receipt.settlementId>=registry.nextSettlementId)return false;
   const faction=factions.get(receipt.factionId),definition=faction&&WORLD_FACTION_DEFINITIONS_256[faction.def];
   if(!faction||!definition||definition.player||definition.hidden||!definition.humanlike||initialWorldGoodwill256(player.def,faction.def)===-100||receipt.naturalGoodwill!==worldNaturalGoodwill274(faction))return false;
   const settlement=settlements.get(receipt.settlementId);
   if(settlement&&(settlement.factionId!==faction.id||settlement.postId!==actualPostId))return false;
  }
  return true;
 };
}
