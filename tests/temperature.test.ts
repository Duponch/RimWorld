import { withoutResearch,withMigratedResearch } from './scenarios/legacy-skills';
import { SCHEMA_VERSION } from '../src/sim/types';
import { withoutPawnSkills, withMigratedSkills } from './scenarios/legacy-skills';
import { finishRoofJob } from '../src/sim/roofing';
import { plantClimateFixture } from './scenarios/plant-climate';
import { plantGrowth, plantTemperatureFactor, sowingTemperatureAllowed } from '../src/sim/plants';
import { updatePlantTemperatures } from '../src/sim/thermal-plants';
import { scheduleGrowing, growingJobValid } from '../src/sim/farming';
import { plantInspection } from '../src/ui/plant-inspection';
import { expect,test } from 'vitest';
import { createWorld,stepWorld,applyCommand,validateWorld,serializeWorld,deserializeWorld } from '../src/sim/index';
import { advanceTemperature,outdoorTemperature,reconcileTemperature,TemperatureView } from '../src/sim/temperature';
import { rotAge,rotRateAtTemperature } from '../src/sim/food-preservation';
import { updateFoodTemperatures } from '../src/sim/thermal-food';
import { addMaterial,refreshStock,transferPile } from '../src/sim/materials';
import { newDoorState } from '../src/sim/door-rules';
import { newCampfireFuel } from '../src/sim/fuel';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots';
import type { World } from '../src/sim/types';
import { ThermalTopologyCache } from '../src/sim/thermal-topology';
import { RoomTopologyCache } from '../src/sim/room-topology';

function chamber() {
  const w=createWorld(81,32,32);w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.structures=[];w.piles=[];w.jobs=[];
  for(const p of w.pawns){p.x=20;p.z=20;p.hunger=100;p.rest=100;p.recreation.level=100;p.schedule.fill('anything');}
  for(let x=2;x<=7;x++)for(const z of [2,7])wall(w,x,z);
  for(let z=3;z<7;z++)for(const x of [2,7])wall(w,x,z);
  const cells=[];for(let z=3;z<7;z++)for(let x=3;x<7;x++)cells.push(z*32+x);
  w.roofing={constructed:cells,build:[],remove:[],cursor:0};refreshStock(w);reconcileTemperature(w);return w;
}
function wall(w:World,x:number,z:number){w.structures.push({id:w.nextId++,kind:'wall',x,z,orientation:0,footprint:'standard'});}
const at=(w:World,x=4,z=4)=>new TemperatureView(w).at(w,{x,z});
const heat=(w:World,n:number)=>{const l=reconcileTemperature(w);for(let i=0;i<n;i++){w.tick++;advanceTemperature(w,l);}};

