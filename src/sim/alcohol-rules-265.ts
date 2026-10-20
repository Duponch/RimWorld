import type {MedicalRecord} from './injury-types.ts';
import type {Pawn} from './types.ts';
import type {MoodThought} from './mood.ts';
import type {AlcoholState265} from './alcohol-state-265.ts';
import {medicalModel} from './body-model.ts';
import type {BodyPartId} from './body-definition.ts';
const f=Math.fround;
const NO_MODIFIERS_265=Object.freeze({painFactor:1,painOffset:0,consciousnessOffset:0,consciousnessFactor:1,consciousnessMax:Infinity,movingOffset:0,manipulationOffset:0,manipulationFactor:1,partOffsets:Object.freeze([] as {part:'liver'|'brain';offset:number}[]),socialFightFactor:1});
const NO_THOUGHTS_265:readonly MoodThought[]=Object.freeze([]);
export const alcoholStage265=(a:AlcoholState265|undefined):number=>!a||a.high<=0?-1:a.high>=f(.9)?4:a.high>=f(.7)?3:a.high>=f(.4)?2:a.high>=f(.25)?1:0;
export const alcoholWithdrawal265=(a:AlcoholState265|undefined):boolean=>!!a?.addiction&&a.addiction.need<=f(.01);
export function alcoholModifiers265(record:MedicalRecord){
 if(!record.alcohol)return NO_MODIFIERS_265;
 const a=record.alcohol,s=alcoholStage265(a),withdrawal=alcoholWithdrawal265(a),hangover=a.hangover;
 const live=(part:'liver'|'brain')=>{const model=medicalModel(record);for(let id:BodyPartId|null=part;id!==null;id=model.byId[id].parent)if(record.missing.some(m=>m.part===id)||record.artificialParts?.some(p=>p.part===id))return false;return true;};
 const liver=!!a.cirrhosis&&live('liver'),brain=!!a.brainDamage&&live('brain');
 // Hediff_Hangover.Visible hides its medical row, not its capMods.
 return {painFactor:s<0?1:[.9,.8,.5,.3,.1][s]!,painOffset:(s===3?.05:0)+(liver?.15:0),
  consciousnessOffset:(hangover>0?hangover>=f(.4)?-.18:hangover>=f(.15)?-.08:-.03:0)+(withdrawal?-.2:0),
  consciousnessFactor:s===1?.9:s===2?.65:s===3?.5:1,consciousnessMax:s===4?.1:Infinity,
  movingOffset:(s>=2&&s<=3?-.1:s===1?-.05:0)+(withdrawal?-.3:0)+(liver?-.1:0),
  manipulationOffset:s===0?-.02:0,manipulationFactor:withdrawal?.5:1,
  partOffsets:[...(liver?[{part:'liver' as const,offset:-.6}]:[]),...(brain?[{part:'brain' as const,offset:-.5}]:[])],
  socialFightFactor:(s<0?1:[1.5,2.5,4,5,1][s]!)*(withdrawal?2:1)};
}
const highNames=['Alcool : chaleur agréable','Alcool : éméché','Alcool : ivre','Alcool : ivresse avancée','Alcool : perte de conscience'];
export function alcoholThoughts265(pawn:Pawn):readonly MoodThought[]{
 if(!pawn.health?.alcohol)return NO_THOUGHTS_265;
 const a=pawn.health?.alcohol,s=alcoholStage265(a),out:MoodThought[]=[];
 const add=(id:string,label:string,offset:number,description:string)=>out.push({id,label,offset,description,kind:'situation'});
 if(s>=0)add('alcohol-high',highNames[s]!,[10,14,20,26][Math.min(s,3)]!,'Effet de l’alcool réellement consommé ; capacités et risques physiologiques associés.');
 // ThoughtWorker_Hediff uses the actual hediff/stage, even while the medical
 // row's Visible override hides Hangover beneath AlcoholHigh.
 if(a&&a.hangover>0)add('alcohol-hangover','Gueule de bois',a.hangover>=f(.4)?-12:a.hangover>=f(.15)?-6:-3,'Contrecoup de l’ivresse, en cours de récupération.');
 if(alcoholWithdrawal265(a))add('alcohol-withdrawal','Sevrage alcoolique',-35,'Dépendance sans dose suffisante : conscience, déplacement et manipulation réduits.');
 return out;
}
export function alcoholInspection265(pawn:Pawn):string[]{
 const a=pawn.health?.alcohol;if(!a)return [];
 const lines:string[]=[],stage=alcoholStage265(a);
 if(stage>=0)lines.push(`${highNames[stage]} (${Math.round(a.high*100)} %).`);
 if(a.tolerance>0)lines.push(`Tolérance à l’alcool : ${(a.tolerance*100).toFixed(1)} %.`);
 if(a.high===0&&a.hangover>0)lines.push(`Gueule de bois : ${Math.round(a.hangover*100)} %.`);
 if(a.addiction)lines.push(`${alcoholWithdrawal265(a)?'Sevrage alcoolique':'Dépendance à l’alcool'} : besoin ${Math.round(a.addiction.need*100)} %, dépendance ${Math.round(a.addiction.severity*100)} %.`);
 if(a.cirrhosis)lines.push('Cirrhose : foie endommagé durablement.');
 if(a.brainDamage)lines.push('Dommage chimique au cerveau : efficacité réduite.');
 return lines;
}
