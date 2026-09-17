import type { ItemId } from './items.ts';
import type { Pawn } from './types.ts';

export const MEDICINES=Object.freeze({
  'herbal-medicine':Object.freeze({potency:.6,maxQuality:.7}),
  medicine:Object.freeze({potency:1,maxQuality:1}),
  'glitterworld-medicine':Object.freeze({potency:1.6,maxQuality:1.3}),
});
export type MedicineItem=keyof typeof MEDICINES;
export type MedicalCare='none'|'dry'|'herbal'|'industrial'|'best';
export const MEDICAL_CARE:Readonly<Record<MedicalCare,string>>=Object.freeze({none:'Aucun soin',dry:'Soins sans médicament',herbal:'Plantes médicinales ou inférieur',industrial:'Médicaments industriels ou inférieur',best:'Meilleurs médicaments disponibles'});
export const isMedicine=(item:ItemId):item is MedicineItem=>typeof item==='string'&&Object.hasOwn(MEDICINES,item);
/** Sparse absence preserves the historical permission and dry-care ceiling. */
export const medicalCare=(pawn:Pawn):MedicalCare=>pawn.careDisabled?'none':pawn.medicalCare??'dry';
export function medicineAllowed(pawn:Pawn,item:MedicineItem):boolean {
  const care=medicalCare(pawn);
  return care==='best'||care==='industrial'&&MEDICINES[item].potency<=1||care==='herbal'&&MEDICINES[item].potency<=.6;
}
export function tendQuality(stat:number,random:number,self=false,item?:MedicineItem):number {
  const rule=item?MEDICINES[item]:{potency:.3,maxQuality:.7};
  return Math.round(Math.max(0,Math.min(rule.maxQuality,Math.min(rule.maxQuality,stat*rule.potency*(self ? .7 : 1))+random*.5-.25))*1000);
}
export const tendXp=(item?:MedicineItem):number=>Math.round(500000*Math.max(.5,Math.min(1,(item?MEDICINES[item].potency:.3)*.7)));
export interface TendMedicine {item:MedicineItem;sourcePileId:number;carryPileId:number|null;quantity:number}
