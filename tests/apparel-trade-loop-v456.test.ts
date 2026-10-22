import {expect,test} from 'vitest';
import {createHash} from 'node:crypto';
import {apparelTradeCamp456} from './scenarios/apparel-trade-v456.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {validateWorld,serializeWorld,deserializeWorld} from '../src/sim/serialization.ts';
import {quoteTrade,tradeGoods} from '../src/sim/trade-goods.ts';
import {tradingAtContact} from '../src/sim/trade-contact.ts';
import {visitorAtEdge} from '../src/sim/visitor-navigation.ts';
import {countedProducts} from '../src/sim/cooking-bills.ts';
import {writeTestFileSync,testOutputPath} from './test-output.ts';
import {visitorTradeFixture} from './scenarios/visitors.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import type {Command,World} from '../src/sim/types.ts';

const accept456=(w:World,c:Command)=>expect(applyCommand(w,c)).toMatchObject({ok:true});
function exact456(w:World){expect(validateWorld(w)).toEqual([]);const raw=serializeWorld(w),copy=deserializeWorld(raw);expect(serializeWorld(copy)).toBe(raw);return copy;}
function until456(w:World,wanted:()=>boolean,max:number){
 for(let i=0;i<max&&!wanted();i++)stepWorld(w);
 expect(wanted(),JSON.stringify({tick:w.tick,people:w.pawns.map(p=>({id:p.id,state:p.state,hunger:p.hunger,rest:p.rest,need:p.need,trade:p.trade,x:p.x,z:p.z})),groups:w.visitors?.groups})).toBe(true);
}
const silver456=(w:World)=>w.piles.filter(p=>p.item==='silver').reduce((n,p)=>n+p.quantity,0);
const colonialFood456=(w:World)=>{const people=new Set(w.pawns.filter(p=>!p.visitor).map(p=>p.id));return w.piles.filter(p=>{const o=p.owner;return p.item==='survival-meal'&&(o.type==='ground'||o.type==='pawn'&&people.has(o.pawnId));}).reduce((n,p)=>n+p.quantity,0);};

