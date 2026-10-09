import { expect,test } from 'vitest';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { deserializeWorld,serializeWorld } from '../src/sim/serialization.ts';
import { validBiofuelTransport,validBuildingFuelShape } from '../src/sim/biofuel-save.ts';
import { refreshStock } from '../src/sim/materials.ts';
import { BIOFUEL_RESEARCH_COST } from '../src/sim/research.ts';
import { biofuelCamp } from './helpers/biofuel-v283.ts';
import { medicalCamp } from './scenarios/health.ts';
import type { MaterialPile,World } from '../src/sim/types.ts';

const checkpoint=(w:World)=>new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)));
function refused(w:World){expect(validBiofuelTransport(w,w.schemaVersion)).toBe(false);expect(checkpoint(w).status).toBe('resync');expect(()=>deserializeWorld(JSON.stringify(w))).toThrow();}
function stacked(){const camp=biofuelCamp(),{world:w}=camp;const pile:MaterialPile={id:w.nextId++,kind:'chemfuel',item:'chemfuel',quantity:150,owner:{type:'ground',x:26,z:25}};w.piles.push(pile);refreshStock(w);return {...camp,pile};}
function carried(){const camp=stacked(),{world:w,pile,generatorId}=camp,p=w.pawns[0]!;
  pile.quantity=3;pile.owner={type:'pawn',pawnId:p.id};p.haul={sourcePileId:w.nextId++,carryPileId:pile.id,quantity:3,phase:'deliver',destination:{type:'fuel',structureId:generatorId},pickupCell:{x:26,z:25}};
  p.jobId=null;p.need=null;p.cooking=null;p.state='working';p.path=[];p.moveCooldown=0;delete p.motion;refreshStock(w);return {...camp,p};}

test('217 migration changes only the schema and does not add research, stock category or reserves',()=>{
  const w=medicalCamp(),before=structuredClone(w);w.schemaVersion=217 as World['schemaVersion'];before.schemaVersion=218;
  const original=structuredClone(w);expect(deserializeWorld(JSON.stringify(w))).toEqual(before);expect(w).toEqual(original);
  expect(Object.hasOwn(w.research??{},'biofuelRefining')).toBe(false);expect(w.stockpiles.every(z=>!Object.hasOwn(z.filters,'chemfuel'))).toBe(true);
});
test('full stack and partially consumed reserve retain exact save and Decoder checkpoints',()=>{
  const {world:w,generatorId}=stacked(),g=w.structures.find(s=>s.id===generatorId)!;
  g.fuel={ticks:599,burned:1,autoRefuel:false,burnRemainder:9};
  expect(validBiofuelTransport(w,218)).toBe(true);expect(deserializeWorld(serializeWorld(w))).toEqual(w);expect(checkpoint(w).status).toBe('applied');
});
test('future material, machine, category and research discriminants are refused before neutral migration',()=>{
  const changes=[(w:World)=>{w.piles.push({id:w.nextId++,kind:'chemfuel',item:'chemfuel',quantity:1,owner:{type:'ground',x:1,z:1}});},
    (w:World)=>{w.research??={points:0,project:null};w.research.biofuelRefining={points:0};},
    (w:World)=>{w.research??={points:0,project:null};w.research.project='biofuel-refining';},
    (w:World)=>{w.stockpiles.push({id:w.nextId++,x:1,z:1,filters:{wood:true,food:true,chemfuel:false},priority:1,capacity:75});},
    (w:World)=>{w.stockpiles.push({id:w.nextId++,x:1,z:1,filters:{wood:true,food:true},items:{chemfuel:false},priority:1,capacity:75});},
    (w:World)=>{w.structures.push({id:w.nextId++,kind:'chemfuel-generator',x:1,z:1,orientation:0,footprint:'standard',material:'steel'});}];
  for(const change of changes){const w=medicalCamp();w.schemaVersion=217 as World['schemaVersion'];change(w);refused(w);}
});
test('research progress is exact and cannot unlock a refinery through an absent completion',()=>{
  for(const state of [{points:BIOFUEL_RESEARCH_COST},{points:BIOFUEL_RESEARCH_COST-1,completedAt:3000},{points:BIOFUEL_RESEARCH_COST,completedAt:3001},{points:BIOFUEL_RESEARCH_COST,completedAt:3000,extra:true},undefined]){
    const {world:w}=biofuelCamp();w.research!.biofuelRefining=state as never;refused(w);
  }
  const {world:w}=biofuelCamp();w.research!.project='biofuel-refining';refused(w);
});
test('new generator fractional accounting has a strict twentieth remainder and original burn horizon',()=>{
  const f={ticks:600,burned:0,autoRefuel:true,burnRemainder:0};
  expect(validBuildingFuelShape(f,'chemfuel-generator',218,3000)).toBe(true);expect(validBuildingFuelShape(f,'chemfuel-generator',217,3000)).toBe(false);
  for(const patch of [{ticks:18001},{ticks:-1},{burnRemainder:20},{burnRemainder:-1},{burnRemainder:.5},{burned:1351},{extra:1},{ticks:0,burnRemainder:1}])expect(validBuildingFuelShape({...f,...patch},'chemfuel-generator',218,3000)).toBe(false);
  expect(validBuildingFuelShape({...f,burned:9},'chemfuel-generator',218,20)).toBe(true);expect(validBuildingFuelShape({...f,burned:9},'chemfuel-generator',218,19)).toBe(false);
  expect(validBuildingFuelShape({ticks:45000,burned:9000,autoRefuel:true,burnRemainder:4},'wood-generator',218,3000)).toBe(true);
});
test('chemical pile refuses food clocks, foreign metadata, category mismatch and impossible damage',()=>{
  for(const patch of [{quantity:151},{kind:'food'},{rot:{bornAt:3000,progress:0,lastTick:3000}},{foodPoison:{}},{unfinished:{}},{damage:50},{damage:0},{item:'wood'}]){
    const {world:w,pile}=stacked();Object.assign(pile,patch);refused(w);
  }
});
test('fuel supply cannot be counterfeited by rotation, material, free power or duplicated optional states',()=>{
  for(const patch of [{orientation:1},{material:'wood'},{footprint:'legacy-single'},{fuel:{ticks:0,burned:0,autoRefuel:true}},{power:{on:true,parentId:null}},{fuel:{ticks:600,burned:0,autoRefuel:true,burnRemainder:0,extra:1}}]){
    const {world:w,generatorId}=biofuelCamp();Object.assign(w.structures.find(s=>s.id===generatorId)!,patch);refused(w);
  }
});
test('real chemical cargo survives a save during refuel transport without transferring ownership',()=>{
  const {world:w}=carried();expect(validBiofuelTransport(w,218)).toBe(true);expect(checkpoint(w).status).toBe('applied');expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});
