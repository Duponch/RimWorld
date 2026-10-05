import { isColonist } from './affiliation.ts';
import { scoutActiveTask,scoutUnstable } from './caravan-trip.ts';
import { commercialMass } from './commercial-mass.ts';
import { validateCivilianPost } from './commercial-post.ts';
import { COMMERCIAL_DECISION_TICKS,COMMERCIAL_LEG_TICKS,COMMERCIAL_MAX_SOURCES } from './commercial-state.ts';
import { foodAllowed } from './food-policy.ts';
import { reservedSource } from './materials.ts';
import { ITEM_DEFINITIONS } from './items.ts';
import type { Pawn,World } from './types.ts';

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(n:unknown,min=0,max=Number.MAX_SAFE_INTEGER):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=min&&n<=max;
const exact=(v:Record<string,unknown>,required:readonly string[],optional:readonly string[]=[])=>required.every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>required.includes(k)||optional.includes(k));
const edge=(v:unknown,w:World)=>object(v)&&exact(v,['x','z'])&&int(v.x,0,w.width-1)&&int(v.z,0,w.height-1)&&(v.x===0||v.z===0||v.x===w.width-1||v.z===w.height-1);
const amounts=(v:unknown)=>object(v)&&exact(v,['medicine','component'])&&int(v.medicine)&&int(v.component);
const textiles=(v:unknown)=>object(v)&&exact(v,['cloth','muffalo-wool'])&&int(v.cloth)&&int(v['muffalo-wool']);
const textileItem=(v:unknown)=>v==='cloth'||v==='muffalo-wool';
const cargoTotal=(v:unknown)=>textiles(v)?Number((v as Record<string,unknown>).cloth)+Number((v as Record<string,unknown>)['muffalo-wool']):0;
const cargoSources=(v:unknown)=>textiles(v)?Math.ceil(Number((v as Record<string,unknown>).cloth)/ITEM_DEFINITIONS.cloth.stackLimit)+Math.ceil(Number((v as Record<string,unknown>)['muffalo-wool'])/ITEM_DEFINITIONS['muffalo-wool'].stackLimit):Infinity;
const preparedKeys=['phase','pawnId','foodQuantity','silverQuantity','startedAt'];
const offMapKeys=['phase','pawn','items','foodPileId','foodQuantity','silverQuantity','startedAt','departedAt','entry','consumed','silverPaid','bought'];
const commercialItems=['survival-meal','silver','medicine','component','cloth','muffalo-wool'];

/** Runs on the original containers before any union exposes off-map owners.
 * Clinical/item definitions remain validated once by the common validators. */
