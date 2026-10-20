import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createWorld,stepWorld} from '../src/sim/engine.ts';
import {deserializeCampaign,deserializeWorld,serializeCampaign,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {GEOTHERMAL_POWER_RESEARCH_COST} from '../src/sim/research.ts';
import {createGeothermalState264,validGeothermalWorld264} from '../src/sim/geothermal-state-264.ts';
import {reconcilePower} from '../src/sim/power.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {preparedMap,registryCamp} from './helpers/world-maps-v255.ts';
import {reorganizationCamp256} from './helpers/group-reorganization-v256.ts';
import {adultAgeTicks} from '../src/sim/animal-life.ts';
import {refreshStock} from '../src/sim/materials.ts';
import {flushRegisteredMap,registeredMap} from '../src/sim/world-map-context.ts';
import type {World,Structure,Job} from '../src/sim/types.ts';
import type {GroupAnimalLoss256} from '../src/sim/group-animal-state-256.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';

type Legacy263World=Omit<World,'schemaVersion'>&{schemaVersion:263};
const legacy263=(world:World):Legacy263World=>{
  Object.assign(world,{schemaVersion:263});return world as unknown as Legacy263World;
};
const REFERENCES=[
  ['Les Forges','v432/les-forges-crash-test.json',263],
  ['Les Aulnes','v394/les-aulnes-integrees.json',250],
  ['Les Éclaircies','v419/les-eclaircies.json',263],
] as const;
function publicPayload(path:string):string {
  const stored=readFileSync(new URL(`../public/test-saves/${path}`,import.meta.url),'utf8');
  const envelope=JSON.parse(stored) as Record<string,unknown>;
  if(envelope.format!=='lisiere-save')return stored;
  if(envelope.version!==1||envelope.codec!=='gzip-base64'||typeof envelope.payload!=='string')throw Error('Unexpected public save envelope');
  const bytes=gunzipSync(Buffer.from(envelope.payload,'base64'));
  expect(bytes.length).toBe(envelope.uncompressedBytes);
  return bytes.toString('utf8');
}

test.each(REFERENCES)('%s preserves the entire campaign through strict263 →264, changing only its number',(label,path,originalVersion)=>{
  const publicText=publicPayload(path),original=JSON.parse(publicText) as World;
  expect(original.schemaVersion).toBe(originalVersion);
  // Aulnes is a public250 archive. First apply its ordinary historical
  // migrations; the resulting263 witness is explicit, never called raw263.
  const witness=originalVersion===263?original as unknown as Legacy263World:legacy263(deserializeWorld(publicText));
  const oldBytes=JSON.stringify(witness),migrated=deserializeCampaign(oldBytes);
  expect(migrated.schemaVersion).toBe(264);
  const expected={...witness,schemaVersion:264};
  expect(JSON.parse(serializeCampaign(migrated)),label).toEqual(expected);
  expect(JSON.stringify(witness)).toBe(oldBytes);
  expect(migrated.research).not.toHaveProperty('geothermalPower');
  // Equality includes every loaded/inactive map, personal/terminal owner,
  // timer, PRNG, geological object and history; no selected-field digest.
},120_000);

test('same code advances the actual Éclaircies263 witness and its264 migration identically for three ticks',()=>{
  // Restore the geographic owner/cache through the ordinary load boundary
  // before comparing physical execution. Raw JSON is not a live campaign.
  const old=legacy263(deserializeWorld(publicPayload('v419/les-eclaircies.json')));
  expect(old.schemaVersion).toBe(263);
  const migrated=deserializeWorld(JSON.stringify(old));
  for(let i=0;i<3;i++){stepWorld(old as unknown as World);stepWorld(migrated);}
  expect(JSON.parse(serializeWorld(migrated))).toEqual({...JSON.parse(JSON.stringify(old)),schemaVersion:264});
},120_000);

const fakePhase=(w:Pick<World,'tick'>)=>({geyserId:1,atTick:w.tick,ticksUntilSpray:500,sprayTicksLeft:0});
/** A single small, ordinary current factory output is the legality control.
 * Mutants change only one new boundary, without replaying a colony scenario. */
test('strict263 rejects geothermal fields or content before neutral migration, preserving its caller witness',()=>{
  const current=createWorld(440,32,32);
  expect(validateWorld(current)).toEqual([]);
  const old=legacy263(JSON.parse(serializeWorld(current)) as World);
  const control=JSON.stringify(old);expect(deserializeCampaign(control).schemaVersion).toBe(264);
  const trials:Array<[string,(w:World)=>void]>=[
    ['natural phase on ordinary structure',w=>w.structures.push({id:w.nextId++,kind:'wall',x:2,z:2,orientation:0,footprint:'standard',material:'wood',geothermal:fakePhase(w)})],
    ['new generator kind',w=>w.structures.push({id:w.nextId++,kind:'geothermal-generator',x:2,z:2,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:null},geothermal:fakePhase(w)})],
    ['phase on ordinary construction job',w=>{const j:Job={id:w.nextId++,kind:'wall',x:2,z:2,orientation:0,footprint:'standard',material:'wood',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0},construction:'blueprint'};Object.assign(j,{geothermal:fakePhase(w)});w.jobs.push(j);}],
    ['new research progress',w=>{w.research??={points:0,project:null};w.research.geothermalPower={points:0};}],
    ['new selected project',w=>{w.research??={points:0,project:null};w.research.project='geothermal-power';}],
  ];
  for(const [label,mutate] of trials){
    const candidate=JSON.parse(control) as Legacy263World;mutate(candidate as unknown as World);const before=JSON.stringify(candidate);
    expect(()=>deserializeCampaign(before),label).toThrow(/263|future|geothermal/i);
    expect(JSON.stringify(candidate),label).toBe(before);
  }
});

