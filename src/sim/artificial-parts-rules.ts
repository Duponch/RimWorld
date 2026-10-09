import { BODY_PARTS,type BodyPartId } from './body-definition.ts';
import type { MedicalRecord } from './injury-types.ts';
import type { ArtificialPart,WoodenPartKind,WoodenPartSite } from './artificial-parts-types.ts';

/** Work is in Core units, shared with SurgeryTask.progress (ten per local tick
 * at neutral speed). Wooden parts are made directly from one physical log. */
export const WOODEN_PARTS:Readonly<Record<WoodenPartKind,{label:string;sites:readonly WoodenPartSite[];efficiency:number;work:number;medicineSkill:number}>>=Object.freeze({
  'peg-leg':{label:'Jambe de bois',sites:['left-leg','right-leg'],efficiency:.6,work:1500,medicineSkill:3},
  'wooden-hand':{label:'Main en bois',sites:['left-hand','right-hand'],efficiency:.6,work:1500,medicineSkill:3},
  'wooden-foot':{label:'Pied en bois',sites:['left-foot','right-foot'],efficiency:.8,work:1000,medicineSkill:3},
});
export const isWoodenPartKind=(value:unknown):value is WoodenPartKind=>typeof value==='string'&&Object.hasOwn(WOODEN_PARTS,value);
export const isWoodenPartSite=(value:unknown):value is WoodenPartSite=>typeof value==='string'&&['left-leg','right-leg','left-hand','right-hand','left-foot','right-foot'].includes(value);
/** Nearest added root, including the root itself. Children remain anatomically
 * missing: capacity workers alone substitute their artificial ancestor. */
export function artificialPartCovering(record:Pick<MedicalRecord,'body'|'artificialParts'>,part:BodyPartId):ArtificialPart|undefined {
  if(record.body!==undefined||!record.artificialParts?.length)return;
  for(let id:BodyPartId|null=part;id!==null;id=BODY_PARTS[id]?.parent??null){
    const added=record.artificialParts.find(p=>p.part===id);if(added)return added;
  }
}
export const artificialPartEfficiencies=(record:Pick<MedicalRecord,'artificialParts'>):{part:BodyPartId;efficiency:number}[]|undefined=>
  record.artificialParts?.map(p=>({part:p.part,efficiency:WOODEN_PARTS[p.kind].efficiency}));
