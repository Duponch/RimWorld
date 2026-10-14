import {expect,test} from 'vitest';
import {preparedTreeExpiryCarrier} from './scenarios/tree-expiry-v353';
import {preparedTreeWrapper} from './scenarios/tree-transfer-v349';
import {stepWorld} from '../src/sim/engine';
import {isMinifiedTree} from '../src/sim/tree-transfer-state';
import type {MinifiedTreePile} from '../src/sim/tree-transfer-state';
import {validTreePileShape,validateTreeDomain} from '../src/sim/tree-transfer-save';
import {validOriginalTreeResource} from '../src/sim/tree-transfer-resource-save';
import {treeExpiryQuantityRange} from '../src/sim/tree-transfer-rules';
import {refreshStock} from '../src/sim/materials';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization';
import {SCHEMA_VERSION,type World} from '../src/sim/types';
import {SnapshotEncoder,SnapshotDecoder,type SnapshotMessage} from '../src/bridge/snapshots';

// Lazy, physically stepped fixtures: no simulation runs during module import.
const bases=new Map<boolean,string>();
function pending(fractional=false):World {
 let saved=bases.get(fractional);
 if(!saved){const {w,pile,source}=preparedTreeExpiryCarrier();if(fractional){source.amount=47;source.damage=10;}
  for(let n=0;n<40&&!pile.plantPack.pendingExpiry;n++)stepWorld(w);
  if(!pile.plantPack.pendingExpiry)throw Error('Actual expiry did not produce pending remains');
  expect(validateWorld(w)).toEqual([]);saved=serializeWorld(w);bases.set(fractional,saved);
 }
 return deserializeWorld(saved);
}
const boxed=(w:World)=>{const p=w.piles.find(isMinifiedTree);if(!p)throw Error('Missing original wrapper');return p;};
const shape=(p:MinifiedTreePile,w:World,version:number=w.schemaVersion,clock=w.tick)=>validTreePileShape(p,version,clock,w.nextId,(r,t)=>validOriginalTreeResource(r,w,version,t));
function exact(w:World){expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);}
function packetPile(packet:SnapshotMessage,w:World):MinifiedTreePile {
 if(packet.kind==='checkpoint')return boxed(packet.world);
 const old=packet.piles?.upserted.find(isMinifiedTree);if(old)return old;
 const p=structuredClone(boxed(w));packet.piles={removed:[],upserted:[p]};return p;
}
function adopted(decoder:SnapshotDecoder,packet:SnapshotMessage){const result=decoder.adopt(structuredClone(packet));expect(result.status).toBe('applied');if(result.status!=='applied')throw Error('Prepared legal packet rejected');return result.world;}

const malformed:{name:string;change:(p:MinifiedTreePile,w:World)=>void}[]=[
 {name:'false marker',change:p=>{Object.assign(p.plantPack,{pendingExpiry:false});}},
 {name:'own undefined marker',change:p=>{Object.assign(p.plantPack,{pendingExpiry:undefined});}},
 {name:'null marker',change:p=>{Object.assign(p.plantPack,{pendingExpiry:null});}},
 {name:'foreign string marker',change:p=>{Object.assign(p.plantPack,{pendingExpiry:'dead'});}},
 {name:'empty marker',change:p=>{Object.assign(p.plantPack,{pendingExpiry:{}});}},
 {name:'foreign marker key',change:p=>{Object.assign(p.plantPack.pendingExpiry!,{grace:1});}},
 {name:'zero dead output',change:p=>{p.plantPack.pendingExpiry!.quantity=0;}},
 {name:'impossible frozen yield',change:p=>{p.plantPack.pendingExpiry!.quantity=24;}},
 {name:'quantity overflow',change:p=>{p.plantPack.pendingExpiry!.quantity=500001;}},
 {name:'fractional retry',change:p=>{p.plantPack.pendingExpiry!.retryAt+=.5;}},
 {name:'past retry',change:(p,w)=>{p.plantPack.pendingExpiry!.retryAt=w.tick-1;}},
 {name:'new lifetime grace',change:(p,w)=>{p.plantPack.pendingExpiry!.retryAt=w.tick+21;}},
];
test.each(malformed)('V353 RAW/full refuses $name without changing the previously adopted world',({change})=>{
 const w=pending(),decoder=new SnapshotDecoder(),encoder=new SnapshotEncoder();const first=adopted(decoder,encoder.encode(w,0,1,true)),before=structuredClone(first);
 const bad=structuredClone(encoder.encode(w,0,1,true));change(packetPile(bad,w),w);
 const p=packetPile(bad,w);expect(shape(p,w)).toBe(false);expect(decoder.adopt(bad).status).toBe('resync');expect(first).toEqual(before);
 // Own undefined is checked before JSON omission; expiry-without-marker is also invalid.
 if(bad.kind!=='checkpoint')throw Error('Checkpoint expected');expect(()=>deserializeWorld(JSON.stringify(bad.world))).toThrow();
});

