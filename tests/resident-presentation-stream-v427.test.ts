import {WorkerNaturalAppearance} from '../src/bridge/worker-natural-appearance';
import {campaignPresentation} from '../src/sim/secondary-site-presentation';
import {expect,test} from 'vitest';
import {SnapshotDecoder,type SnapshotMessage} from '../src/bridge/snapshots';
import {readSnapshotChanges,readSnapshotResourceStructure,readSnapshotStructureChanges} from '../src/bridge/snapshot-changes';
import {stepWorld} from '../src/sim/index';
import type {World} from '../src/sim/types';
import {residentPublication,readResidentWorkerMessage} from '../src/bridge/resident-protocol';
import {fixture,harness} from './resident-presentation-fixtures-v427';

test('valid fixed-producer stream agrees with the strict oracle and complete projection JSON; old render versions remain intact',()=>{
 const h=harness(),strict=new SnapshotDecoder(),held:{world:World;before:World}[]=[];
 const send=(checkpoint=false)=>{
  const packet=h.packet(checkpoint),a=strict.adopt(structuredClone(packet)),b=h.reader.adopt(packet);
  expect(a.status).toBe('applied');expect(b.status).toBe('applied');if(a.status!=='applied'||b.status!=='applied')throw Error('Valid stream refused');
  expect(b.world).toStrictEqual(a.world);expect(JSON.stringify(b.world)).toBe(JSON.stringify(a.world));
  for(const view of held)expect(view.world).toStrictEqual(view.before);
  held.push({world:b.world,before:structuredClone(b.world)});return b.world;
 };
 const a=send();expect(a.campaignMap?.revision).toBe(2);
 if(a.campaignMap?.revision!==2)throw Error('Registered projection expected');
 expect(a.campaignMap.activeMapId).toBe(0);expect(a.campaignMap.rootMapId).toBe(0);expect(a.campaignMap.maps.map(row=>row.id)).toContain(0);
 h.world.resources[0]!.growth=.3123456789012345;h.world.resources[0]!.growthThermalFactor=.7123456789012345;
 const b=send();expect(b.tiles).toBe(a.tiles);expect(b.resources).not.toBe(a.resources);expect(b.resources[1]).toBe(a.resources[1]);
 h.world.piles[0]!.quantity=9;h.world.tiles[1]={terrain:'soil',floor:'wood-planks'};send();
 h.world.resources.splice(0,1);h.world.resources.push({id:h.world.nextId++,kind:'berries',x:5,z:2,amount:7,growth:.9,growthTick:h.world.tick});send();
 h.world.resources.reverse();delete h.world.resources[0]!.growthThermalFactor;send();
 stepWorld(h.world);send();send(true);
});

test('resource membership and reorder preserve target ordinals and conservative journal fallback',()=>{
 const h=harness(),a=h.send(),old=structuredClone(a),removed=a.resources[0]!.id;
 h.world.resources.splice(0,1);const added=h.world.nextId++;
 h.world.resources.push({id:added,kind:'berries',x:5,z:2,amount:8,growth:.8,growthTick:h.world.tick});
 const b=h.send(),edge=readSnapshotResourceStructure(a,b);
 expect(edge?.edges).toEqual([{parentRevision:1,revision:2,beforeCount:2,afterCount:2,removed:[{id:removed,beforeOrdinal:0}],added:[{id:added,afterOrdinal:1}],updated:[]}]);
 expect(readSnapshotChanges(a,b)).toBeUndefined();
 h.world.resources[1]!.growth=.8123456789012345;const c=h.send();
 expect(readSnapshotChanges(b,c)).toEqual({resourceIndices:[1],tileIndices:[]});
 expect(readSnapshotResourceStructure(a,c)?.edges).toHaveLength(2);
 h.world.resources.reverse();const d=h.send();
 expect(readSnapshotResourceStructure(a,d)).toBeUndefined();expect(d.resources.map(row=>row.id)).toEqual(h.world.resources.map(row=>row.id));
 expect(a).toStrictEqual(old);expect(c.resources[1]!.id).toBe(added);
});

