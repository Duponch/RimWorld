import {cancelMelee} from './melee-state.ts';
import {cancelShooting} from './shooting-state.ts';
import {cancelMechanoidRanged} from './mechanoid-ranged-state.ts';
import {mutableWorldPawnOriginal256} from './world-pawn-state-256.ts';
import type {World} from './types.ts';

/** DeSpawn ends local target mandates at the physical departure, including
 * targets on a different personal-pass schedule. Busy clocks and edges stay. */
export function prepareDepartureCombat261(w:World,departing:ReadonlySet<number>){
 const has=(id:number|null|undefined)=>id!==null&&id!==undefined&&departing.has(id);
 const key=(value:string|null|undefined)=>!!value&&/^(pawn|animal):/.test(value)&&has(Number(value.slice(value.indexOf(':')+1)));
 const humans=w.pawns.filter(p=>!departing.has(p.id)&&[p.melee?.order?.structure?undefined:p.melee?.order?.targetId,p.melee?.strike?.structure?undefined:p.melee?.strike?.targetId,p.shooting?.order?.targetId,p.tactics?.targetId,p.mental?.crisis?.kind==='berserk'?p.mental.crisis.targetId:undefined].some(has));
 const animals=(w.wildlife?.animals??[]).filter(a=>!departing.has(a.id)&&[a.threat?.targetId,a.retaliation?.targetId,a.predation?.targetId,a.manhunter?.targetId,a.strike?.structure?undefined:a.strike?.targetId,a.hiveJob?.kind==='attack'&&!a.hiveJob.structure?a.hiveJob.targetId:undefined].some(has));
 const mechs=(w.mechanoids??[]).filter(m=>has(m.melee?.order?.structure?undefined:m.melee?.order?.targetId)||has(m.melee?.strike?.structure?undefined:m.melee?.strike?.targetId)||key(m.ranged?.order?.targetKey));
 const turrets=w.structures.filter(s=>key(s.turret?.targetKey));
 const captureParts=():object[]=>[...humans.flatMap(p=>[p,...p.melee?[p.melee,...p.melee.strike?[p.melee.strike]:[]]:[],...p.shooting?[p.shooting]:[],...p.raid?[p.raid]:[],...p.mental?.crisis?[p.mental.crisis]:[]]),...animals.flatMap(a=>[a,...a.strike?[a.strike]:[],...a.manhunter?[a.manhunter]:[]]),...mechs.flatMap(m=>[m,...m.melee?[m.melee,...m.melee.strike?[m.melee.strike]:[]]:[],...m.ranged?[m.ranged]:[],...m.raid?[m.raid]:[]]),...turrets.map(s=>s.turret!)];
 const parts=captureParts();
 if(!parts.every(mutableWorldPawnOriginal256))return {ok:false as const};
 const tick=w.tick,people=w.pawns,fauna=w.wildlife?.animals,machines=w.mechanoids,structures=w.structures,stamp=JSON.stringify([humans,animals,mechs,turrets]);let used=false;
 const recipientsCurrent=()=>{const live=captureParts();return live.length===parts.length&&live.every((p,i)=>p===parts[i]&&mutableWorldPawnOriginal256(p));};
 const current=()=>!used&&w.tick===tick&&w.pawns===people&&w.wildlife?.animals===fauna&&w.mechanoids===machines&&w.structures===structures&&humans.every(p=>w.pawns.includes(p))&&animals.every(a=>w.wildlife?.animals.includes(a))&&mechs.every(m=>w.mechanoids?.includes(m))&&turrets.every(s=>w.structures.includes(s))&&recipientsCurrent()&&JSON.stringify([humans,animals,mechs,turrets])===stamp;
 return {ok:true as const,current,commit(){
  // The caller checks current before its first original write. It then moves
  // its actors and consumes this same sealed plan without replanning.
  if(used)throw Error('Combat departure already committed');used=true;
  for(const p of humans){
   const engaged=has(p.melee?.order?.structure?undefined:p.melee?.order?.targetId)||has(p.shooting?.order?.targetId)||has(p.tactics?.targetId);
   if(has(p.melee?.order?.structure?undefined:p.melee?.order?.targetId))cancelMelee(p);
   if(has(p.shooting?.order?.targetId))cancelShooting(p);
   if(p.melee?.strike&&!p.melee.strike.structure&&has(p.melee.strike.targetId))p.melee.strike.targetId=null;
   if(has(p.tactics?.targetId))delete p.tactics;
   const crisis=p.mental?.crisis;if(crisis?.kind==='berserk'&&has(crisis.targetId)){crisis.targetId=null;crisis.jobUntilCore=null;}
   if(engaged){p.path=[];p.planCooldown=0;if(p.raid)p.raid.goal=null;if(p.state==='moving'&&(p.motion?.end??0)<=w.tick)p.state='idle';}
  }
  for(const a of animals){
   const engaged=[a.threat?.targetId,a.retaliation?.targetId,a.predation?.targetId,a.manhunter?.targetId,a.hiveJob?.kind==='attack'&&!a.hiveJob.structure?a.hiveJob.targetId:undefined].some(has);
   if(has(a.threat?.targetId))delete a.threat;if(has(a.retaliation?.targetId))delete a.retaliation;if(has(a.predation?.targetId))delete a.predation;
   if(a.manhunter&&has(a.manhunter.targetId)){delete a.manhunter.targetId;delete a.manhunter.door;}
   if(a.hiveJob?.kind==='attack'&&!a.hiveJob.structure&&has(a.hiveJob.targetId))delete a.hiveJob;
   if(a.strike&&!a.strike.structure&&has(a.strike.targetId))a.strike.targetId=null;
   if(engaged){a.path=[];a.nextDecision=Math.min(a.nextDecision,w.tick);if(a.state==='moving'&&(a.motion?.end??0)<=w.tick)a.state='idle';}
  }
  for(const m of mechs){
   const engaged=has(m.melee?.order?.structure?undefined:m.melee?.order?.targetId)||key(m.ranged?.order?.targetKey);
   if(has(m.melee?.order?.structure?undefined:m.melee?.order?.targetId))cancelMelee(m);if(key(m.ranged?.order?.targetKey))cancelMechanoidRanged(m);
   if(m.melee?.strike&&!m.melee.strike.structure&&has(m.melee.strike.targetId))m.melee.strike.targetId=null;
   if(engaged){m.path=[];m.planCooldown=0;if(m.raid)m.raid.goal=null;if(m.state==='moving'&&(m.motion?.end??0)<=w.tick)m.state='idle';}
  }
  // An already emitted turret burst keeps its real delay/ammo/cooldown. Its
  // next ordinary shot callback observes the missing target and cannot hit it.
  for(const s of turrets){s.turret!.targetKey=null;s.turret!.warmup=null;}
 }};
}