test('V353 strict235 neutral migration accepts only a living old wrapper and rejects every own future marker',()=>{
 const {w,pile}=preparedTreeWrapper(null,1),old={...structuredClone(w),schemaVersion:235},before=structuredClone(old);
 expect(deserializeWorld(JSON.stringify(old))).toEqual({...before,schemaVersion:SCHEMA_VERSION});expect(old).toEqual(before);
 for(const marker of [undefined,false,{quantity:23,retryAt:w.tick+20}]){
  const p=structuredClone(pile);Object.assign(p.plantPack,{pendingExpiry:marker});expect(shape(p,w,235)).toBe(false);
  if(marker!==undefined){const bad=structuredClone(old);bad.piles=[p];expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();}
 }
 const dead=pending();dead.schemaVersion=235 as World['schemaVersion'];expect(()=>deserializeWorld(JSON.stringify(dead))).toThrow();
});

test('V353 typed oak dead quantity guard uses frozen source growth/HP and admits only its own possible roll',()=>{
 const {w,pile}=preparedTreeWrapper('oak',1);delete pile.innerResource.damage;
 expect(treeExpiryQuantityRange(pile)).toEqual([23,23]);pile.plantPack.pendingExpiry={quantity:23,retryAt:pile.plantPack.expiresAt+20};
 expect(shape(pile,w,236,pile.plantPack.expiresAt)).toBe(true);pile.plantPack.pendingExpiry.quantity=22;expect(shape(pile,w,236,pile.plantPack.expiresAt)).toBe(false);
});

test('V353 frozen archive uses its own clock including equality at retry, never the later live clock',()=>{
 const w=pending(),pile=boxed(w),deadline=pile.plantPack.expiresAt,retry=pile.plantPack.pendingExpiry!.retryAt;
 const domain=(p:MinifiedTreePile,clock:number)=>validateTreeDomain({version:236,tick:retry+90000,nextId:w.nextId,occurrences:[{pile:p,ownerKey:'frozen',clock,active:false}],resources:[],jobs:[],pawns:[],outerIds:new Set([p.id]),resourceValidAt:(r,t)=>validOriginalTreeResource(r,w,236,t),activeJobValid:()=>true});
 expect(domain(pile,retry)).toBeDefined();expect(domain(pile,deadline-1)).toBeUndefined();expect(domain(pile,retry+1)).toBeUndefined();
 const live=structuredClone(pile);delete live.plantPack.pendingExpiry;expect(domain(live,deadline-1)).toBeDefined();expect(domain(live,deadline)).toBeUndefined();
});

test('V353 pending dead source cannot retain even a pending replant claim',()=>{
 const w=pending(),p=boxed(w);w.jobs.push({id:w.nextId++,kind:'replant-tree',x:20,z:20,orientation:0,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0},tree:{kind:'replant',sourcePileId:p.id,resourceId:p.innerResource.id,phase:'pickup',carryPileId:null,workCore:0}});
 expect(()=>deserializeWorld(JSON.stringify(w))).toThrow();
});

