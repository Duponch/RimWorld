import {readFileSync} from 'node:fs';
import {expect,test,vi} from 'vitest';
import {deserializeCampaign,serializeCampaign} from '../src/sim/serialization.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {registeredMap,registeredMaps} from '../src/sim/world-map-context.ts';
import {campaignPresentation} from '../src/sim/secondary-site-presentation.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {prepareActualBattlefieldEntry261} from '../src/sim/caravan-battlefield-entry-261.ts';
import {caravanMapAllowed261} from '../src/sim/caravan-incidents-261.ts';
import {caravanAmbushMapSize261} from '../src/sim/caravan-incident-calculation-261.ts';
import * as chance from '../src/sim/caravan-incident-calculation-261.ts';
import * as manhunter from '../src/sim/caravan-manhunter-261.ts';
import {writeTestFileSync,testOutputPath} from './test-output.ts';
import {admitted261,away261,runtime261,sha261,totals261} from './helpers/caravan-encounter261-acquired.ts';
import type {World} from '../src/sim/types.ts';

const INPUT_SHA='7e3a8c0895cf7d2a41d429a07bfc3868eb511554227f6329b7af27838f9d2a3b';
const NOTICE='Prepared manhunter occurrence only on acquired actual01 RAW999. No Camp/Reform/route replay, random tape, species choice, injected animal/Scaria/pending, healing, combat/victory or reroll. Actual kind selection, climate, current fresh animal producer, PRNG, pending and full Battlefield generator/owners are exercised. Current NPC generation is provisional; no natural MTB or native internal animal-generation stream parity claimed.';
const preparedTest=process.env.TRAVEL261_MANHUNTER_SIM==='1'?test:test.skip;

function checkpoint(root:World,label:string,extra:object={}){
 const path=testOutputPath(`artifacts/caravan261-manhunter/${label}-RAW.json`) as string;
 // Preserve the real diagnostic before admission, including a refused branch.
 writeTestFileSync(path,JSON.stringify(root));admitted261(root);
 const raw=serializeCampaign(root);writeTestFileSync(path,raw);
 writeTestFileSync(path.replace(/-RAW\.json$/,'-receipt.json'),JSON.stringify({path,sha256:sha261(raw),inputSHA256:INPUT_SHA,tick:root.tick,rng:root.rng,nextId:root.nextId,notice:NOTICE,...extra},null,2));
 return raw;
}
function snapshots(root:World){
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
 const full=structuredClone(encoder.encode(root,0,0));expect(full.kind).toBe('checkpoint');expect(full).toHaveProperty('world');
 const first=decoder.adopt(full);expect(first.status).toBe('applied');if(first.status==='applied')expect(first.world).toEqual(campaignPresentation(root));
 const delta=structuredClone(encoder.encode(root,0,0));expect(delta.kind).toBe('delta');
 const second=decoder.adopt(delta);expect(second.status).toBe('applied');if(second.status==='applied')expect(second.world).toEqual(campaignPresentation(root));
}
function uniqueAnimalOwners(root:World,id:number){
 return registeredMaps(root).flatMap(w=>w.wildlife?.animals.filter(a=>a.id===id)??[]).length
  +root.worldGroups!.groups.reduce((n,r)=>n+(r.pending261?.animals.filter(a=>a.id===id).length??0)+('members'in r.state?r.state.animalOwners?.members.filter(a=>a.id===id).length??0:0),0)
  +root.worldPawns!.owners.filter(r=>r.kind==='animal'&&r.actor.id===id).length;
}

