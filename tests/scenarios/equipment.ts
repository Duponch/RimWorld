import { medicalCamp } from './health.ts';
import { addMaterial } from '../../src/sim/materials.ts';
export function equipmentCamp(count=2,size=32){
  const w=medicalCamp(count,size);w.piles=[];
  for(const [i,p] of w.pawns.entries())Object.assign(p,{x:3+i,z:5});
  addMaterial(w,'weapon',1,{type:'ground',x:12,z:5},'revolver');
  return w;
}
