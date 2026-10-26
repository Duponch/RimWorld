import {ITEM_DEFINITIONS,type ItemId} from './items.ts';
import {pileMarketValue} from './trade-prices.ts';
import {freshRot} from './food-preservation.ts';
import {healthRandom} from './health.ts';
import {WORLD_FACTION_TECH_LEVEL_259,type WorldFactionDef256} from './world-faction-catalog.ts';
import {captureProspectiveGroupMass256,groupCaravanPileMass256} from './group-caravan-mass-256.ts';
import {groupPhysicalPawns256} from './group-mixed-pawns-256.ts';
import {caravanPawnCapacityGrams256} from './group-animal-capacity-256.ts';
import {freightGroup} from './group-freight.ts';
import type {AwayGroup} from './group-capture.ts';
import type {PeaceTalksDelivered293} from './peace-talks-state-293.ts';
import type {MaterialPile} from './types.ts';

/** Declared finite content/tech adapter, not Reward_ItemsStandard distribution.
 * The whole package uses current physical market values and caravan masses. */
export const PEACE_REWARD_PALETTE_293:readonly {item:ItemId;tech:number}[]=Object.freeze([
 {item:'gold',tech:0},{item:'jade',tech:0},{item:'component',tech:4},{item:'medicine',tech:4},
 {item:'plasteel',tech:4},{item:'uranium',tech:4},{item:'advanced-component',tech:5},{item:'glitterworld-medicine',tech:5},
]);
export interface PeaceTriumphDraft293 {items:MaterialPile[];nextId:number;rng:number;budget:number;marketValue:number;massGrams:number;delivered:PeaceTalksDelivered293[]}
export function draftPeaceTriumph293(input:{group:AwayGroup;factionDef:WorldFactionDef256;tile:number;tick:number;version:number;rng:number;nextId:number}):{ok:false;reason:string}|({ok:true}&PeaceTriumphDraft293) {
 const no=(reason:string)=>({ok:false as const,reason});
 if((input.version!==293&&(input.version!==294&&(input.version!==295&&input.version!==296)))||!Number.isSafeInteger(input.nextId)||input.nextId<1||!Number.isSafeInteger(input.tick)||input.tick<0||!Number.isSafeInteger(input.rng)||input.rng<1||input.rng>0xffffffff)return no('Le paquet exige les vrais compteurs courants.');
 const g=input.group,initialMass=captureProspectiveGroupMass256(g,input.version);if(!initialMass)return no('La charge actuelle de la caravane est invalide.');
 const carriers=groupPhysicalPawns256(g).filter(p=>p.state!=='dead'&&!p.health?.death);if(!carriers.length)return no('Aucun voyageur réel ne peut recevoir les objets.');
 const random={rng:input.rng},draw=()=>healthRandom(random),budget=500+Math.floor(draw()*701),tech=WORLD_FACTION_TECH_LEVEL_259[input.factionDef];
 const pool=PEACE_REWARD_PALETTE_293.filter(p=>p.item!=='gold'&&p.tech<=tech);if(!pool.length)return no('La faction ne possède pas de palette représentée.');
 const primary=pool[Math.floor(draw()*pool.length)]!.item;
 const probe=(item:ItemId,quantity=1):MaterialPile=>({id:input.nextId,item,kind:ITEM_DEFINITIONS[item].kind,quantity,owner:{type:'inventory',pawnId:carriers[0]!.id},...freshRot(item,input.tick)});
 const unit=pileMarketValue(probe(primary)),mass=groupCaravanPileMass256(probe(primary),freightGroup(g),input.version);
 if(unit===undefined||unit<=0||mass===undefined||mass<=0)return no('Valeur ou masse de cadeau inconnue.');
 // Reserve at least one gold unit; the primary stays within half the mass cap.
 // This one finite construction never retries an outcome or discards a gift.
 const maximum=Math.min(ITEM_DEFINITIONS[primary].stackLimit,Math.floor((budget-10)/unit),Math.floor(10000/mass));
 if(maximum<1)return no('Aucun paquet physique admissible.');
 const quantity=1+Math.floor(draw()*maximum),value=unit*quantity;
 let gold=Math.floor((budget-value)/10);if(value+gold*10<500)gold++;if(gold<1)return no('Le complément physique est absent.');
 const lines=[{item:primary,quantity},{item:'gold' as const,quantity:gold}],items:MaterialPile[]=[],delivered:PeaceTalksDelivered293[]=[];
 let nextId=input.nextId,marketValue=0,massGrams=0,shadow=captureProspectiveGroupMass256(g,input.version)!;
 for(const line of lines){let left=line.quantity;while(left>0){
  if(items.length>=16||!Number.isSafeInteger(nextId+1))return no('Trop de piles de cadeau.');
  const count=Math.min(left,ITEM_DEFINITIONS[line.item].stackLimit),capable=carriers.filter(p=>caravanPawnCapacityGrams256(p)>0),available=capable.filter(p=>{const row=shadow.carriers.find(r=>r.pawnId===p.id);return !!row&&row.grams<=row.capacityGrams;}),owners=available.length?available:capable.length?capable:carriers;
  const carrier=owners[Math.floor(draw()*owners.length)]!,pile={...probe(line.item,count),id:nextId++,owner:{type:'inventory' as const,pawnId:carrier.id}};
  const price=pileMarketValue(pile),grams=groupCaravanPileMass256(pile,freightGroup(g),input.version);if(price===undefined||grams===undefined)return no('Le véritable objet ne peut pas voyager.');
  items.push(pile);delivered.push({id:pile.id,item:pile.item,quantity:pile.quantity,carrierId:carrier.id});marketValue+=price*count;massGrams+=grams*count;left-=count;
  const projected=captureProspectiveGroupMass256({...g,items:[...g.items,...items]},input.version);if(!projected)return no('Les objets ne peuvent pas être conservés chez leurs voyageurs.');shadow=projected;
 }}
 if(marketValue<500||marketValue>1200||!Number.isSafeInteger(massGrams)||massGrams>20000||g.items.length+items.length>32768)return no('Le paquet dépasse ses bornes physiques.');
 return {ok:true,items,nextId,rng:random.rng,budget,marketValue,massGrams,delivered};
}
