import { isPowerActive } from '../sim/power-rules';
import { isPowerTransmitter } from '../sim/power-grid';
import { footprintCells } from '../sim/definitions';
import type { World } from '../sim/types';
import { WORLD_SCALE } from '../world/scale';
import type { Placement } from './primitives';

/** Parts share the prepared furniture batch. Light is a shared field, never
 * a PointLight or shadow map per appliance. */
export function electricalParts(world:World,cutaway=false):Placement[] {
  const out:Placement[]=[];
  const byId=new Map(world.structures.map(s=>[s.id,s]));
  const transmitters=new Set<number>();
  for(const s of world.structures)if(isPowerTransmitter(s.kind))for(const c of footprintCells(s))transmitters.add(c.z*world.width+c.x);
  for(const s of world.structures) {
    const on=isPowerActive(s);
    if(s.kind==='power-conduit') {
      out.push({x:s.x,z:s.z,y:.055,sx:.18,sy:.07,sz:.18,color:0xac8258});
      for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const x=s.x+dx!,z=s.z+dz!;
        if(x<0||z<0||x>=world.width||z>=world.height||!transmitters.has(z*world.width+x))continue;
        out.push({x:s.x+dx!*.25,z:s.z+dz!*.25,y:.06,sx:dx?.55:.085,sy:.055,sz:dz?.55:.085,color:0xa7784d});
      }
    } else if(s.kind==='power-switch') {
      const closed=s.power?.switchOn!==false;
      out.push({x:s.x,z:s.z,y:.13,sx:.67,sy:.26,sz:.67,color:0x67766b},
        {x:s.x,z:s.z,y:.275,sx:.53,sy:.04,sz:.53,color:0x313e39},
        {x:s.x,z:s.z+(closed?.13:-.13),y:.36,sx:.16,sy:.16,sz:.3,color:closed?0x85b982:0xcf9a67});
    } else if(s.kind==='battery') {
      const cells=footprintCells(s),last=cells[cells.length-1]!,x=(s.x+last.x)/2,z=(s.z+last.z)/2,ry=s.orientation*Math.PI/2;
      out.push({x,z,y:.13,sx:.86,sy:.26,sz:1.83,ry,color:0x4b5957},
        {x,z,y:.57,sx:.79,sy:.7,sz:1.69,ry,color:0x7a8d75},
        {x,z,y:.94,sx:.86,sy:.08,sz:1.82,ry,color:0x54655c});
      for(const sign of [-1,1])out.push({x:x+Math.sin(ry)*sign*.58,z:z+Math.cos(ry)*sign*.58,y:1.04,sx:.23,sy:.14,sz:.2,ry,color:sign>0?0xb07152:0xa8b5ae});
    } else if(s.kind==='solar-generator') {
      const x=s.x+1.5,z=s.z+1.5;
      for(const dz of [-1.42,-.47,.47,1.42]) {
        out.push({x,z:z+dz,y:.44,sx:3.83,sy:.12,sz:.85,color:0x768888},
          {x,z:z+dz,y:.515,sx:3.66,sy:.035,sz:.72,color:0x345673});
        for(const dx of [-1.22,0,1.22])out.push({x:x+dx,z:z+dz,y:.2,sx:.09,sy:.4,sz:.64,color:0x536360});
        for(const dx of [-.92,0,.92])out.push({x:x+dx,z:z+dz,y:.538,sx:.025,sy:.009,sz:.72,color:0x82a5b8});
      }
    } else if(s.kind==='cooler') {
      const h=cutaway?WORLD_SCALE.wallCutawayHeight:WORLD_SCALE.wallHeight,ry=s.orientation*Math.PI/2;
      out.push({x:s.x,z:s.z,y:h/2,sx:.94,sy:h,sz:.88,ry,color:0x8d9d98});
      for(const sign of [-1,1])for(const y of [.25,.5,.75])out.push({x:s.x+Math.sin(ry)*.455*sign,z:s.z+Math.cos(ry)*.455*sign,y:y*h,sx:.68,sy:.075,sz:.055,ry,color:sign>0?0x559bb6:0xb77757});
    } else if(s.kind==='standing-lamp') {
      out.push({x:s.x,z:s.z,y:.05,sx:.44,sy:.1,sz:.44,color:0x5f6f6c},
        {x:s.x,z:s.z,y:WORLD_SCALE.lampHeight/2,sx:.08,sy:WORLD_SCALE.lampHeight,sz:.08,color:0x758580},
        {x:s.x,z:s.z,y:WORLD_SCALE.lampHeight,sx:.4,sy:.24,sz:.4,color:on?0xffdfa0:0x8a8d7e},
        {x:s.x,z:s.z,y:WORLD_SCALE.lampHeight+.15,sx:.49,sy:.06,sz:.49,color:0x5f6f6c});
    } else if(s.kind==='wood-generator') {
      const x=s.x+.5,z=s.z+.5;
      out.push({x,z,y:.13,sx:1.85,sy:.26,sz:1.85,color:0x4e615c},
        {x:x-.37,z,y:WORLD_SCALE.generatorHeight/2+.12,sx:.9,sy:WORLD_SCALE.generatorHeight,sz:1.42,color:0x7e8c79},
        {x:x+.45,z:z+.15,y:.63,sx:.54,sy:.76,sz:.96,color:0x596c68},
        {x:x-.37,z:z+.73,y:.57,sx:.56,sy:.39,sz:.045,color:on?0xeb9542:0x514e42},
        {x:x-.37,z:z-.54,y:WORLD_SCALE.generatorHeight+.35,sx:.23,sy:.7,sz:.23,color:0x535e58});
      for(const dx of [-.4,-.1,.2])out.push({x:x+.45,z:z+dx,y:1.06,sx:.62,sy:.055,sz:.095,color:0x9eab97});
    }
  }
  // Consumer leads are visual links to the saved connection, not guessed by
  // proximity. Reconnection changes only this resident furniture batch.
  for(const s of world.structures)if(s.power?.parentId!=null) {
    const parent=byId.get(s.power.parentId);if(!parent)continue;
    const nearest=footprintCells(parent).reduce((a,b)=>(a.x-s.x)**2+(a.z-s.z)**2<=(b.x-s.x)**2+(b.z-s.z)**2?a:b);
    const dx=nearest.x-s.x,dz=nearest.z-s.z,length=Math.hypot(dx,dz);if(!length)continue;
    out.push({x:(s.x+nearest.x)/2,z:(s.z+nearest.z)/2,y:.065,sx:.025,sy:.025,sz:length,ry:Math.atan2(dx,dz),color:0x9d8665});
  }
  return out;
}