test('air history: exact roof threshold, heating, leakage, doors, split/merge and serialization',()=>{
  const cache=new ThermalTopologyCache(),oracle=new RoomTopologyCache();
  const random=createWorld(9,16,16);random.structures=[];let seed=91;
  const roll=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
  const compare=()=>{
    const roofs=new Set(random.roofing!.constructed),full=oracle.read(random),expected:number[][]=[];
    for(const space of full.allSpaces())if(!space.touchesMapEdge){const cells=random.tiles.flatMap((_,i)=>full.at(i%random.width,Math.floor(i/random.width))===space?[i]:[]);if(cells.filter(i=>!roofs.has(i)).length<Math.ceil(cells.length*.25))expected.push(cells);}
    const layout=cache.read(random);expect(layout.rooms.map(r=>r.cells)).toEqual(expected);expect(cache.read(random)).toBe(layout);return layout;
  };
  // Independent global oracle versus the bounded search, with in-place changes
  // and equal-area dimensions. Previous returned snapshots must remain intact.
  for(let round=0;round<60;round++) {
    random.tiles=random.tiles.map(()=>({terrain:roll()<.37?'rock':'grass'}));
    random.roofing={constructed:random.tiles.flatMap((_,i)=>roll()<.65?[i]:[]),build:[],remove:[],cursor:0};
    if(round===30){random.width=32;random.height=8;}
    const previous=compare(),snapshot=structuredClone(previous);
    // Keep the key, array identities and tick unchanged: only terrain mutates.
    for(let mutation=0;mutation<8;mutation++) {
      const tile=random.tiles[Math.floor(roll()*random.tiles.length)]!;tile.terrain=tile.terrain==='rock'?'grass':'rock';compare();
    }
    expect(previous).toEqual(snapshot);
  }
  expect(outdoorTemperature(1080)).toBeCloseTo(14);expect(outdoorTemperature(4080)).toBeCloseTo(28);
  const w=chamber();expect(w.thermal!.regions).toHaveLength(1);w.thermal!.regions[0]!.temperature=5;
  const partial=structuredClone(w);partial.roofing!.constructed.splice(0,3);reconcileTemperature(partial);expect(at(partial)).toBe(5);
  partial.roofing!.constructed.shift();reconcileTemperature(partial);expect(partial.thermal).toBeUndefined();expect(at(partial)).toBe(outdoorTemperature(partial.tick));
  const plain=structuredClone(w);heat(plain,100);expect(at(plain)).toBeGreaterThan(5);
  const leaky=structuredClone(w);leaky.roofing!.constructed.splice(0,3);heat(leaky,100);expect(at(leaky)).toBeGreaterThan(at(plain));
  const fire=structuredClone(w);fire.structures.push({id:fire.nextId++,kind:'campfire',x:4,z:4,orientation:0,footprint:'standard',fuel:newCampfireFuel(),bills:[]});
  heat(fire,200);expect(at(fire)).toBeGreaterThan(at(plain));expect(at(fire)).toBeLessThanOrEqual(28);
  fire.structures.find(s=>s.kind==='campfire')!.fuel!.ticks=0;const before=at(fire);heat(fire,100);expect(at(fire)).toBeLessThan(before);
  const doorway=structuredClone(w),d=doorway.structures.find(s=>s.x===2&&s.z===4)!;d.kind='door';d.door=newDoorState(doorway.tick);
  doorway.roofing!.constructed.push(4*32+2);doorway.roofing!.constructed.sort((a,b)=>a-b);reconcileTemperature(doorway);
  const open=structuredClone(doorway);open.structures.find(s=>s.id===d.id)!.door!.open=true;
  heat(doorway,100);heat(open,100);expect(at(open)).toBeGreaterThan(at(doorway));
  // Add a second adjacent covered door: it must still exchange air.
  const double=structuredClone(w),first=double.structures.find(s=>s.x===2&&s.z===4)!;first.kind='door';first.door=newDoorState(0);first.door.open=true;
  double.structures.push({...first,id:double.nextId++,x:1,door:{...first.door}});double.roofing!.constructed.push(130,129);double.roofing!.constructed.sort((a,b)=>a-b);
  heat(double,100);expect(at(double)).toBeGreaterThan(at(plain));
  // No ordinary air next to this doorway: walls must still leak heat.
  const isolated=chamber();isolated.structures=[];isolated.roofing!.constructed=[4*32+4];
  for(const [x,z] of [[3,4],[5,4],[4,3],[4,5]])wall(isolated,x!,z!);
  isolated.structures.push({...d,id:isolated.nextId++,x:4,z:4,door:newDoorState(0)});
  reconcileTemperature(isolated);isolated.thermal!.regions[0]!.temperature=0;heat(isolated,100);expect(at(isolated)).toBeGreaterThan(0);
  // Partition without using transient room IDs. Shared history survives a split.
  for(let z=3;z<7;z++)wall(w,5,z);reconcileTemperature(w);expect(w.thermal!.regions).toHaveLength(2);
  expect(w.thermal!.regions.map(r=>r.temperature)).toEqual([5,5]);w.thermal!.regions[1]!.temperature=25;
  const energy=w.thermal!.regions.reduce((n,r)=>n+r.cells.length*r.temperature,0);
  w.structures=w.structures.filter(s=>s.x!==5||s.z<3||s.z>=7);reconcileTemperature(w);
  expect(at(w)).toBeCloseTo((energy+4*outdoorTemperature(w.tick))/16,9);
  expect(validateWorld(w)).toEqual([]);const saved=serializeWorld(w),loaded=deserializeWorld(saved);expect(loaded).toEqual(w);
  stepWorld(w,40);stepWorld(loaded,40);expect(loaded).toEqual(w);
  const enc=new SnapshotEncoder(),dec=new SnapshotDecoder();dec.adopt(structuredClone(enc.encode(w,0,1)));stepWorld(w,1);
  const received=dec.adopt(structuredClone(enc.encode(w,0,1)));expect(received.status).toBe('applied');if(received.status==='applied')expect(received.world).toEqual(w);
  for(const change of [(v:any)=>v.thermal.regions[0].temperature=null,(v:any)=>v.thermal.regions[0].cells.push(v.thermal.regions[0].cells[0]),(v:any)=>v.schemaVersion=37]) {
    const bad=JSON.parse(saved);change(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  }
});

test('thermal food: freeze/thaw intervals, real owner transfers, mixing, threshold expiry and legacy continuation',()=>{
  expect([-5,0,5,10,40].map(rotRateAtTemperature)).toEqual([0,0,.5,1,1]);
  const w=chamber();w.thermal!.regions[0]!.temperature=-5;
  addMaterial(w,'food',10,{type:'ground',x:4,z:4},'berries');const pile=w.piles[0]!;pile.rot!.progress=100;
  updateFoodTemperatures(w);expect(pile.rot!.rate).toBe(0);stepWorld(w,2);expect(rotAge(pile,w.tick)).toBe(100);
  // Frozen means rate zero, not immortality or age reset. Carry out to warm air.
  expect(transferPile(w,pile,{type:'pawn',pawnId:w.pawns[0]!.id})).toBe(true);updateFoodTemperatures(w);
  expect(pile.rot!.rate).toBeUndefined();stepWorld(w,3);expect(rotAge(pile,w.tick)).toBe(103);
  expect(transferPile(w,pile,{type:'ground',x:4,z:4})).toBe(true);updateFoodTemperatures(w);expect(pile.rot!.rate).toBe(0);
  addMaterial(w,'food',10,{type:'ground',x:4,z:4},'berries');expect(rotAge(pile,w.tick)).toBe(51.5);expect(pile.quantity).toBe(20);
  w.thermal!.regions[0]!.temperature=5;updateFoodTemperatures(w);const checkpoint=serializeWorld(w),copy=deserializeWorld(checkpoint);
  const age=rotAge(pile,w.tick);stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);expect(rotAge(pile,w.tick)-age).toBeCloseTo(.5,9);
  const invalid=JSON.parse(checkpoint);invalid.piles[0].rot.rate=-.1;expect(()=>deserializeWorld(JSON.stringify(invalid))).toThrow(/food age/);
  // A refused command preserves the food age and its thermal anchor.
  const now=rotAge(pile,w.tick);expect(applyCommand(w,{type:'speed',speed:0} as any).ok).toBe(false);expect(rotAge(pile,w.tick)).toBe(now);
  const legacy=createWorld(1,32,32),raw=JSON.parse(serializeWorld(legacy));((raw.schemaVersion=37,withoutResearch(raw)),withoutPawnSkills(raw));raw.tiles=raw.tiles.map((t:any)=>t.ore==='machinery'?(({ore:_ore,...rest})=>rest)(t):t);
  const migrated=deserializeWorld(JSON.stringify(raw));expect(migrated).toEqual(withMigratedSkills({...raw,schemaVersion:SCHEMA_VERSION}));
  raw.piles[0].rot={progress:1,atTick:raw.tick,rate:0};expect(()=>deserializeWorld(JSON.stringify(raw))).toThrow(/version 37/);
  const last=chamber();addMaterial(last,'food',1,{type:'ground',x:4,z:4},'simple-meal');last.piles[0]!.rot!.progress=24000-.25;
  last.thermal!.regions[0]!.temperature=5;updateFoodTemperatures(last);stepWorld(last);expect(last.piles).toEqual([]);expect(last.spoiled['simple-meal']).toBe(1);expect(validateWorld(last)).toEqual([]);
  const haul=chamber(),porter=haul.pawns[0]!;haul.pawns=[porter];porter.x=1;porter.z=4;porter.priorities.haul=1;
  const door=haul.structures.find(s=>s.x===2&&s.z===4)!;door.kind='door';door.material='wood';door.door=newDoorState(haul.tick);
  reconcileTemperature(haul);haul.thermal!.regions[0]!.temperature=-30;
  addMaterial(haul,'food',5,{type:'ground',x:4,z:4},'berries');haul.piles[0]!.rot!.progress=10;updateFoodTemperatures(haul);
  expect(applyCommand(haul,{type:'stockpile',enabled:true,x:0,z:4,filters:{food:true,wood:false},priority:2,capacity:75}).ok).toBe(true);
  let mid:World|undefined;
  for(let i=0;i<180;i++) {
    stepWorld(haul);if(mid)stepWorld(mid);
    if(!mid&&porter.haul?.phase==='deliver'&&porter.motion){mid=deserializeWorld(serializeWorld(haul));}
    if(haul.piles[0]?.owner.type==='ground'&&haul.piles[0].owner.x===0)break;
  }
  expect(mid).toBeDefined();expect(mid).toEqual(haul);expect(validateWorld(haul)).toEqual([]);
  expect(haul.piles[0]!.owner).toEqual({type:'ground',x:0,z:4});expect(haul.piles[0]!.quantity).toBe(5);
  expect(rotAge(haul.piles[0]!,haul.tick)).toBeGreaterThan(10);expect(rotAge(haul.piles[0]!,haul.tick)).toBeLessThan(10+haul.tick);
});


