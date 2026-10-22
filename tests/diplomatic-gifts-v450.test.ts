import {expect,test} from 'vitest';
import {commercialCamp} from './helpers/commercial-v193.ts';
import {addMaterial,refreshStock} from '../src/sim/materials.ts';
import {emptyGroupLedger} from '../src/sim/group-loading.ts';
import {initialWorldRegistry,brandCampaignContext} from '../src/sim/world-map-context.ts';
import {draftCommercialPostStock} from '../src/sim/commercial-post-stock.ts';
import {validCivilianPostShape} from '../src/sim/commercial-post-rules.ts';
import {COMMERCIAL_MAX_STOCK,COMMERCIAL_RESTOCK_TICKS} from '../src/sim/commercial-state.ts';
import {groupInventoryVector,groupReorganizationBalance} from '../src/sim/group-reorganization-balance.ts';
import {quoteGroupGift274,prepareGroupGift274} from '../src/sim/group-gift-274.ts';
import {validCommercialGifts274} from '../src/sim/group-gift-state-274.ts';
import {validGroupCommand} from '../src/sim/group-command-shape.ts';
import {applyCommand} from '../src/sim/engine.ts';
import type {AwayGroup} from '../src/sim/group-capture.ts';
import type {WorldGroupRecord} from '../src/sim/world-map-state.ts';
import type {World,MaterialPile} from '../src/sim/types.ts';

/** Declared transaction fixture: actual finite owners and stock at one visited
 * post, no generated geography or played journey claimed. The acquired travel
 * checkpoint is exercised separately; these cases isolate the new transaction. */
function prepared(){
 const {world:w}=commercialCamp(16),p=w.pawns[0]!;delete p.background;delete p.traits;p.state='idle';p.path=[];p.motion=null;p.moveCooldown=0;
 addMaterial(w,'textile',60,{type:'inventory',pawnId:p.id},'cloth');const cloth=w.piles.at(-1)!;
 addMaterial(w,'textile',40,{type:'inventory',pawnId:p.id},'muffalo-wool');const wool=w.piles.at(-1)!;
 const items=w.piles.filter(i=>'pawnId'in i.owner&&i.owner.pawnId===p.id);w.piles=w.piles.filter(i=>!items.includes(i));w.pawns=w.pawns.filter(a=>a!==p);refreshStock(w);
 w.planet={revision:3,homeTile:0} as World['planet'];initialWorldRegistry(w);
 const g:AwayGroup={id:1,phase:'at-site',startedAt:w.tick-20,departedAt:w.tick-10,lastPersonalTick:w.tick,destination:1,tile:1,members:[p],items,baseline:{food:0,silver:0,cargo:{cloth:60,'muffalo-wool':40},medicine:0,component:0},ledger:{...emptyGroupLedger(),cargoLoaded:{cloth:60,'muffalo-wool':40}},entry:{x:2,z:2},route:[1],segment:null,paused:false,stop:{kind:'at-site'}};
 const stock=draftCommercialPostStock({seed:w.seed,tick:w.tick,nextId:w.nextId,schemaVersion:w.schemaVersion})!;w.nextId=stock.nextId;
 const registry=w.worldGroups!;registry.posts=[{id:1,state:stock.post}];registry.nextPostId=2;
 const record:WorldGroupRecord={originMapId:0,localMapId:null,postId:1,context:{seed:w.seed,width:w.width,height:w.height},state:g};registry.groups=[record];registry.selectedGroupId=1;
 w.worldFactions={revision:1,contentModel:'original-faction-content-v1',generatedAt:0,playerFactionId:1,nextFactionId:3,nextSettlementId:2,
  factions:[{id:1,def:'PlayerColony',hidden:false,name:'Colonie',randomKey:1,colorFromSpectrum:0,leaderOwnerId:null},{id:2,def:'OutlanderCivil',hidden:false,name:'Voisins',randomKey:2,colorFromSpectrum:0,leaderOwnerId:null}],relations:[{aId:1,bId:2,goodwill:0,kind:'neutral'}],settlements:[{id:1,factionId:2,tile:1,name:'Comptoir',postId:1}],leaders:[]};
 const view={...w,group:g,events:registry.events};brandCampaignContext(view,w,0,record);
 return {w,view,g,p,cloth,wool,post:stock.post,record,relation:w.worldFactions.relations[0]!};
}
const quote=(f:ReturnType<typeof prepared>,lines:{pileId:number;quantity:number}[])=>{const q=quoteGroupGift274(f.view,lines);expect(q,q.ok?'':q.reason).toMatchObject({ok:true});if(!q.ok)throw Error(q.reason);return q;};
const plan=(f:ReturnType<typeof prepared>,lines:{pileId:number;quantity:number}[])=>{const q=quote(f,lines),p=prepareGroupGift274(f.view,lines,q.signature);expect(p,p.ok?'':p.reason).toMatchObject({ok:true});if(!p.ok)throw Error(p.reason);return {q,plan:p};};

