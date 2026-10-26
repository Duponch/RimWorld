import {validCorpseRot} from './corpse-save.ts';
import {validToxicFalloutHistoricalTransport294,type ToxicFalloutRotFacts294} from './toxic-fallout-save-294.ts';

const data=(v:unknown,k:string):unknown=>{
 if(!v||typeof v!=='object')return undefined;const d=Object.getOwnPropertyDescriptor(v,k);
 return d?.enumerable===true&&Object.hasOwn(d,'value')?d.value:undefined;
};
const number=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
const dataRecord=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>{const d=Object.getOwnPropertyDescriptor(v,k)!;return typeof k==='string'&&d.enumerable===true&&Object.hasOwn(d,'value');});

/** Only incoming new rot witnesses need the physical corpse join. Existing
 * unchanged delta originals retain their already admitted predecessor. The
 * same bounded holder walk closes save-era fields and gathers these facts;
 * no terrain/resource/medical-population validation is added to the renderer. */
export function validToxicFalloutTransport294(raw:unknown,version:unknown):boolean {
 try{
  const facts:ToxicFalloutRotFacts294={holders:[],humans:new Map()};
  if(!validToxicFalloutHistoricalTransport294(raw,version,facts))return false;
  const rootTick=data(raw,'tick')??data(data(raw,'world'),'tick')??data(data(raw,'summary'),'tick');
  for(const {rot,holder,actor,tick:ownTick} of facts.holders){
   const tick=ownTick??rootTick;
   if(typeof tick!=='number'||!Number.isFinite(tick)||tick<0)return false;
   let medical:unknown,death:unknown;
   const humanId=data(data(holder,'humanCorpse'),'pawnId');
   const human=actor&&data(actor,'body')===holder?actor:number(humanId)?facts.humans.get(humanId):undefined;
   if(human){
    const body=data(human,'body');medical=data(human,'health');death=data(body,'observedAt');
    if(data(human,'state')!=='dead'||!number(death)||!number(data(data(medical,'death'),'tick'))||Number(data(data(medical,'death'),'tick'))>death)return false;
    if(human!==actor&&(data(body,'pileId')!==data(holder,'id')||data(body,'lostAt')!==undefined))return false;
   }else{
    const corpse=data(holder,'corpse');medical=corpse?data(corpse,'health'):data(holder,'health');death=data(data(medical,'death'),'tick');
    if(!corpse&&data(holder,'state')!=='dead')return false;
   }
   if(!number(death)||!dataRecord(medical)||!validCorpseRot(rot,tick,death,Number(version),medical))return false;
  }
  return true;
 }catch{return false;}
}