test('sparse structure changes use the same journal and keep earlier target versions after later adoption',()=>{
 const world=fixture();world.structures=[0,1].map<World['structures'][number]>(index=>({id:world.nextId++,kind:'wall',x:index+6,z:6,orientation:0,footprint:'standard',material:'wood'}));
 const h=harness(world),a=h.send();world.structures[1]!.damage=1;const b=h.send(),savedB=structuredClone(b);
 world.structures[0]!.damage=2;const c=h.send();
 expect(readSnapshotStructureChanges(a,b)).toEqual({structureIndices:[1],tileIndices:[]});
 expect(readSnapshotStructureChanges(a,c)).toEqual({structureIndices:[0,1],tileIndices:[]});
 expect(b.structures[0]!.damage).toBeUndefined();expect(b).toStrictEqual(savedB);
});

test('malformed sparse references, duplicate cell edits and wrong predecessor do not consume the valid packet',()=>{
 const h=harness(),a=h.send();h.world.resources[0]!.growth=.5;h.world.tiles[1]={terrain:'soil',floor:'wood-planks'};
 const good=h.packet();if(good.kind!=='delta')throw Error('delta expected');
 const corruptions:((packet:Extract<SnapshotMessage<true>,{kind:'delta'}>)=>void)[]=[
  packet=>{packet.baseRevision++;},
  packet=>{packet.resources!.growth![0]=h.world.nextId+100;},
  packet=>{packet.tiles!.push(structuredClone(packet.tiles![0]!));},
  packet=>{packet.resources!.removed=[a.resources[0]!.id,a.resources[0]!.id];},
  packet=>{packet.resources!.order=[a.resources[0]!.id,a.resources[0]!.id];},
 ];
 for(const corrupt of corruptions){const bad=structuredClone(good);corrupt(bad);expect(h.reader.adopt(bad).status).toBe('resync');}
 const accepted=h.reader.adopt(good);expect(accepted.status).toBe('applied');
 if(accepted.status==='applied')expect(readSnapshotChanges(a,accepted.world)).toEqual({resourceIndices:[0],tileIndices:[1]});
 expect(h.reader.adopt(good).status).toBe('stale');
});

test('transport shape refuses getters, sparse arrays, invalid unsigned headers and future envelope versions',()=>{
 const h=harness(),good=h.packet();let reads=0;
 const malformed=structuredClone(good);Object.defineProperty(malformed.world,'tick',{enumerable:true,get(){reads++;return 0;}});
 expect(h.reader.adopt(malformed).status).toBe('resync');expect(reads).toBe(0);
 for(const field of ['seed','rng']as const){const bad=structuredClone(good);bad.world[field]=-1;expect(h.reader.adopt(bad).status).toBe('resync');}
 const holes=structuredClone(good);if(holes.kind!=='checkpoint')throw Error('checkpoint expected');delete holes.world.tiles[0];expect(h.reader.adopt(holes).status).toBe('resync');
 const envelope=residentPublication(good,new WorkerNaturalAppearance().capture(campaignPresentation(h.world),good));expect(readResidentWorkerMessage(envelope)).toBe(good);
 expect(()=>readResidentWorkerMessage({...envelope,version:3})).toThrow();
 expect(()=>readResidentWorkerMessage(good)).toThrow();expect(h.reader.adopt(good).status).toBe('applied');
});

test('public decoding keeps its business refusal frontier and reader packets expose no trusted boolean',()=>{
 const h=harness(),strict=new SnapshotDecoder(),checkpoint=h.packet();expect(strict.adopt(structuredClone(checkpoint)).status).toBe('applied');
 h.world.piles[0]!.quantity=9;const invalid=h.packet();if(invalid.kind!=='delta')throw Error('delta expected');invalid.piles!.upserted[0]!.quantity=-1;
 expect(strict.adopt(invalid).status).toBe('resync');
 const envelope=residentPublication(checkpoint,new WorkerNaturalAppearance().capture(campaignPresentation(h.world),checkpoint));expect(Object.keys(envelope).sort()).toEqual(['natural','publication','type','version']);
 expect(Object.hasOwn(checkpoint,'trusted')).toBe(false);expect(Object.hasOwn(envelope,'trusted')).toBe(false);
});
