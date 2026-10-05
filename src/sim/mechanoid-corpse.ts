import { groundCapacity } from './ground-placement.ts';
import { mechaMass } from './mechanoid-health.ts';
import { cancelMelee } from './melee-state.ts';
import { cancelShooting } from './shooting-state.ts';
import type { MedicalRecord } from './injury-types.ts';
import type { MaterialPile,World } from './types.ts';

/** The entire dead mechanical owner, never food or an ordinary generic stack. */
export interface MechanoidCorpseState {
  mechKind:'scyther';health:MedicalRecord;heading?:number;
}
export const mechCorpseMass=(p:MaterialPile):number=>p.mechCorpse?mechaMass(p.mechCorpse):0;

function releaseTargets(w:World,id:number):void {
  for(const p of w.pawns){
    if(p.melee?.order?.targetId===id){cancelMelee(p);p.path=[];}
    if(p.shooting?.order?.targetId===id){cancelShooting(p);p.path=[];}
    if(p.tactics?.targetId===id){p.tactics.targetId=null;p.tactics.post=null;p.tactics.reviewAtCore=0;}
  }
  for(const a of w.wildlife?.animals??[]){
    if(a.threat?.targetId===id)delete a.threat;
    if(a.retaliation?.targetId===id)delete a.retaliation;
  }
  for(const m of w.mechanoids??[])if(m.melee?.order?.targetId===id){cancelMelee(m);m.path=[];}
}

/** A crowded cell retains the dead actor until this same cell becomes usable. */
export function advanceMechanoidCorpses(w:World):void {
  if(w.schemaVersion<194||!w.mechanoids?.length)return;
  const removed=new Set<number>();
  for(const m of w.mechanoids){
    if(m.state!=='dead'||!m.health?.death||(m.motion?.end??0)>w.tick||m.moveCooldown>0
      ||(m.melee?.strike?.untilCore??0)>w.tick*10||w.piles.length>=32768
      ||groundCapacity(w,m,'scyther-corpse')<1||w.piles.some(p=>p.id===m.id))continue;
    w.piles.push({id:m.id,kind:'mech-corpse',item:'scyther-corpse',quantity:1,
      owner:{type:'ground',x:m.x,z:m.z},mechCorpse:{mechKind:m.mechKind,health:m.health,heading:m.heading}});
    const group=w.raids?.mechActive;
    if(group?.members.includes(m.id)&&!group.lost.includes(m.id)){group.lost.push(m.id);group.lost.sort((a,b)=>a-b);}
    removed.add(m.id);releaseTargets(w,m.id);
  }
  if(removed.size)w.mechanoids=w.mechanoids.filter(m=>!removed.has(m.id));
}
