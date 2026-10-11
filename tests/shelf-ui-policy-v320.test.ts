import { expect,test } from 'vitest';
import { createWorld } from '../src/sim/index';
import { newShelfStorage,shelfStorageCells } from '../src/sim/shelf-storage';
import { patchShelfPolicy } from '../src/sim/shelf-commands';
import type { Structure,StorageSettings } from '../src/sim/types';
import { readShelfInspection,shelfControlOptions } from '../src/ui/shelf-inspection';
import { readStatusAlerts } from '../src/ui/status-alerts';
import { setStorageControlNode,storageControlNodeState } from '../src/ui/storage-item-controls';
import { STORAGE_FILTER_TREE,storageTreeSelection,storageTreePermissions } from '../src/ui/storage-filter-tree';

function fixture(kind:'shelf'|'small-shelf'='shelf'){
  const world=createWorld(320,32,32);world.stockpiles=[];
  const shelf:Structure={id:world.nextId++,kind,x:7,z:8,orientation:1,footprint:'standard',shelf:newShelfStorage(Array.from({length:kind==='shelf'?2:1},()=>world.nextId++))};
  world.structures.push(shelf);return {world,shelf};
}
test('V320 policy copies ranges and permissions without aliasing the input or changing physical cells',()=>{
  const {world,shelf}=fixture(),cells=shelf.shelf!.cells,piles=JSON.stringify(world.piles),previous=shelf.shelf!.settings;
  const settings:StorageSettings={filters:{wood:true,food:true,furniture:true,chunk:true},items:{wood:true,rice:true},priority:5,quality:{min:'normal',max:'excellent'},hitPoints:{min:25,max:90},allowFresh:true,allowRotten:false};
  expect(patchShelfPolicy(world,shelf.id,settings)).toEqual({ok:true});
  expect(shelf.shelf!.cells).toBe(cells);expect(shelf.shelf!.settings.capacity).toBe(previous.capacity);
  expect(shelf.shelf!.settings.filters).not.toBe(settings.filters);expect(shelf.shelf!.settings.items).not.toBe(settings.items);
  settings.filters!.wood=false;settings.quality!.min='awful';settings.hitPoints!.min=0;settings.items!.rice=false;
  expect(shelf.shelf!.settings.filters.wood).toBe(true);expect(shelf.shelf!.settings.quality!.min).toBe('normal');expect(shelf.shelf!.settings.hitPoints!.min).toBe(25);expect(shelf.shelf!.settings.items!.rice).toBe(true);
  expect(JSON.stringify(world.piles)).toBe(piles);expect(previous.priority).toBe(3);
});
test('V320 rejected patches are atomic and cannot target a packed shelf or accept future policy fields',()=>{
  const {world,shelf}=fixture(),before=JSON.stringify(world);
  for(const settings of [{priority:6},{quality:{min:'legendary',max:'awful'}},{filters:{wood:true,food:true,future:true}},{future:true},{[Symbol('future')]:true},null]){
    expect(patchShelfPolicy(world,shelf.id,settings as StorageSettings).ok).toBe(false);expect(JSON.stringify(world)).toBe(before);
  }
  world.structures=world.structures.filter(s=>s!==shelf);world.packed.push({building:shelf,owner:{type:'ground',x:7,z:8}});
  const packed=JSON.stringify(world);expect(patchShelfPolicy(world,shelf.id,{priority:2}).ok).toBe(false);expect(JSON.stringify(world)).toBe(packed);
});
test('V320 explicit undefined clears independent restrictions with historical patch semantics',()=>{
  const {world,shelf}=fixture();patchShelfPolicy(world,shelf.id,{items:{wood:true},quality:{min:'normal',max:'normal'},hitPoints:{min:90,max:100},allowFresh:false});
  expect(patchShelfPolicy(world,shelf.id,{items:undefined,quality:undefined,hitPoints:undefined,allowFresh:undefined})).toEqual({ok:true});
  for(const key of ['items','quality','hitPoints','allowFresh'])expect(Object.hasOwn(shelf.shelf!.settings,key)).toBe(false);
});

test('V320 copying a zone quota keeps the shelf at three real ItemDef-limited stacks per cell',()=>{
  const {world,shelf}=fixture();expect(patchShelfPolicy(world,shelf.id,{capacity:15,priority:4})).toEqual({ok:true});
  expect(shelf.shelf!.settings.capacity).toBe(500);expect(shelf.shelf!.settings.priority).toBe(4);
});
test('V320 grayed exclusions keep copied user policy separate and parent toggles affect only editable leaves',()=>{
  const chunks=STORAGE_FILTER_TREE.find(n=>n.id==='chunks')!,buildings=STORAGE_FILTER_TREE.find(n=>n.id==='buildings')!,foods=STORAGE_FILTER_TREE.find(n=>n.id==='foods')!;
  const selected=storageTreeSelection({wood:true,food:true,chunk:true,furniture:true});
  const before=storageTreePermissions(selected);
  expect(storageControlNodeState(chunks,selected,shelfControlOptions)).toBe('none');expect(storageControlNodeState(buildings,selected,shelfControlOptions)).toBe('none');
  setStorageControlNode(chunks,selected,false,shelfControlOptions);setStorageControlNode(buildings,selected,false,shelfControlOptions);
  expect(storageTreePermissions(selected)).toEqual(before);
  expect(shelfControlOptions.fixedAllows!('human-corpse')).toBe(false);expect(shelfControlOptions.fixedAllows!('muffalo-corpse')).toBe(true);
  setStorageControlNode(foods,selected,false,shelfControlOptions);expect(storageControlNodeState(foods,selected,shelfControlOptions)).toBe('none');expect(selected.has('furniture')).toBe(true);
});
test('V320 contents count distinct real IDs even for the same item; carried piles never fill shelf places',()=>{
  const {world,shelf}=fixture(),cells=shelfStorageCells(shelf);world.piles=[];
  for(let n=0;n<3;n++)world.piles.push({id:world.nextId++,kind:'wood',item:'wood',quantity:75,owner:{type:'ground',x:cells[0]!.x,z:cells[0]!.z}});
  world.piles.push({id:world.nextId++,kind:'wood',item:'wood',quantity:75,owner:{type:'pawn',pawnId:world.pawns[0]!.id}});
  const before=JSON.stringify(world),view=readShelfInspection(world,shelf)!;
  expect(view.capacity).toBe(6);expect(view.piles).toHaveLength(3);expect(new Set(view.piles.map(p=>p.id)).size).toBe(3);expect(view.piles.reduce((sum,p)=>sum+p.quantity,0)).toBe(225);
  expect(JSON.stringify(world)).toBe(before);expect(readShelfInspection(world,{...shelf,kind:'bed'})).toBeUndefined();
  const small=fixture('small-shelf');expect(readShelfInspection(small.world,small.shelf)!.capacity).toBe(3);
});
test('V320 storage alert recognizes installed shelves while packed shelves remain inactive',()=>{
  const {world,shelf}=fixture('small-shelf');expect(readStatusAlerts(world).some(row=>row.key==='no-stockpile')).toBe(false);
  world.structures=world.structures.filter(s=>s!==shelf);world.packed.push({building:shelf,owner:{type:'ground',x:7,z:8}});
  expect(readStatusAlerts(world).some(row=>row.key==='no-stockpile')).toBe(true);
});
