import { naturalLight } from './environment.ts';
import { footprintCells } from './definitions.ts';
import { LocalLightCache } from './local-light.ts';
import { RoomTopologyCache, type RoomSpace, type RoomTopology } from './room-topology.ts';
import type { Cell, Structure, World } from './types.ts';

export type WorkRoomRole='none'|'bedroom'|'barracks'|'workshop'|'dining'|'recreation';
export const ROOM_ROLE_LABEL:Record<WorkRoomRole,string>={none:'Sans spécialisation',bedroom:'Chambre',barracks:'Dortoir',workshop:'Atelier',dining:'Salle à manger',recreation:'Salle de loisirs'};
export interface WorkRoom {
  readonly space:RoomSpace;readonly covered:number;readonly psychologicallyOutdoors:boolean;readonly role:WorkRoomRole;
}
export const lightWorkFactor=(glow:number):number=>.8+.2*Math.min(1,Math.max(0,glow)/.3);
export interface ProductionFactors {light:number;lighting:number;outdoors:number;roomRole:number;station:number;total:number}

/** Read-only decision snapshot. No temperature, beauty, comfort or mood implied. */
export class WorkEnvironment {
  readonly topology:RoomTopology;
  private rooms:ReadonlyMap<number,WorkRoom>;
  private roofs:ReadonlySet<number>;
  private artificial:Float32Array;
  private sky:number;
  constructor(topology:RoomTopology,rooms:ReadonlyMap<number,WorkRoom>,roofs:ReadonlySet<number>,artificial:Float32Array,sky:number){
    this.topology=topology;this.rooms=rooms;this.roofs=roofs;this.artificial=artificial;this.sky=sky;
  }
  room(cell:Cell):WorkRoom|undefined {
    const space=this.topology.at(cell.x,cell.z);return space?.kind==='space'?this.rooms.get(space.id):undefined;
  }
  lightAt(cell:Cell):number {
    if(!this.topology.at(cell.x,cell.z))return 0;
    const index=cell.z*this.topology.width+cell.x;
    return Math.max(this.roofs.has(index)?0:this.sky,this.artificial[index]??0);
  }
  production(station:Structure,worker:Cell):ProductionFactors {
    const room=this.room(station),light=this.lightAt(worker),lighting=lightWorkFactor(light);
    const outdoors=room?.psychologicallyOutdoors ? .8 : 1;
    const roomRole=station.kind==='stonecutter'&&room&&!room.psychologicallyOutdoors&&room.role!=='workshop' ? .8 : 1;
    const base=station.kind==='campfire' ? .5 : 1;
    return {light,lighting,outdoors,roomRole,station:base,total:lighting*outdoors*roomRole*base};
  }
}

/** Caller owned: validates barriers on each useful read, not per pawn/frame.
 * Local glow is rebuilt only on barrier or lit-source changes. Tick and roof
 * coverage affect sky sampling without rerunning the flood. */
export class WorkEnvironmentCache {
  private topology=new RoomTopologyCache();
  readonly localLight=new LocalLightCache();
  read(world:World):WorkEnvironment {
    const topology=this.topology.read(world),roofs=new Set(world.roofing?.constructed??[]);
    const covered=new Map<number,number>(),scores=new Map<number,{beds:number;workshop:number;dining:number;recreation:number}>();
    for(const index of roofs){const room=topology.at(index%world.width,Math.floor(index/world.width));if(room?.kind==='space')covered.set(room.id,(covered.get(room.id)??0)+1);}
    for(const s of world.structures) {
      if(!['bed','stonecutter','table','horseshoes'].includes(s.kind))continue;
      const ids=new Set<number>();for(const cell of footprintCells(s)){const r=topology.at(cell.x,cell.z);if(r?.kind==='space')ids.add(r.id);}
      for(const id of ids){let v=scores.get(id);if(!v){v={beds:0,workshop:0,dining:0,recreation:0};scores.set(id,v);}
        if(s.kind==='bed')v.beds++;else if(s.kind==='stonecutter')v.workshop+=27;else if(s.kind==='table')v.dining+=12;else v.recreation+=7;}
    }
    const rooms=new Map<number,WorkRoom>();
    for(const space of topology.allSpaces()) {
      const count=covered.get(space.id)??0,unroofed=space.cellCount-count;
      const psychologicallyOutdoors=unroofed>=300||space.touchesMapEdge&&unroofed>=space.cellCount*.5;
      const score=scores.get(space.id);let role:WorkRoomRole='none';
      if(!space.touchesMapEdge&&score) {
        // Current beds are single, civilian and adults have no love clusters.
        const values={bedroom:score.beds===1?100000:0,dining:score.dining,recreation:score.recreation,workshop:score.workshop,barracks:score.beds>1?score.beds*100100:0};
        let best=0;for(const candidate of ['bedroom','dining','recreation','workshop','barracks'] as const)if(values[candidate]>best){best=values[candidate];role=candidate;}
      }
      rooms.set(space.id,{space,covered:count,psychologicallyOutdoors,role});
    }
    return new WorkEnvironment(topology,rooms,roofs,this.localLight.read(world,topology),naturalLight(world.tick));
  }
}
