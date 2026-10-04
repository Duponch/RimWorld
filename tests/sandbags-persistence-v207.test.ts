import { expect,test } from 'vitest';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index.ts';
import { barrierHp,barrierMaxHp } from '../src/sim/barriers.ts';
import { COMPLEX_FURNITURE_RESEARCH_COST } from '../src/sim/research.ts';
import { SCHEMA_VERSION,type Structure,type World } from '../src/sim/types.ts';
import { deconstructionCamp,fixtureBuilding } from './scenarios/deconstruction.ts';

function sacks():World {
  const w=deconstructionCamp();
  // Prepared installed identity, distinct from the physical construction scenarios.
  const s:Structure=fixtureBuilding(w,'sandbags',17,16);s.material='cloth';
  expect(validateWorld(w)).toEqual([]);return w;
}
function armchair():World {
  const w=deconstructionCamp();
  // Prepared legacy upholstery, its required completed research and known old counters;
  // historical textile losses remain unknown.
  w.research={project:null,points:0,complexFurniture:{points:COMPLEX_FURNITURE_RESEARCH_COST,completedAt:0}};
  const s:Structure=fixtureBuilding(w,'armchair',17,16);s.material='cloth';
  w.deconstructed={count:7,lostWood:23,lostSteel:9,fuelTicks:600};
  expect(validateWorld(w)).toEqual([]);return w;
}
function until(w:World,done:()=>boolean):void {
  for(let i=0;i<1500&&!done();i++)stepWorld(w);
  expect(done()).toBe(true);expect(validateWorld(w)).toEqual([]);
}
const raw=(w:World)=>JSON.parse(serializeWorld(w));

test('strict 188 migration preserves the entire legacy world and does not invent textile losses',()=>{
  const source=raw(armchair());source.schemaVersion=188;
  const retained=JSON.stringify(source),loaded=deserializeWorld(retained);
  expect(SCHEMA_VERSION).toBe(189);expect(loaded).toEqual({...source,schemaVersion:189});
  expect(loaded.deconstructed.lostTextiles).toBeUndefined();
  expect(Object.hasOwn(loaded.deconstructed,'lostTextiles')).toBe(false);
  expect(loaded.rng).toBe(source.rng);expect(loaded.nextId).toBe(source.nextId);
  expect(JSON.stringify(source)).toBe(retained);
  expect(deserializeWorld(serializeWorld(loaded))).toEqual(loaded);
});

test('188 refuses future sandbag structures, plans, removal targets, packages and textile ledger before migration',()=>{
  const cases:Array<{label:string;value:ReturnType<typeof raw>}>=[];
  cases.push({label:'installed sandbags',value:raw(sacks())});
  const planned=deconstructionCamp();
  expect(applyCommand(planned,{type:'designate',kind:'sandbags',x:22,z:20}).ok).toBe(true);
  cases.push({label:'sandbag blueprint',value:raw(planned)});
  const removal=armchair();
  expect(applyCommand(removal,{type:'designate',kind:'deconstruct',x:17,z:16}).ok).toBe(true);
  const futureRemoval=raw(removal);futureRemoval.jobs[0].deconstruction.kind='sandbags';
  cases.push({label:'isolated future removal target',value:futureRemoval});
  const transfer=armchair();expect(applyCommand(transfer,{type:'designate',kind:'uninstall',x:17,z:16}).ok).toBe(true);
  const futureTransfer=raw(transfer);futureTransfer.jobs[0].furniture.kind='sandbags';
  cases.push({label:'isolated future transfer payload',value:futureTransfer});
  const packed=raw(sacks());packed.packed=[{building:packed.structures.pop(),owner:{type:'ground',x:17,z:16}}];
  cases.push({label:'forbidden sandbag package',value:packed});
  for(const lostTextiles of [{cloth:3},{'light-leather':4},{}]){
    const value=raw(armchair());value.deconstructed.lostTextiles=lostTextiles;
    cases.push({label:`future textile ledger ${JSON.stringify(lostTextiles)}`,value});
  }
  const damagedLegacy=raw(armchair());damagedLegacy.pawns[0].id=0;
  cases.push({label:'invalid preexisting 188 pawn',value:damagedLegacy});
  for(const {label,value} of cases){
    value.schemaVersion=188;const retained=JSON.stringify(value);
    expect(()=>deserializeWorld(retained),label).toThrow(/version 188/);
    expect(JSON.stringify(value),label).toBe(retained);
  }
});

