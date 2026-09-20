import { isPowerActive } from './power-rules.ts';
import type { ThermalLayout } from './thermal-topology.ts';
import type { CommandResult,Structure,World } from './types.ts';

export interface HeaterState {target:number;high:boolean}
export const newHeaterState=():HeaterState=>({target:21,high:false});
export function adjustHeaterTarget(w:World,id:number,offset:unknown):CommandResult {
  const s=w.structures.find(s=>s.id===id&&s.kind==='heater');
  if(!s?.heater||offset!==null&&(typeof offset!=='number'||![-10,-1,1,10].includes(offset)))return {ok:false,code:'invalid-command',reason:'Réglage de radiateur invalide.'};
  s.heater.target=offset===null?21:Math.max(-273.15,Math.min(1000,s.heater.target+Number(offset)));return {ok:true};
}
/** Same continuous 10-Core-step approximation as the cooler; outdoor air is
 * a reservoir. Reduced efficiency above 20°C reaches zero at 120°C. */
export function applyHeaterHeat(w:World,s:Structure,layout:ThermalLayout):void {
  if(!s.heater)return;s.heater.high=false;
  if(!isPowerActive(s))return;
  const room=w.thermal?.regions[layout.indices[s.z*w.width+s.x]!];if(!room||room.temperature>=s.heater.target)return;
  const energy=21/6*Math.max(0,Math.min(1,(120-room.temperature)/100));if(energy<=0)return;
  room.temperature=Math.min(s.heater.target,room.temperature+energy/room.cells.length);s.heater.high=true;
}
export function validateHeaters(w:World,version:number):string[]{
  const errors:string[]=[];
  for(const s of [...w.structures,...(w.packed??[]).map(p=>p.building),...w.jobs]){
    const h=(s as Structure).heater;
    if(s.kind!=='heater'||'status' in s){if(h!==undefined)errors.push('Unexpected heater state.');continue;}
    if(version<87||!h||typeof h!=='object'||Array.isArray(h)||Object.keys(h).some(k=>!['target','high'].includes(k))||!Number.isFinite(h.target)||h.target < -273.15||h.target>1000||typeof h.high!=='boolean')errors.push('Invalid heater state.');
  }return errors;
}
