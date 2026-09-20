import { isColonist } from '../../src/sim/affiliation.ts';
import { negotiatorRefusal,tradingAtContact } from '../../src/sim/trade-contact.ts';
import { quoteTrade,tradeGoods } from '../../src/sim/trade-goods.ts';
import { visitorMayTrade } from '../../src/sim/visitors.ts';
import { planHaulOrder } from '../../src/sim/player-hauling.ts';
import { buildAreaIndex,queryArea } from '../../src/sim/designation.ts';
import { candidateAccess } from '../../src/sim/candidate-access.ts';
import { blockedCells } from '../../src/sim/pathfinding.ts';
import { canReach } from '../../src/sim/work-planner.ts';
import { footprintCells } from '../../src/sim/definitions.ts';
import { storageCapacity } from '../../src/sim/ground-placement.ts';
import { environmentDecisions,type EnvironmentPlayerState } from './environment-player.ts';
import type { Decision } from './colony-player.ts';
import type { TradeLine } from '../../src/sim/trade-state.ts';
import type { Cell,World } from '../../src/sim/types.ts';

/** Player notebook only. The reference world and all stocks remain untouched. */
export interface TradePlayerState {
  startTick:number;initialPeople:number[];environment:EnvironmentPlayerState;
  milestones:Record<string,number>;traderId?:number;negotiatorId?:number;
  declined:number[];medicineIds:number[];beforeMedicine:number[];soldRevolvers:number;
  boughtMedicine:number;storedMedicine:number;minimumLiving:number;
  replacementWeaponIds?:number[];weaponDepot?:Cell[];
}
const living=(w:World)=>w.pawns.filter(p=>isColonist(p)&&p.state!=='dead');
const colonialMedicine=(w:World)=>w.piles.filter(i=>{const owner=i.owner;return i.item==='medicine'&&(owner.type==='ground'||owner.type==='pawn'&&w.pawns.some(p=>p.id===owner.pawnId&&isColonist(p)));});
export function newTradePlayer(w:World,environment:EnvironmentPlayerState):TradePlayerState {
  const people=living(w).map(p=>p.id);
  if(people.length!==4||w.visitors)throw Error('Trade journey must start from the published four-person V87 colony without an adopted visitor calendar.');
  return {startTick:w.tick,initialPeople:people,environment:structuredClone(environment),milestones:{},declined:[],medicineIds:[],beforeMedicine:[],soldRevolvers:0,boughtMedicine:0,storedMedicine:0,minimumLiving:people.length};
}
/** Retain the four equipped guns and at least one ground replacement per living
 * colonist. Prices decide whether the actual surplus funds a small medical reserve. */
function fundedBasket(w:World,s:TradePlayerState,pawnId:number,traderId:number):{lines:TradeLine[];signature:string}|undefined {
  const p=w.pawns.find(p=>p.id===pawnId)!,t=w.pawns.find(p=>p.id===traderId)!,stock=tradeGoods(w,p,t);
  const medicine=stock.goods.find(g=>g.side==='buy'&&g.pile.item==='medicine'&&!g.refusal);if(!medicine)return;
  const replacement=w.piles.filter(i=>i.item==='revolver'&&i.owner.type==='ground').length-living(w).length;
  const guns=stock.goods.filter(g=>g.side==='sell'&&g.pile.item==='revolver'&&!g.refusal&&!s.replacementWeaponIds?.includes(g.pile.id)).sort((a,b)=>a.unitPrice-b.unitPrice||a.pile.id-b.pile.id).slice(0,Math.max(0,replacement));
  for(let quantity=Math.min(3,medicine.available);quantity>=1;quantity--){
    const lines:TradeLine[]=[{pileId:medicine.pile.id,quantity}];
    for(let n=0;n<=guns.length;n++){
      const quote=quoteTrade(w,pawnId,traderId,lines);if(quote.ok&&!quote.forgone)return {lines,signature:quote.signature};
      if(n<guns.length)lines.push({pileId:guns[n]!.pile.id,quantity:-1});
    }
  }
}
/** The battlefield's forbidden drops are not sale stock. Prepare a real local
 * weapons reserve and authorize surplus pickups; ordinary haulers do the work.
 * Notebook intent is the only state written here, never the World. */
