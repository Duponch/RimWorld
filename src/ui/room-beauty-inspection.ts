import { worldBeautyInput } from '../sim/beauty-need';
import { BeautyMapCache,RoomBeautyCapture,structureBeauty,filthBeauty,type BeautyCell,type BeautyRoom } from '../sim/room-beauty';
import type { RoomTopology } from '../sim/room-topology';
import type { World } from '../sim/types';

/** UI snapshot cache only. SnapshotDecoder replaces tiles on any terrain/floor
 * delta. Dynamic contributors are compared by their actual beauty values, so
 * actor motion, fuel and hit points do not rebuild a 250² beauty field. */
export class RoomBeautyInspection {
  private readonly map=new BeautyMapCache();
  private tiles:World['tiles']|undefined;
  private signature='';
  private capture:RoomBeautyCapture|undefined;
  get rebuilds():number {return this.map.rebuilds;}
  read(world:World,topology:RoomTopology,cell:BeautyCell):BeautyRoom|null {
    const room=topology.at(cell.x,cell.z);
    if(!room||room.kind!=='space'||room.touchesMapEdge)return null;
    const input=worldBeautyInput(world);
    const signature=JSON.stringify([
      input.structures.map(s=>[s.x,s.z,structureBeauty(s)]),
      input.filth?.map(f=>[f.x,f.z,filthBeauty(f)]),input.objects,
    ]);
    if(this.tiles!==world.tiles||this.signature!==signature||this.capture?.topology!==topology){
      this.map.invalidateAll();this.capture=new RoomBeautyCapture(this.map.read(input),topology);
      this.tiles=world.tiles;this.signature=signature;
    }
    return this.capture!.room(cell);
  }
}
