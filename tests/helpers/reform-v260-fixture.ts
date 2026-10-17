import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {captureGroupMass,groupDestinationValid} from '../../src/sim/group-capture.ts';
import {freightGroup} from '../../src/sim/group-freight.ts';
import {findPlanetRoute,planetQueryBudget,planetCostContext} from '../../src/sim/planet-navigation.ts';
import {planetGeography256} from '../../src/sim/planet-geography-256.ts';
import {actualPlayerOwner259} from '../../src/sim/world-affiliation-259.ts';
import {registeredMap,registeredMapId,flushRegisteredMap} from '../../src/sim/world-map-context.ts';
import {prepareActualCampEntry256} from '../../src/sim/group-camp-entry-256.ts';
import {serializeCampaign,deserializeCampaign,validateWorld} from '../../src/sim/serialization.ts';
import {GroupCampaignRuntime256} from '../../src/sim/group-campaign-runtime-256.ts';
import {GroupCaravanPhysical256} from '../../src/sim/group-caravan-physical-256.ts';
import {createGroupCampaignGeometry256} from '../../src/sim/group-campaign-geometry-256.ts';
import {preparePlanetNavigation256} from '../../src/sim/planet-route-256.ts';
import {applyCommand,stepWorld} from '../../src/sim/engine.ts';
import {testOutputPath,writeTestFileSync} from '../test-output.ts';
import type {World} from '../../src/sim/types.ts';
import type {CampaignState} from '../../src/sim/world-map-state.ts';

export const REFORM415_NOTICE='Reprise exacte V415 du vrai départ494 SHAfac771c6a5a4e88721cadb0d396e4cbcf236d16ccd4022df549397d57ee301ef. Aucun globe/usine/capsule/Autoriser/formation/contact/départ rejoué. Même caravane1, originaux7/8 et quatre piles20repas/9bois/7argent, résidente9 et tous autres propriétaires conservés. L’ancienne cible10 obtenue par index QA impliquait110segments : défaut du pilote déclaré. Au même494, vraie commande joueur group-route vers le voisin terrestre libre accessible au coût Core minimal, route réelle1segment, sans filtre de biome ni graine favorable. Trajet normal borné5500ticks tenant compte de la nuitCore, puis vrai Camp200 du biome rencontré ; refus réel conservé sans réparation. Le natif consomme seulement la baseline du ciblé réussi. Aucun contrôle exécuté par cette préparation privée, performance ou démonstration finale revendiquée.';
export const sha415=(s:string)=>createHash('sha256').update(s).digest('hex');
export function drain415<Y,T>(iterator:Generator<Y,T,void>):T {let s=iterator.next();while(!s.done)s=iterator.next();return s.value;}
export function require415(root:CampaignState):asserts root is World {
 if(root.schemaVersion!==260||!('pawns'in root)||root.planet?.revision!==3||!root.worldMaps||!root.worldGroups||!root.worldPawns||!root.worldFactions)throw Error('True260 registry, faction and WorldPawns authorities required');
 const errors=validateWorld(root);if(errors.length)throw Error('Prepared415 invalid: '+errors.join('\n'));
}
export function checkpoint415(root:CampaignState,label:string){
 const path=testOutputPath(`artifacts/reform-v415/${label}-RAW-BEFORE-ADMISSION.json`) as string;
 writeTestFileSync(path,JSON.stringify(root)); // Preserve actual state BEFORE its admission guard.
 require415(root);const raw=serializeCampaign(root);writeTestFileSync(path,raw);return {path,raw,sha256:sha415(raw)};
}
export function runtime415(root:World){if(root.planet?.revision!==3)throw Error('Real geographic planet required');preparePlanetNavigation256(root.planet);const run=new GroupCampaignRuntime256(createGroupCampaignGeometry256(root),new GroupCaravanPhysical256());run.bootstrap(root);return run;}
export interface Baseline415 {revision:1;schemaVersion:260;status:'camp-baseline-admitted'|'complete-reform-targeted-passed';targetedOutputSHA256?:string;path:string;sha256:string;notice:string;homeMapId:number;campMapId:number;destination:number;memberIds:number[];sources:{pileId:number;quantity:number}[];baselineTick:number;bornPersonIds:number[];preparationTicks:{capsules:number;formationAndTravel:number}}
/** Exact acquired full-factory continuation, with ordinary commands only.
 * No constructor/fallback; preserve and report any true prerequisite refusal. */
