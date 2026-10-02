import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotMessage} from '../src/bridge/snapshots.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {medicalCamp} from './scenarios/health.ts';
import {refreshStock} from '../src/sim/materials.ts';

function camp(){
  const w=medicalCamp(2),p=w.pawns[0]!;
  p.x=2;p.z=2;p.hunger=45;p.rest=90;
  for(const pawn of w.pawns){for(const k of Object.keys(pawn.priorities) as (keyof typeof pawn.priorities)[])pawn.priorities[k]=0;pawn.recreation.level=100;}
  w.resources=[];w.structures=[];w.jobs=[];w.piles=[];w.stockpiles=[];w.growingZones=[];
  for(const tile of w.tiles)tile.terrain='soil';
  const food={id:w.nextId++,kind:'food' as const,item:'survival-meal' as const,quantity:3,owner:{type:'ground' as const,x:3,z:2}};
  w.piles.push(food);refreshStock(w);
  expect(applyCommand(w,{type:'scout-start',pawnId:p.id,pileId:food.id,quantity:3}).ok).toBe(true);
  return w;
}

test('V182 every owner transfer reaches snapshots once and preserves prior owned snapshots',()=>{
  const w=camp(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const send=()=>structuredClone(encoder.encode(w,0,1));
  let prior='';let old:ReturnType<SnapshotDecoder['adopt']>|undefined;
  const phases=new Set<string>();
  for(let n=0;n<1600;n++){
    if(old?.status==='applied')expect(JSON.stringify(old.world)).toBe(prior);
    const packet=send(),adopted=decoder.adopt(packet);expect(adopted.status).toBe('applied');
    if(adopted.status!=='applied')throw Error(adopted.status);
    const scout=w.scout;
    if(scout){phases.add(scout.phase);if(scout.phase==='travelling')expect(adopted.world.pawns.some(p=>p.id===scout.pawn.id)).toBe(false);}
    else {expect(phases.has('travelling')).toBe(true);break;}
    old=adopted;prior=JSON.stringify(adopted.world);
    stepWorld(w);
  }
  expect([...phases]).toEqual(['loading','leaving','travelling']);
});

test('V182 malformed off-map metadata refuses a same-tick patch without advancing the decoder',()=>{
  const w=camp();for(let n=0;n<100&&w.scout?.phase!=='travelling';n++)stepWorld(w);
  expect(w.scout?.phase).toBe('travelling');
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const checkpoint=structuredClone(encoder.encode(w,0,1));expect(decoder.adopt(checkpoint).status).toBe('applied');
  const good=structuredClone(encoder.encode(w,0,1));
  for(const mutation of [
    (s:Record<string,unknown>)=>s.returnAt=Number(s.returnAt)+1,
    (s:Record<string,unknown>)=>s.consumed=1,
    (s:Record<string,unknown>)=>s.extra=true,
    (s:Record<string,unknown>)=>(s.pawn as Record<string,unknown>).motion=null,
    (s:Record<string,unknown>)=>((s.items as Record<string,unknown>[])[0]!.owner as Record<string,unknown>).pawnId=999999,
  ]){
    const bad=structuredClone(good);mutation(bad.world.scout as unknown as Record<string,unknown>);
    expect(decoder.adopt(bad as SnapshotMessage).status).toBe('resync');
  }
  expect(decoder.adopt(good).status).toBe('applied');
});

test('V182 malformed loading owner requests resync without committing the packet',()=>{
  const w=camp(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const good=structuredClone(encoder.encode(w,0,1));
  if(good.kind!=='checkpoint')throw Error('Expected checkpoint');
  for(const owner of [null,undefined,'ground']){
    const bad=structuredClone(good);
    (bad.world.piles[0] as unknown as Record<string,unknown>).owner=owner;
    expect(decoder.adopt(bad).status).toBe('resync');
  }
  expect(decoder.adopt(good).status).toBe('applied');
});