export function validateCommercialRegistry(w:World,version:number):string[] {
  if(version<180)return Object.hasOwn(w,'commercialTrip')||Object.hasOwn(w,'civilianPost')?['Future commercial state in legacy save.']:[];
  const postErrors=validateCivilianPost(w,version);if(postErrors.length)return postErrors;
  const s:unknown=w.commercialTrip;if(s===undefined)return [];
  if(w.scout!==undefined)return ['Scout and commercial expedition overlap.'];
  if(!object(s)||!int(s.startedAt,0,w.tick))return ['Invalid commercial trip.'];
  if(s.phase==='unloading'){
    if(!exact(s,['phase','pawnId','startedAt','pendingPileIds'])||!int(s.pawnId,1,w.nextId-1)||!Array.isArray(s.pendingPileIds)
      ||!s.pendingPileIds.length||s.pendingPileIds.length>256||s.pendingPileIds.some(id=>!int(id,1,w.nextId-1))||new Set(s.pendingPileIds).size!==s.pendingPileIds.length)
      return ['Invalid commercial unloading.'];
    const p=w.pawns.find(p=>p?.id===s.pawnId);
    if(!p||!isColonist(p)||p.prisoner||p.visitor||p.state==='dead'||p.state==='downed')return ['Missing commercial unloading owner.'];
    return [];
  }
  const hasCargo=Object.hasOwn(s,'cargo');
  if(version<185&&['cargo','sold','silverEarned'].some(k=>Object.hasOwn(s,k)))return ['Future commercial sales in legacy save.'];
  if(hasCargo&&(!textiles(s.cargo)||cargoTotal(s.cargo)<1||cargoSources(s.cargo)>COMMERCIAL_MAX_SOURCES-1))return ['Invalid commercial cargo.'];
  if((s.foodQuantity!==2&&s.foodQuantity!==3)||!int(s.silverQuantity,hasCargo?0:1))return ['Invalid commercial provisions.'];
  if(s.phase==='loading'||s.phase==='leaving'){
    const ks=s.phase==='loading'?[...preparedKeys,'manifest','cursor']:[...preparedKeys,'foodPileId','exit'];
    if(!exact(s,ks,version>=185?['cargo']:[])||!int(s.pawnId,1,w.nextId-1))return ['Invalid commercial preparation.'];
    const p=w.pawns.find(p=>p?.id===s.pawnId);if(!p||!isColonist(p)||p.prisoner||p.visitor||!['idle','moving','working'].includes(p.state))return ['Missing commercial participant.'];
    if(s.phase==='leaving')return !int(s.foodPileId,1,w.nextId-1)||s.exit!==null&&!edge(s.exit,w)?['Invalid commercial exit.']:[];
    if(!Array.isArray(s.manifest)||s.manifest.length<2||s.manifest.length>COMMERCIAL_MAX_SOURCES||!int(s.cursor,0,s.manifest.length-1))return ['Invalid commercial manifest.'];
    const sourceIds=new Set<number>(),carriedIds=new Set<number>();let silver=0;const freight={cloth:0,'muffalo-wool':0};
    for(let index=0;index<s.manifest.length;index++){
      const line=s.manifest[index];
      if(!object(line)||!exact(line,['sourcePileId','item','quantity'],['carriedPileId'])||!int(line.sourcePileId,1,w.nextId-1)||sourceIds.has(line.sourcePileId)
        ||(index===0?line.item!=='survival-meal':line.item!=='silver'&&!(hasCargo&&textileItem(line.item)))
        ||!int(line.quantity,1,ITEM_DEFINITIONS[line.item as keyof typeof ITEM_DEFINITIONS]?.stackLimit??0)
        ||index===0&&line.quantity!==s.foodQuantity)
        return ['Invalid commercial source line.'];
      if(index<Number(s.cursor)){
        if(!int(line.carriedPileId,1,w.nextId-1)||carriedIds.has(line.carriedPileId))return ['Invalid commercial carried identity.'];
        carriedIds.add(line.carriedPileId);
      }else if(Object.hasOwn(line,'carriedPileId'))return ['Future commercial pickup in manifest.'];
      sourceIds.add(line.sourcePileId);if(line.item==='silver')silver+=line.quantity as number;
      else if(textileItem(line.item))freight[line.item as 'cloth'|'muffalo-wool']+=line.quantity as number;
    }
    return silver!==s.silverQuantity||hasCargo&&(freight.cloth!==(s.cargo as Record<string,unknown>).cloth||freight['muffalo-wool']!==(s.cargo as Record<string,unknown>)['muffalo-wool'])?['Commercial cargo manifest disagrees.']:[];
  }
  const phaseKeys=s.phase==='outbound'?['arrivesAt']:s.phase==='at-post'?['arrivedAt','decisionUntil']:
    s.phase==='returning'||s.phase==='awaiting-entry'?['arrivedAt','leftPostAt','returnAt']:null;
  if(hasCargo&&(!textiles(s.sold)||!int(s.silverEarned)||Number((s.sold as Record<string,unknown>).cloth)>Number((s.cargo as Record<string,unknown>).cloth)
    ||Number((s.sold as Record<string,unknown>)['muffalo-wool'])>Number((s.cargo as Record<string,unknown>)['muffalo-wool'])
    ||(cargoTotal(s.sold)>0)!==(Number(s.silverEarned)>0)))return ['Invalid commercial sales ledger.'];
  if(!phaseKeys||!exact(s,[...offMapKeys,...phaseKeys],hasCargo?['cargo','sold','silverEarned']:[])||!object(s.pawn)||!Array.isArray(s.items)||s.items.length>32768||!edge(s.entry,w)
    ||!int(s.foodPileId,1,w.nextId-1)||!int(s.departedAt,s.startedAt as number,w.tick)||!int(s.consumed,0,s.foodQuantity as number)
    ||!int(s.silverPaid,0,Number(s.silverQuantity)+Number(s.silverEarned??0))||!amounts(s.bought))return ['Invalid off-map commercial expedition.'];
  const departed=s.departedAt as number;
  if(s.phase==='outbound'?(s.arrivesAt!==departed+COMMERCIAL_LEG_TICKS||!int(s.arrivesAt,w.tick+1)):
    !int(s.arrivedAt,departed,w.tick)||s.arrivedAt!==departed+COMMERCIAL_LEG_TICKS)return ['Invalid commercial arrival clock.'];
  if(s.phase==='at-post'){
    if(s.decisionUntil!==(s.arrivedAt as number)+COMMERCIAL_DECISION_TICKS||!int(s.decisionUntil,w.tick+1)||!w.civilianPost)return ['Invalid commercial decision clock.'];
  }else if(s.phase!=='outbound'){
    if(!int(s.leftPostAt,s.arrivedAt as number,Math.min(w.tick,(s.arrivedAt as number)+COMMERCIAL_DECISION_TICKS))||s.returnAt!==(s.leftPostAt as number)+COMMERCIAL_LEG_TICKS
      ||!int(s.returnAt)|| (s.phase==='returning'?w.tick>=s.returnAt:w.tick<s.returnAt))return ['Invalid commercial return clock.'];
  }
  const p=s.pawn;
  if(!int(p.id,1,w.nextId-1)||w.pawns.some(q=>q?.id===p.id)||!isColonist(p as unknown as Pawn)||p.prisoner||p.visitor||p.raid||p.podRescue
    ||p.x!==(s.entry as Record<string,unknown>).x||p.z!==(s.entry as Record<string,unknown>).z||p.state!=='idle'||p.bedId!==null||p.jobId!==null||p.haul!==null||p.cooking!==null||p.need!==null
    ||!Array.isArray(p.path)||p.path.length||p.moveCooldown!==0||p.motion!==undefined||!object(p.orders)||p.orders.active!==null||!Array.isArray(p.orders.queue)||p.orders.queue.length
    ||['draft','shooting','melee','flee','tactics','stun','stagger','rescue','tend','surgery','surgeryRequest','feed','ward','trade','firefighting','priorityWork','research','hunting','burial','cleaning','burning','animalHandling','animalCare','equipmentTask','interruptedCargo','transitExit','heatRefuge','bombRefuge'].some(k=>p[k]!==undefined)
    ||object(p.social)&&p.social.fight!==undefined||object(p.mental)&&p.mental.crisis!==undefined)return ['Off-map commercial owner retains a map task or duplicate.'];
  const ids=new Set<number>();let inventories=0;
  for(const pile of s.items){
    if(!object(pile)||!int(pile.id,1,w.nextId-1)||ids.has(pile.id)||w.piles.some(i=>i?.id===pile.id)||!object(pile.owner)||!exact(pile.owner,['type','pawnId'])||pile.owner.pawnId!==p.id
      ||!['inventory','equipment','apparel'].includes(String(pile.owner.type)))return ['Invalid off-map commercial possession.'];
    ids.add(pile.id);
    if(pile.owner.type==='inventory'){
      inventories++;
      if(!commercialItems.includes(String(pile.item))||textileItem(pile.item)&&(!hasCargo||version<185)||pile.item==='survival-meal'&&(pile.id!==s.foodPileId||pile.foodPoison!==undefined))return ['Invalid commercial inventory item.'];
    }
  }
  if(inventories>256)return ['Commercial inventory exceeds its bound.'];
  if(w.pawns.some(q=>q?.rescue?.patientId===p.id||q?.tend?.patientId===p.id||q?.feed?.patientId===p.id||q?.ward?.patientId===p.id||q?.surgery?.patientId===p.id
    ||q?.melee?.order?.targetId===p.id||q?.melee?.strike?.targetId===p.id||q?.shooting?.order?.targetId===p.id))return ['Map action targets an absent commercial owner.'];
  return [];
}

