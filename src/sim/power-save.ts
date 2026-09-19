import { isElectrical } from './power-rules.ts';
import { PowerTopologyCache, validPowerParent } from './power-topology.ts';
import type { World } from './types.ts';

export function validatePower(world:World,version:number):string[] {
  const errors:string[]=[],topology=new PowerTopologyCache().read(world);
  for(const s of [...world.structures,...(world.packed??[]).map(p=>p.building)]) {
    const p=s.power,packed=!world.structures.includes(s);
    if(!isElectrical(s.kind)){if(p!==undefined)errors.push('Unexpected power state.');continue;}
    if(version<42||!p||typeof p!=='object'||Array.isArray(p)||typeof p.on!=='boolean'||s.kind!=='cooler'&&s.orientation!==0
      ||s.footprint!=='standard'||s.material!=='steel'||Object.keys(p).some(k=>!['on','parentId'].includes(k))
      ||!(p.parentId===null||Number.isSafeInteger(p.parentId)&&p.parentId>0)) {errors.push('Invalid electrical state.');continue;}
    if(s.kind==='wood-generator'&&p.parentId!==null||packed&&(p.on||p.parentId!==null))errors.push('Invalid power owner.');
    if(s.kind!=='wood-generator'&&(p.on&&p.parentId===null||p.parentId!==null&&!validPowerParent(topology,s,p.parentId)))errors.push('Invalid electrical parent.');
  }
  for(const j of world.jobs)if('power' in j)errors.push('Blueprint cannot supply power.');
  return errors;
}
