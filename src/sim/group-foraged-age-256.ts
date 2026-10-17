import type {World,MaterialPile} from './types.ts';
import type {GroupFoodOwner256} from './group-foraged-ingestion-256.ts';
import {GROUP_FORAGED_ITEMS_256,type GroupForagedItem256} from './group-forage-state-256.ts';
import {rotAge,ticksUntilRot} from './food-preservation.ts';
/** Real live fruit owners only, before clinical death/capture at this local
 * frontier. Terminal possessions stay frozen and never receive new clocks. */
export function advanceGroupForagedAges256(w:World,g:GroupFoodOwner256,rate:number):void {
 if(w.schemaVersion<256||w.group!==g||!Number.isFinite(rate)||rate<0||rate>1)throw Error('Invalid fruit preservation authority');
 const counters=g.travel?.forage??g.reorganization?.foodSinceOpening;if(!counters)throw Error('Missing prospective fruit accounting');
 const living=new Set([...g.members,...g.animalOwners?.members??[]].filter(p=>p.state!=='dead'&&!p.health?.death).map(p=>p.id)),fruits=g.items.filter(p=>p.owner.type==='inventory'&&living.has(p.owner.pawnId)&&GROUP_FORAGED_ITEMS_256.includes(p.item as GroupForagedItem256)),lost=new Set<number>(),units={'berries':0,'agave-fruit':0};
 const rateChanges:{pile:MaterialPile;rot:NonNullable<MaterialPile['rot']>}[]=[];
 for(const p of fruits){if(ticksUntilRot(p,w.tick)<=0){lost.add(p.id);units[p.item as GroupForagedItem256]+=p.quantity;}else if(rate!==(p.rot?.rate??1))rateChanges.push({pile:p,rot:{progress:rotAge(p,w.tick),atTick:w.tick,...rate!==1?{rate}:{}}});}
 for(const item of GROUP_FORAGED_ITEMS_256)if(!Number.isSafeInteger(units[item])||!Number.isSafeInteger(counters.spoiled[item]+units[item])||!Number.isSafeInteger((w.spoiled[item]??0)+units[item]))throw Error('Fruit spoilage counter overflow');
 for(const change of rateChanges)change.pile.rot=change.rot;
 if(!lost.size)return;
 g.items=g.items.filter(p=>!lost.has(p.id));for(const item of GROUP_FORAGED_ITEMS_256){counters.spoiled[item]+=units[item];w.spoiled[item]=(w.spoiled[item]??0)+units[item];}
 w.events.push({tick:w.tick,type:'need',message:`${units.berries+units['agave-fruit']} fruits de la caravane ont pourri.`});if(w.events.length>80)w.events.splice(0,w.events.length-80);
}
