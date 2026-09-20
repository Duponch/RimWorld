import { withoutFoodCrops } from './scenarios/legacy-skills';
import { expect,test } from 'vitest';
import { medicalCamp,controlledInjury } from './scenarios/health';
import { createMedicalRecord } from '../src/sim/injury-state';
import { resolveUnarmoredBullet } from '../src/sim/bullet-impact';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization';
import { stepWorld } from '../src/sim/engine';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots';
import { SCHEMA_VERSION } from '../src/sim/types';

function infected(){
  const w=medicalCamp(1),p=w.pawns[0]!;
  p.health={...createMedicalRecord(w.tick),infections:{nextId:3,immunity:250_000_000,cases:[
    {id:1,part:'left-arm',bornAt:w.tick-2,severity:330_000_000,luck:970_000,tend:{quality:800,expiresAtCore:w.tick*10+37500}},
    {id:2,part:'right-arm',bornAt:w.tick-1,severity:100_000_000,luck:1_030_000},
  ]}};
  controlledInjury(w,p,'torso',9000,'gunshot');
  p.health.injuries[0]!.infection={dueCore:w.tick*10+15001,roomFactor:1000};
  return w;
}

test('V80 validates before neutral migration; no risk or immunity invented on old wounds',()=>{
  const old:any=withoutFoodCrops(medicalCamp(1));controlledInjury(old,old.pawns[0],'torso',9000,'gunshot');old.schemaVersion=80;
  const original=structuredClone(old),restored=deserializeWorld(JSON.stringify(old));
  expect(restored).toEqual({...original,schemaVersion:SCHEMA_VERSION});expect(restored.pawns[0]!.health!.infections).toBeUndefined();
  for(const mutate of [(w:any)=>w.pawns[0].health.infections={nextId:2,immunity:0,cases:[]},
    (w:any)=>w.pawns[0].health.injuries[0].infection={dueCore:w.tick*10+15000,roomFactor:1000},
    (w:any)=>w.pawns[0].health.bloodLoss=-1]){
    const broken=structuredClone(old);mutate(broken);expect(()=>deserializeWorld(JSON.stringify(broken))).toThrow(/version 80/);
  }
});

test('infection state is owned transactionally, snapshots and save continuation are exact, corruptions refused',()=>{
  const w=infected();expect(validateWorld(w)).toEqual([]);
  const saved=serializeWorld(w),r=deserializeWorld(saved);
  const result=resolveUnarmoredBullet(w.pawns[0]!.health!,{part:'left-arm',damage:100},()=>.999999);
  expect(result.record.infections!.cases.some(c=>c.part==='left-arm')).toBe(false);
  expect(serializeWorld(w)).toBe(saved); // Purging the copied limb may not mutate the original record.
  const enc=new SnapshotEncoder(),dec=new SnapshotDecoder();dec.adopt(structuredClone(enc.encode(w,0,1)));
  stepWorld(w,120);stepWorld(r,120);expect(serializeWorld(w)).toBe(serializeWorld(r));
  const adopted=dec.adopt(structuredClone(enc.encode(w,0,1)));expect(adopted.status).toBe('applied');
  if(adopted.status==='applied')expect(adopted.world).toEqual(w);
  const mutations:Array<(h:any)=>void>=[
    h=>h.infections.nextId=2,h=>h.infections.immunity=1_000_000_001,h=>h.infections.immunity=.5,
    h=>h.infections.cases[1].part='left-arm',h=>h.infections.cases.reverse(),h=>h.infections.cases[0].part='skull',
    h=>h.infections.cases[0].bornAt=w.tick+1,h=>h.infections.cases[0].luck=0,h=>h.infections.cases[0].severity=0,
    h=>h.infections.cases[0].tend.quality=1301,h=>h.infections.cases[0].tend.expiresAtCore=w.tick*10+45000,
    h=>h.infections.unknown=0,h=>h.infections.cases[0].part='<script>',h=>h.injuries[0].infection.roomFactor=-1,
    h=>h.injuries[0].infection.dueCore=h.tick*10,h=>h.injuries[0].infection.dueCore=h.injuries[0].bornAt*10+14999,
    h=>h.injuries[0].infection.dueCore=w.tick*10+45001,h=>h.injuries[0].bornAt=0,
  ];
  for(const mutate of mutations){const broken=JSON.parse(saved);mutate(broken.pawns[0].health);expect(()=>deserializeWorld(JSON.stringify(broken))).toThrow();}
});
