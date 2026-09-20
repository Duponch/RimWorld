import { environmentLoad,environmentLoadInitial,environmentLoadOutcomeErrors,ENVIRONMENT_PROTOCOL } from './environment-load.ts';
import { startingPawn } from '../../src/sim/starting-pawns.ts';
import { generateVisitorStock } from '../../src/sim/trade-stock.ts';
import { enableVisitors } from '../../src/sim/visitors.ts';
import { newApparelState } from '../../src/sim/apparel-rules.ts';
import { newWeaponState,type WeaponItem } from '../../src/sim/equipment-rules.ts';
import { addGroundMaterial } from '../../src/sim/materials.ts';
import { freshRot } from '../../src/sim/food-preservation.ts';
import { captureStandability } from '../../src/sim/furniture-travel.ts';
import { footprintCells } from '../../src/sim/definitions.ts';
import { applyCommand } from '../../src/sim/engine.ts';
import { processTrade,tradingAtContact } from '../../src/sim/trade-contact.ts';
import { quoteTrade } from '../../src/sim/trade-goods.ts';
import { validateWorld } from '../../src/sim/serialization.ts';
import type { NeedContext } from '../../src/sim/needs.ts';
import type { Cell,Command,World } from '../../src/sim/types.ts';

export const TRADE_PROTOCOL=ENVIRONMENT_PROTOCOL+' V88 trade extension only at 100 original colonists and 100 wild hares: two prepared adult outlander visitors already at a halt, one finite merchant inventory produced by generateVisitorStock with fixed seed 88, separate personal meals and worn shirts. This prepared presence is not a sampled incident frequency or a played arrival. The second researcher of the first six-person group negotiates; his synthetic initial position and the two visitors use the nearest free cardinal meeting within 24 cells of his original position, with all three cells more than six cells from initial fire. No obstacle is cleared. Original and prepared positions are reported. The first researcher/firefighter and every production role remain. The three delivered weapon variants equip three otherwise unchanged miners. Additional 100 silver is an explicit colony input. One medicine purchase and its real contact controller run before timing, without advancing simulation; a new real contact order then remains active through the 650 timed ticks. No trade command, quote calculation, per-tick fixture observer or stock injection runs during timing. Item totals before/after the preparatory exchange must match exactly; timed currency, medicine, visitor sale stock and weapon identities remain conserved. ENVIRONMENT outcomes are evaluated on the original colonial roster, never misclassifying appended visitors as cooks/growers. Initial visitors, physical positions, stock and receipt are reported. Other load profiles are unchanged.';

export interface TradeLoadInitial {
  colonistIds:number[];visitorIds:number[];traderId:number;negotiatorId:number;
  cells:Cell[];negotiatorCells:{original:Cell;prepared:Cell};weaponIds:number[];currency:number;medicine:number;
  merchantStock:{id:number;item:string;quantity:number}[];
  receipt:NonNullable<World['trade']>['recent'][number];
}
const preparation=new WeakMap<World,TradeLoadInitial>();
const total=(w:World,item:string)=>w.piles.reduce((n,p)=>n+(p.item===item?p.quantity:0),0);
const totals=(w:World)=>Object.fromEntries([...new Set(w.piles.map(p=>p.item))].sort().map(item=>[item,total(w,item)]));

