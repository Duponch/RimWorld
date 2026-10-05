import { isColonist } from './affiliation.ts';
import { candidateAccess } from './candidate-access.ts';
import { scoutActiveTask,scoutEligible,scoutUnstable } from './caravan-trip.ts';
import { commercialMass } from './commercial-mass.ts';
import { commercialCargoIntact,emptyCommercialTextiles,isCommercialTextile } from './commercial-state.ts';
import { COMMERCIAL_MAX_SOURCES,COMMERCIAL_DECISION_TICKS,COMMERCIAL_LEG_TICKS,type CommercialCommand,type CommercialSource,type CommercialTrip } from './commercial-state.ts';
import { commercialDepartureReason,commercialPreparationReason,commercialUnloadReason,logCommercial } from './commercial-trip.ts';
import { groundCapacity,nearbyGround } from './ground-placement.ts';
import { refreshStock,reservedSource,transferPile } from './materials.ts';
import { adjacent,blockedCells,routeToCell,routeToJob } from './pathfinding.ts';
import { planInventoryPickup,commitInventoryPickup } from './inventory-pickup.ts';
import { visitorAtEdge,visitorExit } from './visitor-navigation.ts';
import type { NeedContext } from './needs.ts';
import type { Cell,CommandResult,MaterialPile,Pawn,World } from './types.ts';

export { commercialPreparationReason,previewCommercialLoading } from './commercial-trip.ts';

type PreparationCommand=Extract<CommercialCommand,{type:'commercial-start'|'commercial-cancel'|'commercial-unload'}>;
const fail=(reason:string):CommandResult=>({ok:false,code:'invalid-command',reason});
const same=(a:Cell,b:Cell)=>a.x===b.x&&a.z===b.z;
const contact=(p:Pawn,c:Cell)=>same(p,c)||adjacent(p,c);
const inventory=(w:World,p:Pawn)=>w.piles.filter(i=>i.owner.type==='inventory'&&i.owner.pawnId===p.id);

function cancel(w:World,p:Pawn):void {
  delete w.commercialTrip;p.path=[];p.planCooldown=0;
  if(p.state!=='dead'&&p.state!=='downed')p.state='idle';
}
function manifestIntact(w:World,p:Pawn,s:Extract<CommercialTrip,{phase:'loading'}>):boolean {
  for(let index=0;index<s.manifest.length;index++){
    const entry=s.manifest[index]!,pile=w.piles.find(i=>i.id===(index<s.cursor?entry.carriedPileId:entry.sourcePileId));
    if(!pile||pile.item!==entry.item||pile.foodPoison)return false;
    if(index<s.cursor?(pile.owner.type!=='inventory'||pile.owner.pawnId!==p.id||pile.quantity!==entry.quantity):
      pile.owner.type!=='ground'||pile.quantity-reservedSource(w,pile.id,p.id)<entry.quantity)return false;
  }
  return true;
}
/** Destruction can occur while the engine is still traversing an edge. This
 * reconciliation never moves/drops goods or discards that active segment. */
export function reconcileCommercialOnMap(w:World):void {
  const s=w.commercialTrip;if(!s||!('pawnId' in s))return;
  const p=w.pawns.find(p=>p.id===s.pawnId);if(!p){delete w.commercialTrip;return;}
  if(s.phase==='unloading'){
    if(p.state==='dead'||p.state==='downed'||scoutUnstable(p,w)||scoutActiveTask(p)){cancel(w,p);return;}
    const held=new Set(inventory(w,p).map(i=>i.id));s.pendingPileIds=s.pendingPileIds.filter(id=>held.has(id));
    if(!s.pendingPileIds.length)cancel(w,p);
    return;
  }
  if(commercialPreparationReason(w,p)||scoutActiveTask(p)){cancel(w,p);return;}
  if(s.phase==='loading'){if(!manifestIntact(w,p,s))cancel(w,p);return;}
  const held=inventory(w,p),food=held.find(i=>i.id===s.foodPileId);
  if(!food||food.item!=='survival-meal'||food.quantity!==s.foodQuantity||food.foodPoison||held.some(i=>i!==food&&i.item!=='silver'&&!isCommercialTextile(i.item))
    ||held.filter(i=>i.item==='silver').reduce((n,i)=>n+i.quantity,0)!==s.silverQuantity||!commercialCargoIntact(held,p.id,s.cargo))cancel(w,p);
}
/** Preparation is one pure preflight: reservation, all source routes, division
 * identities and prospective mass are checked before installing the manifest. */