preparedTest('acquired999: true manhunter roster/pending, exact pending reload and actual Battlefield spawn retain animal IDs, PRNG and permanent Scaria',()=>{
 const input=process.env.TRAVEL261_MANHUNTER_INPUT;
 if(!input||process.env.TRAVEL261_MANHUNTER_INPUT_SHA256!==INPUT_SHA)throw Error('ROOT must supply exact acquired actual01 RAW02 path and SHA; no fallback');
 const bytes=readFileSync(input,'utf8');expect(sha261(bytes)).toBe(INPUT_SHA);
 let root=deserializeCampaign(bytes);admitted261(root);expect(serializeCampaign(root)).toBe(bytes);
 expect([root.tick,root.rng,root.nextId]).toEqual([999,2577741147,59526]);expect(root.worldGroups!.groups.map(r=>r.state.id)).toEqual([2]);
 const before=root.worldGroups!.groups[0]!,group=away261(before),people=group.members.map(p=>({id:p.id,name:p.name})),goods=group.items.map(p=>structuredClone(p));
 expect([group.tile,group.phase]).toEqual([13323,'at-site']);expect(people.map(p=>p.id)).toEqual([7,8]);expect(before.pending261).toBeUndefined();expect(before.story261).toBeUndefined();
 const allowed=caravanMapAllowed261(root,group.tile);checkpoint(root,'00-exact999-before-occurrence',{allowed});if(!allowed)throw Error('Actual retained tile refuses a caravan incident; no substitute tile/seed');
 let runtime=runtime261(root),producer:undefined|{tile:number;basePoints:number;initialRng:number;resultRng:number;nextId:number;ids:number[]};
 const gate=vi.spyOn(chance,'caravanIncidentOccurs261').mockImplementation((_biome,kind)=>kind==='manhunter-ambush');
 // Spy only: the original producer runs unchanged, including all kind/age/
 // clinical draws. No result, species or animal record is replaced.
 const roster=vi.spyOn(manhunter,'draftManhunterRoster261');
 try{
  try{stepWorld(root,12,undefined,runtime);}catch(error){checkpoint(root,'01-actual-producer-refusal',{error:String(error)});throw error;}
  checkpoint(root,'01-actual-pending-before-admission',{occurrenceKinds:gate.mock.calls.map(c=>c[1])});
  expect(roster).toHaveBeenCalledTimes(1);
  const made=roster.mock.results[0];if(made?.type!=='return'||!made.value)throw Error('True manhunter roster unavailable; no retry or replacement');
  const call=roster.mock.calls[0]!;producer={tile:call[1],basePoints:call[2],initialRng:call[3],resultRng:made.value.rng,nextId:made.value.nextId,ids:made.value.animals.map(a=>a.id)};
  const p=before.pending261;if(p?.kind!=='ambush'||!p.animalAmbush261)throw Error('True manhunter pending absent at the one frontier; no retry');
  expect(p.animals).toBe(made.value.animals);expect(root.rng).toBe(made.value.rng);expect(root.nextId).toBe(made.value.nextId);
 }finally{roster.mockClear();roster.mockRestore();gate.mockClear();gate.mockRestore();}
 if(!producer)throw Error('Actual producer witness absent');
 const pending=before.pending261;if(pending?.kind!=='ambush'||!pending.animalAmbush261)throw Error('Actual animal pending required');
 expect(pending).toMatchObject({decision:'forced',factionId:null,people:[],items:[],packed:[],atCore:10000});expect(pending.animals.length).toBeGreaterThanOrEqual(2);expect(new Set(pending.animals.map(a=>a.species)).size).toBe(1);expect(root.tick).toBe(1000);
 expect(pending.animals.map(a=>a.id)).toEqual(Array.from({length:pending.animals.length},(_,i)=>59526+i));expect(root.nextId).toBe(59526+pending.animals.length);expect(before.story261).toBeUndefined();
 for(const a of pending.animals){expect(uniqueAnimalOwners(root,a.id)).toBe(1);expect(a.health?.scaria261).toBeUndefined();expect(a.manhunter).toBeUndefined();}
 snapshots(root);const pendingRAW=checkpoint(root,'02-real-pending-before-cold-reload',{producer}),pendingRng=root.rng,pendingNextId=root.nextId,pendingAnimals=JSON.stringify(pending.animals);
 // Exercise the real cold-load continuation with this same generated pending.
 // Only one admitted campaign is retained after reassignment.
 root=deserializeCampaign(pendingRAW);admitted261(root);expect(serializeCampaign(root)).toBe(pendingRAW);expect(root.rng).toBe(pendingRng);expect(root.nextId).toBe(pendingNextId);runtime=runtime261(root);
 const record=root.worldGroups!.groups.find(r=>r.state.id===2)!,g=away261(record),p=record.pending261;
 if(p?.kind!=='ambush'||!p.animalAmbush261)throw Error('Original pending lost on cold load');expect(JSON.stringify(p.animals)).toBe(pendingAnimals);
 const originals=p.animals.slice(),travelers=g.members.slice(),inventory=g.items.slice(),size=caravanAmbushMapSize261(travelers.length,originals.length),mapId=root.worldMaps!.nextMapId,beforeGeneration=serializeCampaign(root),progress:unknown[]=[];
 const generator=prepareActualBattlefieldEntry261(root,g.id);let step=generator.next();while(!step.done){progress.push(step.value);step=generator.next();}
 const entry=step.value;expect(serializeCampaign(root)).toBe(beforeGeneration);
 if(entry.status!=='ready'){checkpoint(root,'03-actual-entry-refusal',{phase:entry.phase,reason:entry.reason,progress});throw Error(`Actual Battlefield refused ${entry.phase}: ${entry.reason}; no repair/reroll`);}
 const result=entry.commit();checkpoint(root,'03-actual-entry-or-refusal',{result,progress,producer});expect(result.ok,result.reason).toBe(true);expect(root.tick).toBe(1000);
 const site=root.worldMaps!.sites.find(s=>s.id===mapId)!,map=registeredMap(root,mapId)!;
 expect(site).toMatchObject({tile:13323,kind:'battlefield',createdAt:1000,battlefield261:{kind:'ambush',won:false,factionId:null}});expect(root.worldMaps!.selectedMapId).toBe(mapId);expect([map.width,map.height]).toEqual([size,size]);
 expect(root.worldGroups!.groups.some(r=>r.state.id===2||r.pending261?.animals.some(a=>producer!.ids.includes(a.id)))).toBe(false);
 expect(site.story261).toEqual({revision:1,lastFire:{'manhunter-ambush':10000},lastThreatCore:10000,recent:['manhunter-ambush']});expect(map.raids?.active).toBeUndefined();
 for(const actor of travelers)expect(map.pawns.find(a=>a.id===actor.id)).toBe(actor);for(const item of inventory)expect(map.piles.find(i=>i.id===item.id)).toBe(item);expect(map.pawns.map(a=>({id:a.id,name:a.name}))).toEqual(people);expect(totals261(inventory)).toEqual(totals261(goods));
 const entryWorld=root,animalState=originals.map(a=>{
  expect(map.wildlife!.animals.find(q=>q.id===a.id)).toBe(a);expect(uniqueAnimalOwners(entryWorld,a.id)).toBe(1);expect(a.manhunter).toMatchObject({permanent261:true,startedAtCore:10000,zeroRestTicks:0});expect(a.health?.scaria261).toEqual({manhunterCore:-999999});expect(a.health?.death).toBeUndefined();
  expect(a.x).toBeGreaterThanOrEqual(0);expect(a.x).toBeLessThan(map.width);expect(a.z).toBeGreaterThanOrEqual(0);expect(a.z).toBeLessThan(map.height);expect(Number.isSafeInteger(a.manhunter!.rng)&&a.manhunter!.rng>0).toBe(true);
  return {id:a.id,species:a.species,record:JSON.stringify(a),manhunterRng:a.manhunter!.rng};
 });
 snapshots(root);const complete=checkpoint(root,'04-real-permanent-manhunters-before-exact-reload',{producer,animalIds:producer.ids}),entryRng=root.rng,entryNextId=root.nextId;
 root=deserializeCampaign(complete);admitted261(root);expect(serializeCampaign(root)).toBe(complete);expect([root.tick,root.rng,root.nextId]).toEqual([1000,entryRng,entryNextId]);
 const reloaded=registeredMap(root,mapId)!;for(const saved of animalState){const a=reloaded.wildlife!.animals.find(a=>a.id===saved.id)!;expect(JSON.stringify(a)).toBe(saved.record);expect(a.manhunter?.rng).toBe(saved.manhunterRng);expect(a.manhunter?.permanent261).toBe(true);expect(uniqueAnimalOwners(root,a.id)).toBe(1);}
 snapshots(root);const immutable=serializeCampaign(root);expect(applyCommand(root,{type:'caravan-encounter-choice',groupId:2,choice:'retry'},runtime261(root)).ok).toBe(false);expect(serializeCampaign(root)).toBe(immutable);
 expect(sha261(readFileSync(input,'utf8'))).toBe(INPUT_SHA);checkpoint(root,'05-exact-reload-no-combat-no-time-advanced',{entryRng,entryNextId,animalIds:producer.ids});
},120_000);
