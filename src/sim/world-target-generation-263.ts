import {captureTargetFactionSeal263} from './world-target-faction-seal-263.ts';
import {assembleWorldTargetMap263,type CampMapInputs256,type CampMapResult256,type CampMapProgress256} from './camp-map-assembly-256.ts';
import {captureCampRetainedAnimals256} from './group-camp-draft-256.ts';
import {captureMapGenerationRuntime256,finishMapGenerationRuntime256,validMapGenerationRuntime256} from './map-generation-runtime-256.ts';
import {portableLocalRoadAngular256} from './local-road-angular-256.ts';
import {CORE_4871_PAWN_KIND_ORDER} from './core-definition-order-4871.ts';
import {CAMPAIGN_FIELDS} from './secondary-site-state.ts';
import {worldTargetAccess263} from './world-target-access-263.ts';
import {registeredCampaign} from './world-map-context.ts';
import type {CampaignState} from './world-map-state.ts';
import type {WorldTargetConstruction263} from './world-target-construction-263.ts';
type Generated=Extract<CampMapResult256,{status:'ready'}>;
export type WorldTargetGeneration263={status:'ready';result:Generated;runtimeAfter:ReturnType<typeof finishMapGenerationRuntime256>;current():boolean}|Extract<CampMapResult256,{status:'blocked'}>;
/** SAME terrain/climate/fauna262 pipeline and shared static generation owner.
 * Every yielded prefix is private and disposable. No scenario is replayed. */
export function* prepareWorldTargetGeneration263(input:CampaignState,groupId:number):Generator<CampMapProgress256,WorldTargetGeneration263,void> {
 const root=registeredCampaign(input),maps=root.worldMaps,groups=root.worldGroups,record=groups?.groups.find(r=>r.state.id===groupId),g=record?.state,pending=record?.pendingEntry263,runtime=maps?.generationRuntime;
 const blocked=(phase:string,reason:string):WorldTargetGeneration263=>({status:'blocked',phase,reason});
 if(Number(root.schemaVersion)!==263||!maps||!groups||!runtime||!validMapGenerationRuntime256(runtime)||!record||!g||!('members'in g)||!pending||root.planet?.revision!==3||!root.worldFactions||!root.worldPawns||maps.mapSize.width!==maps.mapSize.height)return blocked('owner','Actual263 campaign, target request and generation runtime required');
 const access=worldTargetAccess263(root,pending.target,g.tile);if(!access.ok)return blocked('target',access.reason);if(access.map)return blocked('target','An existing target map does not require generation');
 const dimensions={...maps.mapSize},size=dimensions.width,context:WorldTargetConstruction263=access.source.kind==='foreign-settlement'?{kind:'foreign-settlement',settlementId:access.source.settlement.id,factionId:access.source.factionId,dimensions}:{kind:'quest-site',siteId:access.source.site.id,factionId:access.source.factionId,dimensions};
 const tick=root.tick,rng=root.rng,nextId=root.nextId,planet=root.planet,geography=planet.geography,state=record.state,source=access.source.kind==='foreign-settlement'?access.source.settlement:access.source.site;
 const stateStamp=JSON.stringify(record),sourceStamp=JSON.stringify(source),runtimeStamp=JSON.stringify(runtime),members=groups.groups,memberRefs=members.slice(),sites=maps.sites,siteRefs=sites.slice(),factions=root.worldFactions,worldSites=root.worldSites263;
 const factionsCurrent=captureTargetFactionSeal263(factions);
 const retained=captureCampRetainedAnimals256(root),retainedRefs=retained.slice();
 const current=()=>{try{return root.tick===tick&&root.rng===rng&&root.nextId===nextId&&root.worldMaps===maps&&root.worldGroups===groups&&root.worldFactions===factions&&factionsCurrent()&&root.worldSites263===worldSites&&root.planet===planet&&planet.geography===geography&&maps.mapSize.width===size&&maps.mapSize.height===size&&maps.generationRuntime===runtime&&JSON.stringify(runtime)===runtimeStamp&&groups.groups===members&&members.length===memberRefs.length&&members.every((r,i)=>r===memberRefs[i])&&record.state===state&&record.pendingEntry263===pending&&JSON.stringify(record)===stateStamp&&JSON.stringify(source)===sourceStamp&&maps.sites===sites&&sites.length===siteRefs.length&&sites.every((s,i)=>s===siteRefs[i])&&worldTargetAccess263(root,pending.target,g.tile).ok&&(()=>{const a=captureCampRetainedAnimals256(root);return a.length===retainedRefs.length&&a.every((p,i)=>p===retainedRefs[i]);})();}catch{return false;}};
 const captured=captureMapGenerationRuntime256(runtime,size,size),campaign=Object.fromEntries(CAMPAIGN_FIELDS.filter(k=>Object.hasOwn(root,k)).map(k=>[k,root[k]])) as CampMapInputs256['campaign'],provenance={source:'actual ordered world target263',atTick:tick,nextId,tile:g.tile};
 const gen=assembleWorldTargetMap263({campaign,tile:g.tile,size,calendarOrigin:maps.calendarOrigin,daysPassedSinceSettle:Math.floor(tick/6000),provenance,target263:context,angular:portableLocalRoadAngular256,context:{tutorial:false,nomadicFactor:.5,layoutRects:[],usedRects:[]},chunks:{adjacentPermutation:captured.adjacentPermutation,provenance},animals:{pawnKindOrder:CORE_4871_PAWN_KIND_ORDER,unspawned:retained,runtimeRng:rng,provenance},fog:{rootsToUnfog:[],...captured.edgeContext?{edgeContext:captured.edgeContext}:{},provenance}});
 let result:CampMapResult256;
 try{for(;;){if(!current())return blocked('stale','Actual target generation owner changed');const next=gen.next();if(next.done){result=next.value;break;}yield next.value;}}
 finally{gen.return({status:'blocked',phase:'cancelled',reason:'Unpublished263 target map discarded'});}
 if(result.status==='blocked')return result;if(!current()||!result.worldAnimalGeneration.current()||result.worldTarget263?.recalled&&!result.worldTarget263.recalled.current())return blocked('stale','Actual original owner changed during target generation');
 return {status:'ready',result,runtimeAfter:finishMapGenerationRuntime256(runtime,result),current:()=>current()&&result.status==='ready'&&result.worldAnimalGeneration.current()&&(!result.worldTarget263?.recalled||result.worldTarget263.recalled.current())};
}
