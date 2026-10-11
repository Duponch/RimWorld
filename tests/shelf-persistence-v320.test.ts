import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {newShelfStorage,storageCellById} from '../src/sim/shelf-storage.ts';
import {validShelfTransport} from '../src/sim/shelf-save.ts';
import {addGroundMaterial} from '../src/sim/materials.ts';
import {SCHEMA_VERSION,type Structure,type World} from '../src/sim/types.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {COMPLEX_FURNITURE_RESEARCH_COST} from '../src/sim/research.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {packagedSurvivalCamp} from './scenarios/packaged-survival-v206.ts';
import {validPackagedSurvivalState} from '../src/sim/packaged-survival-save.ts';

function prepared(kind:'shelf'|'small-shelf'='shelf'){
  const w=deconstructionCamp();w.stockpiles=[];w.growingZones=[];
  const s:Structure={id:w.nextId++,kind,x:17,z:18,orientation:0,footprint:'standard',material:'wood',shelf:newShelfStorage(Array.from({length:kind==='shelf'?2:1},()=>w.nextId++))};
  w.structures.push(s);return {w,s};
}
const checkpoint=(w:World)=>new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)));
function exact(w:World){
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const result=checkpoint(w);expect(result.status).toBe('applied');if(result.status==='applied')expect(result.world).toEqual(w);
}
test('a physically produced survival meal reserves a shelf through file and bridge, then deposits the original ration',()=>{
  const w=packagedSurvivalCamp(),p=w.pawns[0]!,station=w.structures[0]!;
  const s:Structure={id:w.nextId++,kind:'small-shelf',x:14,z:10,orientation:0,footprint:'standard',material:'wood',shelf:newShelfStorage([w.nextId++])};
  w.structures.push(s);station.bills![0]!.destination='stockpile';
  expect(applyCommand(w,{type:'order-cook',pawnId:p.id,structureId:station.id,queue:false}).ok).toBe(true);
  for(let i=0;i<1200&&p.cooking?.storageId!==s.shelf!.cells[0];i++)stepWorld(w);
  expect(p.cooking).toMatchObject({recipe:'cook-survival-meal',phase:'output',storageId:s.shelf!.cells[0]});
  const productId=p.cooking!.productId!;expect(validPackagedSurvivalState(w,SCHEMA_VERSION)).toBe(true);exact(w);
  const invalid=structuredClone(w);invalid.structures=invalid.structures.filter(b=>b.id!==s.id);
  expect(validPackagedSurvivalState(invalid,SCHEMA_VERSION)).toBe(false);expect(checkpoint(invalid).status).toBe('resync');
  const copy=deserializeWorld(serializeWorld(w));
  for(let i=0;i<300&&p.cooking;i++){stepWorld(w);stepWorld(copy);expect(serializeWorld(copy)).toBe(serializeWorld(w));}
  expect(p.cooking).toBeNull();expect(w.piles.find(q=>q.id===productId)).toMatchObject({item:'survival-meal',quantity:1,owner:{type:'ground',x:s.x,z:s.z}});exact(w);
});
test.each(['shelf','small-shelf'] as const)('%s persists independent physical slots and all policy ranges through both boundaries',kind=>{
  const {w,s}=prepared(kind);s.shelf!.settings={...s.shelf!.settings,priority:5,items:{wood:true,steel:true,component:true},quality:{min:'poor',max:'good'},hitPoints:{min:10,max:90},allowFresh:false,allowRotten:true};
  addGroundMaterial(w,'wood',75,s,'wood');addGroundMaterial(w,'steel',75,s,'steel');addGroundMaterial(w,'component',75,s,'component');
  expect(w.piles.filter(p=>p.owner.type==='ground'&&p.owner.x===s.x&&p.owner.z===s.z)).toHaveLength(3);
  const original=structuredClone(w);exact(w);expect(w).toEqual(original);expect(storageCellById(w,s.shelf!.cells[0]!)).toMatchObject({shelfId:s.id,priority:5});
});
test('228 migration is neutral and does not create any building, cell, item, policy or RNG draw',()=>{
  const w=deconstructionCamp();w.schemaVersion=228 as World['schemaVersion'];const original=structuredClone(w);
  expect(deserializeWorld(JSON.stringify(w))).toEqual({...original,schemaVersion:SCHEMA_VERSION});expect(w).toEqual(original);
});

