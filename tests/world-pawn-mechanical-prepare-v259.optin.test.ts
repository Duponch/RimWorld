import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../src/sim/serialization';
import {registeredMapId,flushRegisteredMap} from '../src/sim/world-map-context';
import {enableCassandraRaids} from '../src/sim/cassandra-raids';
import {createMechanoidRaid} from '../src/sim/mechanoid-raids';
import {raidEntries,atMapEdge} from '../src/sim/raid-space';
import {actualWorldPawnGCReader259} from '../src/sim/world-pawn-mechanical-gc-259';
import {actual259,require259,checkpoint259} from './helpers/fresh-caravan-owners-v259';
import {writeTestFileSync} from './test-output';

/** PREPARED incident, not an acquired natural Cassandra ticket. Reuses ONLY
 * actual259-camp-before-raider from the existing fresh259 run; no new globe,
 * clinical waiting, actor/header/health graft or clock/rate/cadence edit.
 * This preparation and its output have NOT been executed/acquired here. */
test.runIf(process.env.ELSEWHERE_PREPARE_MECHANICAL259==='1')('continues the exact fresh Camp through real mechanical birth and MapRemoved to the next actual GC boundary',()=>{
 const resumeBirth=process.env.ELSEWHERE_MECHANICAL259_PREBIRTH_CHECKPOINT,path=resumeBirth??process.env.ELSEWHERE_MECHANICAL259_CAMP_CHECKPOINT,sha=resumeBirth?process.env.ELSEWHERE_MECHANICAL259_PREBIRTH_CHECKPOINT_SHA256:process.env.ELSEWHERE_MECHANICAL259_CAMP_CHECKPOINT_SHA256;
 if(!path||!sha||!/^[a-f0-9]{64}$/.test(sha))throw Error('Exact actual259-camp-before-raider RAW path and SHA256 required');
 const raw=readFileSync(path,'utf8');if(createHash('sha256').update(raw).digest('hex')!==sha)throw Error('Acquired fresh Camp SHA256 mismatch');
 const root=deserializeCampaign(raw);require259(root);const run=actual259(root),camps=root.worldMaps!.sites.filter(s=>s.kind==='camp');
 if(camps.length!==1||root.worldMaps!.selectedMapId!==camps[0]!.id||root.worldMaps!.sites.filter(s=>s.kind==='settlement').length!==1)throw Error('Expected the exact one-home, one-selected-Camp fresh entry');
 const mapId=camps[0]!.id,map=run.local(mapId),state=root.worldPawns!;
 if(registeredMapId(map)!==mapId||map.width!==200||map.height!==200||map.site?.revision!==3||!map.expeditionSite||!resumeBirth&&map.raids||resumeBirth&&root.tick*10%15000!==14990||map.mechanoids?.length||map.pawns.some(p=>p.raid||p.prisoner)||!map.pawns.some(p=>p.worldAffiliation259?.factionId===root.worldFactions!.playerFactionId))throw Error('Checkpoint must precede the prepared raider and have no replaced incident owner');
 const dueCore=(Math.floor(state.atCore/15000)+1)*15000;
 // The original Camp stays active while the real engine advances at most1499
 // local intervals. Spawn/retirement then occur at the same confirmed frontier;
 // this avoids requiring an unkept WorldPawn to survive a due GC beforehand.
 run.until(()=>root.tick*10===dueCore-10,1499);
 const beforeBirth=checkpoint259(root,'actual259-camp-before-declared-mechanical-preparation');
 if(state.atCore!==dueCore-10||state.currentRate!==1||state.lastSuccessfulCore<Math.floor(state.atCore/15000)*15000||map.raids?.active||map.raids?.mechActive||map.mechanoids?.length)throw Error(`Real preceding GC must already be complete at rate1; no cadence is repaired: ${JSON.stringify({at:state.atCore,rate:state.currentRate,last:state.lastSuccessfulCore,active:!!map.raids?.active,mechanical:!!map.raids?.mechActive})}`);
 // Genuine prospective calendar constructor, then the existing incident
 // constructor at a real reachable map border. No date or opportunity is set.
 // The true local engine may already have adopted its prospective secondary
 // calendar during the wait. Preserve it; never replace its RNG or agenda.
 if(!map.raids)enableCassandraRaids(map,true);const calendar=map.raids;if(!calendar?.mechanoid)throw Error('Real mechanical calendar producer missing');const random={rng:calendar.mechanoid.rng},sites=raidEntries(map,random.rng,1);
 if(!sites)throw Error('Actual Camp has no real mechanical edge entry; no terrain/position retry');
 const group=createMechanoidRaid(map,{budget:150,roster:['scyther']},random,sites);
 if(!group)throw Error('Actual prepared mechanical incident producer refused');
 const original=map.mechanoids!.find(m=>m.id===group.members[0])!;
 expect(atMapEdge(map,original)).toBe(true);expect(original.worldFaction259?.revision).toBe(1);
 expect(root.worldFactions!.factions.some(f=>f.def==='Mechanoid'&&f.id===original.worldFaction259?.factionId)).toBe(true);
 expect(root.tick*10).toBe(dueCore-10);flushRegisteredMap(map);expect(validateWorld(root)).toEqual([]);
 const health=JSON.stringify(original.health),timers=JSON.stringify([original.emp,original.stun,original.stagger]);
 run.command({type:'map-abandon',mapId,confirm:true});
 const matches=state.owners.filter(r=>r.actor.id===original.id);expect(matches).toHaveLength(1);const row=matches[0]!;
 if(row.kind!=='mechanical')throw Error('Real MapRemoved did not transfer the mechanical original');
 expect(row.actor).toBe(original);expect(JSON.stringify(original.health)).toBe(health);expect(JSON.stringify([original.emp,original.stun,original.stagger])).toBe(timers);
 expect(row.originMapId).toBe(mapId);expect(row.mechanicalTimersAtCore259).toBe(dueCore-10);expect(root.worldMaps!.retired.some(s=>s.id===mapId)).toBe(true);
 expect(state.owners.some(r=>r.kind==='human')).toBe(true);expect(state.currentRate).toBe(1);
 expect(actualWorldPawnGCReader259(root).facts(row)).toEqual({keep:[],unknown:[],relatedIds:[],memoryIds:[]});
 const output=checkpoint259(root,'actual259-mechanical-MapRemoved-before-GC'),outputSha=createHash('sha256').update(output).digest('hex');
 expect(serializeCampaign(deserializeCampaign(output))).toBe(output);expect(root.tick*10).toBe(dueCore-10);
 writeTestFileSync('artifacts/caravan-owners-v259/actual259-mechanical-MapRemoved-before-GC-input.json',JSON.stringify({sourceLabel:resumeBirth?'actual259-camp-before-declared-mechanical-preparation':'actual259-camp-before-raider',sourceSha256:sha,preparedBaselineSha256:createHash('sha256').update(beforeBirth).digest('hex'),outputLabel:'actual259-mechanical-MapRemoved-before-GC',outputSha256:outputSha,mapId,mechanicalId:original.id,tick:root.tick,nextActualGCCore:dueCore,preparation:'existing prospective calendar and incident constructors; one scyther at a real edge; immediate actual MapRemoved'},null,2));
},120000);
