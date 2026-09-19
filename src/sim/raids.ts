import { isColonist } from './affiliation.ts';
import { raidEntries,atMapEdge } from './raid-space.ts';
import { raidRandom } from './raid-state.ts';
import { startingPawn } from './starting-pawns.ts';
import { newApparelState } from './apparel-rules.ts';
import { newWeaponState } from './equipment-rules.ts';
import { cancelShooting } from './shooting-state.ts';
import { cancelMelee } from './melee-state.ts';
import { TICKS_PER_DAY,type World,type Pawn } from './types.ts';

const log=(w:World,message:string)=>{w.events.push({tick:w.tick,type:'command',message});if(w.events.length>80)w.events.splice(0,w.events.length-80);};
export function enableRaids(w:World):void {
  if(w.raids)return;const s=w.raids={profile:'camp-raids-v1' as const,rng:((w.seed^0x7a1d068)>>>0)||1,nextCheck:0,serial:0,completed:0,departed:[]};s.nextCheck=w.tick+Math.floor(TICKS_PER_DAY*(3.5+raidRandom(s)*.5));
}
export function stopRaidEngagement(p:Pawn):void {cancelShooting(p);cancelMelee(p);delete p.tactics;p.path=[];if(p.raid)p.raid.goal=null;p.planCooldown=0;}
/** Calendar and group outcomes, once per tick. Pawn controllers own movement. */
export function advanceRaids(w:World):void {
  const s=w.raids;if(!s)return;
  const a=s.active;
  if(a){
    const members=w.pawns.filter(p=>a.members.includes(p.id));
    for(const p of members)if((p.state==='dead'||p.state==='downed')&&!a.lost.includes(p.id))a.lost.push(p.id);a.lost.sort((a,b)=>a-b);
    if(a.phase==='assault'){
      const reason=a.lost.length*1000>=a.members.length*a.lossPermille?'losses':w.tick>=a.deadline?'timeout':!w.pawns.some(p=>isColonist(p)&&p.state!=='dead'&&p.state!=='downed')?'colony-down':undefined;
      if(reason){a.phase='withdraw';a.reason=reason;for(const p of members){p.raid!.exiting=true;stopRaidEngagement(p);}log(w,reason==='losses'?'Les assaillants battent en retraite après leurs pertes.':reason==='timeout'?'Les assaillants abandonnent et cherchent une sortie.':'La défense est tombée. Les assaillants se retirent ; les victimes restent sur place.');}
    }
    if(!members.some(p=>p.state!=='dead'&&p.state!=='downed')){
      s.last={id:a.id,tick:w.tick,reason:a.reason==='colony-down'?'colony-down':s.departed.some(d=>a.members.includes(d.pawnId))?'withdrawn':'defended',killed:members.filter(p=>p.state==='dead').length,downed:members.filter(p=>p.state==='downed').length,escaped:a.members.length-members.length};
      for(const p of members){p.raid!.exiting=true;stopRaidEngagement(p);}
      s.completed++;delete s.active;s.nextCheck=w.tick+Math.floor(TICKS_PER_DAY*(6+raidRandom(s)*2));log(w,'Assaut terminé. Vérifiez les blessés, les stocks et les ouvrages endommagés.');
    }
    return;
  }
  if(s.nextCheck===null||w.tick<s.nextCheck)return;
  const count=s.serial===0?1:2,sites=raidEntries(w,s.rng,count);
  if(!sites||s.serial>=Number.MAX_SAFE_INTEGER||w.nextId>Number.MAX_SAFE_INTEGER-count*3||w.pawns.length+count>w.width*w.height||w.piles.length+count*2>32768||s.departed.length+count>w.width*w.height){s.nextCheck=w.tick+TICKS_PER_DAY/4;return;}
  const id=s.serial+1,generated:Pawn[]=[],piles:World['piles']=[];let next=w.nextId;
  for(let i=0;i<count;i++){
    const p=startingPawn(next++,`Assaillant ${id}.${i+1}`,sites[i]!.x,sites[i]!.z,0,55);p.faction='outlaws';p.raid={group:id,exiting:false,goal:null};p.skills.shooting.level=4;p.skills.melee.level=4;p.foodPolicyId=w.foodPolicies[0]!.id;
    generated.push(p);piles.push({id:next++,kind:'apparel',item:'cloth-shirt',quantity:1,owner:{type:'apparel',pawnId:p.id},apparel:newApparelState('cloth-shirt')});
    if(id>1&&i===0)piles.push({id:next++,kind:'weapon',item:'revolver',quantity:1,owner:{type:'equipment',pawnId:p.id},weapon:newWeaponState()});
  }
  const random={rng:s.rng},deadline=w.tick+2600+Math.floor(raidRandom(random)*1201),lossPermille=400+Math.floor(raidRandom(random)*301);
  w.nextId=next;w.pawns.push(...generated);w.piles.push(...piles);s.rng=random.rng;s.serial=id;s.nextCheck=null;s.active={id,startedAt:w.tick,deadline,lossPermille,members:generated.map(p=>p.id),lost:[],phase:'assault'};
  log(w,`Raid : ${count} assaillant(s) arrive(nt) au bord de la carte et attaque(nt) immédiatement. Mobilisez la défense.`);
}
/** Remove only an actor physically at the boundary, after travel/recovery.
 * Export carried equipment with identity/quality/HP; ground loot stays here. */
export function exitRaider(w:World,p:Pawn):boolean {
  if(!p.raid?.exiting||!atMapEdge(w,p)||p.moveCooldown>0||(p.motion?.end??0)>w.tick||p.melee?.strike||p.shooting?.stance||p.need||p.state==='sleeping'||(p.stun?.untilCore??0)>w.tick*10||p.state==='dead'||p.state==='downed')return false;
  const items=w.piles.filter(i=>(i.owner.type==='apparel'||i.owner.type==='equipment')&&i.owner.pawnId===p.id);
  if(w.piles.some(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id)||p.interruptedCargo||p.equipmentDropPending)return false;
  w.raids!.departed.push({group:p.raid.group,pawnId:p.id,name:p.name,cell:{x:p.x,z:p.z},tick:w.tick,items});w.piles=w.piles.filter(i=>!items.includes(i));w.pawns=w.pawns.filter(q=>q!==p);
  for(const q of w.pawns)if(q.shooting?.order?.targetId===p.id||q.melee?.order?.targetId===p.id||q.tactics?.targetId===p.id){stopRaidEngagement(q);if((q.motion?.end??0)<=w.tick&&q.state==='moving')q.state='idle';}
  log(w,`${p.name} quitte la carte avec son équipement porté.`);return true;
}
