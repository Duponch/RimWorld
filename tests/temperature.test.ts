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
  const legacy=createWorld(1,32,32),raw=JSON.parse(serializeWorld(legacy));raw.schemaVersion=37;
  const migrated=deserializeWorld(JSON.stringify(raw));expect(migrated).toEqual({...raw,schemaVersion:38});
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
