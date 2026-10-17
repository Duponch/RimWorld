import {expect,test} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {validateWorld,serializeWorld,deserializeWorld} from '../src/sim/index.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {TileSnapshotCache} from '../src/bridge/tile-snapshot-cache.ts';
import {captureExplorationTransport256,prepareExplorationTransport256,validExplorationTransportEnvelope256} from '../src/bridge/exploration-transport-256.ts';
import {validExplorationCampaignRaw256} from '../src/sim/exploration-campaign-save-256.ts';
import {validExplorationHeader256,validateExploration256} from '../src/sim/exploration-save-256.ts';
import {validateDoors} from '../src/sim/door-save.ts';
import {pendingUnownedBlindMine256,validBlindMineTransport256} from '../src/sim/mining-save.ts';
import {actualExplorationAffiliation256,resolveActualExplorationApproacher256} from '../src/sim/exploration-actors-256.ts';
import {createPrisonerState} from '../src/sim/prisoner-state.ts';
import type {World,Tile} from '../src/sim/types.ts';
/** Actual map preparation. The helper-only Site3 header below is an isolated
 * contract fixture, explicitly not an admitted geographic World or game run. */
function doorDomain(){
 const w=deconstructionCamp(),id=w.nextId++;
 w.site={revision:3,tileId:0,mapSeed:42,biome:'temperate-forest',hilliness:'flat',river:'none',stones:['granite','slate'],coastAngle:null,mutatorCode:0};
 w.exploration={revision:1};
 w.structures.push({id,kind:'door',x:20,z:20,orientation:0,footprint:'standard',material:'wood',
  door:{open:false,holdOpen:false,forbidden:false,changedAt:0,from:0,lastTouch:-12,closeAt:null,explorationApproacherId:w.pawns[0]!.id}});
 return w;
}
test('real legacy full/delta publication and RAW round trip keep absence literal at the same tick',()=>{
 const w=deconstructionCamp();expect(validateWorld(w)).toEqual([]);
 const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
 const first=decoder.adopt(structuredClone(encoder.encode(w,0,0)));expect(first.status,JSON.stringify(first)).toBe('applied');
 const tick=w.tick;w.tiles[1]={terrain:'rich-soil'};
 const packet=structuredClone(encoder.encode(w,0,0));expect(packet.kind).toBe('delta');expect(w.tick).toBe(tick);
 const next=decoder.adopt(packet);expect(next.status,JSON.stringify(next)).toBe('applied');
 if(next.status!=='applied')throw Error('Expected confirmed map');
 expect(next.world.tiles[1]).toEqual({terrain:'rich-soil'});expect(Object.hasOwn(next.world,'exploration')).toBe(false);
 expect(Object.hasOwn(packet,'explorationApproachers')).toBe(false);
});
test('cache owns copied fog presence: initial/full guard, same-tick additions, removals and no mutable witnesses',()=>{
 const tiles:Tile[]=[{terrain:'soil-natural'},{terrain:'rock',fogged:true}],cache=new TileSnapshotCache();
 cache.reset(tiles);expect(cache.diff(tiles)).toEqual([]);
 tiles[0]!.fogged=true;const added=cache.diff(tiles);expect(added).toHaveLength(1);expect(added[0]).toHaveLength(11);expect(added[0]![10]).toBe(true);
 delete tiles[0]!.fogged;const removed=cache.diff(tiles);expect(removed).toEqual([[0,'soil-natural']]);expect(added[0]![10]).toBe(true);
 const map={site:{revision:3},exploration:{revision:1},tiles};expect(validateExploration256(map,256)).toEqual([]);
 let reads=0;Object.defineProperty(tiles[0]!,'fogged',{enumerable:true,get(){reads++;return true;}});
 expect(()=>cache.diff(tiles)).toThrow();expect(reads).toBe(0);
});
test('full/delta future cells and malformed tuples refuse before commit and retain the exact decoder frontier',()=>{
 const w=deconstructionCamp(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
 const first=structuredClone(encoder.encode(w,0,0)),accepted=decoder.adopt(first);expect(accepted.status,JSON.stringify(accepted)).toBe('applied');
 if(accepted.status!=='applied')throw Error('Missing real baseline');const prior=JSON.stringify(accepted.world);
 const full=structuredClone(first);full.revision++;if(full.kind!=='checkpoint')throw Error('Expected full');full.world.tiles[1]!.fogged=true;
 expect(decoder.adopt(full).status).toBe('resync');
 w.tiles[1]={terrain:'rich-soil'};const source=structuredClone(encoder.encode(w,0,0));if(source.kind!=='delta'||!source.tiles?.length)throw Error('Expected real delta');
 const future=structuredClone(source);future.tiles![0]=[1,'rich-soil',undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,true];
 expect(decoder.adopt(future).status).toBe('resync');
 const empty=structuredClone(future);empty.tiles![0]![10]=undefined;expect(decoder.adopt(empty).status).toBe('resync');
 const getter=structuredClone(future);let reads=0;Object.defineProperty(getter.tiles![0],10,{enumerable:true,get(){reads++;return true;}});
 expect(decoder.adopt(getter).status).toBe('resync');expect(reads).toBe(0);
 expect(JSON.stringify(accepted.world)).toBe(prior);expect(decoder.adopt(source).status).toBe('applied');
});
test('original RAW map namespaces reject non-enumerable future markers before a projection can erase them',()=>{
 const root={tiles:[{terrain:'grass'}],site:{revision:2},worldMaps:{sites:[{id:0},{id:1,map:{tiles:[{terrain:'grass'}],site:{revision:2}}}]}};
 expect(validExplorationCampaignRaw256(root,255)).toBe(true);
 const nested=root.worldMaps.sites[1]!.map!;
 Object.defineProperty(nested,'exploration',{value:undefined,enumerable:false});
 expect(validExplorationCampaignRaw256(root,255)).toBe(false);
 const old={tiles:[{terrain:'grass',fogged:undefined}],site:{revision:2}};expect(validExplorationCampaignRaw256(old,255)).toBe(false);
 expect(validExplorationHeader256({site:{revision:2},exploration:undefined},255)).toBe(false);
});
test('compact door witnesses come from the actual referenced owner only and never become saved World fields',()=>{
 const w=doorDomain(),before=JSON.stringify(w),rows=captureExplorationTransport256(w,w);
 expect(rows).toEqual([actualExplorationAffiliation256(w.pawns[0]!)]);
 const packet={explorationApproachers:rows},prepared=prepareExplorationTransport256(packet,w);expect(prepared.ok).toBe(true);
 if(!prepared.ok)throw Error('Expected actual actor witness');
 expect(validateDoors(w,256,prepared.resolve)).toEqual([]);
 expect(resolveActualExplorationApproacher256(w,w.pawns[0]!.id)).toEqual(rows![0]);
 expect(JSON.stringify(w)).toBe(before);expect(Object.hasOwn(w,'explorationApproachers')).toBe(false);
 const wrong={explorationApproachers:[{...rows![0]!,playerOwned:false}]};expect(prepareExplorationTransport256(wrong,w).ok).toBe(false);
 expect(prepareExplorationTransport256({},w).ok).toBe(false);
 expect(prepareExplorationTransport256({explorationApproachers:[...rows!,{id:w.nextId++,playerOwned:true,hostPlayer:false}]},w).ok).toBe(false);
});
test('door metadata old/undefined/nonenumerable/accessors and unknown refs reject without invoking getters or clearing the reference',()=>{
 const w=doorDomain(),rows=captureExplorationTransport256(w,w)!;
 expect(validExplorationTransportEnvelope256({explorationApproachers:undefined},256)).toBe(false);
 expect(validExplorationTransportEnvelope256({explorationApproachers:rows},255)).toBe(false);
 let reads=0;const getter=Object.defineProperty({},'explorationApproachers',{enumerable:true,get(){reads++;return rows;}});
 expect(validExplorationTransportEnvelope256(getter,256)).toBe(false);expect(reads).toBe(0);
 const hidden=Object.defineProperty({},'explorationApproachers',{enumerable:false,value:rows});expect(prepareExplorationTransport256(hidden,w).ok).toBe(false);
 const door=w.structures[0]!.door!,id=door.explorationApproacherId!;door.explorationApproacherId=w.nextId+5;
 expect(prepareExplorationTransport256({explorationApproachers:rows},w).ok).toBe(false);expect(door.explorationApproacherId).toBe(w.nextId+5);
 door.explorationApproacherId=id;
 const packet={explorationApproachers:rows};Object.defineProperty(rows[0]!,'hostPlayer',{enumerable:false,value:false});expect(prepareExplorationTransport256(packet,w).ok).toBe(false);
});
test('real affiliation preserves released foreign prisoner HostPlayer while retained and distinguishes a foreign visitor',()=>{
 const w=deconstructionCamp(),p=w.pawns[0]!;
 const guest={...p,faction:'outlanders' as const,prisoner:createPrisonerState(w,p)};guest.prisoner.mode='release';guest.prisoner.releasedAt=w.tick;
 // Isolated affiliation call on a real personal record, no exit is simulated.
 expect(actualExplorationAffiliation256(guest).hostPlayer).toBe(true);
 expect(actualExplorationAffiliation256({...p,faction:'outlanders',prisoner:undefined}).playerOwned).toBe(false);
 expect(actualExplorationAffiliation256(p).playerOwned).toBe(true);
});
test('blind Mine exception admits only a true idle fog intent and refuses work, worker, escrow and carried delivery',()=>{
 const w=doorDomain();w.tiles[1]!.fogged=true;
 const job:World['jobs'][number]={id:w.nextId++,kind:'mine',x:1,z:0,orientation:0,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}};
 w.jobs.push(job);expect(pendingUnownedBlindMine256(w,job)).toBe(true);expect(validBlindMineTransport256(w)).toBe(true);
 job.progress=1;expect(pendingUnownedBlindMine256(w,job)).toBe(false);job.progress=0;
 job.reservedBy=w.pawns[0]!.id;expect(pendingUnownedBlindMine256(w,job)).toBe(false);job.reservedBy=null;
 job.escrow.wood=1;expect(pendingUnownedBlindMine256(w,job)).toBe(false);job.escrow.wood=0;
 w.pawns[0]!.jobId=job.id;expect(pendingUnownedBlindMine256(w,job)).toBe(false);w.pawns[0]!.jobId=null;
 expect(pendingUnownedBlindMine256(w,job)).toBe(true);delete w.tiles[1]!.fogged;expect(validBlindMineTransport256(w)).toBe(false);
});