export function applyCommercialPreparation(w:World,c:PreparationCommand):CommandResult {
  if(c.type==='commercial-cancel'){
    const s=w.commercialTrip;if(!s||!('pawnId' in s))return fail('Aucune préparation ou décharge commerciale à annuler.');
    const p=w.pawns.find(p=>p.id===s.pawnId);if(!p)return fail('Voyageur introuvable.');
    cancel(w,p);return {ok:true};
  }
  const p=w.pawns.find(p=>p.id===c.pawnId);if(!p)return fail('Colon introuvable.');
  if(c.type==='commercial-unload'){
    if(w.commercialTrip||w.group)return fail('Une expédition ou décharge est déjà engagée.');
    if(!isColonist(p)||p.prisoner||p.visitor||p.state==='dead'||p.state==='downed')return fail('Choisissez un colon libre et présent.');
    const reason=commercialUnloadReason(w,p);if(reason)return fail(reason);
    const held=inventory(w,p);
    if(!held.length||held.length>256||held.some(i=>!['survival-meal','silver','medicine','component','cloth','muffalo-wool'].includes(i.item)))return fail('Aucun inventaire commercial admissible à décharger.');
    if(w.piles.some(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id)||w.packed.some(i=>'pawnId' in i.owner&&i.owner.pawnId===p.id))return fail('Déposez d’abord la cargaison de travail.');
    const access=candidateAccess(w,p,blockedCells(w),new Set()),first=held[0]!;
    if(!nearbyGround(w,p).some(cell=>groundCapacity(w,cell,first.item,p.id)>=first.quantity&&routeToJob(w,cell,access,true)!==null))return fail('Aucun dépôt accessible pour la première pile.');
    w.commercialTrip={phase:'unloading',pawnId:p.id,startedAt:w.tick,pendingPileIds:held.map(i=>i.id)};
    p.planCooldown=0;return {ok:true};
  }
  if(Object.keys(c).some(k=>!['type','pawnId','foodPileId','quantity','silver','cargo'].includes(k))||(c.quantity!==2&&c.quantity!==3)||!Number.isSafeInteger(c.silver)||c.silver<0
    ||c.cargo!==undefined&&(!Array.isArray(c.cargo)||!c.cargo.length||c.cargo.length>=COMMERCIAL_MAX_SOURCES
      ||c.cargo.some(l=>!l||typeof l!=='object'||Object.keys(l).some(k=>!['pileId','quantity'].includes(k))||!Number.isSafeInteger(l.pileId)||l.pileId<1||!Number.isSafeInteger(l.quantity)||l.quantity<1)
      ||new Set(c.cargo.map(l=>l.pileId)).size!==c.cargo.length)||c.silver===0&&!c.cargo?.length)
    return fail('Choisissez deux ou trois rations, de l’argent ou un fret textile positif.');
  if(w.commercialTrip||w.scout||w.group)return fail('Un voyage ou groupe est déjà engagé.');
  const reason=scoutEligible(w,p)??commercialPreparationReason(w,p);if(reason)return fail(reason);
  if(!Number.isSafeInteger(w.tick+2*COMMERCIAL_LEG_TICKS+COMMERCIAL_DECISION_TICKS))return fail('Échéance de voyage hors limites.');
  const food=w.piles.find(i=>i.id===c.foodPileId);
  if(!food||food.owner.type!=='ground'||food.item!=='survival-meal'||food.foodPoison||food.quantity-reservedSource(w,food.id)<c.quantity)
    return fail('La pile de rations saine doit être libre et au sol.');
  const access=candidateAccess(w,p,blockedCells(w),new Set()),foodPath=routeToJob(w,food.owner,access,true);
  if(foodPath===null||!visitorExit(w,p))return fail('Les rations et une sortie doivent être accessibles.');
  const manifest:CommercialSource[]=[{sourcePileId:food.id,item:'survival-meal',quantity:c.quantity}];
  let remaining=c.silver;
  for(const pile of [...w.piles].sort((a,b)=>a.id-b.id)){
    if(!remaining)break;
    if(pile.item!=='silver'||pile.owner.type!=='ground')continue;
    const available=pile.quantity-reservedSource(w,pile.id);if(available<=0||routeToJob(w,pile.owner,access,true)===null)continue;
    const quantity=Math.min(remaining,available);manifest.push({sourcePileId:pile.id,item:'silver',quantity});remaining-=quantity;
    if(manifest.length>COMMERCIAL_MAX_SOURCES)return fail('Le manifeste dépasse trente-deux sources.');
  }
  if(remaining)return fail('L’argent accessible non réservé est insuffisant.');
  const cargo=emptyCommercialTextiles();
  for(const line of c.cargo??[]){
    const source=w.piles.find(i=>i.id===line.pileId);
    if(!source||source.owner.type!=='ground'||!isCommercialTextile(source.item)||source.foodPoison
      ||source.quantity-reservedSource(w,source.id)<line.quantity||routeToJob(w,source.owner,access,true)===null)return fail('Le fret textile doit être accessible, libre et au sol.');
    manifest.push({sourcePileId:source.id,item:source.item,quantity:line.quantity});cargo[source.item]+=line.quantity;
    if(manifest.length>COMMERCIAL_MAX_SOURCES)return fail('Le manifeste dépasse trente-deux sources.');
  }
  const sources=manifest.map(line=>w.piles.find(i=>i.id===line.sourcePileId)!),splits=manifest.reduce((n,line,i)=>n+Number(line.quantity<sources[i]!.quantity),0);
  if(w.piles.length+splits>32768||!Number.isSafeInteger(w.nextId+splits))return fail('Identités ou capacité insuffisantes pour le chargement.');
  const prospective:MaterialPile[]=[...w.piles.filter(i=>i.owner.type==='apparel'||i.owner.type==='equipment'),
    ...manifest.map((line,i)=>({...sources[i]!,quantity:line.quantity,owner:{type:'inventory' as const,pawnId:p.id}}))];
  const mass=commercialMass(w,p,prospective);if(!mass||mass.grams>mass.capacityGrams)return fail('La charge prospective est excessive ou inconnue.');
  w.commercialTrip={phase:'loading',pawnId:p.id,manifest,cursor:0,foodQuantity:c.quantity,silverQuantity:c.silver,startedAt:w.tick,...c.cargo?{cargo}:{}};
  p.path=foodPath;p.planCooldown=0;p.state=foodPath.length?'moving':'working';return {ok:true};
}