test('acquired physical shirts trade after an actual meal/contact, reload and buy back by ID, then leave in the real visitor archive',()=>{
 const f=apparelTradeCamp456();let w=f.w;
 const person=()=>w.pawns.find(p=>p.id===f.negotiatorId)!,trader=()=>w.pawns.find(p=>p.id===f.traderId)!;
 const garment=(id:number)=>w.piles.find(p=>p.id===id)!;
 const first=structuredClone(garment(f.firstGarmentId)),second=structuredClone(garment(f.secondGarmentId)),spare=structuredClone(garment(f.spareGarmentId)),worn=structuredClone(garment(f.wornGarmentId));
 expect(first).toMatchObject({item:'cloth-shirt',quantity:1,owner:{type:'ground'},apparel:{quality:'poor',hitPoints:100}});expect(second.apparel).toEqual(first.apparel);
 expect(spare).toMatchObject({owner:{type:'ground'},apparel:{quality:'normal',hitPoints:100}});expect(worn).toMatchObject({owner:{type:'apparel',pawnId:f.wearerId},apparel:{quality:'good',hitPoints:100}});
 expect(w.tick).toBe(3641);expect(w.tailoring?.completed).toBe(4);expect(w.piles.some(p=>p.unfinished)).toBe(false);expect(person().hunger).toBeLessThan(24);expect(tradingAtContact(w,person(),trader())).toBe(false);
 const beforeRaw=serializeWorld(w),initialSilver=silver456(w),initialFood=colonialFood456(w),initialHunger=person().hunger,merchantMoney=tradeGoods(w,person(),trader()).merchantSilver.reduce((n,p)=>n+p.quantity,0);
 exact456(w);expect(initialFood).toBe(4);expect(merchantMoney).toBeGreaterThanOrEqual(50);expect(merchantMoney).toBeLessThanOrEqual(250);
 accept456(w,{type:'order-consume',pawnId:f.negotiatorId,pileId:f.mealPileId,queue:false});
 let witnessedIngest=false;
 until456(w,()=>{const task=person().need;witnessedIngest ||= task?.kind==='eat'&&task.phase==='ingest';return witnessedIngest&&person().need===null&&person().hunger>70;},500);
 expect(person().hunger).toBeGreaterThan(initialHunger+50);expect(colonialFood456(w)).toBeLessThan(initialFood);expect(w.trade).toBeUndefined();exact456(w);
 const mealTick=w.tick;
 const join=()=>{accept456(w,{type:'order-trade',pawnId:f.negotiatorId,traderId:f.traderId});until456(w,()=>tradingAtContact(w,person(),trader()),500);};
 const quote=(id:number,quantity:number)=>{const q=quoteTrade(w,f.negotiatorId,f.traderId,[{pileId:id,quantity}]);expect(q.ok,q.ok?'':q.reason).toBe(true);if(!q.ok)throw Error(q.reason);return q;};
 join();const readyRaw=serializeWorld(w);exact456(w);
 expect(tradeGoods(w,person(),trader()).goods.some(g=>g.pile.id===f.wornGarmentId)).toBe(false);
 const sale=quote(f.firstGarmentId,-1);expect(sale.forgone).toBe(0);expect(sale.net).toBeLessThan(0);expect(sale.paid).toBe(sale.net);
 const sellCommand:Command={type:'trade-execute',pawnId:f.negotiatorId,traderId:f.traderId,lines:[{pileId:f.firstGarmentId,quantity:-1}],quote:sale.signature,acceptShortfall:false};
 // A valid 99PV stale draft keeps the same health-price plateau, but the
 // quoted actual garment changed. Refusal must be atomic, even at equal price.
 const stale=exact456(w),changed=stale.piles.find(p=>p.id===f.firstGarmentId)!;changed.apparel!.hitPoints=99;
 const changedQuote=quoteTrade(stale,f.negotiatorId,f.traderId,[{pileId:f.firstGarmentId,quantity:-1}]);expect(changedQuote.ok).toBe(true);
 if(changedQuote.ok){expect(changedQuote.selected[0]!.good.unitPrice).toBe(sale.selected[0]!.good.unitPrice);expect(changedQuote.signature).not.toBe(sale.signature);}
 const staleRaw=serializeWorld(stale);expect(applyCommand(stale,sellCommand).ok).toBe(false);expect(serializeWorld(stale)).toBe(staleRaw);
 accept456(w,sellCommand);expect(garment(f.firstGarmentId)).toMatchObject({id:first.id,quantity:1,owner:{type:'inventory',pawnId:f.traderId}});expect(garment(f.firstGarmentId).apparel).toEqual(first.apparel);expect(silver456(w)).toBe(initialSilver);
 expect(w.trade).toMatchObject({count:1,sold:{'cloth-shirt':1},silverReceived:-sale.paid,forgone:0});expect(w.trade!.recent[0]!.lines).toEqual([{item:'cloth-shirt',quantity:-1,unitPrice:sale.selected[0]!.good.unitPrice}]);
 const afterSaleRaw=serializeWorld(w);w=exact456(w);expect(applyCommand(w,sellCommand).ok).toBe(false);expect(serializeWorld(w)).toBe(afterSaleRaw);
 join();const purchase=quote(f.firstGarmentId,1);expect(purchase.net).toBeGreaterThan(-sale.paid);
 accept456(w,{type:'trade-execute',pawnId:f.negotiatorId,traderId:f.traderId,lines:[{pileId:f.firstGarmentId,quantity:1}],quote:purchase.signature,acceptShortfall:false});
 expect(garment(f.firstGarmentId)).toMatchObject({id:first.id,item:first.item,quantity:1,owner:{type:'ground'}});expect(garment(f.firstGarmentId).apparel).toEqual(first.apparel);expect(silver456(w)).toBe(initialSilver);
 expect(w.trade).toMatchObject({count:2,sold:{'cloth-shirt':1},bought:{'cloth-shirt':1},silverPaid:purchase.paid});const reboughtRaw=serializeWorld(w);w=exact456(w);
 join();const secondSale=quote(f.secondGarmentId,-1);expect(secondSale.forgone).toBe(0);
 accept456(w,{type:'trade-execute',pawnId:f.negotiatorId,traderId:f.traderId,lines:[{pileId:f.secondGarmentId,quantity:-1}],quote:secondSale.signature,acceptShortfall:false});
 expect(garment(f.secondGarmentId).owner).toEqual({type:'inventory',pawnId:f.traderId});expect(garment(f.secondGarmentId).apparel).toEqual(second.apparel);w=exact456(w);
 // No deadline patch or off-map teleport: the prepared finite halt actually
 // expires, and the same live merchant walks to a real border before export.
 const beforeDeparture=w.tick;
 until456(w,()=>!w.pawns.some(p=>p.id===f.traderId),1600);
 const departed=w.visitors!.departed.find(d=>d.pawn.id===f.traderId)!;
 expect(departed).toBeDefined();expect(visitorAtEdge(w,departed.pawn)).toBe(true);expect(departed.pawn.visitor?.phase).toBe('leaving');expect(departed.tick).toBeGreaterThan(3641+800);
 expect(departed.items.find(p=>p.id===f.secondGarmentId)).toMatchObject({id:second.id,item:second.item,quantity:1,owner:{type:'inventory',pawnId:f.traderId},apparel:second.apparel});
 expect(w.piles.some(p=>p.id===f.secondGarmentId)).toBe(false);expect(w.visitors!.groups).toHaveLength(0);expect(garment(f.firstGarmentId).apparel).toEqual(first.apparel);expect(garment(f.spareGarmentId)).toEqual(spare);expect(garment(f.wornGarmentId)).toEqual(worn);
 const bench=w.structures.find(s=>s.id===184)!;expect(countedProducts(w,bench.bills![0]!)).toBe(1);expect(w.tailoring?.completed).toBe(4);expect(w.piles.some(p=>p.unfinished)).toBe(false);
 expect(w.trade).toMatchObject({count:3,sold:{'cloth-shirt':2},bought:{'cloth-shirt':1},forgone:0});expect(silver456(w)+departed.items.filter(p=>p.item==='silver').reduce((n,p)=>n+p.quantity,0)).toBe(initialSilver);
 const afterRaw=serializeWorld(w),frozen=JSON.stringify(departed);w=exact456(w);stepWorld(w,20);expect(JSON.stringify(w.visitors!.departed.find(d=>d.pawn.id===f.traderId))).toBe(frozen);exact456(w);
 const folder='artifacts/apparel-trade-v456';writeTestFileSync(`${folder}/before.json`,beforeRaw);writeTestFileSync(`${folder}/ready.json`,readyRaw);writeTestFileSync(`${folder}/sold.json`,afterSaleRaw);writeTestFileSync(`${folder}/rebought.json`,reboughtRaw);writeTestFileSync(`${folder}/after.json`,afterRaw);
 writeTestFileSync(`${folder}/manifest.json`,JSON.stringify({version:456,schemaVersion:279,source:f.source,preparation:f.preparation,beforePath:testOutputPath(`${folder}/before.json`),beforeSha256:createHash('sha256').update(beforeRaw).digest('hex'),readyPath:testOutputPath(`${folder}/ready.json`),readyMeaning:'Node earned meal and contact only; native UI must import before.json and play those actions itself.',afterPath:testOutputPath(`${folder}/after.json`),negotiatorId:f.negotiatorId,wearerId:f.wearerId,traderId:f.traderId,firstGarmentId:f.firstGarmentId,secondGarmentId:f.secondGarmentId,spareGarmentId:f.spareGarmentId,wornGarmentId:f.wornGarmentId,oldGarmentId:f.oldGarmentId,mealPileId:f.mealPileId,personalMealId:f.personalMealId,initialSilver,merchantMoney,initialColonialMeals:initialFood,initialHunger,fromTick:3641,mealTick,readyTick:JSON.parse(readyRaw).tick,beforeDepartureTick:beforeDeparture,toTick:departed.tick,prices:{sale:sale.selected[0]!.good.unitPrice,purchase:purchase.selected[0]!.good.unitPrice},commands:{sale:sellCommand},receipt:JSON.parse(afterRaw).trade},null,2)+'\n');
});

