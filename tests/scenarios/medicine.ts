import { careCamp } from './care.ts';
import { addMaterial } from '../../src/sim/materials.ts';
import type { MedicineItem } from '../../src/sim/medicine-rules.ts';

export function medicineCamp(pairs=1,size=32,item:MedicineItem='medicine') {
  const w=careCamp(pairs,size);
  for(let i=0;i<pairs;i++){
    const d=w.pawns[i*2]!,p=w.pawns[i*2+1]!;
    p.medicalCare='best';
    addMaterial(w,'medicine',4,{type:'ground',x:d.x+1,z:d.z-1},item);
  }
  return w;
}
