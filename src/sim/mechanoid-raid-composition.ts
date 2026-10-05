import { isMechanoidKind,mechanoidDefinition,type MechanoidKind } from './mechanoid-definition.ts';
import { raidRandom } from './raid-state.ts';
import type { MechanoidRaidComposition } from './mechanoid-raid-state.ts';

export function mechFactionCommonality(points:number):number {
  const curve=[[300,0],[700,1],[1400,1.8],[2800,2.2],[4000,2.6]] as const;
  if(points<=300)return 0;
  for(let i=1;i<curve.length;i++)if(points<=curve[i]![0]){
    const [x,y]=curve[i]!,[px,py]=curve[i-1]!;return py+(y-py)*(points-px)/(x-px);
  }
  return 2.6;
}
export function mechMaxPawnCost(budget:number):number {
  let cap=200;
  if(budget>400)cap=budget<=900?200+(budget-400)*100/500:300+(Math.min(budget,100000)-900)*9700/99100;
  return Math.max(Math.min(cap,budget),132);
}
export const mechanoidRaidCost=(kind:MechanoidKind):number=>mechanoidDefinition(kind).combatPower;
export function validMechanoidComposition(value:unknown,ranged=false):value is MechanoidRaidComposition {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const v=value as Record<string,unknown>,budget=v.budget,roster=v.roster;
  if(Object.keys(v).length!==2||!Object.hasOwn(v,'budget')||!Object.hasOwn(v,'roster')
    ||typeof budget!=='number'||!Number.isFinite(budget)||budget<(ranged?110:150)||budget>10000
    ||!Array.isArray(roster)||!roster.length||roster.length>90||Object.keys(roster).length!==roster.length
    ||roster.some(k=>!isMechanoidKind(k)))return false;
  if(roster.every(k=>k==='scyther'))return budget>=150&&mechMaxPawnCost(budget)>=150&&roster.length===Math.floor(budget/150);
  if(!ranged||roster.some(k=>k==='scyther'))return false;
  const cap=mechMaxPawnCost(budget);let remaining=budget;
  for(const kind of roster){const cost=mechanoidRaidCost(kind);if(cost>remaining||cost>cap)return false;remaining-=cost;}
  return remaining<110;
}
export function chooseMechanoidComposition(budget:number,random:{rng:number},ranged=false):MechanoidRaidComposition|null {
  if(ranged){
    if(!Number.isFinite(budget)||budget<110||budget>10000)return null;
    const envelope=budget<150?181:budget<400?251:281,draw=raidRandom(random)*envelope;
    if(draw>=180&&draw<250&&budget>=150)return {budget,roster:Array.from({length:Math.floor(budget/150)},()=> 'scyther' as const)};
    if(draw<100||draw>=180)return null;
    const roster:MechanoidKind[]=[],cap=mechMaxPawnCost(budget);let remaining=budget;
    while(remaining>=110){
      const options=(['pikeman','lancer'] as const).filter(k=>mechanoidRaidCost(k)<=remaining&&mechanoidRaidCost(k)<=cap);
      if(!options.length)break;
      // P110/L190 ratio exceeds .5 when both are affordable: the Core cost
      // weight curve is then1 and each XML selection weight is10.
      const selected=options[Math.min(options.length-1,Math.floor(raidRandom(random)*options.length))]!;
      roster.push(selected);remaining-=mechanoidRaidCost(selected);
    }
    return roster.length?{budget,roster}:null;
  }
  if(!Number.isFinite(budget)||budget<150||budget>10000||mechMaxPawnCost(budget)<150)return null;
  const envelope=budget<400?251:281,draw=raidRandom(random)*envelope;
  // all100/ranged80 are absent; only melee70 is implemented. No fallback.
  if(draw<180||draw>=250)return null;
  return {budget,roster:Array.from({length:Math.floor(budget/150)},()=> 'scyther' as const)};
}
