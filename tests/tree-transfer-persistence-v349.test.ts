import {expect,test} from 'vitest';
import {preparedTreeWrapper,treeTransferScene} from './scenarios/tree-transfer-v349';
import {SnapshotEncoder,SnapshotDecoder,type SnapshotMessage} from '../src/bridge/snapshots';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization';
import {SCHEMA_VERSION,type World} from '../src/sim/types';
import {ensureFireState} from '../src/sim/fire-rules';
import {refreshStock} from '../src/sim/materials';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {isMinifiedTree} from '../src/sim/tree-transfer';
import {validTreePileShape} from '../src/sim/tree-transfer-save';
import {validOriginalTreeResource} from '../src/sim/tree-transfer-resource-save';
import type {MinifiedTreePile} from '../src/sim/tree-transfer-state';

function exact(w:World){expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);const adopted=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1,true)));expect(adopted.status).toBe('applied');if(adopted.status==='applied')expect(adopted.world).toEqual(w);}
function payload(packet:SnapshotMessage):MinifiedTreePile{const pile=packet.kind==='checkpoint'?packet.world.piles.find(isMinifiedTree):packet.piles?.upserted.find(isMinifiedTree);if(!pile)throw Error('Missing changed tree payload in the prepared packet');return pile;}
const record=(value:object)=>value as unknown as Record<string,unknown>;

test.each(['oak','poplar','pine','birch','drago',null] as const)('V349 boxed %s has one owner, two exact IDs and neutral file / checkpoint transport',species=>{const {w,pile,source}=preparedTreeWrapper(species),before=structuredClone(w);exact(w);expect(w).toEqual(before);expect(w.resources.some(r=>r.id===source.id)).toBe(false);expect(pile.id).not.toBe(source.id);expect(pile.innerResource).toBe(source);});

test('V349 migration validates the literal 234 source first and only changes its header',()=>{const w=treeTransferScene(),literal={...structuredClone(w),schemaVersion:234} as unknown as World,before=structuredClone(literal);expect(deserializeWorld(JSON.stringify(literal))).toEqual({...before,schemaVersion:SCHEMA_VERSION});expect(literal).toEqual(before);expect(literal.resources).toHaveLength(1);expect(literal.piles).toEqual([]);});

test.each(['boxed-item','tree-job','plant-target','paused-life'] as const)('V349 schema234 refuses future %s before migration',mode=>{
  const prepared=mode==='boxed-item'?preparedTreeWrapper():{w:treeTransferScene()},w=prepared.w;
  if(mode==='tree-job')expect(applyCommand(w,{type:'extract-tree',resourceId:w.resources[0]!.id}).ok).toBe(true);
  if(mode==='plant-target'){expect(applyCommand(w,{type:'designate',kind:'cut',x:12,z:10}).ok).toBe(true);w.jobs[0]!.plantTarget={resourceId:w.resources[0]!.id};}
  if(mode==='paused-life')Object.assign(w.resources[0]!.plantLife!,{pausedTicks:0,ageTick:w.tick});
  w.schemaVersion=234 as World['schemaVersion'];const before=structuredClone(w);expect(()=>deserializeWorld(JSON.stringify(w))).toThrow();expect(w).toEqual(before);
});

test.each(['innerResource','plantPack'] as const)('V349 raw234 refuses own undefined %s on an ordinary pile before adoption',key=>{
  const w=treeTransferScene(),pile={id:w.nextId++,kind:'wood' as const,item:'wood' as const,quantity:1,owner:{type:'ground' as const,x:4,z:4}};Object.assign(pile,{[key]:undefined});w.piles=[pile];refreshStock(w);w.schemaVersion=234 as World['schemaVersion'];
  const before=structuredClone(w),packet=structuredClone(new SnapshotEncoder().encode(w,0,1,true));expect(new SnapshotDecoder().adopt(packet).status).toBe('resync');expect(w).toEqual(before);
  expect(validTreePileShape(pile,234,w.tick,w.nextId,(resource,tick)=>validOriginalTreeResource(resource,w,235,tick))).toBe(false);
});

