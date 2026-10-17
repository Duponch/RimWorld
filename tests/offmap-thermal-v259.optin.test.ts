import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeCampaign,serializeCampaign} from '../src/sim/serialization';
import {groupAmbientTemperature256} from '../src/sim/group-provision-age';
import {groupPawnInterval256} from '../src/sim/group-core-cadence-256';
import {offmapThermalRange259} from '../src/sim/offmap-thermal-259';
import {nextHeatSeverity} from '../src/sim/heat-severity';
import {nextColdSeverity} from '../src/sim/cold-rules';
import {actual259,require259,dropPreparedPetSupplies259,start259,transport259,checkpoint259} from './helpers/fresh-caravan-owners-v259';

/** NON EXECUTED continuation of ROOT's acquired fresh02 tick31 baseline.
 * No new globe, capsule replay, stock, recovery wait or prepared hediff. */
test.runIf(process.env.ELSEWHERE_RUN_OFFMAP_THERMAL259==='1')('the same actual hypothermic original forms and departs, then human/animal true hash60 and real WorldPawn life preserve exact transport',()=>{
 const path=process.env.ELSEWHERE_OFFMAP_THERMAL259_CHECKPOINT??'tmp/test-runs/caravan-owners-v414-fresh02-2026-10-17T17-32-49.893Z-16872/artifacts/caravan-owners-v259/declared-local-stocks-before-first-formation.json';
 const raw=readFileSync(path,'utf8');expect(createHash('sha256').update(raw).digest('hex')).toBe('b4ad25fafdb1f1c5e090dc7ad1591fdf92f7c3c66fdf7a80edd59a00acd452fb');
 const root=deserializeCampaign(raw);require259(root);expect(root.tick).toBe(31);const run=actual259(root),home=run.local(),members=[7,9].map(id=>home.pawns.find(p=>p.id===id)!);
 const pet=home.wildlife!.animals.find(a=>a.id===2389)!;if(members.some(p=>!p)||!pet||pet.species!=='cat')throw Error('Exact acquired original roster is required');
 dropPreparedPetSupplies259(home,pet);expect(members[0]!.health?.hypothermia).toBe(1500000);const medical=members.map(p=>JSON.stringify(p.health)),tick=root.tick;
 const id=start259(run,home,members,50386,[pet.id]);expect(root.tick).toBe(tick);expect(members.map(p=>JSON.stringify(p.health))).toEqual(medical);
 checkpoint259(root,'offmap-thermal-actual31-formation-without-recovery');run.until(()=>!!run.state(id)&&'members'in run.state(id)!,6000);
 const away=run.away(id);expect(away.members).toEqual(expect.arrayContaining(members));expect(away.animalOwners!.members).toContain(pet);
 run.command({type:'group-pause',groupId:id,paused:true});
 // Exactly12 ordinary intervals cover two true hash60 calls per actor. The
 // pause fixes the real current tile for this short comparison, not a climate.
 for(let n=0;n<12;n++){
  const current=run.away(id),people=[...current.members,...current.animalOwners!.members],before=people.map(p=>({p,heat:p.health?.heatstroke??0,cold:p.health?.hypothermia??0,range:offmapThermalRange259(p,current.items)}));
  run.step();const at=root.tick*10,air=groupAmbientTemperature256(root,run.away(id),at);
  for(const b of before){if(typeof b.range==='string')throw Error(b.range);const due=groupPawnInterval256(b.p.id,at,60,10);expect(b.p.health?.heatstroke??0).toBe(due?nextHeatSeverity(b.heat,air,b.range.max):b.heat);expect(b.p.health?.hypothermia??0).toBe(due?nextColdSeverity(b.cold,air,b.range.min,true):b.cold);}
 }
 transport259(run,'offmap-thermal-actual-human-cat-caravan');
 // The real remaining home original8 becomes a WorldPawn. No discarded local
 // map provides its climate; the actual campaign life owner ticks it at21C.
 run.command({type:'map-abandon',mapId:0,confirm:true});const row=root.worldPawns!.owners.find(r=>r.kind==='human'&&r.actor.id===8)!;
 if(!row||row.kind!=='human')throw Error('Real MapRemoved WorldPawn8 missing');
 for(let n=0;n<6;n++){const heat=row.actor.health?.heatstroke??0,cold=row.actor.health?.hypothermia??0,range=offmapThermalRange259(row.actor,row.items);if(typeof range==='string')throw Error(range);run.step();const due=groupPawnInterval256(row.actor.id,root.tick*10,60,10);expect(row.actor.health?.heatstroke??0).toBe(due?nextHeatSeverity(heat,21,range.max):heat);expect(row.actor.health?.hypothermia??0).toBe(due?nextColdSeverity(cold,21,range.min,true):cold);expect(row.clockCore).toBe(root.tick*10);}
 const saved=checkpoint259(root,'offmap-thermal-real-WP21');expect(serializeCampaign(deserializeCampaign(saved))).toBe(saved);
},120000);
