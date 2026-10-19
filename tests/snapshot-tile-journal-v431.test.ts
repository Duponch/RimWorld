import {expect,test} from 'vitest';
import {SnapshotChangeJournal,SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler';
import {readSnapshotChanges,readSnapshotTileChanges} from '../src/bridge/snapshot-changes';
import {terrainTileChanges} from '../src/render/terrain-state';
import {fixture} from './resident-presentation-fixtures-v427';
import type {World} from '../src/sim/types';

function harness(mode:'resident'|'public'='resident'){
 const world=fixture();
 // The prepared journal cells must support the real floor mutations below.
 for(let i=0;i<=64;i++)world.tiles[i]={terrain:'soil'};
 const encoder=new SnapshotEncoder(),decoder=mode==='resident'?new ResidentPresentationAssembler():new SnapshotDecoder();
 const packet=(checkpoint=false)=>structuredClone(encoder.encode(world,0,1,checkpoint));
 const send=(checkpoint=false):World=>{const result=decoder.adopt(packet(checkpoint));if(result.status!=='applied')throw Error(JSON.stringify(result));return result.world;};
 return {world,encoder,decoder,packet,send};
}

test.each(['resident','public']as const)('%s: tile chronology survives resource birth, removal, reorder and same-tick commands',mode=>{
 const h=harness(mode),a=h.send(),saved=structuredClone(a);
 h.world.resources.push({id:h.world.nextId++,kind:'berries',x:10,z:10,amount:10});h.world.tiles[3]!.floor='wood-planks';const b=h.send();
 expect(b.tick).toBe(a.tick);expect(readSnapshotChanges(a,b)).toBeUndefined();expect(readSnapshotTileChanges(a,b)).toStrictEqual([3]);
 expect(terrainTileChanges(a,b,true)).toStrictEqual([3]);
 h.world.resources.reverse();h.world.tiles[7]!.floor='wood-planks';const c=h.send();
 h.world.resources.splice(0,1);h.world.tiles[9]!.floor='wood-planks';const d=h.send();
 expect(readSnapshotTileChanges(a,c)).toStrictEqual([3,7]);expect(readSnapshotTileChanges(b,d)).toStrictEqual([7,9]);
 expect(readSnapshotTileChanges(c,a)).toBeUndefined();expect(a).toStrictEqual(saved);
 const unknown=structuredClone(c);expect(readSnapshotTileChanges(a,unknown)).toBeUndefined();expect(readSnapshotTileChanges(unknown,c)).toBeUndefined();
 expect(terrainTileChanges(a,c,true)).toStrictEqual(terrainTileChanges(a,c,false));
});

test('full and tile results are frozen exact endpoint values, reused only until append/reset',()=>{
 const h=harness(),a=h.send();h.world.resources[0]!.amount++;h.world.tiles[8]!.floor='wood-planks';const b=h.send();
 const full=readSnapshotChanges(a,b)!,tiles=readSnapshotTileChanges(a,b)!;
 expect(full).toStrictEqual({resourceIndices:[0],tileIndices:[8]});expect(tiles).toStrictEqual(full.tileIndices);
 expect(readSnapshotChanges(a,b)).toBe(full);expect(readSnapshotTileChanges(a,b)).toBe(tiles);
 expect(Object.isFrozen(full)).toBe(true);expect(Object.isFrozen(full.resourceIndices)).toBe(true);expect(Object.isFrozen(full.tileIndices)).toBe(true);expect(Object.isFrozen(tiles)).toBe(true);
 expect(()=>{(tiles as number[]).push(99);}).toThrow();
 h.world.resources[1]!.amount++;h.world.tiles[2]!.floor='wood-planks';const c=h.send();
 expect(readSnapshotChanges(a,b)).toStrictEqual(full);expect(readSnapshotChanges(a,b)).not.toBe(full);
 expect(readSnapshotTileChanges(a,b)).toStrictEqual(tiles);expect(readSnapshotTileChanges(a,b)).not.toBe(tiles);
 expect(readSnapshotTileChanges(a,c)).toStrictEqual([2,8]);expect(readSnapshotTileChanges(b,c)).toStrictEqual([2]);
 const checkpoint=h.send(true);expect(readSnapshotChanges(a,checkpoint)).toBeUndefined();expect(readSnapshotTileChanges(a,checkpoint)).toBeUndefined();
 expect(readSnapshotTileChanges(checkpoint,checkpoint)).toStrictEqual([]);
});

test.each(['refuse','throw']as const)('late %s and a missing publication cannot publish or poison the cached tile suffix',mode=>{
 const h=harness(),a=h.send();h.world.tiles[3]!.floor='wood-planks';const b=h.send(),before=readSnapshotTileChanges(a,b);
 h.world.tiles[7]!.floor='wood-planks';const good=h.packet();let rejected:World|undefined;
 const extra=(world:World)=>{rejected=world;if(mode==='throw')throw Error('late tile metadata');return false;};
 if(mode==='throw')expect(()=>h.decoder.adopt(good,extra)).toThrow('late tile metadata');else expect(h.decoder.adopt(good,extra).status).toBe('resync');
 expect(rejected).toBeDefined();expect(readSnapshotTileChanges(a,rejected!)).toBeUndefined();expect(readSnapshotTileChanges(a,b)).toBe(before);
 const retry=h.decoder.adopt(good);expect(retry.status).toBe('applied');if(retry.status!=='applied')throw Error(JSON.stringify(retry));
 expect(readSnapshotTileChanges(a,retry.world)).toStrictEqual([3,7]);
 h.world.tiles[9]!.floor='wood-planks';const missing=h.packet();h.world.tiles[10]!.floor='wood-planks';const ahead=h.packet();
 expect(h.decoder.adopt(ahead).status).toBe('resync');expect(readSnapshotTileChanges(a,retry.world)).toStrictEqual([3,7]);
 expect(h.decoder.adopt(missing).status).toBe('applied');const recovered=h.decoder.adopt(ahead);expect(recovered.status).toBe('applied');
 if(recovered.status!=='applied')throw Error(JSON.stringify(recovered));expect(readSnapshotTileChanges(a,recovered.world)).toStrictEqual([3,7,9,10]);
});

test('the65th edge evicts a previously cached prefix, while a surviving64edge suffix remains exact',()=>{
 const h=harness(),frames=[h.send()];
 for(let i=0;i<64;i++){h.world.resources[0]!.amount++;h.world.tiles[i]!.floor='wood-planks';frames.push(h.send());}
 const first=frames[0]!,last=frames[64]!;expect(readSnapshotTileChanges(first,last)).toStrictEqual(Array.from({length:64},(_,i)=>i));
 expect(readSnapshotChanges(first,last)?.resourceIndices).toStrictEqual([0]);
 h.world.tiles[64]!.floor='wood-planks';const next=h.send();expect(readSnapshotTileChanges(first,next)).toBeUndefined();
 expect(readSnapshotTileChanges(first,last)).toBeUndefined();expect(readSnapshotChanges(first,last)).toBeUndefined();
 expect(readSnapshotTileChanges(frames[1]!,next)).toStrictEqual(Array.from({length:64},(_,i)=>i+1));
});

test('independent owners with equal numeric epochs/revisions cannot borrow each others cached result',()=>{
 const left=harness(),right=harness(),a=left.send(),x=right.send();left.world.tiles[3]!.floor='wood-planks';right.world.tiles[9]!.floor='wood-planks';
 const b=left.send(),y=right.send();expect(readSnapshotTileChanges(a,b)).toStrictEqual([3]);expect(readSnapshotTileChanges(x,y)).toStrictEqual([9]);
 expect(readSnapshotTileChanges(a,y)).toBeUndefined();expect(readSnapshotChanges(x,b)).toBeUndefined();
});

// Deliberately instrument only the internal journal's owned records, not an
// admitted World. This proves iteration count without a benchmark/timing gate.
type InstrumentedRecord={parentRevision:number;resourceIndices:readonly number[]|undefined;tileIndices:readonly number[]};
function records(journal:SnapshotChangeJournal):Map<number,InstrumentedRecord>{return (journal as unknown as {records:Map<number,InstrumentedRecord>}).records;}
function counted(values:readonly number[],onRead:()=>void):readonly number[]{
 return new Proxy(values,{get(target,key,receiver){if(key===Symbol.iterator){onRead();return target[Symbol.iterator].bind(target);}return Reflect.get(target,key,receiver);}});
}
test('tile-only never traverses resource ordinals; repeated full/tile reads do not traverse records again',()=>{
 const a=fixture(),b={...a},c={...a},journal=new SnapshotChangeJournal();journal.reset(a,1,1);journal.append(a,b,1,2,[0,1],[8,3,8]);
 const prior=records(journal).get(2)!;let resourceReads=0,tileReads=0;
 records(journal).set(2,{...prior,resourceIndices:counted(prior.resourceIndices!,()=>resourceReads++),tileIndices:counted(prior.tileIndices,()=>tileReads++)});
 const tiles=readSnapshotTileChanges(a,b);expect(tiles).toStrictEqual([3,8]);expect(resourceReads).toBe(0);expect(tileReads).toBe(1);
 expect(readSnapshotTileChanges(a,b)).toBe(tiles);expect(resourceReads).toBe(0);expect(tileReads).toBe(1);
 const full=readSnapshotChanges(a,b);expect(full).toStrictEqual({resourceIndices:[0,1],tileIndices:[3,8]});expect(resourceReads).toBe(1);expect(tileReads).toBe(2);
 expect(readSnapshotChanges(a,b)).toBe(full);expect(resourceReads).toBe(1);expect(tileReads).toBe(2);
 journal.append(b,c,1,3,undefined,[4]);expect(readSnapshotChanges(a,c)).toBeUndefined();expect(readSnapshotTileChanges(a,c)).toStrictEqual([3,4,8]);
 expect(resourceReads).toBe(1);expect(tileReads).toBe(3);
});

test('ordered capture keeps duplicate/reversed input normalization and immutable ownership exact',()=>{
 const a=fixture(),b={...a},journal=new SnapshotChangeJournal(),resources=[4,1,4,0,1],tiles=[8,3,8,0];
 journal.reset(a,1,1);journal.append(a,b,1,2,resources,tiles);resources.fill(99);tiles.fill(99);
 expect(readSnapshotChanges(a,b)).toStrictEqual({resourceIndices:[0,1,4],tileIndices:[0,3,8]});expect(readSnapshotTileChanges(a,b)).toStrictEqual([0,3,8]);
});