function unload(w:World,p:Pawn,ctx:NeedContext):boolean {
  const s=w.commercialTrip;if(s?.phase!=='unloading')return false;
  if(p.state==='dead'||p.state==='downed'||scoutUnstable(p,w)||scoutActiveTask(p)||p.hunger<=20||p.rest<=15){cancel(w,p);return false;}
  if(p.moveCooldown>0)return true;
  // A fire may have destroyed any pending stack, not just the next one.
  const held=new Set(inventory(w,p).map(i=>i.id));s.pendingPileIds=s.pendingPileIds.filter(id=>held.has(id));
  if(!s.pendingPileIds.length){cancel(w,p);return false;}
  const id=s.pendingPileIds[0],pile=w.piles.find(i=>i.id===id);
  if(!pile||pile.owner.type!=='inventory'||pile.owner.pawnId!==p.id){cancel(w,p);return false;}
  const cells=nearbyGround(w,p),at=cells.find(c=>contact(p,c)&&groundCapacity(w,c,pile.item,p.id)>=pile.quantity);
  if(at){
    if(!transferPile(w,pile,{type:'ground',...at}))return true;
    s.pendingPileIds.shift();p.path=[];p.planCooldown=0;p.state='idle';
    if(!s.pendingPileIds.length){delete w.commercialTrip;logCommercial(w,`${p.name} a terminé le déchargement commercial.`);}
    return true;
  }
  const access=candidateAccess(w,p,blockedCells(w),new Set());
  for(const cell of cells){
    if(groundCapacity(w,cell,pile.item,p.id)<pile.quantity)continue;
    const path=routeToJob(w,cell,access,true);if(path===null)continue;
    if(!p.path.length)p.path=path;ctx.move(cell,false);return true;
  }
  p.path=[];p.state='idle';p.planCooldown=20;return true;
}
/** Uses the engine's actual movement and contact, never an off-map pickup. */
export function processCommercialOnMap(w:World,p:Pawn,ctx:NeedContext):boolean {
  const s=w.commercialTrip;if(!s||!('pawnId' in s)||s.pawnId!==p.id)return false;
  reconcileCommercialOnMap(w);if(w.commercialTrip!==s)return false;
  if(s.phase==='unloading')return unload(w,p,ctx);
  if(commercialPreparationReason(w,p)||scoutActiveTask(p)){cancel(w,p);return false;}
  if(p.moveCooldown>0)return true;
  if(s.phase==='loading'){
    const line=s.manifest[s.cursor],source=line&&w.piles.find(i=>i.id===line.sourcePileId);
    if(!line||!source||source.owner.type!=='ground'||source.item!==line.item||source.foodPoison||source.quantity-reservedSource(w,source.id,p.id)<line.quantity){cancel(w,p);return false;}
    if(!contact(p,source.owner)){
      if(!p.path.length){const path=routeToJob(w,source.owner,candidateAccess(w,p,blockedCells(w),new Set()),true);if(path===null){cancel(w,p);return false;}p.path=path;}
      ctx.move(source.owner,false);return true;
    }
    const pickup=planInventoryPickup(w,source,p.id,line.quantity);
    if(!pickup||!commitInventoryPickup(w,pickup)){cancel(w,p);return false;}
    line.carriedPileId=pickup.carried.id;
    refreshStock(w);s.cursor++;p.path=[];p.planCooldown=0;
    if(s.cursor===s.manifest.length){
      w.commercialTrip={phase:'leaving',pawnId:p.id,foodPileId:s.manifest[0]!.carriedPileId!,foodQuantity:s.foodQuantity,silverQuantity:s.silverQuantity,startedAt:s.startedAt,exit:null,...s.cargo?{cargo:{...s.cargo}}:{}};p.state='moving';
    }else p.state='working';
    return true;
  }
  const mass=commercialMass(w,p),held=inventory(w,p),food=held.find(i=>i.id===s.foodPileId);
  if(!mass||mass.grams>mass.capacityGrams||!food||food.quantity!==s.foodQuantity||food.item!=='survival-meal'||food.foodPoison
    ||held.some(i=>i!==food&&i.item!=='silver'&&!isCommercialTextile(i.item))||held.filter(i=>i.item==='silver').reduce((n,i)=>n+i.quantity,0)!==s.silverQuantity
    ||!commercialCargoIntact(held,p.id,s.cargo)){cancel(w,p);return false;}
  if(s.exit&&same(p,s.exit)&&visitorAtEdge(w,p)){p.path=[];p.state='idle';if(commercialDepartureReason(w,p)){cancel(w,p);return false;}return true;}
  if(!s.exit||!p.path.length){const exit=visitorExit(w,p);if(!exit){cancel(w,p);return false;}
    const path=routeToCell(w,exit,candidateAccess(w,p,blockedCells(w),new Set()));if(path===null){cancel(w,p);return false;}s.exit=exit;p.path=path;}
  if(s.exit)ctx.move(s.exit,true);return true;
}
