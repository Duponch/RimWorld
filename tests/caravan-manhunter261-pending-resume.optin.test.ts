import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {deserializeCampaign,serializeCampaign} from '../src/sim/serialization.ts';
import {applyCommand} from '../src/sim/engine.ts';
import {registeredMap,registeredMaps} from '../src/sim/world-map-context.ts';
import {campaignPresentation} from '../src/sim/secondary-site-presentation.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {prepareActualBattlefieldEntry261} from '../src/sim/caravan-battlefield-entry-261.ts';
import {caravanAmbushMapSize261} from '../src/sim/caravan-incident-calculation-261.ts';
import {writeTestFileSync,testOutputPath} from './test-output.ts';
import {admitted261,away261,runtime261,sha261,totals261} from './helpers/caravan-encounter261-acquired.ts';
import type {World} from '../src/sim/types.ts';

const INPUT_SHA='1e92b658d8c12492abf5a49f6acf03f25a136b4481ee9afcd7d936f8aceaf480';
const NOTICE='Continuation ONLY of acquired main-and-animal01 real manhunter pending1000. Original occurrence stimulus and real producer are preserved as earlier evidence; no occurrence gate, producer replay, RNG tape, species/health mutation, Camp/route or clock advancement here. True checkpoint payload + delta/Decoder + pending reload, then actual Battlefield generator/owners and permanent Scaria, exact reload. Provisional current animal producer declared; no natural MTB/combat/victory/long clinical proof.';
const preparedTest=process.env.TRAVEL261_MANHUNTER_PENDING_SIM==='1'?test:test.skip;