test('plant climate: integrated local history, query independence, roof changes, migration and deltas',()=>{
  for(const [t,f] of [[-10,0],[0,0],[3,.5],[6,1],[42,1],[50,.5],[58,0],[70,0]])expect(plantTemperatureFactor(t!)).toBe(f);
  for(const t of [0,58,-1,59])expect(sowingTemperatureAllowed(t)).toBe(false);
  for(const t of [.00001,3,42,57.99999])expect(sowingTemperatureAllowed(t)).toBe(true);
  const w=plantClimateFixture(),crop=w.resources[0]!;
  let expected=.2,copy:World|undefined;
  const setHeat=(temperature:number)=>{w.thermal!.regions[0]!.temperature=temperature;updatePlantTemperatures(w,reconcileTemperature(w));};
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();decoder.adopt(encoder.encode(w,0,1));
  for(let i=0;i<1200;i++) {
    if(i===100)setHeat(50);if(i===250)setHeat(-2);if(i===450)setHeat(21);
    if(i===500)copy=deserializeWorld(serializeWorld(w));
    const temperature=w.thermal!.regions[0]!.temperature,tick=w.tick+1;
    // Independent per-tick oracle: no production integral/rate helper.
    const factor=temperature<=0||temperature>=58?0:temperature<6?temperature/6:temperature>42?(58-temperature)/16:1;
    const phase=tick%6000/6000;
    const zenith=Math.acos(Math.cos((phase-.5)*Math.PI*2)/Math.sqrt(2));
    const glow=Math.max(0,Math.min(1,Math.cos(Math.max(0,zenith-23.25*Math.PI/180))/.7));
    if(phase>=.25&&phase<=.8)expected+=Math.max(0,(glow-.51)/.49)*factor/18000;
    const untouched=serializeWorld(w);for(let q=0;q<i%5;q++)plantGrowth(w,crop);expect(serializeWorld(w)).toBe(untouched);
    stepWorld(w);if(copy)stepWorld(copy);
    if(i%47===0) {expect(plantGrowth(w,crop)).toBeCloseTo(expected,11);const result=decoder.adopt(encoder.encode(w,0,1));expect(result.status).toBe('applied');if(result.status==='applied')expect(plantGrowth(result.world,result.world.resources[0]!)).toBeCloseTo(expected,11);}
  }
  expect(copy).toEqual(w);expect(crop.growthThermalFactor).toBeUndefined();expect(validateWorld(w)).toEqual([]);
  const beforeRoof=plantGrowth(w,crop);
  // The public roof completion checkpoints the old illumination before coverage.
  const job={id:w.nextId++,kind:'build-roof' as const,x:4,z:4,orientation:0 as const,footprint:'standard' as const,status:'active' as const,reservedBy:w.pawns[0]!.id,progress:1,escrow:{wood:0,food:0}};
  w.roofing!.build.push(4*32+4);finishRoofJob(w,job);w.roofing!.build=[];stepWorld(w,80);expect(plantGrowth(w,w.resources[0]!)).toBeCloseTo(beforeRoof,11);
  expect(plantInspection(w,w.resources[0]!)).toContain('Lumière insuffisante');
  finishRoofJob(w,{...job,kind:'remove-roof'});const opened=plantGrowth(w,w.resources[0]!);stepWorld(w,80);expect(plantGrowth(w,w.resources[0]!)).toBeGreaterThan(opened);
  // Opening the enclosure restores the outside rate, without replaying cold time.
  setHeat(3);const beforeOpen=plantGrowth(w,w.resources[0]!);w.structures=w.structures.filter(s=>!(s.x===2&&s.z===4));updatePlantTemperatures(w,reconcileTemperature(w));
  expect(w.thermal).toBeUndefined();expect(w.resources[0]!.growthThermalFactor).toBeUndefined();expect(plantGrowth(w,w.resources[0]!)).toBeCloseTo(beforeOpen,12);
  const legacy=plantClimateFixture(3),raw=JSON.parse(serializeWorld(legacy));((raw.schemaVersion=38,withoutResearch(raw)),withoutPawnSkills(raw));delete raw.resources[0].growthThermalFactor;raw.resources[0].growthTick=1000;
  const migrated=deserializeWorld(JSON.stringify(raw));expect(migrated).toEqual(withMigratedSkills({...raw,schemaVersion:SCHEMA_VERSION}));const oldGrowth=plantGrowth(migrated,migrated.resources[0]!);updatePlantTemperatures(migrated,reconcileTemperature(migrated));expect(plantGrowth(migrated,migrated.resources[0]!)).toBe(oldGrowth);
  for(const factor of [-.01,1.01,null,'0.5']) {const bad=JSON.parse(serializeWorld(legacy));bad.resources[0].growthThermalFactor=factor;expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/thermal factor/);}
  raw.resources[0].growthThermalFactor=.5;expect(()=>deserializeWorld(JSON.stringify(raw))).toThrow(/version 38/);
  const deltaEncoder=new SnapshotEncoder(),deltaDecoder=new SnapshotDecoder();deltaDecoder.adopt(deltaEncoder.encode(legacy,0,1));legacy.resources[0]!.growthThermalFactor=0;
  const message=deltaEncoder.encode(legacy,0,1);expect(message.kind).toBe('delta');const adopted=deltaDecoder.adopt(message);expect(adopted.status).toBe('applied');if(adopted.status==='applied')expect(adopted.world.resources[0]!.growthThermalFactor).toBe(0);
  legacy.resources[0]!.growthThermalFactor=.25;const corrupt=deltaEncoder.encode(legacy,0,1);if(corrupt.kind==='delta'){corrupt.resources!.upserted[0]!.growthThermalFactor=2;expect(deltaDecoder.adopt(corrupt).status).toBe('resync');expect((deltaDecoder as any).current?.resources[0]!.growthThermalFactor).toBe(0);}
});

