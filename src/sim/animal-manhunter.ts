import { carrierOf } from './rescue-state.ts';
import { partMissing } from './injury-state.ts';
import { animalSpecies } from './animal-species.ts';
import { animalBody } from './wildlife-health.ts';
import { isRoomDoor,doorOpenness } from './door-rules.ts';
import { meleeContact } from './melee-space.ts';
import { moveAnimal,type animalNavigation } from './wildlife-navigation.ts';
import { cancelShooting } from './shooting-state.ts';
import { cancelMelee } from './melee-state.ts';
import type { WildAnimal } from './wildlife-state.ts';
import type { World } from './types.ts';

/** Private continuation stream: refusals and anatomical damage never spend it. */
function random(a:WildAnimal):number {
  const m=a.manhunter!;let n=m.rng;n^=n<<13;n^=n>>>17;n^=n<<5;m.rng=n>>>0;return m.rng/4294967296;
}
export function recoverAnimalManhunter(w:World,a:WildAnimal):void {
  if(!a.manhunter)return;
  delete a.manhunter;a.path=[];a.nextDecision=w.tick;
  if(a.state!=='dead'&&a.state!=='downed')a.state=(a.motion?.end??0)>w.tick?'moving':'idle';
  for(const p of w.pawns){
    const shooting=p.shooting?.order?.targetId===a.id&&!!p.shooting.order.auto;
    const melee=p.melee?.order?.targetId===a.id&&(p.melee.order.auto==='draft'||p.melee.order.auto==='response');
    if(shooting)cancelShooting(p);if(melee)cancelMelee(p);
    if(shooting||melee){p.path=[];p.planCooldown=0;if(p.state!=='dead'&&p.state!=='downed')p.state=(p.motion?.end??0)>w.tick?'moving':'idle';}
  }
}
export function startAnimalManhunter(w:World,a:WildAnimal,core=w.tick*10):boolean {
  if(w.schemaVersion<183||!w.wildlife?.animals.includes(a)||a.domestic||a.manhunter||a.retaliation||a.state==='dead'||a.state==='downed'
    ||!Number.isSafeInteger(core)||core<0||core>w.tick*10||animalBody(a).capacities.moving<=0
    ||!animalSpecies(a.species).melee.some(t=>!a.health||!partMissing(a.health,t.sourcePart)))return false;
  a.manhunter={startedAtCore:core,rng:(w.seed^Math.imul(a.id,0x9e3779b1)^core^0x73b914f5)>>>0||1,zeroRestTicks:0};
  delete a.meal;delete a.predation;delete a.exiting;delete a.mating;delete a.flee;delete a.threat;delete a.retaliation;delete a.taming;delete a.sleepUntilCore;
  a.path=[];a.state=(a.motion?.end??0)>w.tick?'moving':'idle';a.nextDecision=w.tick;return true;
}
export function animalManhunterTarget(w:World,a:WildAnimal){
  if(a.manhunter?.exhausted)return;
  const p=w.pawns.find(p=>p.id===a.manhunter?.targetId);
  return p&&p.state!=='dead'&&p.state!=='downed'&&!carrierOf(w,p.id)?p:undefined;
}
/** Once per confirmed tick, including ticks inside a captured movement edge. */
export function advanceAnimalManhunter(w:World,a:WildAnimal,core=w.tick*10):void {
  const m=a.manhunter;if(!m)return;
  if(a.state==='dead'||a.state==='downed'){recoverAnimalManhunter(w,a);return;}
  if(m.door&&(core>=m.door.untilCore||!w.structures.some(s=>s.id===m.door!.targetId&&s.door)))delete m.door;
  if(m.targetId!==undefined&&!animalManhunterTarget(w,a)){delete m.targetId;delete m.door;a.path=[];}
  if(m.exhausted){
    a.path=[];
    if((a.motion?.end??0)<=core/10){recoverAnimalManhunter(w,a);a.state='sleeping';}
    return;
  }
  const age=core-m.startedAtCore;
  // Local hash phases retain the Core 30/150 cadences at clock scale ten.
  if(age>=99999999||age>=10000&&(w.tick+a.id)%3===0&&random(a)<1/600){recoverAnimalManhunter(w,a);return;}
  if((w.tick+a.id)%15!==0)return;
  m.zeroRestTicks=a.rest<.0001?m.zeroRestTicks+150:0;
  if(m.zeroRestTicks<=1000||a.state==='sleeping')return;
  const chance=m.zeroRestTicks<15000?.01:m.zeroRestTicks<30000?.02:m.zeroRestTicks<45000?.03:.04;
  if(random(a)<chance){
    m.exhausted=true;delete m.targetId;delete m.door;a.path=[];
    if((a.motion?.end??0)<=core/10){recoverAnimalManhunter(w,a);a.state='sleeping';}
  }
}
/** No search occurs without the rotating wildlife caller granting its token. */
export function processAnimalManhunter(w:World,a:WildAnimal,nav:ReturnType<typeof animalNavigation>,physical:Uint8Array,takeSearch:()=>boolean):boolean {
  const m=a.manhunter;if(!m)return false;
  if(a.strike||a.stun){a.path=[];a.state='idle';return true;}
  const target=animalManhunterTarget(w,a);
  // Only a previously captured pursuit route can expose a blocking door.
  if(target&&!m.door&&a.path.length){
    let from={x:a.x,z:a.z};
    for(let i=0;i<a.path.length;i++){
      const next=a.path[i]!;
      if(!nav.step(from,next)){
        const door=w.structures.find(s=>s.x===next.x&&s.z===next.z&&isRoomDoor(s.kind)&&s.door&&!s.door.open);
        if(door&&Math.hypot(door.x-a.x,door.z-a.z)<=6){
          m.door={targetId:door.id,remaining:2+Math.floor(random(a)*4),untilCore:w.tick*10+2000+Math.floor(random(a)*2000)};
          a.path=a.path.slice(0,i);
        } else a.path=a.path.slice(0,i);
        break;
      }
      from=next;
    }
  }
  if(m.door){
    const door=w.structures.find(s=>s.id===m.door!.targetId&&isRoomDoor(s.kind));
    if(!door||!door.door||m.door.remaining<=0||door.door.open&&doorOpenness(door,w.tick)>=1-1e-9){delete m.door;a.path=[];a.nextDecision=w.tick+3;return true;}
    if(meleeContact(w,a,door,physical)){a.path=[];a.state='idle';return true;}
    if(!a.path.length&&takeSearch())a.path=nav.humanPursuitRoute(a,[door],physical)?.path??[];
    if(a.path.length)moveAnimal(w,a,nav.step,animalBody(a).capacities.moving);else a.state='idle';return true;
  }
  if(target&&meleeContact(w,a,target,physical)){a.path=[];a.state='idle';return true;}
  const end=a.path.at(-1),review=!target||!end||!meleeContact(w,end,target,physical)||w.tick>=a.nextDecision;
  if(review&&(target&&!end||w.tick>=a.nextDecision)&&takeSearch()){
    const candidates=w.pawns.filter(p=>p.state!=='dead'&&p.state!=='downed'&&!carrierOf(w,p.id));
    // Keep an engaged target when reachable; alternatives reuse the same field.
    const route=nav.humanPursuitRoute(a,target?[target,...candidates.filter(p=>p!==target)]:candidates,physical,!!target);
    if(route){m.targetId=route.targetId;a.path=route.path;}else{delete m.targetId;a.path=[];}
    a.nextDecision=w.tick+25;
  }
  if(a.path.length){if(moveAnimal(w,a,nav.step,animalBody(a).capacities.moving)&&!a.path.length)a.nextDecision=w.tick;}else a.state='idle';return true;
}
