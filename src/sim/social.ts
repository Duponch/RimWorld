import { isColonist,distanceSquared } from './affiliation.ts';
import { pawnBody } from './health-rules.ts';
import { carrierOf } from './rescue-state.ts';
import { clearShotSegment,type ShotGrid } from './combat-space.ts';
import { STRUCTURE_SHOT_FILL } from './combat-content.ts';
import { footprintCells } from './definitions.ts';
import { learnSkill } from './skills.ts';
import { addSocialMemory,deepTalkWeight,expireSocialMemories,SOCIAL_LABELS,socialCompatibility,socialImpact,socialRandom,socialSeed,type SocialKind,type SocialState } from './social-state.ts';
import type { Pawn,World } from './types.ts';

const stateFor=(w:World,p:Pawn):SocialState=>p.social??={rng:socialSeed(w.seed,p.id),memories:[]};
export function canSocialize(world:World,pawn:Pawn,initiate:boolean,carried?:ReadonlySet<number>):boolean {
  if(!isColonist(pawn)||pawn.state==='dead'||pawn.state==='downed'||pawn.state==='sleeping'||pawn.medicalSleep||pawn.mental?.crisis||pawn.stun||pawn.shooting||pawn.melee||pawn.flee||pawn.tactics||(carried?carried.has(pawn.id):carrierOf(world,pawn.id)))return false;
  const body=pawnBody(pawn);return body.canBeAwake&&(!initiate||body.capacities.talking>0);
}
/** Full obstacles only: no combat lean, no navigation and no scan of map vegetation.
 * Built lazily for this synchronous interaction pass, never retained after mutation. */
function socialSight(world:World):ShotGrid {
  const blocked=new Set<number>();for(const s of world.structures)if(STRUCTURE_SHOT_FILL[s.kind]>.99&&!(s.kind==='door'&&s.door?.open))for(const c of footprintCells(s))blocked.add(c.z*world.width+c.x);
  return {width:world.width,height:world.height,coverAt:()=>undefined,blocksSight:(x,z)=>world.tiles[z*world.width+x]?.terrain==='rock'||blocked.has(z*world.width+x)};
}
export function goodSocialPosition(world:World,a:Pawn,b:Pawn,grid:ShotGrid=socialSight(world)):boolean {
  return a.id!==b.id&&distanceSquared(a,b)<=36&&!grid.blocksSight(b.x,b.z)&&clearShotSegment(grid,a,b);
}
/** Passive exchanges do not acquire reservations, cancel work or retime an edge. */
export function exchangeSocial(world:World,a:Pawn,b:Pawn,kind:SocialKind,grid?:ShotGrid):boolean {
  if(!world.pawns.includes(a)||!world.pawns.includes(b)||!canSocialize(world,a,true)||!canSocialize(world,b,false)||world.tick-(a.social?.last?.tick??-1000)<12||!goodSocialPosition(world,a,b,grid))return false;
  const sa=stateFor(world,a),sb=stateFor(world,b),impactA=socialImpact(a),impactB=socialImpact(b);
  expireSocialMemories(a,world.tick);expireSocialMemories(b,world.tick);
  addSocialMemory(sa,b.id,kind,world.tick,impactB);addSocialMemory(sb,a.id,kind,world.tick,impactA);
  a.skills.social??={level:0,xp:0,dailyXp:0,passion:0};learnSkill(a.skills.social,(kind==='chitchat'?4:10)*1000,a);
  sa.last={otherId:b.id,kind,tick:world.tick,initiated:true};sb.last={otherId:a.id,kind,tick:world.tick,initiated:false};delete sa.wants;
  world.events.push({tick:world.tick,type:'need',message:`${SOCIAL_LABELS[kind]} entre ${a.name} et ${b.name}.`});if(world.events.length>80)world.events.splice(0,world.events.length-80);
  return true;
}
/** Hash checks: 60 Core ticks; pending attempts retry every 91 Core ticks.
 * Recipients are sampled uniformly among eligible nearby colonists. */
export function advanceSocial(world:World):void {
  let grid:ShotGrid|undefined;
  const carried=new Set(world.pawns.flatMap(p=>p.rescue?.phase==='carry'?[p.rescue.patientId]:[]));
  for(const p of world.pawns){
    expireSocialMemories(p,world.tick);
    if(!canSocialize(world,p,true,carried)){if(p.social)delete p.social.wants;continue;}
    if(p.draft&&p.social)delete p.social.wants;
    const prior=p.social,last=prior?.last?.tick??-1000,pending=!!prior?.wants;
    if(pending?(world.tick*10+p.id)%91>=10:(world.tick+p.id)%6!==0||world.tick<=last+32)continue;
    const s=stateFor(world,p);
    if(!pending&&socialRandom(s)>=60/(p.draft?22000:6600))continue;
    if(world.tick-last<12)continue;
    const candidates=world.pawns.filter(q=>q!==p&&distanceSquared(p,q)<=36&&canSocialize(world,q,false,carried));
    if(candidates.length){grid??=socialSight(world);const eligible=candidates.filter(q=>goodSocialPosition(world,p,q,grid));
      if(eligible.length){const other=eligible[Math.floor(socialRandom(s)*eligible.length)]!,weight=deepTalkWeight(socialCompatibility(world.seed,p.id,other.id));
        if(exchangeSocial(world,p,other,socialRandom(s)<weight/(1+weight)?'deep-talk':'chitchat',grid))continue;
      }
    }
    s.wants=true;
  }
}