test.each([true,false])('V353 same-epoch checkpoint=%s cannot reroll a dead output, retained or updated, and valid revision retries atomically',checkpoint=>{
 const w=pending(true),p=boxed(w),possible=treeExpiryQuantityRange(p);expect(possible[0]).not.toBe(possible[1]);
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),first=adopted(decoder,encoder.encode(w,0,1,true)),before=structuredClone(first);
 const good=structuredClone(encoder.encode(w,0,1,checkpoint)),bad=structuredClone(good),forged=packetPile(bad,w);
 forged.plantPack.pendingExpiry!.quantity=possible.find(q=>q!==p.plantPack.pendingExpiry!.quantity)!;
 const raw=structuredClone(w);boxed(raw).plantPack.pendingExpiry!.quantity=forged.plantPack.pendingExpiry!.quantity;exact(raw); // RAW alone cannot know prior roll.
 expect(decoder.adopt(bad).status).toBe('resync');expect(first).toEqual(before);expect(adopted(decoder,good)).toEqual(w);expect(first).toEqual(before);
 const fresh=structuredClone(new SnapshotEncoder().encode(raw,0,1,true));fresh.epoch=9;expect(adopted(decoder,fresh)).toEqual(raw);
});

function revived(w:World):World {const alive=structuredClone(w),p=boxed(alive);delete p.plantPack.pendingExpiry;p.plantPack.packedAt=alive.tick;p.plantPack.expiresAt=alive.tick+42000;return alive;}
test.each([true,false])('V353 same-epoch checkpoint=%s cannot revive a dead wrapper with shifted stamps',checkpoint=>{
 const w=pending(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),first=adopted(decoder,encoder.encode(w,0,1,true)),before=structuredClone(first),alive=revived(w);exact(alive);
 const bad=structuredClone(encoder.encode(Object.assign(w,alive),0,1,checkpoint));expect(decoder.adopt(bad).status).toBe('resync');expect(first).toEqual(before);
 const fresh=structuredClone(new SnapshotEncoder().encode(alive,0,1,true));fresh.epoch=9;expect(adopted(decoder,fresh)).toEqual(alive);
});

test.each([true,false])('V353 same-epoch checkpoint=%s cannot put the dead original back among living resources',checkpoint=>{
 const w=pending(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),first=adopted(decoder,encoder.encode(w,0,1,true)),before=structuredClone(first);
 const alive=structuredClone(w),pile=boxed(alive);alive.piles=alive.piles.filter(i=>i.id!==pile.id);alive.resources=[...alive.resources,structuredClone(pile.innerResource)];delete alive.pawns[0]!.interruptedCargo;refreshStock(alive);exact(alive);
 expect(decoder.adopt(structuredClone(encoder.encode(Object.assign(w,alive),0,1,checkpoint))).status).toBe('resync');expect(first).toEqual(before);
 const fresh=structuredClone(new SnapshotEncoder().encode(alive,0,1,true));fresh.epoch=9;expect(adopted(decoder,fresh)).toEqual(alive);
});

test('V353 snapshot baseline detects nested dead-source and retry changes after synchronous message capture',()=>{
 const w=pending(),encoder=new SnapshotEncoder(),first=structuredClone(encoder.encode(w,0,1,true));if(first.kind!=='checkpoint')throw Error('Checkpoint expected');const before=structuredClone(first.world);
 boxed(w).plantPack.pendingExpiry!.retryAt++;boxed(w).innerResource.amount=200;
 const delta=structuredClone(encoder.encode(w,0,1));expect(delta.kind).toBe('delta');if(delta.kind!=='delta')throw Error('Same World delta expected');
 const changed=delta.piles?.upserted.find(isMinifiedTree);expect(changed).toEqual(boxed(w));expect(changed?.plantPack.pendingExpiry?.retryAt).toBe(boxed(before).plantPack.pendingExpiry!.retryAt+1);expect(changed?.innerResource.amount).toBe(200);expect(first.world).toEqual(before);
});