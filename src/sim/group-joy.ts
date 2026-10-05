import type { AwayGroup } from './group-capture.ts';
import type { Pawn } from './types.ts';
import { hasMentalBreak } from './mental-state.ts';
import { gainRecreation, type RecreationKind } from './recreation-rules.ts';

export interface GroupJoyContext {tick:number;stationary:boolean;random():number}
/** Ten Core per published tick; no overflow from multiplying a large clock. */
export const groupJoyDue=(person:Pawn,tick:number):boolean=>((tick%125)*10+person.id%1250)%1250<10;

/** Caravan's stationary meditation/social interval, adapted to the delivered
 * solitary/social tolerance categories. It creates no conversation, XP or job. */
export function advanceGroupJoy(group:AwayGroup,c:GroupJoyContext):void {
  if(group.lastPersonalTick!==c.tick)throw Error('Joy precedes group personal frontier');
  if(!c.stationary)return;
  const socialAvailable=group.members.filter(p=>p.state!=='dead'&&p.state!=='downed'&&!p.health?.death&&!hasMentalBreak(p)).length>=2;
  for(const person of group.members){
    if(person.state==='dead'||person.health?.death||!groupJoyDue(person,c.tick))continue;
    const choices:{kind:RecreationKind;weight:number}[]=[];
    for(const kind of ['solitary','social'] as const){
      const joy=person.recreation,weight=Math.max(0,1-joy.tolerance[kind]/100);
      if(!joy.bored[kind]&&weight>0&&(kind!=='social'||socialAvailable))choices.push({kind,weight});
    }
    if(!choices.length)continue;
    let draw=c.random()*choices.reduce((sum,p)=>sum+p.weight,0);
    let choice=choices[choices.length-1]!;
    for(const candidate of choices){draw-=candidate.weight;if(draw<0){choice=candidate;break;}}
    // 4e-5 level/Core × 1250 Core × the local 100-point meter.
    gainRecreation(person.recreation,choice.kind,5);
  }
}
