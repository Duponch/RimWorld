import { expect, test } from 'vitest';
import { SnapshotDecoder, SnapshotEncoder, type SnapshotMessage } from '../src/bridge/snapshots.ts';
import { applyCommand, createWorld, deserializeWorld, serializeWorld, stepWorld } from '../src/sim/index.ts';
import type { World } from '../src/sim/types.ts';
import { PresentationChanges } from '../src/bridge/presentation-changes';
import { MotionRecorder } from '../src/bridge/motion-tracks';
import { MotionTimeline } from '../src/render/MotionTimeline';
import { PresentationQueue } from '../src/render/PresentationQueue';
import { PawnLayer } from '../src/render/PawnLayer';
import { miningCamp } from './scenarios/mining';

test('snapshots preserve exact state and previous frames through harvest, patches, replacement and recovery', () => {
  const encoder = new SnapshotEncoder(); const decoder = new SnapshotDecoder();
  let source = createWorld(42, 32, 32);
  const transfer = (checkpoint = false): SnapshotMessage => structuredClone(encoder.encode(source, 0.2, 1, checkpoint));
  const apply = (message: SnapshotMessage, replaced = false): World => {
    const result = decoder.adopt(message);
    if (result.status !== 'applied') throw new Error(`Snapshot refused: ${JSON.stringify(result)}`);
    expect(result.replaced).toBe(replaced);
    expect(result.world).toEqual(source);
    expect(JSON.stringify(result.world)).toBe(JSON.stringify(source));
    return result.world;
  };
  const initialPacket = transfer(); const initial = apply(initialPacket, true);
  const initialValue = structuredClone(initial);
  expect(initialPacket.kind).toBe('checkpoint');
  // Metadata-only changes must propagate, including in-place producer edits,
  // while the previous frame keeps its original tile/resource identity.
  const rockIndex = source.tiles.findIndex(t => t.terrain === 'rock');
  source.tiles[rockIndex]!.stone = source.tiles[rockIndex]!.stone === 'marble' ? 'slate' : 'marble';
  const looseRock = source.resources.find(r => r.kind === 'rock')!;
  looseRock.stone = looseRock.stone === 'marble' ? 'slate' : 'marble';
  const stonePacket = transfer(); apply(stonePacket);
  expect(initial).toEqual(initialValue);
  delete source.tiles[rockIndex]!.stone; delete looseRock.stone;
  const afterStone = apply(transfer());
  expect(applyCommand(source, { type: 'designate', kind: 'chop', x: 14, z: 14 }).ok).toBe(true);
  let last = afterStone; let gathered = false;
  for (let tick = 0; tick < 250; tick += 5) {
    const previousValue = structuredClone(last);
    stepWorld(source, 5);
    const packet = transfer(); const next = apply(packet);
    expect(packet.kind).toBe('delta');
    expect(next.tiles).toBe(last.tiles);
    if (next.resources.length === last.resources.length) expect(next.resources).toBe(last.resources);
    else {
      gathered = true;
      expect(packet.kind === 'delta' && packet.resources?.removed).toHaveLength(1);
      expect(packet.kind === 'delta' && packet.resources?.order).toBeUndefined();
      expect(next.resources).not.toBe(last.resources);
    }
    expect(last).toEqual(previousValue);
    last = next;
  }
  expect(gathered).toBe(true);
  expect(initial).toEqual(initialValue);
  expect(initial.tiles).not.toBe(source.tiles);
  expect(initial.resources[0]).not.toBe(source.resources[0]);

  // Future terrain edits and resource additions/changes/reordering retain exact array order.
  const beforePatch = structuredClone(last);
  source.tiles[0] = { terrain: source.tiles[0]!.terrain === 'soil' ? 'grass' : 'soil' };
  source.resources[0]!.amount += 1;
  source.resources.unshift({ id: source.nextId++, x: 15, z: 15, kind: 'berries', amount: 7 });
  source.resources.reverse();
  const patch = transfer();
  if (patch.kind !== 'delta') throw new Error('Expected a delta.');
  expect(patch.tiles).toHaveLength(1); expect(patch.resources?.upserted).toHaveLength(2);
  expect(patch.resources?.order).toHaveLength(source.resources.length);
  const wrongSize = structuredClone(patch); wrongSize.world.width++;
  expect(decoder.adopt(wrongSize).status).toBe('resync');
  const outsideTerrain = structuredClone(patch); outsideTerrain.tiles![0]![0] = source.tiles.length;
  expect(decoder.adopt(outsideTerrain).status).toBe('resync');
  const wrongStone = structuredClone(patch); wrongStone.tiles![0]![2] = 'marble';
  expect(decoder.adopt(wrongStone).status).toBe('resync'); // ordinary soil/grass cannot carry a rock identity
  const invalid = structuredClone(patch);
  invalid.resources!.order![0] = -1;
  expect(decoder.adopt(invalid).status).toBe('resync');
  // Reusing the same revision after refusal proves rejection was atomic.
  const changed = apply(patch);
  expect(last).toEqual(beforePatch);
  expect(changed.tiles).not.toBe(last.tiles); expect(changed.tiles[1]).toBe(last.tiles[1]);
  expect(decoder.adopt(patch).status).toBe('stale');

  // Same-tick edits cannot be hidden behind array/object identity. Exercise the
  // ordered fast path followed by membership changes, including retained refs.
  const retained=source.resources[0]!,oldFrames:Array<{world:World;value:World}>=[];
  const edits:Array<()=>void>=[
    ()=>{retained.amount++;},
    ()=>{source.resources.reverse();retained.amount++;},
    ()=>{source.resources[1]={...source.resources[1]!,id:source.nextId++};},
    ()=>{source.resources.splice(1,1);source.resources.push({id:source.nextId++,x:3,z:3,kind:'berries',amount:2,growth:.4,growthTick:source.tick,growthThermalFactor:.8});},
    ()=>{const r=source.resources.at(-1)!;delete r.growthThermalFactor;r.growth=.5;},
    ()=>{const r=source.resources.pop()!;source.resources.unshift(r);retained.amount++;},
    ()=>{source.resources=source.resources.map(r=>({...r}));},
    ()=>{source.resources.length=0;},
    ()=>{source.resources.push({...retained,amount:3});},
    ()=>{source.resources[0]!.amount=4;},
  ];
  for(const edit of edits){
    edit();const frame=apply(transfer());oldFrames.push({world:frame,value:structuredClone(frame)});
    const unchanged=transfer();expect(unchanged.kind==='delta'&&unchanged.resources).toBeUndefined();apply(unchanged);
    for(const old of oldFrames)expect(old.world).toEqual(old.value);
  }

  // A missing delta cannot quietly corrupt the baseline. A same-epoch checkpoint repairs it.
  source.tick++; const missed = transfer();
  source.tick++; const ahead = transfer();
  expect(decoder.adopt(ahead).status).toBe('resync');
  const recovery = transfer(true); const recovered = apply(recovery);
  expect(recovery.epoch).toBe(patch.epoch);
  expect(decoder.adopt(missed).status).toBe('stale');
  expect(recovered.tiles).not.toBe(changed.tiles);

  // Same-size/same-seed saves commonly reuse all IDs; a new epoch must replace their contents.
  source = deserializeWorld(serializeWorld(initialValue));
  source.tiles[0] = { terrain: 'soil' }; source.resources[0]!.amount += 3;
  const loadedPacket = transfer(); const loaded = apply(loadedPacket, true);
  expect(loadedPacket.kind).toBe('checkpoint'); expect(loadedPacket.epoch).toBe(recovery.epoch + 1);
  expect(loaded.resources[0]!.id).toBe(initial.resources[0]!.id);
  expect(loaded.resources[0]!.amount).toBe(initial.resources[0]!.amount + 3);
  expect(decoder.adopt(recovery).status).toBe('stale');
  const beforeInvalidCommand = serializeWorld(source);
  expect(applyCommand(source, { type: 'designate', kind: 'wall', x: -1, z: 0 }).ok).toBe(false);
  expect(serializeWorld(source)).toBe(beforeInvalidCommand);
  expect(apply(transfer()).resources).toBe(loaded.resources);

  // A newly connected consumer requests a checkpoint instead of interpreting a partial world.
  const fresh = new SnapshotDecoder();
  expect(fresh.adopt(transfer()).status).toBe('resync');
  const restored = fresh.adopt(transfer(true));
  expect(restored.status).toBe('applied');
  if (restored.status === 'applied') {
    expect(restored.world).toEqual(source);
    expect(restored.replaced).toBe(true);
  }
});