test('sandbag persistence requires cloth, orientation zero, standard footprint and damage strictly below 300 without quality',()=>{
  const w=sacks(),s=w.structures[0]!;s.damage=299;
  expect(barrierMaxHp(s)).toBe(300);expect(barrierHp(s)).toBe(1);
  const saved=serializeWorld(w);expect(deserializeWorld(saved)).toEqual(w);
  const corruptions:Array<{label:string;change:(v:ReturnType<typeof raw>)=>void}>=[
    {label:'missing cloth',change:v=>delete v.structures[0].material},
    {label:'leather substitute',change:v=>v.structures[0].material='light-leather'},
    {label:'rotation',change:v=>v.structures[0].orientation=1},
    {label:'legacy footprint',change:v=>v.structures[0].footprint='legacy-single'},
    {label:'quality',change:v=>v.structures[0].quality='normal'},
    {label:'medical role',change:v=>v.structures[0].medical=true},
    {label:'unknown future attribute',change:v=>v.structures[0].paint='red'},
    ...[0,-1,.5,300,301].map(damage=>({label:`damage ${damage}`,change:(v:ReturnType<typeof raw>)=>{v.structures[0].damage=damage;}})),
  ];
  for(const {label,change} of corruptions){const v=JSON.parse(saved);change(v);expect(()=>deserializeWorld(JSON.stringify(v)),label).toThrow();}
  expect(serializeWorld(w)).toBe(saved);
});

test('sandbag plans and removal payloads reject incompatible orientation/material, and packages or transfer payloads are always forbidden',()=>{
  const plan=deconstructionCamp();expect(applyCommand(plan,{type:'designate',kind:'sandbags',x:22,z:20}).ok).toBe(true);
  const removal=sacks();expect(applyCommand(removal,{type:'designate',kind:'deconstruct',x:17,z:16}).ok).toBe(true);
  for(const [label,w] of [['plan',plan],['removal',removal]] as const){
    const saved=serializeWorld(w);expect(deserializeWorld(saved)).toEqual(w);
    const changes:Array<(v:ReturnType<typeof raw>)=>void>=[
      v=>v.jobs[0].orientation=1,v=>v.jobs[0].footprint='legacy-single',
      v=>{const target=label==='plan'?v.jobs[0]:v.jobs[0].deconstruction;target.material='light-leather';},
      v=>{const target=label==='plan'?v.jobs[0]:v.jobs[0].deconstruction;delete target.material;},
    ];
    for(const change of changes){const v=JSON.parse(saved);change(v);expect(()=>deserializeWorld(JSON.stringify(v)),label).toThrow();}
  }
  const packed=raw(sacks());packed.packed=[{building:packed.structures.pop(),owner:{type:'ground',x:17,z:16}}];
  expect(()=>deserializeWorld(JSON.stringify(packed))).toThrow();
  const transfer=armchair();expect(applyCommand(transfer,{type:'designate',kind:'uninstall',x:17,z:16}).ok).toBe(true);
  const forged=raw(transfer);forged.jobs[0].furniture.kind='sandbags';
  expect(()=>deserializeWorld(JSON.stringify(forged))).toThrow();
});

test('only prospective physical deconstruction of migrated upholstery adds known cloth losses, with deterministic saved continuation',()=>{
  const legacy=raw(armchair());legacy.schemaVersion=188;
  const w=deserializeWorld(JSON.stringify(legacy)),historical=structuredClone(w.deconstructed);
  expect(applyCommand(w,{type:'designate',kind:'deconstruct',x:17,z:16}).ok).toBe(true);
  expect(w.deconstructed).toEqual(historical);expect(w.piles).toEqual([]);
  until(w,()=>(w.jobs[0]?.progress??0)>0);const saved=serializeWorld(w),copy=deserializeWorld(saved),start=w.tick;
  until(w,()=>!w.structures.length);stepWorld(copy,w.tick-start);
  expect(copy).toEqual(w);expect(w.deconstructed).toEqual({...historical,count:8,lostTextiles:{cloth:55}});
  expect(w.piles.filter(p=>p.item==='cloth').reduce((sum,p)=>sum+p.quantity,0)).toBe(55);
  expect(JSON.parse(saved).deconstructed).toEqual(historical);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('known positive textile losses roundtrip without stock and remain independent from loaded clones; malformed ledgers are refused',()=>{
  const w=armchair();w.deconstructed.lostTextiles={cloth:3,'light-leather':7};
  const saved=serializeWorld(w),copy=deserializeWorld(saved);
  expect(copy).toEqual(w);expect(copy.piles).toEqual([]);
  expect(copy.deconstructed.lostTextiles).not.toBe(w.deconstructed.lostTextiles);
  w.deconstructed.lostTextiles.cloth=8;
  expect(copy.deconstructed.lostTextiles).toEqual({cloth:3,'light-leather':7});
  for(const ledger of [{},{cloth:0},{cloth:-1},{cloth:.5},{cloth:Number.MAX_SAFE_INTEGER+1},{wood:2},{cloth:3,unknown:1},[],null]){
    const v=JSON.parse(saved);v.deconstructed.lostTextiles=ledger;
    expect(()=>deserializeWorld(JSON.stringify(v)),JSON.stringify(ledger)).toThrow();
  }
});
