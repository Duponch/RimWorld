import { expect,test } from 'vitest';
import { ITEM_DEFINITIONS } from '../src/sim/items';
import { STORAGE_FILTER_TREE,STORAGE_LEAVES,setStorageNode,storageNodeLeaves,storageNodeState,storageSearchNodes,storageTreePermissions,storageTreeSelection } from '../src/ui/storage-filter-tree';

const food=STORAGE_FILTER_TREE.find(node=>node.id==='foods')!;
const raw=food.children!.find(node=>node.id==='raw-food')!;
test('supported catalogue and packed furniture each have exactly one reachable permission',()=>{
  expect(new Set(STORAGE_LEAVES).size).toBe(STORAGE_LEAVES.length);
  expect([...STORAGE_LEAVES].sort()).toEqual([...Object.keys(ITEM_DEFINITIONS),'furniture'].sort());
});
test('legacy category permissions and explicit item permissions retain their intersection',()=>{
  const filters={wood:false,food:true,steel:false,furniture:true};
  expect(storageTreeSelection(filters).has('rice')).toBe(true);
  const selected=storageTreeSelection(filters,{rice:true,steel:true,berries:false});
  expect([...selected].sort()).toEqual(['furniture','rice']);
  expect(filters).toEqual({wood:false,food:true,steel:false,furniture:true});
});
test('nested parent toggles are recursive and child exclusions propagate mixed state to ancestors',()=>{
  const selected=storageTreeSelection({wood:false,food:false});
  setStorageNode(food,selected,true);
  expect(storageNodeState(food,selected)).toBe('all');expect(storageNodeState(raw,selected)).toBe('all');
  selected.delete('rice');
  expect(storageNodeState(food,selected)).toBe('mixed');expect(storageNodeState(raw,selected)).toBe('mixed');
  setStorageNode(raw,selected,false);
  expect(storageNodeState(raw,selected)).toBe('none');expect(selected.has('simple-meal')).toBe(true);
  setStorageNode(food,selected,false);expect(selected.size).toBe(0);
});
test('empty and all permissions include the furniture domain without inventing an ItemId',()=>{
  const selected=storageTreeSelection({wood:false,food:false});
  expect(storageTreePermissions(selected)).toEqual({filters:{wood:false,food:false},items:undefined});
  for(const node of STORAGE_FILTER_TREE)setStorageNode(node,selected,true);
  const all=storageTreePermissions(selected);
  expect(all.items).toBeUndefined();expect(all.filters.furniture).toBe(true);
  expect(storageTreeSelection(all.filters,all.items)).toEqual(selected);
});
test('complete kinds stay category-only, a partial kind whitelists every selected kind',()=>{
  const selected=storageTreeSelection({wood:true,food:false,silver:true,furniture:true});
  expect(storageTreePermissions(selected).items).toBeUndefined();
  selected.add('rice');
  expect(storageTreePermissions(selected).items).toEqual({wood:true,silver:true,rice:true});
  setStorageNode(food,selected,true);
  expect(storageTreePermissions(selected).items).toBeUndefined();
});
test('search reveals matching ancestry, accepts accents and cannot mutate permissions',()=>{
  const selected=storageTreeSelection({wood:true,food:true,corpse:true});
  const before=storageTreePermissions(selected);
  expect(storageSearchNodes('deplouille impossible').size).toBe(0);
  const visible=storageSearchNodes('MECANOIDES');
  expect(visible.has('corpses')).toBe(true);expect(visible.has('mech-corpses')).toBe(true);
  expect(visible.has('lancer-corpse')).toBe(true);expect(visible.has('human-corpse')).toBe(false);
  expect(storageSearchNodes('Viande de lièvre').has('raw-food')).toBe(true);
  expect(storageTreePermissions(selected)).toEqual(before);
});
test('searching a parent displays all descendants while a parent toggle still addresses the complete branch',()=>{
  const visible=storageSearchNodes('aliments crus');
  for(const id of storageNodeLeaves(raw))expect(visible.has(id)).toBe(true);
  const selected=storageTreeSelection({wood:false,food:false});
  storageSearchNodes('riz');setStorageNode(raw,selected,true);
  expect(selected.has('hare-meat')).toBe(true);expect(selected.has('rice')).toBe(true);expect(selected.has('simple-meal')).toBe(false);
});
