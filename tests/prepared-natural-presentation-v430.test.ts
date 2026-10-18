import {expect,test,vi} from 'vitest';
import {vegetationHarness} from './resident-vegetation-fixtures-v430';
import {fixture as baseFixture} from './resident-presentation-fixtures-v427';
import {PreparedNaturalPresentation} from '../src/render/PreparedNaturalPresentation';
import {NaturalResourcePresentation} from '../src/render/NaturalResourcePresentation';
import {SceneResourceIndex} from '../src/render/scene-resource-index';
import {SceneRenderCore} from '../src/render/SceneRenderCore';
import {readPreparedNaturalFrame} from '../src/bridge/prepared-natural-frame';
import {floraSize,isResidentCrop} from '../src/render/flora-presentation';
import {harvestable} from '../src/sim/plants';
import {plantLeafless} from '../src/sim/plant-life';
import type {World,Resource} from '../src/sim/types';

// Numerical query fixture, not a continued SAVE. Real Worker observer,
// envelope, admission and scalar pages are supplied by the shared harness.
function fixture():World {
 const w=baseFixture();w.tick=1500;w.tiles=w.tiles.map(()=>({terrain:'soil-natural'}));
 w.climate={revision:1,profile:'temperate-reference',adoptedAt:0,calendarOrigin:0};
 w.resources=(['grass','oak','berry-bush']as const).map<Resource>((species,i)=>({id:w.nextId++,kind:species==='oak'?'tree':species==='berry-bush'?'berries':'wild-plant',species,
  x:2+i,z:3,amount:10,growth:i===0?.249999:i===1?.2:.649999,growthTick:w.tick,growthLight:'artificial-full'}));
 return w;
}
function consumer(){const value=new PreparedNaturalPresentation(),index=new SceneResourceIndex();return {value,index,read:(world:World,reset=false)=>value.readScene(world,reset,index.adopt(world,reset))};}
function assertNumbers(value:PreparedNaturalPresentation,world:World):void {
 for(const resource of world.resources)if(!isResidentCrop(resource)){
  const observation=value.appearance!.read(resource),ready=value.appearance!.harvestable(resource);
  expect({size:observation.size,ripe:observation.ripe,leafless:observation.leafless,harvestable:ready}).toStrictEqual({
   size:floraSize(world,resource),ripe:resource.kind==='berries'&&harvestable(world,resource),leafless:plantLeafless(world,resource),harvestable:harvestable(world,resource)});
 }
 for(const [id,change]of value.changes)if(change.resource){expect(change.resource).toBe(world.resources.find(r=>r.id===id));expect(change.size).toBe(floraSize(world,change.resource));}
}

test('a tick-only prepared change triggers with the same admitted resource array and no MAIN forecast',()=>{
 const h=vegetationHarness(fixture()),c=consumer(),a=h.send(true);expect(c.read(a,true)).toStrictEqual({changed:true});
 const before=structuredClone(a),initialSize=c.value.appearance!.read(a.resources[0]!).size;
 h.w.tick++;const b=h.send();expect(b.resources).toBe(a.resources);expect(c.value.hasFrameChange(b)).toBe(true);
 expect(c.read(b)).toStrictEqual({changed:true});expect(c.value.hasFrameChange(b)).toBe(false);
 expect(c.value.appearance!.read(b.resources[0]!).size).not.toBe(initialSize);assertNumbers(c.value,b);expect(a).toStrictEqual(before);
 const unknown=structuredClone(b);expect(readPreparedNaturalFrame(unknown)).toBeUndefined();expect(c.value.hasFrameChange(unknown)).toBe(true);
 expect(c.read(b)).toStrictEqual({changed:false});expect(c.value.changes.size).toBe(0);
});