test('buffered scene preserves arrival, work, excavation, tree removal and cargo across sparse publications',()=>{
  const source=miningCamp(),pawn=source.pawns[0]!;pawn.priorities.gather=2;
  for(const x of [12,13,14]){source.tiles[12*32+x]={terrain:'rock',stone:'sandstone'};expect(applyCommand(source,{type:'designate',kind:'mine',x,z:12}).ok).toBe(true);}
  source.resources.push({id:source.nextId++,x:15,z:11,kind:'tree',amount:12});expect(applyCommand(source,{type:'designate',kind:'chop',x:15,z:11}).ok).toBe(true);
  const initial=source.tick,encoder=new SnapshotEncoder(),changes=new PresentationChanges(),motion=new MotionRecorder();
  const packets:Array<{at:number;message:SnapshotMessage}>=[];
  const publish=()=>{changes.capture(source);motion.capture(source);packets.push({at:(source.tick-initial)*100/6+30,message:structuredClone({...encoder.encode(source,0,6),motion:motion.snapshot()})});};
  publish();
  for(let i=0;i<500;i++) {
    const previousState=pawn.state,previousJobs=source.jobs.length;stepWorld(source);motion.capture(source);
    const boundary=changes.capture(source);
    if(pawn.state!==previousState||source.jobs.length<previousJobs)expect(boundary).toBe(true);
    if(boundary||i%12===0)publish();
  }
  publish();
  expect(source.jobs).toEqual([]);expect(source.resources).toEqual([]);expect(source.stock.wood).toBe(12);
  expect(packets.length).toBeLessThan(110); // no publication for each movement/work tick
  const timeline=new MotionTimeline(),queue=new PresentationQueue(),decoder=new SnapshotDecoder(),layer=new PawnLayer();
  let world:World|undefined,index=0,previousPosition:{x:number;z:number}|undefined;const worked=new Set<number>();
  for(let now=0;now<=9000;now+=5) {
    while(packets[index]&&packets[index]!.at<=now) {
      const message=packets[index++]!.message,result=decoder.adopt(message);if(result.status!=='applied')throw Error(result.status);
      timeline.adopt(result.world.tick,6,message.motion!,now,result.replaced);
      if(result.replaced){queue.clear();world=result.world;layer.update(world,1,true);}else queue.push(result.world);
      expect(decoder.adopt(message).status).toBe('stale');
    }
    if(!world)continue;
    timeline.advance(now);const due=queue.take(timeline.tick,now);
    if(due){for(const job of world.jobs)if(!due.jobs.some(j=>j.id===job.id))expect(worked.has(job.id),`removed before displayed work: ${job.id}`).toBe(true);world=due;layer.update(world,1,false);}
    expect(world.tick).toBeLessThanOrEqual(timeline.tick);layer.blend.value=1;layer.updateTravel(world,timeline);
    const g=(layer as any).pawnMesh.geometry,f=g.getAttribute('aFrom'),t=g.getAttribute('aTo'),travel=g.getAttribute('aTravel'),m=g.getAttribute('aMotion');
    const duration=travel.getY(0)-travel.getX(0),alpha=duration>0?Math.max(0,Math.min(1,(layer.travelTime.value-travel.getX(0))/duration)):1;
    const x=f.getX(0)+(t.getX(0)-f.getX(0))*alpha,z=f.getZ(0)+(t.getZ(0)-f.getZ(0))*alpha;
    if(previousPosition)expect(Math.hypot(x-previousPosition.x,z-previousPosition.z),`jump at ${now}`).toBeLessThanOrEqual(.101);
    previousPosition={x,z};expect(world.tiles[Math.round(z)*32+Math.round(x)]!.terrain,`inside rendered rock at ${now}`).not.toBe('rock');
    if(m.getY(0)>0){const p=world.pawns[0]!,job=world.jobs.find(j=>j.id===p.jobId);if(job){expect(Math.max(Math.abs(job.x-x),Math.abs(job.z-z))).toBeLessThanOrEqual(1.001);worked.add(job.id);}}
  }
  expect(worked.size).toBe(4);expect(queue.size).toBe(0);expect(world).toEqual(source);
  // An unchanged phase survives structured cloning. Its final continuous
  // update is retained even when no further worker snapshot arrives in pause.
  const phase=new PresentationChanges();expect(phase.capture(source)).toBe(true);expect(phase.capture(structuredClone(source))).toBe(false);
  const continuous=structuredClone(source);continuous.tick++;
  queue.clear();queue.push(source);expect(queue.take(source.tick,0)).toBe(source);
  queue.push(continuous);expect(queue.take(continuous.tick,10)).toBeUndefined();expect(queue.size).toBe(1);
  expect(queue.take(continuous.tick,199)).toBeUndefined();expect(queue.take(continuous.tick,200)).toBe(continuous);
  const replacement=structuredClone(source);replacement.tick=2000;queue.push(replacement);queue.clear();expect(queue.take(Infinity)).toBeUndefined();
});