test('strict263 validates the actual inactive map before rejecting its future geothermal field',()=>{
  const root=registryCamp();preparedMap(root,52,'legacy-site',false);
  const control=serializeWorld(root),old=legacy263(JSON.parse(control) as World);
  expect(deserializeCampaign(JSON.stringify(old)).schemaVersion).toBe(264);
  const map=old.worldMaps!.sites.find(s=>s.map)!.map!;
  map.structures.push({id:old.nextId++,kind:'wall',x:2,z:2,orientation:0,footprint:'standard',material:'wood',geothermal:fakePhase(old)});
  const before=JSON.stringify(old);expect(()=>deserializeCampaign(before)).toThrow(/263|future|geothermal/i);expect(JSON.stringify(old)).toBe(before);
});

/** Reuse the established original caravan owners, then prepare an explicit
 * terminal animal holder. No trip, acquisition or loss is claimed as played. */
function terminalPackage(){
  const f=reorganizationCamp256();
  const animal:WildAnimal={id:f.w.nextId++,species:'muffalo',sex:'female',ageTicks:adultAgeTicks('muffalo'),x:f.members[0]!.x,z:f.members[0]!.z,food:1,rest:1,state:'idle',path:[],nextDecision:f.w.tick,domestic:{since:f.w.tick,care:'herbal',tameness:5,nextDecay:f.w.tick+6000,productFullness:0}};
  const building:Structure={id:f.w.nextId++,kind:'bedroll',x:animal.x,z:animal.z,orientation:0,footprint:'standard',material:'cloth',quality:'normal'};
  const loss:GroupAnimalLoss256={reason:'caravan-lost',groupId:f.g.id,tile:f.g.tile,tick:f.w.tick,animal,origin:{pawnId:animal.id,originMapId:f.record.originMapId,context:f.record.context},items:[],packed:[{building,owner:{type:'inventory',pawnId:animal.id}}]};
  const map=registeredMap(f.w,f.record.originMapId)!;map.pawns.push(...f.g.members);map.piles.push(...f.g.items);
  f.w.worldGroups!.groups=[];f.w.worldGroups!.selectedGroupId=null;f.w.worldGroups!.animalLosses=[loss];
  refreshStock(map);flushRegisteredMap(map);expect(validateWorld(f.w)).toEqual([]);
  return {world:f.w,building};
}

test('strict263 rejects a geothermal phase hidden in the original terminal package owner',()=>{
  const {world}=terminalPackage(),old=legacy263(JSON.parse(serializeWorld(world)) as World);
  expect(deserializeCampaign(JSON.stringify(old)).schemaVersion).toBe(264);
  old.worldGroups!.animalLosses![0]!.packed![0]!.building.geothermal=fakePhase(old);
  const before=JSON.stringify(old);expect(()=>deserializeCampaign(before)).toThrow(/263|future|geothermal/i);expect(JSON.stringify(old)).toBe(before);
});

