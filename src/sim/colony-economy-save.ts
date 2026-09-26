import { ADAPTATION_INTERVAL, WEALTH_SAMPLE_INTERVAL } from './colony-economy.ts';
import type { World } from './types.ts';

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min:number,max=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
const finite=(v:unknown,min:number,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const keys=(v:Record<string,unknown>,required:string[],optional:string[]=[])=>required.every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>required.includes(k)||optional.includes(k));
export function validateColonyEconomy(world:World,version:number):string[] {
  const e:unknown=world.economy;if(e===undefined)return [];
  const fail=()=>['Invalid colony economy.'];
  if(version<105||!object(e)||!keys(e,['profile','adoptedAt','sampledAt','nextSampleAt','wealth','adaptationDays','nextAdaptAt'],['pendingLosses'])
    ||e.profile!=='colony-prosperity-v1'||!integer(e.adoptedAt,0,world.tick)||!integer(e.sampledAt,e.adoptedAt,world.tick)
    ||e.nextSampleAt!==e.sampledAt+WEALTH_SAMPLE_INTERVAL||!integer(e.nextSampleAt,world.tick+1)
    ||(e.sampledAt-e.adoptedAt)%WEALTH_SAMPLE_INTERVAL!==0||!finite(e.adaptationDays,-60,100)
    ||!integer(e.nextAdaptAt,world.tick+1,world.tick+ADAPTATION_INTERVAL)||(e.nextAdaptAt-e.adoptedAt)%ADAPTATION_INTERVAL!==0)return fail();
  const w=e.wealth;
  const values=['items','structures','floors','pawnsKnown','knownTotal','knownStorytellerWealth'];
  const groups=['unpricedPileIds','unpricedPackedIds','unpricedStructureIds','unpricedPawnIds'];
  if(!object(w)||!keys(w,[...values,...groups,'complete'])||!values.every(k=>finite(w[k],0))||w.pawnsKnown!==0
    ||w.knownTotal!==Number(w.items)+Number(w.structures)+Number(w.floors)+Number(w.pawnsKnown)
    ||w.knownStorytellerWealth!==Number(w.items)+Number(w.pawnsKnown)+(Number(w.structures)+Number(w.floors))*.5)return fail();
  const ids:number[]=[];
  for(const group of groups){const list=w[group];if(!Array.isArray(list)||list.length>world.nextId||!list.every(id=>integer(id,1,world.nextId-1)))return fail();ids.push(...list);}
  // A sparse census may refer to a departed or destroyed object. Identities
  // remain globally monotonic, but need not still exist in the live map.
  if(new Set(ids).size!==ids.length||w.complete!==(ids.length===0))return fail();
  if(e.pendingLosses!==undefined){
    if(!Array.isArray(e.pendingLosses)||!e.pendingLosses.length||e.pendingLosses.length>world.pawns.length)return fail();
    const seen=new Set<number>();
    for(const loss of e.pendingLosses){
      if(!object(loss)||!keys(loss,['pawnId','kind','population'])||!integer(loss.pawnId,1,world.nextId-1)||seen.has(loss.pawnId)
        ||!['downed','died'].includes(String(loss.kind))||!integer(loss.population,loss.kind==='died'?0:1,world.pawns.length))return fail();
      const pawn=world.pawns.find(p=>p.id===loss.pawnId);
      if(!pawn||(pawn.faction??'colony')!=='colony'||pawn.prisoner||pawn.visitor||loss.kind==='died'&&pawn.state!=='dead')return fail();
      seen.add(loss.pawnId);
    }
  }
  return [];
}