test('new fuel cargo rejects wood substitution, cooking purpose and oversized or partial possession',()=>{
  for(const patch of [{item:'wood',kind:'wood'},{quantity:2}]){const {world:w,pile}=carried();Object.assign(pile,patch);refused(w);}
  for(const patch of [{forCooking:true},{forced:false},{extra:1}]){const {world:w,p}=carried();Object.assign(p.haul!.destination,patch);refused(w);}
  const {world:w,p}=carried();p.haul!.quantity=11;refused(w);
});
test('chemfuel is never accepted by a legacy wood appliance',()=>{
  const {world:w,p,startGeneratorId}=carried();p.haul!.destination={type:'fuel',structureId:startGeneratorId};refused(w);
});
test('refuel contact progress requires the real carrier settled by the machine',()=>{
  const {world:w,p,generatorId}=carried(),g=w.structures.find(s=>s.id===generatorId)!;
  p.x=g.x-1;p.z=g.z;p.haul!.serviceProgress=1;expect(validBiofuelTransport(w,218)).toBe(true);
  p.z=g.z-1;expect(validBiofuelTransport(w,218)).toBe(false);
  p.x=1;p.z=1;refused(w);
});
test('machine removal keeps carried fuel but never validates a stale service intention',()=>{
  const {world:w,p,generatorId}=carried();w.structures=w.structures.filter(s=>s.id!==generatorId);expect(validBiofuelTransport(w,218)).toBe(false);
  p.haul=null;p.state='idle';p.interruptedCargo=true;expect(validBiofuelTransport(w,218)).toBe(true);
});
test('original human archives can retain chemical possessions but cannot retain local production tasks',()=>{
  const {world:w,p,pile}=carried();p.haul=null;p.state='idle';w.pawns=w.pawns.filter(q=>q.id!==p.id);w.piles=[];
  w.visitors={departed:[{tick:2990,pawn:p,items:[pile]}]} as never;
  expect(validBiofuelTransport(w,218)).toBe(true);
  p.cooking={recipe:'chemfuel-from-wood'} as never;expect(validBiofuelTransport(w,218)).toBe(false);
});
test('new machines cannot enter a minified owner and trade histories cannot invent local fuel purchases',()=>{
  const {world:w,generatorId}=biofuelCamp(),g=w.structures.find(s=>s.id===generatorId)!;w.structures=w.structures.filter(s=>s!==g);w.packed.push({building:g,owner:{type:'ground',x:26,z:25}} as never);refused(w);
  const next=stacked(),history=next.world;
  history.trade={count:1,silverPaid:1,silverReceived:0,forgone:0,bought:{wood:1},sold:{},recent:[{tick:history.tick-1,negotiatorId:history.pawns[0]!.id,traderId:history.pawns[1]!.id,silver:1,forgone:0,lines:[{item:'wood',quantity:1,unitPrice:1.2}]}]};
  expect(checkpoint(history).status).toBe('applied');
  history.trade.bought={chemfuel:1};history.trade.silverPaid=2;history.trade.recent[0]!.silver=2;history.trade.recent[0]!.lines=[{item:'chemfuel',quantity:1,unitPrice:2.3}];refused(history);
});
test('sparse Decoder updates apply the same strict remaining-fuel guard before adopting',()=>{
  const {world:w,generatorId}=biofuelCamp(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,1))).status).toBe('applied');
  w.structures.find(s=>s.id===generatorId)!.fuel!.burnRemainder=20;
  expect(decoder.adopt(structuredClone(encoder.encode(w,1,2))).status).toBe('resync');
});
