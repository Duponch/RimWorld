import { describe,expect,it } from 'vitest';
import { advanceBeautyNeeds,BEAUTY_NEED_INTERVAL,captureWorldBeauty } from '../src/sim/beauty-need.ts';
import { BEAUTY_BAND_LABEL } from '../src/sim/room-beauty.ts';
import { RoomTopologyCache } from '../src/sim/room-topology.ts';
import { createWorld } from '../src/sim/engine.ts';
import { roomCamp } from './scenarios/rooms.ts';

describe('besoin de beauté V90',()=>{
  it('échantillonne ensemble et laisse le sommeil figer le besoin',()=>{
    const w=createWorld(90,32,32);w.tick=BEAUTY_NEED_INTERVAL;
    const pawn=w.pawns[0]!;pawn.beauty=40;w.piles=[];
    w.structures.push({id:w.nextId++,kind:'dining-chair',x:pawn.x,z:pawn.z+1,orientation:0,footprint:'standard',material:'wood',quality:'normal'});
    advanceBeautyNeeds(w,new RoomTopologyCache().read(w));expect(pawn.beauty).toBeGreaterThan(40);
    const value=pawn.beauty;pawn.state='sleeping';w.tick+=BEAUTY_NEED_INTERVAL;advanceBeautyNeeds(w,new RoomTopologyCache().read(w));expect(pawn.beauty).toBe(value);
  });
  it('partage les contributeurs physiques et les libellés avec l’inspection',()=>{
    const w=roomCamp(),topology=new RoomTopologyCache().read(w),pawn={x:13,z:13};
    const room=captureWorldBeauty(w,topology).room(pawn);
    expect(room).not.toBeNull();
    expect(BEAUTY_BAND_LABEL[room!.band]).toMatch(/hideuse|laide|neutre|jolie|belle/);
    w.piles.push({id:w.nextId++,item:'wood',kind:'wood',quantity:1,owner:{type:'ground',x:pawn.x,z:pawn.z}});
    expect(captureWorldBeauty(w,topology).room(pawn)!.total).toBe(room!.total-4);
  });
});
