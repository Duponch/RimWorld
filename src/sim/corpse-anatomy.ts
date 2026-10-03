import type { BodyPartId } from './body-definition.ts';
import { animalBodyModel,modelHasPart } from './body-model.ts';
import { adultAgeTicks,bodySizeAtAge } from './animal-life.ts';
import { isWithinPart } from './injury-rules.ts';
import type { CorpseState } from './corpses.ts';

/** Post-mortem absence is separate from the frozen medical history. */
export interface ConsumedPart {part:BodyPartId;atTick:number}
export interface CorpseConsumption {consumesWhole:boolean;consumedParts?:ConsumedPart[]}
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;

export function corpsePartAbsent(corpse:CorpseState,part:BodyPartId):boolean {
  const model=animalBodyModel(corpse.species);
  return !modelHasPart(model,part)||corpse.health.missing.some(m=>isWithinPart(part,m.part,model))
    ||!!corpse.consumedParts?.some(m=>isWithinPart(part,m.part,model));
}

/** Exclusive contributions count descendants once, including internal organs
 * contained by an edible external part. Wounds do not reduce nutrition. */
export function corpseCoverage(corpse:CorpseState,part:BodyPartId='torso'):number {
  const model=animalBodyModel(corpse.species);
  if(!modelHasPart(model,part)||corpsePartAbsent(corpse,part))return 0;
  return model.parts.reduce((sum,p,index)=>sum+(isWithinPart(p.id,part,model)&&!corpsePartAbsent(corpse,p.id)?model.coverage[index]!:0),0);
}

export function corpsePartNutrition(corpse:CorpseState,part:BodyPartId):number {
  return 5.2*bodySizeAtAge(corpse.species,corpse.ageTicks??adultAgeTicks(corpse.species))*corpseCoverage(corpse,part);
}

/** Freshness, ownership, diet and physical access belong to the caller. Core's
 * nearest-nutrition selection keeps the first anatomical tie without RNG. */
export function selectCorpsePart(corpse:CorpseState,wanted:number):{part:BodyPartId;nutrition:number;consumesWhole:boolean}|null {
  if(!Number.isFinite(wanted)||wanted<0)return null;
  let selected:ReturnType<typeof selectCorpsePart>=null,best=Infinity;
  for(const part of animalBodyModel(corpse.species).parts){
    if(part.depth!=='outside'||part.conceptual||corpsePartAbsent(corpse,part.id))continue;
    const nutrition=corpsePartNutrition(corpse,part.id),distance=Math.abs(nutrition-wanted);
    if(nutrition>.001&&distance<best){selected={part:part.id,nutrition,consumesWhole:part.id==='torso'};best=distance;}
  }
  return selected;
}

/** Shared strict shape/date check. The owning save validator supplies World.tick;
 * the pure projection supplies its prospective contact tick. */
export function validCorpseConsumption(corpse:CorpseState,tick=Number.MAX_SAFE_INTEGER):boolean {
  const entries:unknown=corpse.consumedParts;
  if(entries===undefined)return true;
  const death=corpse.health.death?.tick,model=animalBodyModel(corpse.species);
  if(!integer(tick)||!integer(death,0,tick)||!Array.isArray(entries)||!entries.length||entries.length>model.parts.length)return false;
  const roots:BodyPartId[]=[];
  for(const entry of entries){
    if(!entry||typeof entry!=='object'||Array.isArray(entry)||Object.keys(entry).some(k=>k!=='part'&&k!=='atTick'))return false;
    const {part,atTick}=entry as Record<string,unknown>;
    if(!modelHasPart(model,part)||part==='torso'||model.byId[part].depth!=='outside'||model.byId[part].conceptual||!integer(atTick,death,tick)
      ||corpse.health.missing.some(m=>isWithinPart(part,m.part,model))
      ||roots.some(root=>isWithinPart(part,root,model)||isWithinPart(root,part,model)))return false;
    roots.push(part);
  }
  return true;
}

/** Project only the future absence. No injury, physiological clock, death,
 * thermal age or source array is mutated, and nothing is committed here. */
export function projectCorpseConsumption(corpse:CorpseState,part:BodyPartId,tick:number):CorpseConsumption|null {
  const model=animalBodyModel(corpse.species),death=corpse.health.death?.tick;
  if(!integer(death)||!integer(tick,death)||!validCorpseConsumption(corpse,tick)||!modelHasPart(model,part)
    ||model.byId[part].depth!=='outside'||model.byId[part].conceptual||corpsePartAbsent(corpse,part)||corpsePartNutrition(corpse,part)<=.001)return null;
  if(part==='torso')return {consumesWhole:true};
  const consumedParts=(corpse.consumedParts??[]).filter(entry=>!isWithinPart(entry.part,part,model)).map(entry=>({...entry}));
  consumedParts.push({part,atTick:tick});
  consumedParts.sort((a,b)=>model.index[a.part]-model.index[b.part]);
  return {consumesWhole:false,consumedParts};
}
