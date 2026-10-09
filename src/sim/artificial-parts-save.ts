import {HUMAN_MODEL,modelHasPart} from './body-model.ts';
import {isWithinPart} from './injury-rules.ts';
import {WOODEN_PARTS,isWoodenPartKind,isWoodenPartSite} from './artificial-parts-rules.ts';
import type {ArtificialPart} from './artificial-parts-types.ts';
import type {MedicalRecord} from './injury-types.ts';

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const dense=(v:unknown[])=>Object.keys(v).length===v.length&&Object.keys(v).every((key,index)=>key===String(index));

/** Called after ordinary injury/missing shapes, before physiological replay.
 * Added roots are present; their direct biological children remain absent. */
export function validArtificialParts(record:MedicalRecord,version:number,human=true):boolean {
  const raw=record as unknown as Record<string,unknown>,value=raw.artificialParts;
  if(Object.hasOwn(raw,'artificialParts')&&(version<210||!human||!Array.isArray(value)||!value.length||value.length>4||!dense(value)))return false;
  const parts:ArtificialPart[]=value===undefined?[]:value as ArtificialPart[];
  if(parts.length&&record.infections!==undefined&&(!object(record.infections)||!Array.isArray(record.infections.cases)))return false;
  const sites=new Set<string>();
  for(const part of parts){
    if(!object(part)||Reflect.ownKeys(part).length!==3||Object.keys(part).some(k=>!['part','kind','installedAt'].includes(k))
      ||!isWoodenPartKind(part.kind)||!isWoodenPartSite(part.part)||!WOODEN_PARTS[part.kind].sites.includes(part.part as never)
      ||!integer(part.installedAt,0,record.tick)||sites.has(part.part))return false;
    sites.add(part.part);
    if(parts.some(other=>other!==part&&(!object(other)||!isWoodenPartSite(other.part)
      ||isWithinPart(part.part,other.part,HUMAN_MODEL)||isWithinPart(other.part,part.part,HUMAN_MODEL)))
      ||record.missing.some(m=>isWithinPart(part.part,m.part,HUMAN_MODEL))
      ||record.injuries.some(i=>i.part===part.part?Object.hasOwn(i,'scar')||Object.hasOwn(i,'infection'):isWithinPart(i.part,part.part,HUMAN_MODEL))
      ||record.infections?.cases.some(i=>!object(i)||!modelHasPart(HUMAN_MODEL,i.part)||isWithinPart(i.part,part.part,HUMAN_MODEL)))return false;
    for(const child of HUMAN_MODEL.parts.filter(p=>p.parent===part.part)){
      const marker=record.missing.find(m=>m.part===child.id);
      if(!marker||marker.nonFresh!==true||marker.bornAt!==part.installedAt||Object.hasOwn(marker,'tended'))return false;
    }
  }
  for(const marker of record.missing){
    if(!Object.hasOwn(marker,'nonFresh'))continue;
    if(version<210||!human||marker.nonFresh!==true||Object.hasOwn(marker,'tended'))return false;
    const parent=parts.find(p=>HUMAN_MODEL.byId[marker.part]?.parent===p.part);
    if(parent?marker.bornAt!==parent.installedAt:!isWoodenPartSite(marker.part)||parts.some(p=>isWithinPart(marker.part,p.part,HUMAN_MODEL)))return false;
  }
  return true;
}

/** Sparse new-domain detection also catches explicit undefined/future fields. */
export function hasArtificialPartData(record:unknown):boolean {
  return object(record)&&(Object.hasOwn(record,'artificialParts')
    ||Array.isArray(record.missing)&&record.missing.some(m=>object(m)&&Object.hasOwn(m,'nonFresh')));
}
