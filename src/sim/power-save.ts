import { isElectrical,isFlickable,isPowerTrader } from './power-rules.ts';
import { isPowerConnector,isPowerTransmitter } from './power-grid.ts';
import { BATTERY_CAPACITY } from './power-battery.ts';
import { PowerTopologyCache, validPowerParent } from './power-topology.ts';
import type { World } from './types.ts';

export function validatePower(world:World,version:number):string[] {
  const errors:string[]=[],topology=new PowerTopologyCache().read(world);
  for(const s of [...world.structures,...(world.packed??[]).map(p=>p.building)]) {
    const p=s.power,packed=!world.structures.includes(s);
    const battery=s.battery;
    if(s.kind==='battery'){
      if(version<85||!battery||typeof battery!=='object'||Array.isArray(battery)||Object.keys(battery).some(k=>k!=='stored'&&(k!=='half'||version<87))||!Number.isSafeInteger(battery.stored)||battery.stored<0||battery.stored>BATTERY_CAPACITY||battery.half!==undefined&&(battery.half!==true||battery.stored===BATTERY_CAPACITY))errors.push('Invalid battery energy.');
    }else if(battery!==undefined)errors.push('Unexpected battery energy.');
    if(!isElectrical(s.kind)){if(p!==undefined)errors.push('Unexpected power state.');continue;}
    if(version<42||s.kind==='electric-stove'&&version<84||['battery','solar-generator','power-conduit','power-switch'].includes(s.kind)&&version<85||['heater','wind-turbine'].includes(s.kind)&&version<87||!p||typeof p!=='object'||Array.isArray(p)||typeof p.on!=='boolean'||s.kind!=='cooler'&&s.kind!=='electric-stove'&&s.kind!=='battery'&&s.kind!=='wind-turbine'&&s.orientation!==0
      ||s.footprint!=='standard'||s.material!=='steel'||Object.keys(p).some(k=>!['on','parentId',...(version>=85&&isFlickable(s.kind)?['switchOn']:[])].includes(k))
      ||p.switchOn!==undefined&&typeof p.switchOn!=='boolean'||p.switchOn===false&&p.on
      ||!(p.parentId===null||Number.isSafeInteger(p.parentId)&&p.parentId>0)) {errors.push('Invalid electrical state.');continue;}
    if(isPowerTransmitter(s.kind)&&p.parentId!==null||!isPowerTrader(s.kind)&&p.on||packed&&(p.on||p.parentId!==null))errors.push('Invalid power owner.');
    if(isPowerConnector(s.kind)&&(p.on&&p.parentId===null||p.parentId!==null&&!validPowerParent(topology,s,p.parentId)))errors.push('Invalid electrical parent.');
  }
  for(const j of world.jobs)if('power' in j||'battery' in j)errors.push('Blueprint cannot supply power.');
  return errors;
}