test('whole cloth and split wool move once to the actual finite stock, preserving originals and reducing exact mass without payment',()=>{
 const f=prepared(),lines=[{pileId:f.cloth.id,quantity:60},{pileId:f.wool.id,quantity:10}],before=JSON.stringify(f.w),rng=f.w.rng,nextId=f.w.nextId,oldTransactions=f.post.transactions,oldLedger=structuredClone(f.g.ledger);
 const {q,plan:p}=plan(f,lines);expect(q.mass.grams).toBe(30*28);expect(JSON.stringify(f.w)).toBe(before);expect(p.current()).toBe(true);p.commit();
 expect(f.post.stock.find(i=>i.id===f.cloth.id)).toBe(f.cloth);expect(Object.hasOwn(f.cloth,'owner')).toBe(false);expect(f.g.items.includes(f.cloth)).toBe(false);
 expect(f.g.items.find(i=>i.id===f.wool.id)).toBe(f.wool);expect(f.wool.quantity).toBe(30);expect(f.wool.owner).toEqual({type:'inventory',pawnId:f.p.id});
 expect(f.post.stock.find(i=>i.id===nextId)).toMatchObject({item:'muffalo-wool',quantity:10});expect(f.w.nextId).toBe(nextId+1);expect(f.w.rng).toBe(rng);
 expect(f.post.transactions).toBe(oldTransactions);expect(f.g.ledger).toEqual(oldLedger);expect(f.post.gifts274).toMatchObject({count:1,totals:{cloth:60,'muffalo-wool':10}});
 expect(f.post.gifts274!.recent[0]).toMatchObject({recognizedValue:q.recognizedValue,baseGoodwill:q.baseGoodwill,requestedGain:q.requestedGain,appliedGain:q.appliedGain,groupId:1,pawnId:f.p.id,settlementId:1,factionId:2,postId:1});
 expect(f.relation.goodwill).toBe(q.goodwillAfter);expect(f.g.reorganization!.sent).toEqual({cloth:60,'muffalo-wool':10});expect(groupReorganizationBalance(f.g,f.g.reorganization!,[])).toBe(true);
 expect(validCivilianPostShape(f.post,f.w.tick,f.w.nextId,f.w.schemaVersion)).toBe(true);expect(p.current()).toBe(false);expect(()=>p.commit()).toThrow('Stale');
 const committed=JSON.stringify(f.w);expect(prepareGroupGift274(f.view,lines,q.signature).ok).toBe(false);expect(JSON.stringify(f.w)).toBe(committed);
});

test.each(['pile','owner','stock','post','relation','person','history'] as const)('a prepared gift refuses an equal-value replacement of %s before any further write',target=>{
 const f=prepared(),lines=[{pileId:f.cloth.id,quantity:5}],{plan:p}=plan(f,lines);
 if(target==='pile')f.g.items=f.g.items.map(i=>i===f.cloth?{...i}:i);
 if(target==='owner')f.cloth.owner={...f.cloth.owner};
 if(target==='stock')f.post.stock=f.post.stock.slice();
 if(target==='post')f.w.worldGroups!.posts[0]!.state=structuredClone(f.post);
 if(target==='relation')f.w.worldFactions!.relations[0]={...f.relation};
 if(target==='person')f.g.members[0]=structuredClone(f.p);
 if(target==='history')f.g.baseline={...f.g.baseline,cargo:{...f.g.baseline.cargo}};
 const before=JSON.stringify(f.w);expect(p.current()).toBe(false);expect(()=>p.commit()).toThrow('Stale');expect(JSON.stringify(f.w)).toBe(before);
});

test('stock capacity and immutable recipients refuse the entire basket without losing cargo or goodwill',()=>{
 for(const failure of ['full','locked-owner','locked-relation','locked-events'] as const){
  const f=prepared();
  if(failure==='full')while(f.post.stock.length<COMMERCIAL_MAX_STOCK)f.post.stock.push({id:f.w.nextId++,item:'silver',kind:'silver',quantity:1});
  if(failure==='locked-owner')Object.defineProperty(f.cloth,'owner',{configurable:false});
  if(failure==='locked-relation')Object.defineProperty(f.relation,'kind',{writable:false});
  if(failure==='locked-events')Object.preventExtensions(f.w.worldGroups!.events);
  const lines=[{pileId:f.cloth.id,quantity:60}],before=JSON.stringify(f.w),q=quoteGroupGift274(f.view,lines);
  if(q.ok)expect(prepareGroupGift274(f.view,lines,q.signature).ok).toBe(false);else expect(q.reason).toBeTruthy();expect(JSON.stringify(f.w)).toBe(before);
 }
});

