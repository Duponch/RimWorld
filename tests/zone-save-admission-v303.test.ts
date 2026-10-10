import {expect,test} from 'vitest';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization';
import {SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots';
import {createScenarioWorld} from '../src/sim/new-game';
import {createPlantLife} from '../src/sim/plant-life';
import {isPlant} from '../src/sim/plants';
import {reconcileTemperature} from '../src/sim/temperature';
import {updatePlantTemperatures} from '../src/sim/thermal-plants';
import type {Command,Resource,World} from '../src/sim/types';
import {fixtureBuilding} from './scenarios/deconstruction';

const at={x:4,z:4};
const reserve:Command={type:'stockpile',enabled:true,...at,filters:{wood:true,food:true},priority:2,capacity:75};
function camp():World {
  const w=createScenarioWorld(42,32,'crashlanded',{hilliness:'small-hills',biome:'temperate-forest'});
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.stockpiles=[];w.growingZones=[];w.structures=[];w.jobs=[];
  if(w.wildlife)w.wildlife.animals=[];
  return w;
}
function plant(w:World,kind:'tree'|'berries'|'wild-plant'):Resource {
  const r:Resource={id:w.nextId++,kind,...at,amount:kind==='wild-plant'?0:10,...kind==='wild-plant'?{species:'grass' as const}: {},...kind==='tree'?{}:{growth:1,growthTick:w.tick}};
  if(isPlant(r))r.plantLife=createPlantLife(w,r);
  w.resources=[r];updatePlantTemperatures(w,reconcileTemperature(w));return r;
}
function injectReserve(w:World):void {
  const id=w.nextId++;w.stockpiles=[{id,zoneId:id,...at,filters:{wood:true,food:true},priority:2,capacity:75}];
}

test('single-cell storage admits plant cells, keeps plants, and resumes through file and checkpoint readers',()=>{
  for(const kind of ['tree','berries','wild-plant'] as const){
    const w=camp();plant(w,kind);const original=structuredClone(w.resources);
    expect(applyCommand(w,reserve)).toMatchObject({ok:true});
    expect(w.stockpiles).toHaveLength(1);expect(w.resources).toEqual(original);expect(validateWorld(w)).toEqual([]);
    const loaded=deserializeWorld(serializeWorld(w));expect(loaded).toEqual(w);
    const packet=structuredClone(new SnapshotEncoder().encode(w,0,6));
    const adopted=new SnapshotDecoder().adopt(packet);expect(adopted.status).toBe('applied');
    if(adopted.status==='applied')expect(adopted.world).toEqual(w);
    stepWorld(w);stepWorld(loaded);expect(loaded).toEqual(w);
  }
});

test('plant jobs are compatible with single-cell storage and remain intact after reload',()=>{
  for(const [kind,job]of [['tree','chop'],['berries','harvest'],['wild-plant','cut']] as const){
    const w=camp();plant(w,kind);
    expect(applyCommand(w,{type:'designate',kind:job,...at}).ok).toBe(true);
    const before=structuredClone(w.jobs);
    expect(applyCommand(w,reserve).ok).toBe(true);expect(w.jobs).toEqual(before);expect(validateWorld(w)).toEqual([]);
    expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  }
});

test('terrain rock, rock resources, walls and wall blueprints still refuse storage atomically and in files',()=>{
  for(const obstacle of ['terrain-rock','resource-rock','wall','wall-blueprint'] as const){
    const w=camp();
    if(obstacle==='terrain-rock')w.tiles[at.z*w.width+at.x]!.terrain='rock';
    else if(obstacle==='resource-rock')w.resources=[{id:w.nextId++,kind:'rock',...at,amount:20}];
    else if(obstacle==='wall')fixtureBuilding(w,'wall',at.x,at.z);
    else expect(applyCommand(w,{type:'designate',kind:'wall',...at}).ok).toBe(true);
    const before=serializeWorld(w);
    expect(applyCommand(w,reserve)).toMatchObject({ok:false,code:'occupied'});expect(serializeWorld(w)).toBe(before);
    injectReserve(w);expect(validateWorld(w).length).toBeGreaterThan(0);
    expect(()=>deserializeWorld(JSON.stringify(w))).toThrow();
  }
});

test('schema218 raw files keep the original resource and nonconstruction-job overlap rejection',()=>{
  for(const kind of ['tree','berries','wild-plant'] as const){
    const w=camp();plant(w,kind);(w as unknown as {schemaVersion:number}).schemaVersion=218;
    const before=JSON.stringify(w);
    expect(deserializeWorld(before).schemaVersion).toBe(219);
    expect(applyCommand(w,reserve)).toMatchObject({ok:false,code:'occupied'});expect(JSON.stringify(w)).toBe(before);
    injectReserve(w);delete w.stockpiles[0]!.zoneId;
    expect(()=>deserializeWorld(JSON.stringify(w))).toThrow('Storage overlaps fixed content.');
  }
  const valid=camp();plant(valid,'tree');
  expect(applyCommand(valid,{type:'designate',kind:'chop',...at}).ok).toBe(true);
  (valid as unknown as {schemaVersion:number}).schemaVersion=218;
  injectReserve(valid);delete valid.stockpiles[0]!.zoneId;
  expect(()=>deserializeWorld(JSON.stringify(valid))).toThrow('Storage overlaps fixed content.');
});
