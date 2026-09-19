import { factionOf,isColonist } from './affiliation.ts';
import { pawnBody,medicallyStopped } from './health-rules.ts';
import { updatePawnHealth } from './health.ts';
import { impactSoundSpace } from './impact-sound.ts';
import { carrierOf } from './rescue-state.ts';
import type { Cell,Pawn,World } from './types.ts';

export const isLying=(p:Pawn):boolean=>p.state==='sleeping'||p.state==='resting'||p.state==='downed';
const asleep=(p:Pawn):boolean=>p.state==='sleeping'||!!p.medicalSleep;
/** Only a resting service is released. A pending player queue, bed ownership,
 * captured edge, recovery and emergency cargo keep their identity and timing. */
function wake(world:World,p:Pawn):boolean {
  if(medicallyStopped(p)||carrierOf(world,p.id)||p.need?.kind!=='sleep'||p.need.phase!=='sleep')return false;
  if(p.health&&p.health.tick<world.tick)updatePawnHealth(world,p);
  // Anchoring health can itself cause a fall/death: that also invalidates
  // projectile posture/ownership captures, even though no wake is possible.
  if(medicallyStopped(p))return true;
  p.need=null;delete p.medicalSleep;p.state='idle';p.path=[];p.planCooldown=0;p.needCooldown=0;
  world.events.push({tick:world.tick,type:'need',message:`${p.name} interrompt son repos après un impact.`});
  if(world.events.length>80)world.events.splice(0,world.events.length-80);
  return true;
}
/** One caller-owned combat interval; no cache survives geometry/door mutation.
 * A wake invalidates the caller's shot/posture capture even on a ground miss. */
export function disturbanceEvents(world:World) {
  let audible:ReturnType<typeof impactSoundSpace>|undefined;
  let structures=world.structures;
  const noise=(source:Cell,radius:number,core:number,harmed?:Pawn):boolean=>{
    if(world.schemaVersion<62)return false;
    // Another impact in this same Core interval may have opened an enclosure.
    if(structures!==world.structures){structures=world.structures;audible=undefined;}
    let changed=false;
    for(const p of world.pawns){
      if(medicallyStopped(p)||carrierOf(world,p.id)||harmed&&(isColonist(p)||factionOf(p)!==factionOf(harmed)||!asleep(p)))continue;
      const d=(p.x-source.x)**2+(p.z-source.z)**2;
      if(d>=radius*radius)continue;
      const hearing=Math.min(1,pawnBody(p).capacities.hearing);
      if(!hearing||d>=(radius*hearing)**2||!(audible??=impactSoundSpace(world))(source,p))continue;
      const state=p.disturbance??={sleepUntilCore:0,lieUntilCore:0};state.sleepUntilCore=Math.max(state.sleepUntilCore,core+1000);
      if(asleep(p))changed=wake(world,p)||changed;
    }
    return changed;
  };
  return {
    impact:(cell:Cell,core:number)=>noise(cell,12,core),
    damage:(p:Pawn,core:number,wasLying:boolean):boolean=>{
      if(world.schemaVersion<62)return false;
      let changed=false;
      if(wasLying&&p.state!=='dead'){
        const state=p.disturbance??={sleepUntilCore:0,lieUntilCore:0};state.lieUntilCore=Math.max(state.lieUntilCore,core+400);
        changed=wake(world,p);
      }
      return noise(p,18,core,p)||changed;
    },
  };
}
