import { RoomQualityCapture,type RoomQuality } from '../sim/room-quality';
import { structureBeauty,filthBeauty,type BeautyCell } from '../sim/room-beauty';
import { daylilyBeauty } from '../sim/flower-pot';
import { structureRoomMarketValue } from '../sim/room-market-value';
import type { RoomTopology } from '../sim/room-topology';
import type { World } from '../sim/types';

/** UI snapshot cache only. SnapshotDecoder replaces tiles on any terrain/floor
 * delta. Dynamic contributors are compared by their actual beauty values, so
 * actor motion, fuel or time alone never rebuilds the inspected enclosure.
 * A local room traversal replaces the old four whole-map beauty arrays. */
export class RoomBeautyInspection {
  private count=0;
  private tiles:World['tiles']|undefined;
  private signature='';
  private capture:RoomQualityCapture|undefined;
  get rebuilds():number {return this.count;}
  read(world:World,topology:RoomTopology,cell:BeautyCell):RoomQuality|null {
    const room=topology.at(cell.x,cell.z);
    if(!room||room.kind!=='space'||room.touchesMapEdge)return null;
    const signature=JSON.stringify([
      world.structures.map(s=>[s.kind,s.x,s.z,s.orientation,s.footprint,structureBeauty(s),structureRoomMarketValue(s),daylilyBeauty(s.flower?.plant)]),
      world.filth?.items.map(f=>[f.x,f.z,filthBeauty(f),f.kind]),
      world.piles.flatMap(p=>p.owner.type==='ground'?[[p.owner.x,p.owner.z,p.kind]]:[]),
      world.packed.flatMap(p=>p.owner.type==='ground'?[[p.owner.x,p.owner.z]]:[]),
      world.resources.flatMap(r=>r.kind==='tree'?[r.z*world.width+r.x]:[]),
      world.jobs.filter(j=>j.construction==='frame').map(j=>[j.kind,j.x,j.z,j.orientation,j.footprint]),world.roofing?.constructed,
    ]);
    if(this.tiles!==world.tiles||this.signature!==signature||this.capture?.topology!==topology){
      this.capture=new RoomQualityCapture(world,topology);this.count++;
      this.tiles=world.tiles;this.signature=signature;
    }
    return this.capture!.room(cell);
  }
}