/** Benchmark input construction only; no calendar or gameplay speed change. */
export function tradeLoad(count:number):World {
  if(count!==100)throw Error('The V88 TRADE protocol is restricted to 100 original colonists');
  const w=environmentLoad(count),colonistIds=w.pawns.map(p=>p.id),negotiator=w.pawns[3]!;
  if(negotiator.moveCooldown||negotiator.path.length||negotiator.jobId!==null||negotiator.haul||negotiator.need||negotiator.research)throw Error('The prepared negotiator already has an active physical task');
  const original={x:negotiator.x,z:negotiator.z};
  const occupied=new Set([...w.structures.flatMap(footprintCells),...w.jobs.flatMap(footprintCells),...w.pawns.filter(p=>p!==negotiator),...w.resources,...w.wildlife?.animals??[],...w.piles.flatMap(p=>p.owner.type==='ground'?[p.owner]:[])].map(c=>c.z*w.width+c.x)),stand=captureStandability(w);
  const free=(c:Cell)=>!occupied.has(c.z*w.width+c.x)&&stand(c)&&!w.fires?.items.some(f=>(f.x-c.x)**2+(f.z-c.z)**2<=36);
  const neighbors=(c:Cell)=>[{x:c.x,z:c.z-1},{x:c.x-1,z:c.z},{x:c.x+1,z:c.z},{x:c.x,z:c.z+1}];
  const candidates:Cell[]=[];
  for(let dz=-24;dz<=24;dz++)for(let dx=-24;dx<=24;dx++)if(Math.abs(dx)+Math.abs(dz)<=24)candidates.push({x:original.x+dx,z:original.z+dz});
  candidates.sort((a,b)=>Math.abs(a.x-original.x)+Math.abs(a.z-original.z)-Math.abs(b.x-original.x)-Math.abs(b.z-original.z)||a.z-b.z||a.x-b.x);
  let meeting:{negotiator:Cell;trader:Cell;second:Cell}|undefined;
  for(const a of candidates){
    if(!free(a))continue;
    for(const b of neighbors(a)){if(!free(b))continue;const c=neighbors(b).find(c=>free(c)&&(c.x!==a.x||c.z!==a.z));if(c){meeting={negotiator:a,trader:b,second:c};break;}}
    if(meeting)break;
  }
  if(!meeting)throw Error('No safe three-person meeting near the prepared negotiator');
  // Synthetic load preparation only. Do not clear any obstacle or alter the
  // first researcher, workshops, wildlife, stores, crops or other workers.
  negotiator.x=meeting.negotiator.x;negotiator.z=meeting.negotiator.z;
  const traderCell=meeting.trader,second=meeting.second;
  enableVisitors(w);const visitorIds:number[]=[],cells=[traderCell,second];
  for(const [i,c] of cells.entries()) {
    const p=startingPawn(w.nextId++,i?'Accompagnant du banc':'Marchand du banc',c.x,c.z,0,70);p.faction='outlanders';p.foodPolicyId=w.foodPolicies[0]!.id;
    for(const key of Object.keys(p.priorities) as (keyof typeof p.priorities)[])p.priorities[key]=0;
    p.visitor={group:1,role:i?'visitor':'trader',phase:'staying',goal:{...c},personalFoodIds:[]};
    w.pawns.push(p);visitorIds.push(p.id);
    w.piles.push({id:w.nextId++,kind:'apparel',item:'cloth-shirt',quantity:1,owner:{type:'apparel',pawnId:p.id},apparel:newApparelState('cloth-shirt')});
    if(!i){const stock=generateVisitorStock(88,p.id,w.nextId,w.tick);w.piles.push(...stock.piles);w.nextId=stock.nextId;}
    const foodId=w.nextId++;w.piles.push({id:foodId,kind:'food',item:'simple-meal',quantity:3,owner:{type:'inventory',pawnId:p.id},...freshRot('simple-meal',w.tick)});p.visitor.personalFoodIds=[foodId];
  }
  w.visitors!.serial=1;w.visitors!.groups=[{id:1,kind:'visitor',members:visitorIds,entry:{x:0,z:traderCell.z},spot:{...traderCell},phase:'staying',startedAt:w.tick,arrivedAt:w.tick,durationCore:14000,hostile:false}];
  const weaponIds:number[]=[];
  for(const [i,item] of (['revolver','bolt-action-rifle','plasteel-knife'] as WeaponItem[]).entries()) {
    const p=w.pawns[5+i*6]!;if(w.piles.some(s=>s.owner.type==='equipment'&&s.owner.pawnId===p.id))throw Error('Trade load would replace an existing weapon');
    const id=w.nextId++;weaponIds.push(id);w.piles.push({id,kind:'weapon',item,quantity:1,owner:{type:'equipment',pawnId:p.id},weapon:newWeaponState(item)});
  }
  const cmd=(c:Command)=>{const r=applyCommand(w,c);if(!r.ok)throw Error(`Trade fixture: ${r.reason}`);};
  addGroundMaterial(w,'silver',100,negotiator,'silver');
  const money=w.piles.find(p=>p.item==='silver'&&p.owner.type==='ground');if(!money||money.owner.type!=='ground')throw Error('Prepared colony money missing');
  if(!w.home?.includes(money.owner.z*w.width+money.owner.x))cmd({type:'area',action:'home',from:money.owner,to:money.owner});
  const trader=w.pawns.find(p=>p.id===visitorIds[0])!,traderId=trader.id,negotiatorId=negotiator.id;
  const ready=()=>{
    cmd({type:'order-trade',pawnId:negotiatorId,traderId});
    // The actors were prepared adjacent, stationary and healthy. This executes
    // the ordinary contact transition without simulating any warmup gameplay.
    processTrade(w,negotiator,{move:()=>{throw Error('Prepared contact unexpectedly needs movement');}} as unknown as NeedContext);
    if(!tradingAtContact(w,negotiator,trader))throw Error('Prepared trade did not acquire physical contact');
  };
  ready();const medicine=w.piles.find(p=>p.item==='medicine'&&p.owner.type==='inventory'&&p.owner.pawnId===traderId)!;
  const lines=[{pileId:medicine.id,quantity:1}],q=quoteTrade(w,negotiatorId,traderId,lines);if(!q.ok)throw Error(q.reason);
  const before=JSON.stringify(totals(w));cmd({type:'trade-execute',pawnId:negotiatorId,traderId,lines,quote:q.signature,acceptShortfall:false});
  if(JSON.stringify(totals(w))!==before)throw Error('Preparatory exchange failed global item conservation');ready();
  const initial:TradeLoadInitial={colonistIds,visitorIds,traderId,negotiatorId,cells,negotiatorCells:{original,prepared:{...meeting.negotiator}},weaponIds,currency:total(w,'silver'),medicine:total(w,'medicine'),receipt:structuredClone(w.trade!.recent[0]!),merchantStock:w.piles.filter(p=>p.owner.type==='inventory'&&p.owner.pawnId===traderId&&!trader.visitor!.personalFoodIds.includes(p.id)).map(p=>({id:p.id,item:p.item,quantity:p.quantity}))};
  preparation.set(w,initial);const errors=validateWorld(w);if(errors.length)throw Error(`Invalid trade load: ${errors.join('; ')}`);return w;
}
export function tradeLoadInitial(w:World):TradeLoadInitial {const p=preparation.get(w);if(!p)throw Error('Trade load must be captured from its prepared world');return structuredClone(p);}
export function tradeEnvironmentView(w:World,initial:TradeLoadInitial):World {const ids=new Set(initial.colonistIds);return {...w,pawns:w.pawns.filter(p=>ids.has(p.id))};}
export function tradeLoadSummary(w:World,initial:TradeLoadInitial) {
  const p=w.pawns.find(p=>p.id===initial.negotiatorId),t=w.pawns.find(p=>p.id===initial.traderId);
  return {initial,colonists:initial.colonistIds.filter(id=>w.pawns.some(p=>p.id===id)).length,totalActors:w.pawns.length,visitors:initial.visitorIds.map(id=>{const p=w.pawns.find(p=>p.id===id);return {id,present:!!p,phase:p?.visitor?.phase,state:p?.state};}),contact:!!p&&!!t&&tradingAtContact(w,p,t),receiptCount:w.trade?.count??0,currency:total(w,'silver'),medicine:total(w,'medicine'),missingWeaponIds:initial.weaponIds.filter(id=>!w.piles.some(p=>p.id===id)),stockChanged:initial.merchantStock.filter(s=>!w.piles.some(p=>p.id===s.id&&p.item===s.item&&p.quantity===s.quantity&&p.owner.type==='inventory'&&p.owner.pawnId===initial.traderId))};
}
export function tradeLoadOutcomeErrors(w:World,crops:readonly number[],initial:TradeLoadInitial,environment:ReturnType<typeof environmentLoadInitial>):string[] {
  const errors=environmentLoadOutcomeErrors(tradeEnvironmentView(w,initial),crops,environment),s=tradeLoadSummary(w,initial);
  if(s.visitors.some(p=>!p.present||p.phase!=='staying'||p.state==='dead'||p.state==='downed'))errors.push('The prepared neutral visit did not remain safely present');
  if(!s.contact||s.receiptCount!==1)errors.push('The preparatory exchange or sustained real contact was lost');
  if(s.currency!==initial.currency||s.medicine!==initial.medicine||s.missingWeaponIds.length||s.stockChanged.length)errors.push('Prepared currency, medicine, weapons or finite merchant stock changed during timing');
  return errors;
}