const corruptions:{name:string;change:(p:MinifiedTreePile,w:World)=>void}[]=[
  {name:'wrapper quantity two',change:p=>{record(p).quantity=2;}},
  {name:'inner identity equals wrapper',change:p=>{p.innerResource.id=p.id;}},
  {name:'inner identity equals a real colonist',change:(p,w)=>{p.innerResource.id=w.pawns[0]!.id;}},
  {name:'inner identity exceeds nextId',change:(p,w)=>{p.innerResource.id=w.nextId;}},
  {name:'unsupported saguaro conversion',change:p=>{p.innerResource.species='saguaro';}},
  {name:'changed exact deadline',change:p=>{p.plantPack.expiresAt--;}},
  {name:'reset stamp beyond current clock',change:(p,w)=>{p.plantPack.packedAt=w.tick+1;p.plantPack.expiresAt=p.plantPack.packedAt+42000;}},
  {name:'extra inner field',change:p=>{record(p.innerResource).future=1;}},
  {name:'extra pack field',change:p=>{record(p.plantPack).resetAt=1;}},
  {name:'wrapper HP is not inner HP',change:p=>{p.damage=100;}},
  {name:'source growth checkpoint after extraction',change:p=>{p.innerResource.growthTick=p.plantPack.packedAt+1;}},
  {name:'forbidden job escrow owner',change:p=>{p.owner={type:'job',jobId:1};}},
];

test.each(corruptions)('V349 save rejects $name without rewriting either identity',({change})=>{const {w,pile}=preparedTreeWrapper();exact(w);change(pile,w);const before=structuredClone(w);expect(()=>deserializeWorld(JSON.stringify(w))).toThrow();expect(w).toEqual(before);});

test.each([true,false])('V349 Decoder checkpoint=%s rejects tree-domain damage atomically and retries the exact valid revision',checkpoint=>{
  const {w,pile}=preparedTreeWrapper(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();exact(w);
  const first=decoder.adopt(structuredClone(encoder.encode(w,0,1,true)));expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('Prepared boxed baseline rejected');const retained=structuredClone(first.world);
  pile.damage=10;const good=structuredClone(encoder.encode(w,0,1,checkpoint));if(!checkpoint)expect(good.kind).toBe('delta');
  for(const {name,change} of corruptions){const bad=structuredClone(good);change(payload(bad),w);expect(decoder.adopt(bad).status,name).toBe('resync');expect(first.world).toEqual(retained);}
  const retry=decoder.adopt(good);expect(retry.status).toBe('applied');if(retry.status==='applied')expect(retry.world).toEqual(w);expect(first.world).toEqual(retained);
});

test('V349 Decoder rejects live duplication of the contained original in resources, even if its inner coordinates are only provenance',()=>{
  const {w,pile}=preparedTreeWrapper(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();exact(w);const first=decoder.adopt(structuredClone(encoder.encode(w,0,1,true)));expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('Prepared baseline rejected');const retained=structuredClone(first.world);
  const bad=structuredClone(encoder.encode(w,0,1,true));if(bad.kind!=='checkpoint')throw Error('Checkpoint expected');bad.world.resources.push(structuredClone(pile.innerResource));expect(decoder.adopt(bad).status).toBe('resync');expect(first.world).toEqual(retained);
});

test('V349 actual source → contained original → source delta preserves older confirmed worlds',()=>{
  const w=treeTransferScene('oak',.1),sourceId=w.resources[0]!.id,encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),frames:{world:World;before:World}[]=[];
  const send=()=>{const message=structuredClone(encoder.encode(w,0,1)),result=decoder.adopt(message);expect(result.status).toBe('applied');if(result.status!=='applied')throw Error('Actual tree state rejected');expect(result.world).toEqual(w);for(const frame of frames)expect(frame.world).toEqual(frame.before);frames.push({world:result.world,before:structuredClone(result.world)});return message;};
  exact(w);send();expect(applyCommand(w,{type:'extract-tree',resourceId:sourceId}).ok).toBe(true);send();for(let tick=0;tick<700&&!w.piles.some(isMinifiedTree);tick++)stepWorld(w);const pile=w.piles.find(isMinifiedTree);expect(pile).toBeDefined();const wrapped=send();expect(wrapped.kind).toBe('delta');
  expect(applyCommand(w,{type:'replant-tree',pileId:pile!.id,x:20,z:14}).ok).toBe(true);send();for(let tick=0;tick<700&&!w.resources.some(r=>r.id===sourceId);tick++)stepWorld(w);expect(w.resources.some(r=>r.id===sourceId)).toBe(true);send();exact(w);
});

// Declared sparse counters, never a claimed natural minified-tree destruction.
test.each(['fire','neutral'] as const)('V349 old234 cannot import a future minified-tree %s ledger key',kind=>{
 const w=treeTransferScene();if(kind==='fire')ensureFireState(w).ledger.items['minified-tree']=1;else w.destroyed={count:0,lost:{},items:{'minified-tree':1}};
 expect(validateWorld(w)).toEqual([]);const literal={...structuredClone(w),schemaVersion:234};expect(()=>deserializeWorld(JSON.stringify(literal))).toThrow();
});