test('skipping admitted B/D never substitutes their scalars for played C, including A-to-B-to-C returned values',()=>{
 const h=vegetationHarness(fixture()),c=consumer();h.w.resources[0]!.growth=.3;const a=h.send(true);c.read(a,true);const first=structuredClone(a);
 const plant=h.w.resources[0]!,oldGrowth=plant.growth;plant.growth=.9;h.w.tick++;h.send();
 plant.growth=oldGrowth;h.w.tick++;const target=h.send(),held=structuredClone(target),targetFrame=readPreparedNaturalFrame(target)!;
 expect(targetFrame.lookup(plant.id)!.size).toBe(readPreparedNaturalFrame(a)!.lookup(plant.id)!.size);
 plant.growth=1;h.w.tick++;const ahead=h.send();expect(readPreparedNaturalFrame(ahead)!.revision).toBeGreaterThan(targetFrame.revision);
 expect(c.read(target)).toStrictEqual({changed:true});expect(c.value.changes.has(plant.id)).toBe(true);assertNumbers(c.value,target);
 expect(target).toStrictEqual(held);expect(a).toStrictEqual(first);
 expect(c.value.appearance!.read(target.resources[0]!).size).toBe(targetFrame.lookup(plant.id)!.size);
});

test('same-map checkpoint, reorder, removals/rebirth and classification retire exact old IDs',()=>{
 const h=vegetationHarness(fixture()),c=consumer(),a=h.send(true);c.read(a,true);
 const removed=h.w.resources[0]!,rebornId=removed.id;h.w.resources=h.w.resources.filter(r=>r!==removed);h.w.tick++;h.send();
 h.w.resources.push({...removed,growth:1});h.w.tick++;const reborn=h.send();c.read(reborn);expect(c.value.changes.get(rebornId)?.resource).toBe(reborn.resources.at(-1));assertNumbers(c.value,reborn);
 const retiring=h.w.resources[1]!;h.w.resources=h.w.resources.filter(r=>r.id!==retiring.id);h.w.tick++;
 const checkpoint=h.send(true);c.read(checkpoint);expect(c.value.changes.get(retiring.id)).toStrictEqual({resource:undefined,size:0});assertNumbers(c.value,checkpoint);
 h.w.resources.reverse();h.w.tick++;const reordered=h.send();c.read(reordered);expect([...c.value.changes.values()].filter(v=>v.resource).map(v=>v.resource)).toStrictEqual(reordered.resources);assertNumbers(c.value,reordered);
 const id=h.w.resources[0]!.id;h.w.resources[0]={id,kind:'rice',x:4,z:3,amount:1,growth:.3,growthTick:h.w.tick};h.w.tick++;
 const crop=h.send();c.read(crop);expect(c.value.changes.get(id)).toStrictEqual({resource:undefined,size:0});assertNumbers(c.value,crop);
 c.value.clear();c.index.clear();expect(c.value.appearance).toBeUndefined();expect(c.value.hasFrameChange(crop)).toBe(true);
 expect(c.read(crop,true)).toStrictEqual({changed:true});assertNumbers(c.value,crop);
});

test('current source updates precede previous source removals even when numeric IDs are reversed',()=>{
 const w=fixture();w.resources.reverse();const h=vegetationHarness(w),c=consumer(),a=h.send(true);c.read(a,true);
 const removed=a.resources.map(r=>r.id);h.w.resources=[];h.w.tick++;const empty=h.send();c.read(empty);
 expect([...c.value.changes.keys()]).toStrictEqual(removed);for(const change of c.value.changes.values())expect(change).toStrictEqual({resource:undefined,size:0});
});