function weaponStorageDecisions(w:World,s:TradePlayerState):Decision[] {
  if(s.milestones.exchanged!==undefined||w.raids?.active||living(w).some(p=>p.draft))return [];
  const ground=w.piles.filter(i=>i.item==='revolver'&&i.owner.type==='ground');
  if(ground.length<=living(w).length)return [];
  s.replacementWeaponIds??=[...ground].sort((a,b)=>(b.weapon?.hitPoints??0)-(a.weapon?.hitPoints??0)||a.id-b.id).slice(0,living(w).length).map(i=>i.id);
  const surplus=ground.filter(i=>!s.replacementWeaponIds!.includes(i.id));
  if(!s.weaponDepot){
    const anchor=s.environment.prison.campAnchor,occupied=new Set([...w.structures.flatMap(footprintCells),...w.jobs.flatMap(footprintCells),...w.pawns.filter(p=>p.state==='dead'),...w.piles.flatMap(i=>i.owner.type==='ground'?[i.owner]:[])].map(c=>c.z*w.width+c.x));
    const index=buildAreaIndex(w),reach=candidateAccess(w,living(w)[0]!,blockedCells(w),new Set()),candidates:Cell[]=[];
    for(let z=Math.max(1,anchor.z-14);z<Math.min(w.height-3,anchor.z+14);z++)for(let x=Math.max(1,anchor.x-14);x<Math.min(w.width-4,anchor.x+14);x++)candidates.push({x,z});
    candidates.sort((a,b)=>(a.x-anchor.x)**2+(a.z-anchor.z)**2-((b.x-anchor.x)**2+(b.z-anchor.z)**2)||a.z-b.z||a.x-b.x);
    for(const from of candidates){
      const query=queryArea(w,{type:'area',action:'stockpile',from,to:{x:from.x+2,z:from.z+1},filters:{wood:false,food:false,weapon:true},priority:3,capacity:1},index);
      if(!query.ok||query.cells.length!==6||query.cells.some(i=>occupied.has(i)))continue;
      const cells=query.cells.map(i=>({x:i%w.width,z:Math.floor(i/w.width)}));
      if(cells.every(c=>canReach(w,c,reach,true))){s.weaponDepot=cells;break;}
    }
    if(!s.weaponDepot)throw Error('No accessible empty 3×2 weapons reserve near the reached colony; inspect the checkpoint instead of declaring field loot saleable.');
  }
  const out:Decision[]=[];
  for(const cell of s.weaponDepot){const zone=w.stockpiles.find(z=>z.x===cell.x&&z.z===cell.z);
    if(!zone||!zone.filters.weapon||zone.priority!==3||zone.capacity!==1||Object.entries(zone.filters).some(([kind,on])=>kind!=='weapon'&&on))out.push({reason:'Préparer près du camp six places réservées aux armes récupérées, avec transport physique avant le commerce.',command:{type:'stockpile',...cell,enabled:true,filters:{wood:false,food:false,weapon:true},priority:3,capacity:1}});
  }
  for(const pile of surplus)if(pile.weapon?.forbidden)out.push({reason:'Autoriser le transport du revolver abandonné en surplus ; conserver quatre armes de remplacement et les principales portées.',command:{type:'weapon-permission',itemId:pile.id,allowed:true}});
  return out;
}
export function tradeMaintenanceDecisions(w:World,s:TradePlayerState):Decision[] {return [...environmentDecisions(w,s.environment),...weaponStorageDecisions(w,s)];}
/** A broad stockpile full of other materials has no space for medicine, even
 * with spare numeric capacity. Add one genuinely empty, reachable medical cell. */
