import { modelHasPart,type BodyModel } from './body-model.ts';
import { injuryPartRules,isWithinPart } from './injury-rules.ts';
import type { MedicalRecord } from './injury-types.ts';

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
const keys=(v:Record<string,unknown>,allowed:readonly string[])=>Object.keys(v).every(k=>allowed.includes(k));

/** Called after ordinary wounds/missing parts are shape-checked. Never upgrades
 * old wounds into new infection candidates while reading a save. */
export function validInfections(record:MedicalRecord,model:BodyModel,allowed:boolean):boolean {
  const now=record.tick*10;
  for(const wound of record.injuries){
    const risk:unknown=wound.infection;if(risk===undefined)continue;
    if(!allowed||!object(risk)||!keys(risk,['dueCore','roomFactor'])||!['cut','crush','gunshot','bite'].includes(wound.kind)
      ||injuryPartRules(model)[wound.part].solid||!integer(risk.dueCore,record.death?1:now+1,wound.bornAt*10+45000)
      ||!integer(risk.roomFactor,200,1000)||wound.tended===undefined&&risk.roomFactor!==1000)return false;
    // Crush refreshes bornAt when wounds merge, without renewing its exposure.
    if(wound.kind!=='crush'&&risk.dueCore<wound.bornAt*10+15000)return false;
  }
  const state:unknown=record.infections;if(state===undefined)return true;
  if(!allowed||!object(state)||!keys(state,['nextId','cases','immunity'])||!integer(state.nextId,2)
    ||!integer(state.immunity,0,1_000_000_000)||!Array.isArray(state.cases)||state.cases.length>model.parts.length)return false;
  const parts=new Set<string>();let previousId=0,previousBorn=0;
  for(const c of state.cases){
    if(!object(c)||!keys(c,['id','part','bornAt','severity','luck','tend'])||!integer(c.id,previousId+1,state.nextId-1)
      ||!integer(c.bornAt,previousBorn,record.tick)||!modelHasPart(model,c.part)||model.byId[c.part].conceptual||injuryPartRules(model)[c.part].solid
      ||parts.has(c.part)||record.missing.some(m=>isWithinPart(c.part as typeof m.part,m.part,model))
      ||!integer(c.severity,1,1_000_000_000)||!integer(c.luck,800_000,1_200_000))return false;
    previousId=c.id;previousBorn=c.bornAt;parts.add(c.part);
    if(c.tend!==undefined&&(!object(c.tend)||!keys(c.tend,['quality','expiresAtCore'])||!integer(c.tend.quality,0,1300)
      ||!integer(c.tend.expiresAtCore,c.bornAt*10+37500,now+44999)))return false;
  }
  return true;
}