test('real SceneRenderCore resource branch forwards prepared numbers to existing layers and bypasses legacy prediction',()=>{
 const h=vegetationHarness(fixture()),a=h.send(true),index=new SceneResourceIndex(),prepared=new PreparedNaturalPresentation();
 const legacy={read:vi.fn(()=>{throw Error('Legacy MAIN query used');}),readScene:vi.fn(()=>{throw Error('Legacy MAIN agenda used');})};
 const state={immutableWorlds:new WeakSet([a]),preparedNaturalPresentation:prepared,naturalPresentation:legacy,
  plants:{update:vi.fn((..._args:unknown[])=>{})},resources:{update:vi.fn((..._args:unknown[])=>{})},overview:{update:vi.fn((..._args:unknown[])=>{})}};
 const update=(SceneRenderCore.prototype as unknown as {updateResources(this:unknown,w:World,reset:boolean,index:ReturnType<SceneResourceIndex['adopt']>):void}).updateResources;
 update.call(state,a,true,index.adopt(a,true));
 expect(state.plants.update).toHaveBeenCalledWith(a,true,prepared.changes);
 expect(state.resources.update.mock.calls[0]?.[0]).toBe(a);expect(state.resources.update.mock.calls[0]?.[4]).toBe(prepared.appearance);
 expect(state.overview.update).toHaveBeenCalledWith(a,true,prepared.changes,prepared.appearance);assertNumbers(prepared,a);
 h.w.tick++;const b=h.send();state.immutableWorlds.add(b);expect(prepared.hasFrameChange(b)).toBe(true);
 update.call(state,b,false,index.adopt(b));expect(state.resources.update).toHaveBeenCalledTimes(2);expect(legacy.read).not.toHaveBeenCalled();expect(legacy.readScene).not.toHaveBeenCalled();
});

test('refused metadata never advances the played consumer, and explicit replacement clears previous ownership',()=>{
 const h=vegetationHarness(fixture()),c=consumer(),a=h.send(true);c.read(a,true);const before=structuredClone(a);
 h.w.tick++;const envelope=h.envelope(),valid=structuredClone(envelope);
 (envelope.natural as unknown as {tick:number}).tick++;
 expect(h.reader.adopt(h.unwrap(envelope)).status).toBe('resync');expect(c.value.hasFrameChange(a)).toBe(false);expect(a).toStrictEqual(before);
 const accepted=h.reader.adopt(h.unwrap(valid));expect(accepted.status).toBe('applied');if(accepted.status!=='applied')throw Error(JSON.stringify(accepted));
 c.read(accepted.world);assertNumbers(c.value,accepted.world);
 const replacement=fixture();replacement.seed++;replacement.resources=replacement.resources.slice(0,1);
 const other=vegetationHarness(replacement).send(true);expect(c.read(other,true)).toStrictEqual({changed:true});assertNumbers(c.value,other);
 expect([...c.value.changes.values()].filter(change=>change.resource).map(change=>change.resource)).toStrictEqual(other.resources);
});

test('prepared to mutable/public and back resets all natural consumers even on the same map',()=>{
 const h=vegetationHarness(fixture()),a=h.send(true),index=new SceneResourceIndex(),prepared=new PreparedNaturalPresentation();
 const state={immutableWorlds:new WeakSet<World>([a]),preparedNaturalPresentation:prepared,naturalPresentation:new NaturalResourcePresentation(),
  plants:{update:vi.fn((..._args:unknown[])=>{})},resources:{update:vi.fn((..._args:unknown[])=>{})},overview:{update:vi.fn((..._args:unknown[])=>{})}};
 const update=(SceneRenderCore.prototype as unknown as {updateResources(this:unknown,w:World,reset:boolean,index:ReturnType<SceneResourceIndex['adopt']>):void}).updateResources;
 update.call(state,a,true,index.adopt(a,true));expect(prepared.active).toBe(true);
 const raw=structuredClone(a);raw.resources=raw.resources.slice(1);raw.tick++;
 expect(prepared.hasFrameChange(raw)).toBe(true);update.call(state,raw,false,index.adopt(raw));
 expect(prepared.active).toBe(false);expect(state.resources.update.mock.calls.at(-1)?.[1]).toBe(true);expect(state.plants.update.mock.calls.at(-1)?.[1]).toBe(true);expect(state.overview.update.mock.calls.at(-1)?.[1]).toBe(true);
 h.w.tick++;const b=h.send();state.immutableWorlds.add(b);update.call(state,b,false,index.adopt(b));
 expect(prepared.active).toBe(true);expect(state.resources.update.mock.calls.at(-1)?.[1]).toBe(true);expect(state.plants.update.mock.calls.at(-1)?.[1]).toBe(true);expect(state.overview.update.mock.calls.at(-1)?.[1]).toBe(true);
});