function checkpoint(root:World,label:string,extra:object={}){
 const path=testOutputPath(`artifacts/caravan261-manhunter-pending/${label}-RAW.json`) as string;
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

preparedTest('acquired real pending1000: checkpoint/delta + exact reload then actual Battlefield permanent animals, no producer replay',()=>{
 const input=process.env.TRAVEL261_MANHUNTER_PENDING_INPUT;
 if(!input||process.env.TRAVEL261_MANHUNTER_PENDING_INPUT_SHA256!==INPUT_SHA)throw Error('ROOT must supply exact acquired main-and-animal01 pending path and SHA; no fallback');
 const bytes=readFileSync(input,'utf8');expect(sha261(bytes)).toBe(INPUT_SHA);
 let root=deserializeCampaign(bytes);admitted261(root);expect(serializeCampaign(root)).toBe(bytes);
 expect([root.tick,root.rng,root.nextId]).toEqual([1000,3427484333,59533]);expect(root.worldGroups!.groups.map(r=>r.state.id)).toEqual([2]);
 const before=root.worldGroups!.groups[0]!,group=away261(before),people=group.members.map(p=>({id:p.id,name:p.name})),goods=group.items.map(p=>structuredClone(p));
 expect([group.tile,group.phase]).toEqual([13323,'at-site']);expect(people.map(p=>p.id)).toEqual([7,8]);expect(totals261(goods)).toEqual({'survival-meal':20,wood:9,silver:7});expect(before.story261).toBeUndefined();
 const pending=before.pending261;if(pending?.kind!=='ambush'||!pending.animalAmbush261)throw Error('Exact real acquired animal pending absent');
 const acquired={source:'main-and-animal01 producer already acquired, not rerun',sourceSHA256:INPUT_SHA,ids:[59526,59527,59528,59529,59530,59531,59532]};
 expect(pending).toMatchObject({decision:'forced',factionId:null,people:[],items:[],packed:[],atCore:10000});expect(pending.animals.map(a=>a.id)).toEqual(acquired.ids);expect(pending.animals.map(a=>a.species)).toEqual(Array(7).fill('arctic-fox'));
 for(const a of pending.animals){expect(uniqueAnimalOwners(root,a.id)).toBe(1);expect(a.health?.scaria261).toBeUndefined();expect(a.manhunter).toBeUndefined();}
 snapshots(root);const pendingRAW=checkpoint(root,'02-real-pending-before-cold-reload',{acquired}),pendingRng=root.rng,pendingNextId=root.nextId,pendingAnimals=JSON.stringify(pending.animals);
 // Exercise the real cold-load continuation with this same generated pending.
 // Only one admitted campaign is retained after reassignment.
 root=deserializeCampaign(pendingRAW);admitted261(root);expect(serializeCampaign(root)).toBe(pendingRAW);expect(root.rng).toBe(pendingRng);expect(root.nextId).toBe(pendingNextId);
 const record=root.worldGroups!.groups.find(r=>r.state.id===2)!,g=away261(record),p=record.pending261;
 if(p?.kind!=='ambush'||!p.animalAmbush261)throw Error('Original pending lost on cold load');expect(JSON.stringify(p.animals)).toBe(pendingAnimals);
 const originals=p.animals.slice(),travelers=g.members.slice(),inventory=g.items.slice(),size=caravanAmbushMapSize261(travelers.length,originals.length),mapId=root.worldMaps!.nextMapId,beforeGeneration=serializeCampaign(root),progress:unknown[]=[];
 const generator=prepareActualBattlefieldEntry261(root,g.id);let step=generator.next();while(!step.done){progress.push(step.value);step=generator.next();}
 const entry=step.value;expect(serializeCampaign(root)).toBe(beforeGeneration);
 if(entry.status!=='ready'){checkpoint(root,'03-actual-entry-refusal',{phase:entry.phase,reason:entry.reason,progress});throw Error(`Actual Battlefield refused ${entry.phase}: ${entry.reason}; no repair/reroll`);}
 const result=entry.commit();checkpoint(root,'03-actual-entry-or-refusal',{result,progress,acquired});expect(result.ok,result.reason).toBe(true);expect(root.tick).toBe(1000);
 const site=root.worldMaps!.sites.find(s=>s.id===mapId)!,map=registeredMap(root,mapId)!;
 expect(site).toMatchObject({tile:13323,kind:'battlefield',createdAt:1000,battlefield261:{kind:'ambush',won:false,factionId:null}});expect(root.worldMaps!.selectedMapId).toBe(mapId);expect([map.width,map.height]).toEqual([size,size]);
 expect(root.worldGroups!.groups.some(r=>r.state.id===2||r.pending261?.animals.some(a=>acquired.ids.includes(a.id)))).toBe(false);
 expect(site.story261).toEqual({revision:1,lastFire:{'manhunter-ambush':10000},lastThreatCore:10000,recent:['manhunter-ambush']});expect(map.raids?.active).toBeUndefined();
 for(const actor of travelers)expect(map.pawns.find(a=>a.id===actor.id)).toBe(actor);for(const item of inventory)expect(map.piles.find(i=>i.id===item.id)).toBe(item);expect(map.pawns.map(a=>({id:a.id,name:a.name}))).toEqual(people);expect(totals261(inventory)).toEqual(totals261(goods));
 const entryWorld=root,animalState=originals.map(a=>{
  expect(map.wildlife!.animals.find(q=>q.id===a.id)).toBe(a);expect(uniqueAnimalOwners(entryWorld,a.id)).toBe(1);expect(a.manhunter).toMatchObject({permanent261:true,startedAtCore:10000,zeroRestTicks:0});expect(a.health?.scaria261).toEqual({manhunterCore:-999999});expect(a.health?.death).toBeUndefined();
  expect(a.x).toBeGreaterThanOrEqual(0);expect(a.x).toBeLessThan(map.width);expect(a.z).toBeGreaterThanOrEqual(0);expect(a.z).toBeLessThan(map.height);expect(Number.isSafeInteger(a.manhunter!.rng)&&a.manhunter!.rng>0).toBe(true);
  return {id:a.id,species:a.species,record:JSON.stringify(a),manhunterRng:a.manhunter!.rng};
 });
 snapshots(root);const complete=checkpoint(root,'04-real-permanent-manhunters-before-exact-reload',{acquired,animalIds:acquired.ids}),entryRng=root.rng,entryNextId=root.nextId;
 root=deserializeCampaign(complete);admitted261(root);expect(serializeCampaign(root)).toBe(complete);expect([root.tick,root.rng,root.nextId]).toEqual([1000,entryRng,entryNextId]);
 const reloaded=registeredMap(root,mapId)!;for(const saved of animalState){const a=reloaded.wildlife!.animals.find(a=>a.id===saved.id)!;expect(JSON.stringify(a)).toBe(saved.record);expect(a.manhunter?.rng).toBe(saved.manhunterRng);expect(a.manhunter?.permanent261).toBe(true);expect(uniqueAnimalOwners(root,a.id)).toBe(1);}
 snapshots(root);const immutable=serializeCampaign(root);expect(applyCommand(root,{type:'caravan-encounter-choice',groupId:2,choice:'retry'},runtime261(root)).ok).toBe(false);expect(serializeCampaign(root)).toBe(immutable);
 expect(sha261(readFileSync(input,'utf8'))).toBe(INPUT_SHA);checkpoint(root,'05-exact-reload-no-combat-no-time-advanced',{entryRng,entryNextId,animalIds:acquired.ids});
},120_000);
