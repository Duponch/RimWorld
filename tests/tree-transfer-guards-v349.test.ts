import {test,expect} from 'vitest';
import {treeTransferScene,preparedTreeWrapper} from './scenarios/tree-transfer-v349';
import {physicalTravelUnitMass} from '../src/sim/tree-transfer-mass';
import {storageConditionAccepts} from '../src/sim/storage-condition';
import {itemInformation} from '../src/ui/item-information';
import {prepareConstructionFlora} from './scenarios/construction-flora-v348';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots';
import {validTreeJobShape,validateTreeTransport} from '../src/sim/tree-transfer-save';
import {validateWorld,deserializeWorld,serializeWorld} from '../src/sim/serialization';
import type {World} from '../src/sim/types';
function extracting(){const w=treeTransferScene();expect(applyCommand(w,{type:'extract-tree',resourceId:w.resources[0]!.id}).ok).toBe(true);expect(validateWorld(w)).toEqual([]);return w;}
function planting(){const {w,pile}=preparedTreeWrapper();expect(applyCommand(w,{type:'replant-tree',pileId:pile.id,x:20,z:14}).ok).toBe(true);expect(validateWorld(w)).toEqual([]);return w;}
function refusedAtomically(good:World,change:(w:World)=>void){
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();const first=decoder.adopt(encoder.encode(good,0,1,true));expect(first.status).toBe('applied');if(first.status!=='applied')throw Error(first.status==='resync'?first.reason:'Unexpected stale first checkpoint');
 const before=structuredClone(first.world),valid=encoder.encode(good,0,1,true),bad=structuredClone(valid);if(bad.kind!=='checkpoint')throw Error('Expected explicit checkpoint');change(bad.world);
 expect(decoder.adopt(bad).status).toBe('resync');expect(first.world).toEqual(before);const retry=decoder.adopt(valid);expect(retry.status).toBe('applied');if(retry.status==='applied')expect(retry.world).toEqual(good);
}
test('V349 new tree job envelope is closed without changing ordinary Jobs',()=>{
 const w=extracting(),job=structuredClone(w.jobs[0]!);Object.assign(job,{unexpected:1});expect(validTreeJobShape(job,w.schemaVersion,w.nextId)).toBe(false);
 const bad=structuredClone(w);Object.assign(bad.jobs[0]!,{unexpected:1});expect(()=>deserializeWorld(serializeWorld(bad))).toThrow();refusedAtomically(w,c=>Object.assign(c.jobs[0]!,{unexpected:1}));
});
test('V349 isolated new tree domain rejects out-of-map replant before Decoder adopts it',()=>{
 const w=planting(),bad=structuredClone(w);bad.jobs[0]!.x=bad.width;expect(validateTreeTransport(bad)).toBe(false);refusedAtomically(w,c=>{c.jobs[0]!.x=c.width;});
});
test('V349 Decoder rejects outer extraction Job ID colliding with a real colonist even without other strict domains',()=>{
 const w=extracting();expect(w.startingArrival).toBeUndefined();expect(w.orbital).toBeUndefined();refusedAtomically(w,c=>{c.jobs[0]!.id=c.pawns[0]!.id;});
});
test('V349 extraction remainder must be a positive bounded integer',()=>{
 const w=extracting();for(const value of [0,-1,10000,NaN,1.5]){const job=structuredClone(w.jobs[0]!);job.workRemainder=value;expect(validTreeJobShape(job,w.schemaVersion,w.nextId)).toBe(false);}
});

test('V349 current wrapper HP filter and information use the explicit new context',()=>{
 const {pile}=preparedTreeWrapper();pile.damage=10;
 expect(storageConditionAccepts({hitPoints:{min:90,max:100}},pile)).toBe(true);
 expect(storageConditionAccepts({hitPoints:{min:91,max:100}},pile)).toBe(false);
 expect(itemInformation(pile).rows).toContainEqual(expect.objectContaining({label:'Points de vie',value:'90 / 100'}));
 expect(pile.innerResource.damage).toBe(30);
});

function clearing(){
 const {w,pile}=preparedTreeWrapper();w.resources.push({id:w.nextId++,kind:'wild-plant',species:'grass',x:20,z:14,amount:0,growth:.5,growthTick:w.tick});prepareConstructionFlora(w);
 expect(applyCommand(w,{type:'replant-tree',pileId:pile.id,x:20,z:14}).ok).toBe(true);
 for(let n=0;n<500&&!w.jobs[0]?.clearance;n++)stepWorld(w);
 expect(w.jobs[0]?.clearance).toBeDefined();expect(validateWorld(w)).toEqual([]);return w;
}
test('V349 real replant clearance rejects invalid remainder before adopting a new-domain candidate',()=>{
 const w=clearing();for(const value of [0,-1,10000,1.5]){const job=structuredClone(w.jobs[0]!);job.clearance!.workRemainder=value;expect(validTreeJobShape(job,w.schemaVersion,w.nextId)).toBe(false);}
 refusedAtomically(w,c=>{c.jobs[0]!.clearance!.workRemainder=-1;});
});
test('V349 replant clearance must resolve its living resource at the exact destination',()=>{
 const w=clearing(),bad=structuredClone(w);bad.jobs[0]!.clearance!.resourceId=bad.nextId-1; // nextId-1 is the replant Job, not a Resource.
 expect(validateTreeTransport(bad)).toBe(false);refusedAtomically(w,c=>{c.jobs[0]!.clearance!.resourceId=c.nextId-1;});
});
test('V349 a legacy manual plant Job without plantTarget cannot share an active extraction claim',()=>{
 const good=extracting();const corrupt=(w:World)=>{
 const extract=w.jobs[0]!,p=w.pawns[0]!,other=w.pawns[1]!;Object.assign(p,{x:11,z:10,state:'working',jobId:extract.id,path:[],moveCooldown:0});Object.assign(extract,{status:'active',reservedBy:p.id});
 const cut={id:w.nextId++,kind:'cut' as const,x:12,z:10,orientation:0 as const,footprint:'standard' as const,status:'active' as const,reservedBy:other.id,progress:2,escrow:{wood:0,food:0}};w.jobs.push(cut);Object.assign(other,{x:13,z:10,state:'working',jobId:cut.id,path:[],moveCooldown:0});other.priorities.gather=1;
 };
 const bad=structuredClone(good);corrupt(bad);expect(validateTreeTransport(bad)).toBe(false);refusedAtomically(good,corrupt);
});

test('V349 actual replant clearance cannot be loaded past its own plant work duration',()=>{
 const w=clearing(),bad=structuredClone(w);bad.jobs[0]!.clearance!.progress=60;expect(validateTreeTransport(bad)).toBe(false);refusedAtomically(w,c=>{c.jobs[0]!.clearance!.progress=60;});
});

test('V349 older mass context keeps wood outside its historical travel catalogue',()=>{
 const wood={id:2,kind:'wood' as const,item:'wood' as const,quantity:1,owner:{type:'inventory' as const,pawnId:1}};
 expect(physicalTravelUnitMass(wood,234)).toBeUndefined();expect(physicalTravelUnitMass(wood,235)).toBe(400);
});