/** Called after the ordinary union has validated people and pile states. */
export function validateCommercialBindings(w:World,version:number,_ids?:Set<number>):string[] {
  // The central ID pass registers post stock before ordinary map/union IDs.
  const errors=validateCivilianPost(w,version),s=w.commercialTrip;if(version<180||!s)return errors;
  const p='pawn' in s?s.pawn:w.pawns.find(p=>p.id===s.pawnId);if(!p)return [...errors,'Missing commercial owner.'];
  const held=w.piles.filter(i=>i.owner.type==='inventory'&&i.owner.pawnId===p.id);
  if('pawnId' in s){
    if(scoutActiveTask(p)||scoutUnstable(p,w))errors.push('Commercial actor has an incompatible map activity.');
    if(s.phase==='unloading'){
      if(held.length!==s.pendingPileIds.length||held.some(i=>!s.pendingPileIds.includes(i.id)||!commercialItems.includes(i.item)||version<185&&textileItem(i.item)))errors.push('Commercial unloading possessions disagree.');
      return errors;
    }
    if(s.phase==='loading'){
      const carried=s.manifest.slice(0,s.cursor);
      if(held.length!==carried.length||held.some(i=>!carried.some(line=>line.carriedPileId===i.id)))errors.push('Commercial loading possessions disagree.');
      for(let index=0;index<s.manifest.length;index++){
        const line=s.manifest[index]!,pile=w.piles.find(i=>i.id===(index<s.cursor?line.carriedPileId:line.sourcePileId));
        if(!pile||pile.item!==line.item||pile.foodPoison){errors.push('Commercial source reservation or possession disagrees.');continue;}
        if(index<s.cursor?(pile.owner.type!=='inventory'||pile.owner.pawnId!==p.id||pile.quantity!==line.quantity):
          pile.owner.type!=='ground'||reservedSource(w,pile.id)>pile.quantity)errors.push('Commercial source reservation or possession disagrees.');
      }
    }else{
      const food=held.find(i=>i.id===s.foodPileId);
      if(!food||food.item!=='survival-meal'||food.quantity!==s.foodQuantity||food.foodPoison||held.length>COMMERCIAL_MAX_SOURCES
        ||held.some(i=>i!==food&&i.item!=='silver'&&!(s.cargo&&textileItem(i.item)))||held.filter(i=>i.item==='silver').reduce((n,i)=>n+i.quantity,0)!==s.silverQuantity
        ||s.cargo&&(['cloth','muffalo-wool'] as const).some(item=>held.filter(i=>i.item===item).reduce((n,i)=>n+i.quantity,0)!==s.cargo![item]))errors.push('Commercial departure provisions disagree.');
    }
    if(!foodAllowed(w,p,'survival-meal'))errors.push('Commercial rations forbidden by policy.');
  }else{
    const itemTotals={food:0,silver:0,medicine:0,component:0,cloth:0,'muffalo-wool':0};
    for(const pile of s.items)if(pile.owner.type==='inventory'){
      if(pile.item==='survival-meal')itemTotals.food+=pile.quantity;
      else if(pile.item==='silver')itemTotals.silver+=pile.quantity;
      else if(pile.item==='medicine')itemTotals.medicine+=pile.quantity;
      else if(pile.item==='component')itemTotals.component+=pile.quantity;
      else if(textileItem(pile.item))itemTotals[pile.item as 'cloth'|'muffalo-wool']+=pile.quantity;
    }
    if(itemTotals.food!==s.foodQuantity-s.consumed||itemTotals.silver!==s.silverQuantity+(s.silverEarned??0)-s.silverPaid||itemTotals.medicine!==s.bought.medicine||itemTotals.component!==s.bought.component
      ||(['cloth','muffalo-wool'] as const).some(item=>itemTotals[item]!==((s.cargo?.[item]??0)-(s.sold?.[item]??0))))
      errors.push('Commercial provisions and purchases are not conserved.');
    if(s.phase==='outbound'&&(s.silverPaid!==0||s.bought.medicine!==0||s.bought.component!==0||(s.silverEarned??0)!==0||cargoTotal(s.sold)!==0))errors.push('Commercial transaction precedes arrival.');
    if(s.silverPaid===0?(s.bought.medicine!==0||s.bought.component!==0):(s.bought.medicine+s.bought.component===0||!w.civilianPost))errors.push('Commercial payment and goods disagree.');
    const post=w.civilianPost;
    if(post&&(s.silverPaid>post.silverReceived||s.bought.medicine>post.bought.medicine||s.bought.component>post.bought.component))errors.push('Commercial trip exceeds post transaction totals.');
    if((s.silverEarned??0)>0&&(!post||(s.silverEarned??0)>(post.silverPaid??0)||(['cloth','muffalo-wool'] as const).some(item=>(s.sold?.[item]??0)>(post.sold?.[item]??0))))errors.push('Commercial sales exceed post transaction totals.');
    if(!foodAllowed(w,p,'survival-meal'))errors.push('Commercial rations forbidden by policy.');
  }
  const mass=commercialMass(w,p,'items' in s?s.items:w.piles);if(!mass||mass.grams>mass.capacityGrams)errors.push('Commercial possessions exceed admissible mass.');
  return errors;
}