test('cold farming: no new sowing, stale intent rejected, accepted sowing completes and mature harvest remains available',()=>{
  const w=plantClimateFixture(-10),plant=w.resources[0]!;
  expect(applyCommand(w,{type:'area',action:'growing',from:{x:4,z:4},to:{x:5,z:4}}).ok).toBe(true);
  scheduleGrowing(w);expect(w.jobs).toEqual([]);
  w.thermal!.regions[0]!.temperature=3;updatePlantTemperatures(w,reconcileTemperature(w));scheduleGrowing(w);
  expect(w.jobs).toHaveLength(1);const pending=w.jobs[0]!;expect(pending.kind).toBe('sow');
  // Preparation has the same selection gate: an old cut intent is not accepted
  // just because it was generated before the cold arrived.
  const prep=plantClimateFixture(3);prep.resources=[{id:prep.nextId++,kind:'berries',x:5,z:4,amount:10,growth:.3,growthTick:prep.tick}];
  applyCommand(prep,{type:'area',action:'growing',from:{x:5,z:4},to:{x:5,z:4}});scheduleGrowing(prep);expect(prep.jobs[0]!.kind).toBe('cut');
  prep.thermal!.regions[0]!.temperature=-10;stepWorld(prep);expect(prep.jobs).toEqual([]);expect(prep.resources).toHaveLength(1);

  w.thermal!.regions[0]!.temperature=-10;expect(growingJobValid(w,pending)).toBe(false);stepWorld(w);expect(w.jobs).toEqual([]);
  w.thermal!.regions[0]!.temperature=3;updatePlantTemperatures(w,reconcileTemperature(w));
  for(let i=0;i<100&&!w.jobs.some(j=>j.kind==='sow'&&j.reservedBy!==null);i++)stepWorld(w);
  const accepted=w.jobs.find(j=>j.kind==='sow'&&j.reservedBy!==null)!;expect(accepted).toBeDefined();
  w.thermal!.regions[0]!.temperature=-10;updatePlantTemperatures(w,reconcileTemperature(w));expect(growingJobValid(w,accepted)).toBe(true);
  const resumed=deserializeWorld(serializeWorld(w));stepWorld(w,100);stepWorld(resumed,100);expect(resumed).toEqual(w);
  expect(w.resources.filter(p=>p.kind==='rice')).toHaveLength(2);expect(w.resources.find(p=>p.x===5)!.growth).toBe(.0001);
  plant.growth=1;plant.growthTick=w.tick;
  expect(applyCommand(w,{type:'designate',kind:'harvest',x:4,z:4}).ok).toBe(true);stepWorld(w,200);
  expect(w.resources.some(p=>p.id===plant.id)).toBe(false);expect(w.piles.filter(p=>p.item==='rice').reduce((n,p)=>n+p.quantity,0)).toBe(6);expect(validateWorld(w)).toEqual([]);
});
