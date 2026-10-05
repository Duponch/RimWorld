import { expect,test } from 'vitest';
import { SnapshotDecoder,SnapshotEncoder,type SnapshotMessage } from '../src/bridge/snapshots.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { validateMental } from '../src/sim/mental-save.ts';
import { turretDangerNativeFixture } from './helpers/mini-turret-danger-v212.ts';
import type { World } from '../src/sim/types.ts';

function adopt(decoder:SnapshotDecoder,packet:SnapshotMessage):World {
  const result=decoder.adopt(packet);expect(result.status).toBe('applied');
  if(result.status!=='applied')throw Error(JSON.stringify(result));return result.world;
}

test('a real Tantrum strike finishes its recovery before refuge, survives strict transport and produces Bomb with exact replay',()=>{
  const fixture=turretDangerNativeFixture(),w=fixture.world,actor=w.pawns.find(p=>p.id===fixture.aggressorId)!;
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  function frontier(checkpoint=false):void {
    expect(validateWorld(w),`World at tick ${w.tick}`).toEqual([]);
    expect(adopt(decoder,structuredClone(encoder.encode(w,0,1,checkpoint)))).toEqual(w);
  }
  expect(w.structures.every(s=>!s.damage&&!s.turret?.wick)).toBe(true);
  expect(w.bombWaves).toBeUndefined();expect(actor.mental?.crisis).toBeUndefined();
  expect(applyCommand(w,{type:'order-job',pawnId:actor.id,jobId:fixture.jobId,queue:false})).toMatchObject({ok:true});frontier(true);

  let prefix=0;
  while(prefix<800&&!w.structures.find(s=>s.id===fixture.turretId)?.turret?.wick){stepWorld(w);prefix++;frontier();}
  const source=w.structures.find(s=>s.id===fixture.turretId)!,wick=structuredClone(source?.turret?.wick);
  expect(wick).toBeDefined();expect(prefix).toBeLessThanOrEqual(800);
  expect(source.damage).toBeGreaterThanOrEqual(80);expect(actor.mental?.crisis?.kind).toBe('tantrum');
  const recovery=structuredClone(actor.melee?.strike);
  expect(recovery?.targetId).toBe(fixture.turretId);expect(actor.bombRefuge).toBeUndefined();
  let peer=deserializeWorld(serializeWorld(w)),refugeTick:number|undefined,birthTick:number|undefined;
  expect(peer).toEqual(w);
  const suffixEnd=3745;expect(w.tick).toBeLessThan(suffixEnd);

  while(w.tick<suffixEnd){
    stepWorld(w);stepWorld(peer);expect(peer).toEqual(w);frontier();
    if(recovery&&w.tick*10<recovery.untilCore){expect(actor.melee?.strike).toEqual(recovery);expect(actor.bombRefuge).toBeUndefined();}
    if(refugeTick===undefined&&actor.bombRefuge){
      refugeTick=w.tick;expect(recovery).toBeDefined();expect(w.tick*10).toBeGreaterThanOrEqual(recovery!.untilCore);
      expect(actor.melee).toBeUndefined();expect(actor.mental?.crisis?.kind).toBe('tantrum');expect(actor.mental?.crisis?.target).toBeNull();
      expect(actor.path.length).toBeGreaterThan(0);expect(actor.path.at(-1)).toEqual(actor.bombRefuge.target);

      // The ordinary crisis destination cannot authorize an unrelated refuge.
      // Reject the corrupted same-tick packet, then adopt its exact good peer.
      const good=structuredClone(encoder.encode(w,0,1)),bad=structuredClone(good),q=bad.world.pawns.find(p=>p.id===actor.id)!;
      q.bombRefuge!.target={x:0,z:0};q.mental!.crisis!.target={...q.path.at(-1)!};
      const forged=structuredClone(w),forgedActor=forged.pawns.find(p=>p.id===actor.id)!;
      forgedActor.bombRefuge!.target={x:0,z:0};forgedActor.mental!.crisis!.target={...forgedActor.path.at(-1)!};
      expect(validateMental(forged,193)).toContain('Mental route has no matching destination.');
      expect(()=>deserializeWorld(JSON.stringify(forged))).toThrow(/Mental route has no matching destination/);
      expect(decoder.adopt(bad).status).toBe('resync');expect(adopt(decoder,good)).toEqual(w);
      peer=deserializeWorld(serializeWorld(w));expect(peer).toEqual(w);frontier(true);
    }
    const wave=w.bombWaves?.find(wave=>wave.sourceId===fixture.turretId);
    if(birthTick===undefined&&wave){
      birthTick=w.tick;expect(wave.startedAtCore).toBe(wick!.endCore);
      expect(w.structures.some(s=>s.id===fixture.turretId)).toBe(false);expect(refugeTick).toBeDefined();
      peer=deserializeWorld(serializeWorld(w));expect(peer).toEqual(w);frontier(true);
    }
  }
  expect(refugeTick).toBeDefined();expect(birthTick).toBeDefined();expect(w.bombWaves).toBeUndefined();
  expect(w.structures.some(s=>s.id===fixture.turretId)).toBe(false);expect(actor.bombRefuge).toBeUndefined();
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);expect(peer).toEqual(w);frontier(true);
});
