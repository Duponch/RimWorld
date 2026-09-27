import {expect,test} from 'vitest';
import {animalPenAt,invalidateAnimalPens,penAccessCells,penRegion,PEN_ANIMALS} from '../src/sim/animal-pens.ts';
import {newDoorState} from '../src/sim/door-rules.ts';
import {applyCommand,createWorld} from '../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {refreshStock} from '../src/sim/materials.ts';
import {damageStructure} from '../src/sim/thing-damage.ts';
import {structureMaxHp} from '../src/sim/thing-damage-rules.ts';
import type {Structure,World} from '../src/sim/types.ts';

function fencedWorld(){
  const world=createWorld(731,16,16);
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));
  world.structures=[];world.jobs=[];world.resources=[];world.piles=[];
  const add=(kind:Structure['kind'],x:number,z:number):Structure=>{
    const s:Structure={id:world.nextId++,kind,x,z,orientation:0,footprint:'standard',material:'wood'};
    if(kind==='fence-gate')s.door=newDoorState(world.tick);
    if(kind==='pen-marker')s.pen={accepted:[...PEN_ANIMALS]};
    world.structures.push(s);return s;
  };
  for(let x=4;x<=8;x++){add('fence',x,4);add('fence',x,8);}
  for(let z=5;z<8;z++){add(z===6?'fence-gate':'fence',4,z);add('fence',8,z);}
  const marker=add('pen-marker',6,6);
  refreshStock(world);
  return {world,marker,gate:world.structures.find(s=>s.kind==='fence-gate')!};
}

test('physical pen is closed and accessible through its gate; policy and breach change it without changing terrain',()=>{
  const {world,marker,gate}=fencedWorld();
  const original=JSON.stringify(world);
  const region=penRegion(world,marker.id)!;
  expect(region).toMatchObject({closed:true,accessible:true});
  expect(region.cells.has(6*world.width+6)).toBe(true);
  expect(region.cells.has(6*world.width+3)).toBe(false);
  expect(animalPenAt(world,6,6)?.markerId).toBe(marker.id);
  expect(penAccessCells(world,marker.id)).toContainEqual({x:5,z:6});
  expect(JSON.stringify(world)).toBe(original);
  expect(applyCommand(world,{type:'door-policy',structureId:gate.id,setting:'forbidden',value:true}).ok).toBe(true);
  expect(penRegion(world,marker.id)?.accessible).toBe(false);
  expect(applyCommand(world,{type:'door-policy',structureId:gate.id,setting:'forbidden',value:false}).ok).toBe(true);
  expect(penRegion(world,marker.id)?.accessible).toBe(true);
  gate.door!.holdOpen=true;gate.door!.open=true;invalidateAnimalPens(world);
  expect(penRegion(world,marker.id)?.closed).toBe(false);
  gate.door!.holdOpen=false;gate.door!.open=false;invalidateAnimalPens(world);
  world.structures.splice(world.structures.findIndex(s=>s.kind==='fence'&&s.x===8&&s.z===6),1);invalidateAnimalPens(world);
  expect(penRegion(world,marker.id)?.closed).toBe(false);
});

test('marker species choice is atomic, persisted, and old saves migrate without invented pens',()=>{
  const {world,marker}=fencedWorld();
  expect(validateWorld(world)).toEqual([]);
  const before=serializeWorld(world);
  expect(applyCommand(world,{type:'pen-species',markerId:marker.id,species:'muffalo',accepted:false}).ok).toBe(true);
  expect(marker.pen!.accepted).not.toContain('muffalo');
  const after=serializeWorld(world);
  expect(deserializeWorld(after)).toEqual(world);
  const failed=applyCommand(world,{type:'pen-species',markerId:999999,species:'deer',accepted:false});
  expect(failed.ok).toBe(false);
  expect(serializeWorld(world)).toBe(after);
  const historical=JSON.parse(before) as World;
  historical.structures=[];historical.schemaVersion=109 as never;
  for(const policy of historical.foodPolicies)policy.allowed=policy.allowed.filter(item=>item!=='milk');
  historical.apparelPolicies=(historical.apparelPolicies??[]).map(policy=>({...policy,
    allowedItems:policy.allowedItems.filter(item=>!item.startsWith('muffalo-wool-')),
    allowedMaterials:policy.allowedMaterials.filter(material=>material!=='muffalo-wool')}));
  const migrated=deserializeWorld(JSON.stringify(historical));
  expect(migrated).toEqual({...historical,schemaVersion:121});
  expect(migrated.structures).toEqual([]);
});

test('a gate surrounded by barriers on its exterior is not an animal entrance',()=>{
  const {world,marker}=fencedWorld();
  world.structures.push({id:world.nextId++,kind:'fence',x:3,z:6,orientation:0,footprint:'standard',material:'wood'});
  invalidateAnimalPens(world);
  expect(penRegion(world,marker.id)).toMatchObject({closed:true,accessible:false});
  expect(penAccessCells(world,marker.id)).toEqual([]);
});

test('destruction of one fence segment invalidates the pen before another tick',()=>{
  const {world,marker}=fencedWorld();
  expect(penRegion(world,marker.id)?.closed).toBe(true);
  const segment=world.structures.find(s=>s.kind==='fence'&&s.x===8&&s.z===6)!;
  expect(damageStructure(world,segment,structureMaxHp(segment))).toBe(true);
  expect(penRegion(world,marker.id)?.closed).toBe(false);
  expect(validateWorld(world)).toEqual([]);
});
