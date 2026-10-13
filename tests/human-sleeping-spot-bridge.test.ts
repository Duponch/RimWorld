import { expect,test } from 'vitest';
import { SnapshotDecoder,SnapshotEncoder,type SnapshotValidationContext } from '../src/bridge/snapshots.ts';
import { createOwnedValidationGeometry } from '../src/sim/owned-validation-geometry.ts';
import { PowerParentValidationCache } from '../src/sim/power-parent-validation.ts';
import { sleepingSpotFrame,medicalSpotFrame,surgerySpotFrame,rescueSpotFrame } from './helpers/human-sleeping-spot-persistence.ts';
import type { World } from '../src/sim/types.ts';

class QueryDecoder extends SnapshotDecoder {
  protected override createValidationContext(w:World):SnapshotValidationContext {
    const geometry=createOwnedValidationGeometry(w);return {powerParents:new PowerParentValidationCache(),geometry,resourceFacts:geometry.resourceFacts};
  }
}
for(const Decoder of [SnapshotDecoder,QueryDecoder]){
  test(`${Decoder.name}: civil, medical, medical prisoner and surgical spot states preserve exact checkpoints`,()=>{
    for(const w of [sleepingSpotFrame().w,medicalSpotFrame().w,medicalSpotFrame(true).w,surgerySpotFrame(),rescueSpotFrame().w,rescueSpotFrame(true).w]){
      const before=structuredClone(w),encoder=new SnapshotEncoder(),decoder=new Decoder(),first=decoder.adopt(structuredClone(encoder.encode(w,0,1)));
      expect(first.status).toBe('applied');if(first.status!=='applied')throw Error(first.status==='resync'?first.reason:'stale');expect(first.world).toEqual(w);
      const next=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(next.status).toBe('applied');if(next.status==='applied')expect(next.world).toEqual(w);expect(first.world).toEqual(before);
    }
  });
  for(const checkpoint of [false,true]){
    test(`${Decoder.name}: ${checkpoint?'checkpoint':'delta'} refusal preserves state and revision before valid replay`,()=>{
      const f=sleepingSpotFrame(),encoder=new SnapshotEncoder({structureDelta:true,minimumStructures:1}),decoder=new Decoder(),first=decoder.adopt(structuredClone(encoder.encode(f.w,0,1)));
      expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('initial admission');const before=structuredClone(first.world);
      const correct=structuredClone(encoder.encode(f.w,0,1,checkpoint));
      const forges:Array<(w:World)=>void>=[
        w=>{w.pawns[0]!.bedSlot=0;},w=>{w.pawns[1]!.bedId=f.spot.id;},
        w=>{if(w.pawns[0]!.need?.kind==='sleep')w.pawns[0]!.need.target.z++;},
        w=>{w.pawns[0]!.z++;},w=>{w.schemaVersion=231 as World['schemaVersion'];},
      ];
      for(const forge of forges){const bad=structuredClone(correct);forge(bad.world as World);expect(decoder.adopt(bad).status).toBe('resync');expect(first.world).toEqual(before);}
      const accepted=decoder.adopt(correct);expect(accepted.status).toBe('applied');if(accepted.status==='applied')expect(accepted.world).toEqual(f.w);expect(first.world).toEqual(before);
    });
    test(`${Decoder.name}: ${checkpoint?'checkpoint':'sparse delta'} refuses material and accessor before consuming revision`,()=>{
      const f=sleepingSpotFrame(),encoder=new SnapshotEncoder({structureDelta:true,minimumStructures:1}),decoder=new Decoder(),first=decoder.adopt(structuredClone(encoder.encode(f.w,0,1)));
      expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('initial admission');const before=structuredClone(first.world);
      // A genuine role change supplies a real sparse upsert, then forge it.
      f.p.need=null;f.p.state='idle';f.p.bedId=null;f.spot.medical=true;
      const correct=structuredClone(encoder.encode(f.w,0,1,checkpoint)),bad=structuredClone(correct);
      const target=bad.kind==='checkpoint'?bad.world.structures[0]!:bad.structures!.upserted[0]!;
      Object.assign(target,{material:'wood'});expect(decoder.adopt(bad).status).toBe('resync');expect(first.world).toEqual(before);
      const accessor=structuredClone(correct),value=accessor.kind==='checkpoint'?accessor.world.structures[0]!:accessor.structures!.upserted[0]!;
      let reads=0;Object.defineProperty(value,'kind',{enumerable:true,get(){reads++;throw Error('getter');}});
      expect(decoder.adopt(accessor).status).toBe('resync');expect(reads).toBe(0);expect(first.world).toEqual(before);
      const accepted=decoder.adopt(correct);expect(accepted.status).toBe('applied');if(accepted.status==='applied')expect(accepted.world).toEqual(f.w);
    });
  }
}