test('zero effective gain at100 still gives real goods and the versioned stock retains receipts across actual restock',()=>{
 const f=prepared();f.relation.goodwill=100;f.relation.kind='ally';const {q,plan:p}=plan(f,[{pileId:f.wool.id,quantity:40}]);
 expect(q.appliedGain).toBe(0);p.commit();expect(f.post.stock.find(i=>i.id===f.wool.id)).toBe(f.wool);expect(f.post.gifts274!.count).toBe(1);
 const header={seed:f.w.seed,tick:f.w.tick+COMMERCIAL_RESTOCK_TICKS+1,nextId:f.w.nextId,schemaVersion:f.w.schemaVersion},next=draftCommercialPostStock(header,f.post)!;
 expect(next).toBeDefined();expect(next.changed).toBe(true);expect(next.post.gifts274).toEqual(f.post.gifts274);expect(next.post.stock.some(i=>i.id===f.wool.id)).toBe(false);
 expect(validCivilianPostShape(next.post,header.tick,next.nextId,f.w.schemaVersion)).toBe(true);expect(draftCommercialPostStock({...header,schemaVersion:273},f.post)).toBeUndefined();
});

test('a nonhostile civil faction below its natural goodwill applies the real adjusted gain and retains a verifiable receipt',()=>{
 const f=prepared();f.relation.goodwill=-50;f.relation.kind='neutral';
 const {q,plan:p}=plan(f,[{pileId:f.cloth.id,quantity:60},{pileId:f.wool.id,quantity:40}]);
 expect(q.naturalGoodwill).toBe(0);expect(q.requestedGain).toBeGreaterThan(0);expect(q.adjustedGain).toBeGreaterThan(q.requestedGain);expect(q.appliedGain).toBe(q.adjustedGain);
 p.commit();expect(f.relation.goodwill).toBe(-50+q.adjustedGain);expect(validCommercialGifts274(f.post.gifts274,274,f.w.tick,f.w.nextId)).toBe(true);
 const forged=structuredClone(f.post.gifts274!);forged.recent[0]!.naturalGoodwill=-130;expect(validCommercialGifts274(forged,274,f.w.tick,f.w.nextId)).toBe(false);
});

test('an empty catalogue has no large signature and an unchanged public basket survives only an elapsed personal frontier',()=>{
 const f=prepared(),lines=[{pileId:f.cloth.id,quantity:5}],catalogue=quote(f,[]),{q,plan:p}=plan(f,lines);expect(catalogue.signature).toBe('');
 f.w.tick++;f.view.tick=f.w.tick;f.g.lastPersonalTick=f.w.tick;
 expect(quote(f,lines).signature).toBe(q.signature);expect(p.current()).toBe(false);
});

test('receipt shape and targeted command reject historical/future, forged and empty gifts without mutating originals',()=>{
 const f=prepared(),lines=[{pileId:f.cloth.id,quantity:10}],{q,plan:p}=plan(f,lines);p.commit();
 const receipt=f.post.gifts274!,command={type:'group-gift274',groupId:1,lines,quote:q.signature};
 expect(validCommercialGifts274(receipt,274,f.w.tick,f.w.nextId)).toBe(true);
 for(const version of [273,278]){expect(validCommercialGifts274(receipt,version,f.w.tick,f.w.nextId)).toBe(false);expect(validGroupCommand(command,version)).toBe(false);}
 expect(validGroupCommand(command,274)).toBe(true);expect(validGroupCommand({...command,lines:[]},274)).toBe(false);expect(validGroupCommand({...command,extra:1},274)).toBe(false);
 const forged=structuredClone(receipt);forged.recent[0]!.appliedGain++;expect(validCommercialGifts274(forged,274,f.w.tick,f.w.nextId)).toBe(false);
 const wrongBase=structuredClone(receipt);wrongBase.recent[0]!.baseGoodwill+=40;expect(validCommercialGifts274(wrongBase,274,f.w.tick,f.w.nextId)).toBe(false);
 const text=JSON.stringify(f.w);expect(applyCommand(f.w,command as Parameters<typeof applyCommand>[1]).ok).toBe(false);expect(JSON.stringify(f.w)).toBe(text);
 expect(groupInventoryVector(f.g.items).cloth).toBe(50);
});