test('a declared good plainleather shirt at65/130HP is actually sold and bought back by the same standard visitor with exact public and RAW custody',()=>{
 // Explicit finite starting possessions, not a claim of acquired tailoring,
 // incidental damage or a random quality draw for this second test garment.
 const f=visitorTradeFixture(),w=f.world,p=w.pawns.find(p=>p.id===f.pawnId)!,t=w.pawns.find(p=>p.id===f.traderId)!;
 // This historical fixture prepares its clock at15000 without playing the
 // interval. Anchor this control's deterioration clock to that prepared tick.
 w.deterioration!.lastTick=w.tick;
 addMaterial(w,'apparel',1,{type:'ground',x:4,z:3},'plainleather-shirt');
 const prepared=w.piles.find(i=>i.item==='plainleather-shirt'&&i.owner.type==='ground')!;prepared.apparel!.hitPoints=65;prepared.apparel!.quality='good';
 addMaterial(w,'silver',200,{type:'ground',x:2,z:3},'silver');accept456(w,{type:'area',action:'home',from:{x:0,z:0},to:{x:w.width-1,z:w.height-1}});
 const id=prepared.id,condition=structuredClone(prepared.apparel),money=silver456(w);expect(condition).toEqual({quality:'good',hitPoints:65,material:'plainleather'});exact456(w);
 const join=()=>{accept456(w,{type:'order-trade',pawnId:f.pawnId,traderId:f.traderId});until456(w,()=>tradingAtContact(w,p,t),1200);};
 const quote=(quantity:number)=>{const q=quoteTrade(w,f.pawnId,f.traderId,[{pileId:id,quantity}]);expect(q.ok,q.ok?'':q.reason).toBe(true);if(!q.ok)throw Error(q.reason);return q;};
 join();const encoder=new SnapshotEncoder({structureDelta:true,minimumStructures:0}),decoder=new SnapshotDecoder(),resident=new ResidentPresentationAssembler();
 const first=structuredClone(encoder.encode(w,0,0));expect(decoder.adopt(structuredClone(first)).status).toBe('applied');expect(resident.adopt(structuredClone(first)).status).toBe('applied');
 const sale=quote(-1);expect(sale.forgone).toBe(0);expect(sale.net).toBeLessThan(0);
 accept456(w,{type:'trade-execute',pawnId:f.pawnId,traderId:f.traderId,lines:[{pileId:id,quantity:-1}],quote:sale.signature,acceptShortfall:false});
 expect(w.piles.find(i=>i.id===id)).toMatchObject({item:'plainleather-shirt',quantity:1,owner:{type:'inventory',pawnId:f.traderId},apparel:condition});expect(silver456(w)).toBe(money);exact456(w);
 const soldPacket=structuredClone(encoder.encode(w,0,0)),sold=decoder.adopt(structuredClone(soldPacket)),shown=resident.adopt(structuredClone(soldPacket));expect(sold.status).toBe('applied');expect(shown.status).toBe('applied');
 if(sold.status==='applied'&&shown.status==='applied'){expect(shown.world).toEqual(sold.world);expect(sold.world.piles.find(i=>i.id===id)).toMatchObject({owner:{type:'inventory',pawnId:f.traderId},apparel:condition});}
 // Rejoin and buy from the same finite owner, without changing its inventory,
 // the subject's HP/quality, any price or either actor's physical position.
 join();const purchase=quote(1);expect(purchase.net).toBeGreaterThan(-sale.net);
 accept456(w,{type:'trade-execute',pawnId:f.pawnId,traderId:f.traderId,lines:[{pileId:id,quantity:1}],quote:purchase.signature,acceptShortfall:false});
 expect(w.piles.filter(i=>i.id===id)).toHaveLength(1);expect(w.piles.find(i=>i.id===id)).toMatchObject({item:'plainleather-shirt',quantity:1,owner:{type:'ground'},apparel:condition});expect(silver456(w)).toBe(money);
 expect(w.trade).toMatchObject({count:2,sold:{'plainleather-shirt':1},bought:{'plainleather-shirt':1},silverReceived:-sale.paid,silverPaid:purchase.paid,forgone:0});
 const boughtPacket=structuredClone(encoder.encode(w,0,0)),bought=decoder.adopt(structuredClone(boughtPacket)),reshown=resident.adopt(structuredClone(boughtPacket));expect(bought.status).toBe('applied');expect(reshown.status).toBe('applied');if(bought.status==='applied'&&reshown.status==='applied')expect(reshown.world).toEqual(bought.world);
 const reloaded=exact456(w);expect(reloaded.piles.find(i=>i.id===id)?.apparel).toEqual(condition);expect(reloaded.trade).toEqual(w.trade);
});