export function preparedReform415(){
 const resume=process.env.REFORM415_RESUME_MANIFEST;if(resume){const expected=process.env.REFORM415_RESUME_MANIFEST_SHA256;if(!expected||sha415(readFileSync(resume,'utf8'))!==expected)throw Error('Exact acquired prepared415 manifest SHA required, no fallback generation');const input=loadBaseline415(resume,false),m=input.manifest;return {root:input.root,camp:input.camp,raw:input.raw,homeMapId:m.homeMapId,campMapId:m.campMapId,destination:m.destination,memberIds:m.memberIds,sources:m.sources,notice:m.notice,manifestPath:resume};}
 // Reuse the last independently durable acquired departure, without fallback.
 const source=process.env.REFORM415_DEPARTURE494_INPUT;if(!source)throw Error('Exact acquired departure494 input required in REFORM415_DEPARTURE494_INPUT; no opening/formation fallback');
 const sourceRaw=readFileSync(source,'utf8'),sourceSHA='fac771c6a5a4e88721cadb0d396e4cbcf236d16ccd4022df549397d57ee301ef';if(sha415(sourceRaw)!==sourceSHA)throw Error('Acquired departure494 input SHA differs');
 const root=deserializeCampaign(sourceRaw);require415(root);if(sha415(serializeCampaign(root))!==sourceSHA)throw Error('Departure494 restore was not byte-exact before the first command');
 if(root.tick!==494||root.nextId!==36333||root.width!==250||root.height!==250||root.startingArrival?.phase!=='opened'||root.startingArrival.openedAt!==31||root.worldMaps!.sites.length!==1||root.worldGroups!.groups.length!==1||root.planet?.revision!==3)throw Error('Exact acquired full250 departure494 required');
 const planet=root.planet,geography=planetGeography256(planet),home=planet.homeTile,homeMapId=registeredMapId(root)!,openedAt=root.startingArrival.openedAt,id=1,state=()=>root.worldGroups!.groups.find(r=>r.state.id===id)?.state;
 const departed=state();if(!departed||!('members'in departed)||departed.id!==1||departed.tile!==0||departed.destination!==10||departed.phase!=='travelling'||departed.segment!==null||departed.stop!==null||departed.paused||departed.departedAt!==494||departed.members.map(p=>p.id).join(',')!=='7,8'||home!==0||homeMapId!==0||geography.surface.seedText!=='Elsewhere')throw Error('Exact acquired away originals/planet differ');
 const expectedStock=[{id:36326,item:'survival-meal',quantity:10,pawnId:7},{id:2308,item:'survival-meal',quantity:10,pawnId:7},{id:36331,item:'wood',quantity:9,pawnId:8},{id:36332,item:'silver',quantity:7,pawnId:7}];
 if(departed.items.length!==4||expectedStock.some(e=>!departed.items.some(p=>p.id===e.id&&p.item===e.item&&p.quantity===e.quantity&&p.owner.type==='inventory'&&p.owner.pawnId===e.pawnId)))throw Error('Acquired finite inventory identities/quantities/owners differ');
 const members=departed.members.slice(),chosen=members.map(p=>p.id),born=[...root.pawns,...members].filter(p=>actualPlayerOwner259(p,root.worldFactions!.playerFactionId));if(born.map(p=>p.id).sort((a,b)=>a-b).join(',')!=='7,8,9'||root.pawns.map(p=>p.id).join(',')!=='9')throw Error('Actual starter ownership differs');
 checkpoint415(root,'04-resumed-exact-departure494-before-redirection');
 const runtime=runtime415(root),until=(done:()=>boolean,limit:number,label:string)=>{for(let n=0;n<limit&&!done();n++)stepWorld(root,1,undefined,runtime);checkpoint415(root,label);if(!done())throw Error(`Prepared415 prerequisite ${label} not reached within ${limit} real ticks (at${root.tick}); no repair/retry`);};
 const mass=captureGroupMass(departed.members,departed.items,freightGroup(departed),root.schemaVersion,departed.packed,departed.animalOwners?.members);if(!mass)throw Error('Actual departing mass invalid');
 const context=planetCostContext(root,mass),occupied=new Set([...root.worldMaps!.sites.map(s=>s.tile),...root.worldFactions!.settlements.map(s=>s.tile),...root.worldMaps!.retired.filter(s=>s.markerUntilCore===undefined||s.markerUntilCore>root.tick*10).map(s=>s.tile)]);
 // This is a player choice among actual immediate neighbours; no biome filter,
 // seed search, route repair, climate adoption or prospective camp is supplied.
 const neighbours=geography.surface.tiles[departed.tile]!.neighbours.filter(tile=>groupDestinationValid(planet,tile)&&!occupied.has(tile)).flatMap(tile=>{const route=findPlanetRoute(planet,departed.tile,tile,context,planetQueryBudget(planet));return route.kind==='found'&&route.tiles.length===2&&route.tiles[0]===departed.tile&&route.tiles[1]===tile?[{tile,estimatedCore:route.estimatedCore,route:route.tiles}]:[];}).sort((a,b)=>a.estimatedCore-b.estimatedCore||a.tile-b.tile);
 const target=neighbours[0];if(!target)throw Error('No actual free adjacent terrestrial one-segment route; no alternate world or fallback');
 writeTestFileSync(testOutputPath('artifacts/reform-v415/04-player-redirection-choice.json') as string,JSON.stringify({inputSHA256:sourceSHA,tick:root.tick,groupId:id,oldDestination:departed.destination,oldRoute:departed.route,origin:departed.tile,choice:target,biome:geography.surface.tiles[target.tile]!.biome,candidates:neighbours,travelLimit:5500},null,2));
 const beforeCommand=JSON.stringify(root),routeBefore={destination:departed.destination,route:departed.route,phase:departed.phase,stop:departed.stop};
 const redirected=applyCommand(root,{type:'group-route',groupId:id,destination:target.tile},runtime);if(!redirected.ok){checkpoint415(root,'04-player-redirection-refused');throw Error('True player group-route refused: '+redirected.reason);}
 const redirectedState=state();if(!redirectedState||!('members'in redirectedState)||redirectedState.route.join(',')!==target.route.join(',')||redirectedState.destination!==target.tile||redirectedState.segment!==null||redirectedState.members.some((p,i)=>p!==members[i])||JSON.stringify(root,(_key,value)=>value===redirectedState?{...value,...routeBefore}:value)!==beforeCommand)throw Error('Redirection changed acquired state beyond its permitted route fields');
 checkpoint415(root,'04-after-real-player-redirection-same494');
 // An edge costs at most30000 moving Core through its ordinary payment rate;
 // allow20000 additional night Core plus500 simulated ticks of frontier margin.
 until(()=>{const g=state();return !!g&&'members'in g&&g.phase==='at-site';},5500,'05-one-segment-actual-arrival-or-bounded-refusal');
 const away=state();if(!away||!('members'in away)||away.tile!==target.tile||away.phase!=='at-site'||away.members.length!==2||away.members.some(p=>!members.includes(p)))throw Error('Actual arrived exclusive owners absent');
 const carried=away.items.filter(p=>p.owner.type==='inventory').map(p=>p.id);if(!carried.length)throw Error('Real journey retained no selectable inventory; no stock refill');
 const before=checkpoint415(root,'06-real-before-camp'),entry=drain415(prepareActualCampEntry256(root,id));if(serializeCampaign(root)!==before.raw)throw Error('Camp preparation mutated its source before commit');if(entry.status!=='ready')throw Error('Real Camp preparation blocked: '+entry.phase+': '+entry.reason);const entered=entry.commit();if(!entered.ok)throw Error(entered.reason);
 const campMapId=root.worldMaps!.selectedMapId!,camp=registeredMap(root,campMapId);if(!camp||camp.width!==200||camp.height!==200||Number(root.worldMaps!.sites.length)!==2||root.worldGroups!.groups.length||!root.startingArrival)throw Error('Real full-source250/Camp200 entry incomplete');
 flushRegisteredMap(camp);const saved=checkpoint415(root,'07-camp-baseline'),lines=carried.map(pileId=>{const p=camp.piles.find(p=>p.id===pileId);if(!p||p.owner.type!=='inventory'||p.quantity<1)throw Error('Original carried stock absent after real Camp entry');return {pileId,quantity:p.quantity};});
 const manifest:Baseline415={revision:1,schemaVersion:260,status:'camp-baseline-admitted',path:saved.path,sha256:saved.sha256,notice:REFORM415_NOTICE,homeMapId,campMapId,destination:home,memberIds:chosen,sources:lines,baselineTick:root.tick,bornPersonIds:born.map(p=>p.id),preparationTicks:{capsules:openedAt,formationAndTravel:root.tick-openedAt}};
 const manifestPath=testOutputPath('artifacts/reform-v415/native-baseline-manifest.json') as string;writeTestFileSync(manifestPath,JSON.stringify(manifest,null,2));
 return {root,camp,raw:saved.raw,homeMapId,campMapId,destination:home,memberIds:chosen,sources:lines,notice:REFORM415_NOTICE,manifestPath};
}
export type Reform415=ReturnType<typeof preparedReform415>;
/** Called only after the complete targeted case's final assertions succeed. */
export function markReformTargeted415(path:string,outputRaw:string){const m=JSON.parse(readFileSync(path,'utf8')) as Baseline415;if(!['camp-baseline-admitted','complete-reform-targeted-passed'].includes(m.status)||sha415(readFileSync(m.path,'utf8'))!==m.sha256)throw Error('Prepared baseline changed before targeted success');m.status='complete-reform-targeted-passed';m.targetedOutputSHA256=sha415(outputRaw);writeTestFileSync(path,JSON.stringify(m,null,2));}
/** Native must consume a successful targeted baseline. No generation fallback. */
export function readPreparedReform415(){
 const path=process.env.REFORM415_BASELINE_MANIFEST;if(!path)throw Error('ROOT must provide successful targeted REFORM415_BASELINE_MANIFEST; native never generates a replacement');
 return loadBaseline415(path,true);
}
function loadBaseline415(path:string,completeOnly:boolean){
 const manifest=JSON.parse(readFileSync(path,'utf8')) as Baseline415;if(manifest.revision!==1||manifest.schemaVersion!==260||!['camp-baseline-admitted','complete-reform-targeted-passed'].includes(manifest.status)||completeOnly&&(manifest.status!=='complete-reform-targeted-passed'||!/^[a-f0-9]{64}$/.test(manifest.targetedOutputSHA256??''))||!manifest.notice||!Number.isSafeInteger(manifest.baselineTick))throw Error('Required targeted415 baseline manifest absent or incomplete');
 const raw=readFileSync(manifest.path,'utf8');if(sha415(raw)!==manifest.sha256)throw Error('Targeted Camp baseline SHA changed');const root=deserializeCampaign(raw);require415(root);const camp=registeredMap(root,manifest.campMapId);
 if(!camp||root.tick!==manifest.baselineTick||root.worldMaps!.selectedMapId!==manifest.campMapId||root.worldMaps!.sites.length!==2||root.worldGroups!.groups.length||registeredMap(root,manifest.homeMapId)?.width!==250||camp.width!==200||root.startingArrival?.phase!=='opened')throw Error('Actual acquired full-source250/Camp200 baseline differs');
 for(const id of manifest.memberIds)if(!camp.pawns.some(p=>p.id===id))throw Error('Declared original Camp member absent');for(const l of manifest.sources)if(!camp.piles.some(p=>p.id===l.pileId&&p.quantity===l.quantity&&p.owner.type==='inventory'))throw Error('Declared true Camp stock differs');return {manifest,root,camp,raw};
}
export function restored415(raw:string){const root=deserializeCampaign(raw);require415(root);const row=root.worldMaps!.sites.find(s=>s.kind==='camp');if(!row)throw Error('Prepared real Camp absent');const camp=registeredMap(root,row.id)!;return {root,camp,runtime:runtime415(root)};}
