import { describe,expect,it } from 'vitest';
import { advanceBeautyNeeds,BEAUTY_NEED_INTERVAL } from '../src/sim/beauty-need.ts';
import { RoomTopologyCache } from '../src/sim/room-topology.ts';
import { createWorld } from '../src/sim/engine.ts';

describe('besoin de beauté V90',()=>{
  it('échantillonne ensemble et laisse le sommeil figer le besoin',()=>{
    const w=createWorld(90,32,32);w.schemaVersion=90;w.tick=BEAUTY_NEED_INTERVAL;
    const pawn=w.pawns[0]!;pawn.beauty=40;w.piles=[];
    w.structures.push({id:w.nextId++,kind:'dining-chair',x:pawn.x,z:pawn.z+1,orientation:0,footprint:'standard',material:'wood',quality:'normal'});
    advanceBeautyNeeds(w,new RoomTopologyCache().read(w));expect(pawn.beauty).toBeGreaterThan(40);
    const value=pawn.beauty;pawn.state='sleeping';w.tick+=BEAUTY_NEED_INTERVAL;advanceBeautyNeeds(w,new RoomTopologyCache().read(w));expect(pawn.beauty).toBe(value);
  });
});