test('current264 resumes a real geyser generator and rejects another owner, invalid phase, or fixed-building parcel',()=>{
  const world=deserializeWorld(publicPayload('v419/les-eclaircies.json'));
  const geyser=world.geysers!.items.find(g=>{
    const occupied=new Set(Array.from({length:36},(_,i)=>(g.z-2+Math.floor(i/6))*world.width+g.x-2+i%6));
    return ![...world.structures,...world.jobs].some(s=>footprintCells(s).some(c=>occupied.has(c.z*world.width+c.x)))
      &&!world.piles.some(p=>p.owner.type==='ground'&&occupied.has(p.owner.z*world.width+p.owner.x))
      &&!world.pawns.some(p=>occupied.has(p.z*world.width+p.x));
  });
  if(!geyser)throw Error('Public geographic reference has no unoccupied real geyser');
  // Prepared construction/research are declared here. Preserve the actual
  // geological owner and phase; remove only vegetation inside this fixture's
  // machine footprint, without pretending it was harvested or built by play.
  const generator:Structure={id:world.nextId++,kind:'geothermal-generator',x:geyser.x-2,z:geyser.z-2,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:null}};
  const cells=new Set(footprintCells(generator).map(c=>c.z*world.width+c.x));world.resources=world.resources.filter(r=>!cells.has(r.z*world.width+r.x));
  world.research??={points:0,project:null};world.research.geothermalPower={points:GEOTHERMAL_POWER_RESEARCH_COST,completedAt:world.tick};
  world.structures.push(generator);generator.geothermal=createGeothermalState264(world,generator);reconcilePower(world);
  const saved=serializeWorld(world);expect(serializeWorld(deserializeWorld(saved))).toBe(saved);
  const phase={...generator.geothermal};
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const checkpoint=structuredClone(encoder.encode(world,0,0)),first=decoder.adopt(checkpoint);
  expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('Valid geothermal checkpoint was refused');
  const retained=JSON.stringify(first.world);
  expect(first.world.structures.find(s=>s.id===generator.id)!.geothermal).toEqual(phase);
  const powerless=structuredClone(checkpoint);
  delete powerless.world.structures.find(s=>s.id===generator.id)!.power;
  expect(new SnapshotDecoder().adopt(powerless).status).toBe('resync');
  generator.geothermal!.ticksUntilSpray--;
  const delta=structuredClone(encoder.encode(world,0,0));expect(delta.kind).toBe('delta');
  if(delta.kind!=='delta')throw Error('Expected confirmed same-tick geothermal delta');
  expect(delta.world.structures.find(s=>s.id===generator.id)!.geothermal).toEqual(generator.geothermal);
  const brokenPhase=structuredClone(delta);brokenPhase.world.structures.find(s=>s.id===generator.id)!.geothermal!.atTick++;
  expect(decoder.adopt(brokenPhase).status).toBe('resync');
  const locked=structuredClone(delta);delete locked.world.research!.geothermalPower;
  expect(decoder.adopt(locked).status).toBe('resync');
  const adopted=decoder.adopt(delta);expect(adopted.status).toBe('applied');
  if(adopted.status==='applied')expect(adopted.world.structures.find(s=>s.id===generator.id)!.geothermal).toEqual(generator.geothermal);
  expect(JSON.stringify(first.world)).toBe(retained);
  for(const [label,mutate] of [
    ['another geyser identity',()=>{generator.geothermal!.geyserId=world.geysers!.items.find(g=>g.id!==geyser.id)!.id;}],
    ['phase at another tick',()=>{generator.geothermal!.atTick++;}],
    ['simultaneous wait and spray',()=>{generator.geothermal!.sprayTicksLeft=10;}],
  ] as const){
    generator.geothermal={...phase};mutate();expect(validGeothermalWorld264(world),label).toBe(false);
    expect(()=>deserializeWorld(JSON.stringify(world)),label).toThrow(/geothermal/i);
  }
  generator.geothermal={...phase};world.structures=world.structures.filter(s=>s!==generator);generator.power!.on=false;
  world.packed.push({building:generator,owner:{type:'ground',x:generator.x,z:generator.z}});
  expect(validGeothermalWorld264(world)).toBe(false);expect(()=>deserializeWorld(JSON.stringify(world))).toThrow(/geothermal|packed|furniture/i);
  world.packed.pop();
  const retainedOwner=world.worldPawns!.owners.find(p=>p.kind==='human')!;
  retainedOwner.heldAtCore259=world.tick*10;
  retainedOwner.packed.push({building:generator,owner:{type:'inventory',pawnId:retainedOwner.actor.id}});
  expect(validGeothermalWorld264(world)).toBe(false);expect(()=>deserializeWorld(JSON.stringify(world))).toThrow(/geothermal|packed|furniture/i);
},120_000);