test.each(['shelf','small-shelf'] as const)('%s completes a paid physical construction with independent durable cell IDs',kind=>{
  const w=deconstructionCamp();w.stockpiles=[];w.growingZones=[];
  w.research={project:null,points:0,complexFurniture:{points:COMPLEX_FURNITURE_RESEARCH_COST,completedAt:w.tick}};
  const cost=kind==='shelf'?20:10;addGroundMaterial(w,'wood',cost,{x:14,z:16},'wood');
  expect(applyCommand(w,{type:'designate',kind,x:17,z:18,orientation:1,material:'wood'}).ok).toBe(true);
  exact(w);
  for(let i=0;i<700&&!w.structures.some(s=>s.kind===kind);i++)stepWorld(w);
  const s=w.structures.find(s=>s.kind===kind);expect(s).toBeDefined();expect(w.jobs).toHaveLength(0);
  expect(w.piles.filter(p=>p.item==='wood').reduce((sum,p)=>sum+p.quantity,0)).toBe(0);
  expect(s!.shelf!.cells).toHaveLength(kind==='shelf'?2:1);
  expect(new Set([s!.id,...s!.shelf!.cells]).size).toBe(kind==='shelf'?3:2);
  expect(Object.hasOwn(s!,'quality')).toBe(false);exact(w);
});
test.each(['building','job','descriptor','packed','foreign-state'] as const)('historical 228 refuses future shelf content in %s before migration',mode=>{
  const {w,s}=prepared();w.schemaVersion=228 as World['schemaVersion'];
  if(mode==='job'){w.structures=[];w.jobs.push({id:s.id,kind:'shelf',x:s.x,z:s.z,orientation:0,footprint:'standard',material:'wood',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0},construction:'blueprint'});}
  if(mode==='descriptor'){w.structures=[];w.jobs.push({id:s.id,kind:'uninstall',x:s.x,z:s.z,orientation:0,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0},furniture:{structureId:s.id,kind:'shelf'}});}
  if(mode==='packed'){w.structures=[];w.packed.push({building:s,owner:{type:'ground',x:15,z:18}});}
  if(mode==='foreign-state')Object.assign(s,{kind:'wall'});
  expect(validShelfTransport(w,228)).toBe(false);expect(checkpoint(w).status).toBe('resync');expect(()=>deserializeWorld(JSON.stringify(w))).toThrow(/shelf/i);
});
test.each([
 ['missing state',(s:Structure)=>{delete s.shelf;}],
 ['too few cells',(s:Structure)=>{s.shelf!.cells=[];}],
 ['duplicate cells',(s:Structure)=>{s.shelf!.cells[1]=s.shelf!.cells[0]!;}],
 ['future identity',(s:Structure)=>{s.shelf!.cells[0]=Number.MAX_SAFE_INTEGER;}],
 ['owner collision',(s:Structure)=>{s.shelf!.cells[0]=s.id;}],
 ['noninteger cell',(s:Structure)=>{s.shelf!.cells[0]=.5;}],
 ['extra state key',(s:Structure)=>{Object.assign(s.shelf!,{virtualItems:[]});}],
 ['negative capacity',(s:Structure)=>{s.shelf!.settings.capacity=-1;}],
 ['noncanonical capacity',(s:Structure)=>{s.shelf!.settings.capacity=15;}],
 ['future filter',(s:Structure)=>{Object.assign(s.shelf!.settings.filters,{future:true});}],
 ['wrong quality',(s:Structure)=>{Object.assign(s,{quality:'normal'});}],
 ['foreign building state',(s:Structure)=>{Object.assign(s,{flower:{}});}],
 ['wrong kind',(s:Structure)=>{s.kind='wall';}],
] as const)('file and Decoder both reject %s atomically',(_name,mutate)=>{
  const {w,s}=prepared();mutate(s);const original=structuredClone(w);
  expect(checkpoint(w).status).toBe('resync');expect(()=>deserializeWorld(JSON.stringify(w))).toThrow();expect(w).toEqual(original);
});
test('a fourth pile on a shelf is not silently folded into quantities and both boundaries refuse it',()=>{
  const {w,s}=prepared('small-shelf');for(const [kind,item] of [['wood','wood'],['steel','steel'],['component','component']] as const)addGroundMaterial(w,kind,75,s,item);
  w.piles.push({id:w.nextId++,kind:'medicine',item:'medicine',quantity:1,owner:{type:'ground',x:s.x,z:s.z}});
  expect(checkpoint(w).status).toBe('resync');expect(()=>serializeWorld(w)).toThrow();
});
test('packed shelf retains settings and storage cell identities without exposing active storage',()=>{
  const {w,s}=prepared();w.structures=[];w.packed.push({building:s,owner:{type:'ground',x:15,z:18}});
  exact(w);for(const id of s.shelf!.cells)expect(storageCellById(w,id)).toBeUndefined();
});
test('file and bridge refuse a packed object resting on an empty installed shelf',()=>{
  const {w,s}=prepared('small-shelf');
  const stool:Structure={id:w.nextId++,kind:'stool',x:5,z:5,orientation:0,footprint:'standard',material:'wood',quality:'normal'};
  w.packed.push({building:stool,owner:{type:'ground',x:5,z:5}});exact(w);
  w.packed[0]!.owner={type:'ground',x:s.x,z:s.z};
  expect(checkpoint(w).status).toBe('resync');expect(()=>deserializeWorld(JSON.stringify(w))).toThrow();
});

test('shelf cell IDs reserve the namespace even without relational or orbital owners',()=>{
  const {w,s}=prepared();delete w.relationships;delete w.planet;delete w.group;delete w.groupLosses;delete w.orbital;
  exact(w);s.shelf!.cells[0]=w.pawns[0]!.id;
  expect(checkpoint(w).status).toBe('resync');expect(()=>serializeWorld(w)).toThrow();
});

test('removing the last shelf in a delta must also resolve every surplus physical pile',()=>{
  const {w,s}=prepared('small-shelf');for(const [kind,item] of [['wood','wood'],['steel','steel'],['component','component']] as const)addGroundMaterial(w,kind,75,s,item);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),initial=decoder.adopt(structuredClone(encoder.encode(w,0,1)));
  expect(initial.status).toBe('applied');const held=structuredClone(initial);w.structures=[];
  const invalid=structuredClone(encoder.encode(w,0,1));expect(invalid.kind).toBe('delta');
  expect(decoder.adopt(invalid).status).toBe('resync');expect(initial).toEqual(held);
});
