import type {Structure} from '../sim/types';
import type {GeyserWorld256} from '../sim/local-geyser-state-256';
import type {Placement} from './primitives';

export const GEOTHERMAL_VENT_264=Object.freeze({x:2.5,y:2.72,z:2.5});
/** Authored opaque machinery in the existing furniture batch. All bounds stay
 * inside the fixed 6×6 footprint; no actor, scene, material or moving rotor. */
export function geothermalParts264(s:Structure):Placement[] {
  if(s.kind!=='geothermal-generator')return [];
  const out:Placement[]=[],x=s.x+2.5,z=s.z+2.5;
  const box=(dx:number,y:number,dz:number,sx:number,sy:number,sz:number,color:number)=>out.push({key:s.id,targetId:s.id,x:x+dx,y,z:z+dz,sx,sy,sz,color});
  box(0,.09,0,5.88,.18,5.88,0x586a65);
  box(0,.25,0,5.55,.14,5.55,0x81948a);
  box(0,.53,0,3.18,.44,3.18,0xaab6a2);
  box(0,1.22,0,2.72,.94,2.72,0x8d9e8d);
  box(0,1.78,0,3.02,.18,3.02,0x586e68);
  box(0,2.04,0,2.02,.34,2.02,0xb8c2aa);
  box(0,2.32,0,1.52,.22,1.52,0x788e84);
  box(0,2.52,0,1.06,.18,1.06,0x526962);
  box(0,2.64,0,1.22,.12,1.22,0x9bad9f);
  box(0,2.705,0,.81,.01,.81,0x324f4c);
  for(const side of [-1,1]){
    box(side*2.13,.72,0,1.05,.8,3.86,0x6a8078);
    box(side*2.13,1.17,0,1.13,.1,4,0xabb9a4);
    for(const dz of [-1.5,-1,-.5,0,.5,1,1.5])box(side*2.13,1.25,dz,.96,.08,.12,0x4b6762);
    box(0,.53,side*2.13,3.5,.42,.42,0x697d75);
    for(const dx of [-1.35,0,1.35])box(dx,.78,side*2.13,.2,.12,.56,0x9fac98);
  }
  box(0,1.12,1.38,.78,.35,.06,0x385a54);
  box(0,1.12,1.418,.57,.13,.025,0xadc2a3);
  return out;
}

/** Derived once during adoption. Persisted geyser identity and exact original
 * anchor must agree, so a stale association can never hide another owner. */
export function harvestedGeyserIds264(world:Pick<GeyserWorld256,'geysers'|'structures'>):Set<number> {
  const candidates=new Map<number,Structure>();
  for(const s of world.structures)if(s.kind==='geothermal-generator'&&s.geothermal)candidates.set(s.geothermal.geyserId,s);
  const ids=new Set<number>();
  for(const g of world.geysers?.items??[]){const s=candidates.get(g.id);if(s&&s.x+2===g.x&&s.z+2===g.z)ids.add(g.id);}
  return ids;
}
/** Only confirmed phase controls emission. Power, EMP and mechanical faults
 * intentionally do not stop geothermal steam. No World reads during present. */
export function geothermalSteam264(s:Structure):boolean {
  return s.kind==='geothermal-generator'&&(s.geothermal?.sprayTicksLeft??0)>0;
}
