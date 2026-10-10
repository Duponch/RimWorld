import {expect,test} from 'vitest';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {buildAreaIndex,queryArea} from '../src/sim/designation';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization';
import {createScenarioWorld} from '../src/sim/new-game';
import {createPlantLife} from '../src/sim/plant-life';
import {isPlant} from '../src/sim/plants';
import {reconcileTemperature} from '../src/sim/temperature';
import {updatePlantTemperatures} from '../src/sim/thermal-plants';
import type {AreaAction,AreaCommand,Resource,World} from '../src/sim/types';

function camp():World {
  const w=createScenarioWorld(42,32,'crashlanded',{hilliness:'small-hills',biome:'temperate-forest'});
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.stockpiles=[];w.growingZones=[];w.structures=[];w.jobs=[];
  if(w.wildlife)w.wildlife.animals=[];
  return w;
}
const rectangle=(action:AreaAction):AreaCommand=>({type:'area',action,from:{x:10,z:10},to:{x:13,z:11}});
function plants(w:World):void {
  const kinds:Resource[]=[
    {id:0,x:10,z:10,kind:'tree',amount:8},
    {id:0,x:11,z:10,kind:'berries',amount:10,growth:1,growthTick:0},
    {id:0,x:12,z:10,kind:'wild-plant',species:'grass',amount:0,growth:1,growthTick:0},
    {id:0,x:13,z:10,kind:'wild-plant',species:'brambles',amount:0,growth:1,growthTick:0},
    {id:0,x:10,z:11,kind:'wild-plant',species:'tall-grass',amount:0,growth:1,growthTick:0},
    {id:0,x:11,z:11,kind:'rice',amount:6,growth:1,growthTick:0},
    {id:0,x:12,z:11,kind:'corn',amount:22,growth:1,growthTick:0},
    {id:0,x:13,z:11,kind:'healroot',amount:1,growth:1,growthTick:0},
  ];
  w.resources=kinds.map(r=>{
    const plant={...r,id:w.nextId++};
    if(isPlant(plant))plant.plantLife=createPlantLife(w,plant);
    return plant;
  });
  updatePlantTemperatures(w,reconcileTemperature(w));
}

test('stockpile and growing previews include every plant cell and applying keeps plants intact',()=>{
  for(const action of ['stockpile','growing'] as const){
    const w=camp();plants(w);const before=structuredClone(w.resources),snapshot=serializeWorld(w);
    const query=queryArea(w,rectangle(action),buildAreaIndex(w));
    expect(query).toMatchObject({ok:true,selected:8,skipped:0,cells:[330,331,332,333,362,363,364,365]});
    expect(serializeWorld(w)).toBe(snapshot);
    expect(applyCommand(w,rectangle(action))).toMatchObject({ok:true,affected:8,skipped:0});
    expect(w.resources).toEqual(before);
    const members=action==='stockpile'?w.stockpiles.map(s=>s.z*w.width+s.x):w.growingZones.flatMap(z=>z.cells);
    expect(members).toEqual(query.ok?query.cells:[]);
    expect(action==='stockpile'?new Set(w.stockpiles.map(s=>s.zoneId)).size:w.growingZones.length).toBe(1);
    expect(validateWorld(w)).toEqual([]);
    const recovered=deserializeWorld(serializeWorld(w));expect(recovered).toEqual(w);
    stepWorld(w);stepWorld(recovered);expect(recovered).toEqual(w);
  }
});

test('plant work designations do not puncture zones but incompatible construction still does',()=>{
  const w=camp();plants(w);
  expect(applyCommand(w,{type:'designate',kind:'chop',x:10,z:10}).ok).toBe(true);
  expect(applyCommand(w,{type:'designate',kind:'cut',x:13,z:10}).ok).toBe(true);
  for(const action of ['stockpile','growing'] as const)expect(queryArea(w,rectangle(action))).toMatchObject({ok:true,selected:8,skipped:0});
  expect(applyCommand(w,rectangle('stockpile')).ok).toBe(true);
  expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const blocked=camp();
  blocked.tiles[330]!.terrain='rock';blocked.tiles[331]!.terrain='water';
  blocked.resources=[{id:blocked.nextId++,x:12,z:10,kind:'rock',amount:20}];
  blocked.structures.push({id:blocked.nextId++,x:13,z:10,kind:'wall',orientation:0,footprint:'standard',quality:'normal'});
  expect(applyCommand(blocked,{type:'designate',kind:'wall',x:10,z:11}).ok).toBe(true);
  for(const action of ['stockpile','growing'] as const)expect(queryArea(blocked,rectangle(action))).toMatchObject({ok:true,cells:[363,364,365],selected:8,skipped:5});
});

test('walkable zone-compatible fixtures remain eligible and Core ground-growing fertility is enforced',()=>{
  const w=camp();
  for(const [x,z,kind]of [[10,10,'door'],[11,10,'dining-chair'],[12,10,'power-conduit'],[13,10,'fence']] as const)
    w.structures.push({id:w.nextId++,x,z,kind,orientation:0,footprint:'standard',quality:'normal'});
  for(const action of ['stockpile','growing'] as const)expect(queryArea(w,rectangle(action))).toMatchObject({ok:true,skipped:0});
  w.tiles[362]!.terrain='soil';w.tiles[363]!.floor='wood-planks';w.tiles[364]!.terrain='rough-stone';w.tiles[365]!.terrain='gravel';
  expect(queryArea(w,rectangle('growing'))).toMatchObject({ok:true,cells:[330,331,332,333,362,365],skipped:2});
  expect(queryArea(w,rectangle('stockpile'))).toMatchObject({ok:true,skipped:0});
});

test('old schema stockpile previews retain their historical plant/job exclusions',()=>{
  const w=camp();plants(w);(w as unknown as {schemaVersion:number}).schemaVersion=218;
  expect(queryArea(w,rectangle('stockpile'))).toMatchObject({ok:true,cells:[],skipped:8});
  expect(queryArea(w,rectangle('growing'))).toMatchObject({ok:true,skipped:0});
});
