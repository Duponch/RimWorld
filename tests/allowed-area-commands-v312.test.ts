import { expect,test } from 'vitest';
import { medicalCamp } from './scenarios/health.ts';
import { applyAllowedAreaCommand,ALLOWED_AREA_COLORS } from '../src/sim/allowed-areas.ts';
import { validAllowedAreaTransport } from '../src/sim/allowed-area-save.ts';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { deserializeWorld,serializeWorld } from '../src/sim/serialization.ts';
import { startTravel } from '../src/sim/movement.ts';
import { addMaterial } from '../src/sim/materials.ts';
import type { AllowedAreaCommand,World } from '../src/sim/types.ts';

function prepared(){
  const w=medicalCamp(2),p=w.pawns[0]!;expect(applyAllowedAreaCommand(w,{type:'allowed-area-create',label:'Village'})?.ok).toBe(true);
  return {w,p,area:w.allowedAreas![0]!};
}
const checkpoint=(w:World)=>new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)));
function exact(w:World){expect(validAllowedAreaTransport(w,223)).toBe(true);expect(deserializeWorld(serializeWorld(w))).toEqual(w);const result=checkpoint(w);expect(result.status).toBe('applied');if(result.status==='applied')expect(result.world).toEqual(w);}

test('create normalizes labels, chooses deterministic color and caps ten without consuming RNG',()=>{
  const w=medicalCamp(),rng=w.rng,id=w.nextId;
  expect(applyAllowedAreaCommand(w,{type:'allowed-area-create',label:'  e\u0301té  '})?.ok).toBe(true);
  expect(w.allowedAreas![0]).toEqual({id,label:'été',color:ALLOWED_AREA_COLORS[0],cells:[]});
  for(let i=1;i<10;i++)expect(applyAllowedAreaCommand(w,{type:'allowed-area-create'})?.ok).toBe(true);
  const full=structuredClone(w);expect(applyAllowedAreaCommand(w,{type:'allowed-area-create'})?.ok).toBe(false);expect(w).toEqual(full);expect(w.rng).toBe(rng);exact(w);
});
test('paint replaces sorted membership, preserves old array and permits overlap, disjoint islands and empty zones',()=>{
  const {w,area}=prepared(),old=area.cells;
  applyAllowedAreaCommand(w,{type:'allowed-area-paint',areaId:area.id,enabled:true,from:{x:3,z:4},to:{x:2,z:3}});
  expect(old).toEqual([]);expect(w.allowedAreas![0]!.cells).toEqual([98,99,130,131]);
  const previous=w.allowedAreas![0]!.cells;
  applyAllowedAreaCommand(w,{type:'allowed-area-paint',areaId:area.id,enabled:true,from:{x:20,z:20},to:{x:20,z:20}});
  expect(previous).toEqual([98,99,130,131]);expect(w.allowedAreas![0]!.cells).toEqual([98,99,130,131,660]);
  applyAllowedAreaCommand(w,{type:'allowed-area-paint',areaId:area.id,enabled:false,from:{x:0,z:0},to:{x:31,z:31}});
  expect(w.allowedAreas![0]!.cells).toEqual([]);exact(w);
});
test('rename and color preserve a live return, path and edge without invoking drop hooks',()=>{
  const {w,p,area}=prepared(),target={x:p.x+1,z:p.z};area.cells=[target.z*w.width+target.x];p.allowedAreaId=area.id;p.allowedAreaReturn={target};p.path=[];p.state='moving';
  expect(startTravel(w,p,target)).toBe(true);const edge=structuredClone(p.motion),intent=structuredClone(p.allowedAreaReturn);let calls=0;
  expect(applyAllowedAreaCommand(w,{type:'allowed-area-settings',areaId:area.id,label:'Hameau',color:0x123456},{preflight(){calls++;return false;},reconcile(){calls++;}})?.ok).toBe(true);
  expect(calls).toBe(0);expect(p.motion).toEqual(edge);expect(p.allowedAreaReturn).toEqual(intent);exact(w);
});
test('paint and assign preflight the future policy against original actors and publish the opaque drop plan once',()=>{
  const {w,p,area}=prepared();p.allowedAreaId=area.id;
  addMaterial(w,'steel',3,{type:'pawn',pawnId:p.id},'steel');p.interruptedCargo=true;
  const before=structuredClone(w);let calls=0;
  const command={type:'allowed-area-paint' as const,areaId:area.id,enabled:true,from:{x:1,z:1},to:{x:1,z:1}};
  expect(applyAllowedAreaCommand(w,command,{preflight(next,actors){expect(next.allowedAreas![0]!.cells).toEqual([33]);expect(actors[0]).toBe(p);expect(w).toEqual(before);calls++;return false;},reconcile(){throw new Error('Rejected preflight published.');}})?.ok).toBe(false);
  expect(w).toEqual(before);expect(calls).toBe(1);
  const plan={drop:'opaque'};
  expect(applyAllowedAreaCommand(w,{type:'assign-allowed-area',pawnId:p.id,areaId:null},{preflight(next,actors){expect(next.pawns.find(q=>q.id===p.id)!.allowedAreaId).toBeUndefined();expect(actors[0]).toBe(p);expect(w).toEqual(before);return plan;},reconcile(real,actors,passed){expect(real).toBe(w);expect(actors[0]).toBe(p);expect(passed).toBe(plan);expect(p.allowedAreaId).toBeUndefined();}})?.ok).toBe(true);
  expect(w.piles).toEqual(before.piles);expect(w.rng).toBe(before.rng);
});
test('assignment interruption clears future return steps while preserving the same-tick physical edge and RNG',()=>{
  const {w,p,area}=prepared(),target={x:p.x+1,z:p.z};area.cells=[target.z*w.width+target.x];p.allowedAreaId=area.id;p.allowedAreaReturn={target};p.state='moving';p.path=[];
  expect(startTravel(w,p,target)).toBe(true);const edge=structuredClone(p.motion),rng=w.rng,position={x:p.x,z:p.z};
  expect(applyAllowedAreaCommand(w,{type:'assign-allowed-area',pawnId:p.id,areaId:null})?.ok).toBe(true);
  expect(p.allowedAreaReturn).toBeUndefined();expect(p.path).toEqual([]);expect(p.motion).toEqual(edge);expect({x:p.x,z:p.z}).toEqual(position);expect(w.rng).toBe(rng);exact(w);
});
test('malformed commands with real actor and zone IDs refuse atomically before callbacks',()=>{
  const {w,p,area}=prepared();const commands:unknown[]=[
    {type:'allowed-area-create',label:''},{type:'allowed-area-create',label:7},{type:'allowed-area-create',extra:true},
    {type:'allowed-area-settings',areaId:area.id},{type:'allowed-area-settings',areaId:area.id,color:0x1000000},
    {type:'allowed-area-settings',areaId:area.id,color:NaN},{type:'allowed-area-settings',areaId:area.id,label:undefined},
    {type:'allowed-area-settings',areaId:area.id,label:'x'.repeat(65)},{type:'allowed-area-delete',areaId:area.id,extra:0},
    {type:'allowed-area-paint',areaId:area.id,enabled:1,from:{x:1,z:1},to:{x:2,z:2}},
    {type:'allowed-area-paint',areaId:area.id,enabled:true,from:{x:-1,z:1},to:{x:2,z:2}},
    {type:'allowed-area-paint',areaId:area.id,enabled:true,from:{x:1.5,z:1},to:{x:2,z:2}},
    {type:'allowed-area-paint',areaId:area.id,enabled:true,from:{x:1,z:1,extra:0},to:{x:2,z:2}},
    {type:'assign-allowed-area',pawnId:p.id,areaId:undefined},{type:'assign-allowed-area',pawnId:p.id,areaId:area.id,extra:true},
    {type:'assign-allowed-area',pawnId:p.id,areaId:w.nextId},
  ];
  for(const c of commands){const before=structuredClone(w);let calls=0;expect(applyAllowedAreaCommand(w,c as AllowedAreaCommand,{preflight(){calls++;return undefined;},reconcile(){calls++;}})?.ok).toBe(false);expect(w).toEqual(before);expect(calls).toBe(0);}
});
test('choosing an empty area is unlimited, retained during draft, and deletion removes only area references',()=>{
  const {w,p,area}=prepared();p.draft={lastActiveTick:w.tick,target:null,queue:[]};
  expect(applyAllowedAreaCommand(w,{type:'assign-allowed-area',pawnId:p.id,areaId:area.id})?.ok).toBe(true);
  const before=structuredClone(w);expect(p.allowedAreaId).toBe(area.id);
  expect(applyAllowedAreaCommand(w,{type:'allowed-area-delete',areaId:area.id})?.ok).toBe(true);
  delete before.allowedAreas;delete before.pawns[0]!.allowedAreaId;expect(w).toEqual(before);exact(w);
});