function medicineStorageDecision(w:World,s:TradePlayerState,quantity:number):Decision|undefined {
  const actor=living(w).find(p=>p.state!=='downed');if(!actor)return;
  const reach=candidateAccess(w,actor,blockedCells(w),new Set());
  if(w.stockpiles.some(z=>z.filters.medicine&&storageCapacity(w,z,'medicine')>=quantity&&canReach(w,z,reach,true)))return;
  const anchor=s.environment.prison.campAnchor,occupied=new Set([...w.structures.flatMap(footprintCells),...w.jobs.flatMap(footprintCells),...w.pawns.filter(p=>p.state==='dead'),...w.piles.flatMap(i=>i.owner.type==='ground'?[i.owner]:[])].map(c=>c.z*w.width+c.x));
  const index=buildAreaIndex(w),candidates:Cell[]=[];
  for(let z=Math.max(1,anchor.z-14);z<Math.min(w.height-1,anchor.z+14);z++)for(let x=Math.max(1,anchor.x-14);x<Math.min(w.width-1,anchor.x+14);x++)if(!occupied.has(z*w.width+x))candidates.push({x,z});
  candidates.sort((a,b)=>(a.x-anchor.x)**2+(a.z-anchor.z)**2-((b.x-anchor.x)**2+(b.z-anchor.z)**2)||a.z-b.z||a.x-b.x);
  for(const cell of candidates){
    const query=queryArea(w,{type:'area',action:'stockpile',from:cell,to:cell,filters:{wood:false,food:false,medicine:true},priority:3,capacity:25},index);
    if(query.ok&&query.cells.length===1&&canReach(w,cell,reach,true))return {reason:'Les réserves générales sont pleines : réserver une case libre accessible aux médicaments achetés, avant leur transport physique.',command:{type:'stockpile',...cell,enabled:true,filters:{wood:false,food:false,medicine:true},priority:3,capacity:25}};
  }
  throw Error('No accessible empty medical storage cell near the reached colony; keep the purchased pile and inspect the checkpoint.');
}
export function tradeDecisions(w:World,s:TradePlayerState):Decision[] {
  if(!w.visitors)return [{reason:'Adopter explicitement les visites sur la colonie historique, sans introduction rétroactive.',command:{type:'enable-visitors'}}];
  if(w.raids?.active||w.pawns.some(p=>isColonist(p)&&p.draft))return [];
  if(s.milestones.exchanged!==undefined){
    const pile=w.piles.find(i=>s.medicineIds.includes(i.id)&&i.owner.type==='ground'&&!w.stockpiles.some(z=>z.filters.medicine&&i.owner.type==='ground'&&z.x===i.owner.x&&z.z===i.owner.z));
    if(pile){
      if(w.pawns.some(p=>p.haul?.sourcePileId===pile.id))return [];
      const storage=medicineStorageDecision(w,s,pile.quantity);if(storage)return [storage];
      for(const p of living(w).filter(p=>p.orders.active===null&&p.hunger>35&&p.rest>25&&!negotiatorRefusal(p))){const target={type:'pile' as const,pileId:pile.id},proposal=planHaulOrder(w,p,target);if(!proposal.reason)return [{reason:'Ranger physiquement les médicaments achetés dans les réserves existantes.',command:{type:'order-haul',pawnId:p.id,target,queue:false}}];}
    }
    return [];
  }
  const current=w.pawns.find(p=>isColonist(p)&&p.trade);
  if(current){
    const t=w.pawns.find(p=>p.id===current.trade!.traderId);if(!t||!tradingAtContact(w,current,t))return [];
    s.milestones.contact??=w.tick;const basket=fundedBasket(w,s,current.id,t.id);
    if(!basket){s.declined.push(t.id);return [{reason:'Renoncer à ce panier : aucun achat médical finançable sans sacrifier les armes de remplacement.',command:{type:'cancel-trade',pawnId:current.id}}];}
    s.beforeMedicine=colonialMedicine(w).map(i=>i.id);s.traderId=t.id;s.negotiatorId=current.id;
    return [{reason:'Vendre seulement des revolvers de surplus et constituer une petite réserve médicale avec le stock réel du visiteur.',command:{type:'trade-execute',pawnId:current.id,traderId:t.id,lines:basket.lines,quote:basket.signature,acceptShortfall:false}}];
  }
  const merchant=w.pawns.find(p=>visitorMayTrade(w,p)&&!s.declined.includes(p.id));if(!merchant)return [];
  s.milestones.visitorSeen??=w.tick;
  const candidates=living(w).filter(p=>p.orders.active===null&&p.hunger>40&&p.rest>35&&!negotiatorRefusal(p)&&!p.rescue&&!p.tend&&!p.feed&&!p.firefighting).sort((a,b)=>(b.skills.social?.level??0)-(a.skills.social?.level??0)||(a.x-merchant.x)**2+(a.z-merchant.z)**2-((b.x-merchant.x)**2+(b.z-merchant.z)**2)||a.id-b.id);
  const negotiator=candidates[0];if(!negotiator)return [];
  return [{reason:'Envoyer un colon disponible au contact du marchand observé sur la carte.',command:{type:'order-trade',pawnId:negotiator.id,traderId:merchant.id}}];
}
export function observeTrade(w:World,s:TradePlayerState):void {
  if(w.visitors)s.milestones.adopted??=w.tick;
  s.minimumLiving=Math.min(s.minimumLiving,living(w).length);
  if(s.traderId!==undefined&&s.milestones.exchanged===undefined){const receipt=w.trade?.recent.find(r=>r.traderId===s.traderId&&r.tick>=s.startTick&&r.lines.some(l=>l.item==='medicine'&&l.quantity>0));
    if(receipt){s.milestones.exchanged=receipt.tick;s.boughtMedicine=receipt.lines.filter(l=>l.item==='medicine'&&l.quantity>0).reduce((n,l)=>n+l.quantity,0);s.soldRevolvers=receipt.lines.filter(l=>l.item==='revolver'&&l.quantity<0).reduce((n,l)=>n-l.quantity,0);s.medicineIds=colonialMedicine(w).filter(i=>!s.beforeMedicine.includes(i.id)).map(i=>i.id);}
  }
  if(s.milestones.exchanged!==undefined){
    // Bulk pickup creates a successor pile; follow the actual haul relationship
    // rather than mistaking a retired ground ID for missing purchased medicine.
    for(const p of living(w))if(p.haul?.carryPileId&&s.medicineIds.includes(p.haul.sourcePileId)&&!s.medicineIds.includes(p.haul.carryPileId))s.medicineIds.push(p.haul.carryPileId);
    s.storedMedicine=w.piles.filter(i=>s.medicineIds.includes(i.id)&&i.owner.type==='ground'&&w.stockpiles.some(z=>z.filters.medicine&&i.owner.type==='ground'&&z.x===i.owner.x&&z.z===i.owner.z)).reduce((n,i)=>n+i.quantity,0);
    if(s.storedMedicine>=s.boughtMedicine)s.milestones.stored??=w.tick;
    if(w.visitors?.departed.some(d=>d.pawn.id===s.traderId))s.milestones.merchantDeparted??=w.tick;
  }
}
export function tradeJourneyComplete(s:TradePlayerState):boolean {return ['adopted','visitorSeen','contact','exchanged','stored','merchantDeparted'].every(k=>s.milestones[k]!==undefined)&&s.soldRevolvers>0&&s.boughtMedicine>0;}
export function tradePlayerSummary(w:World,s:TradePlayerState){return {tick:w.tick,elapsedDays:(w.tick-s.startTick)/6000,milestones:{...s.milestones},traderId:s.traderId,soldRevolvers:s.soldRevolvers,boughtMedicine:s.boughtMedicine,storedMedicine:s.storedMedicine,minimumLiving:s.minimumLiving,
  people:living(w).map(p=>({id:p.id,hunger:p.hunger,rest:p.rest,state:p.state})),visitors:w.visitors?{groups:w.visitors.groups.length,departures:w.visitors.departed.length,nextVisitor:w.visitors.visitor.pending[0],nextTraveler:w.visitors.traveler.pending[0]}:null,trade:w.trade??null};}
