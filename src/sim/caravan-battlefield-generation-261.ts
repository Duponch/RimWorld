import {assembleEncounterCamp256,type CampMapInputs256,type CampMapResult256,type CampMapProgress256} from './camp-map-assembly-256.ts';
import {captureCampRetainedAnimals256} from './group-camp-draft-256.ts';
import {captureMapGenerationRuntime256,finishMapGenerationRuntime256,validMapGenerationRuntime256} from './map-generation-runtime-256.ts';
import {portableLocalRoadAngular256} from './local-road-angular-256.ts';
import {CORE_4871_PAWN_KIND_ORDER} from './core-definition-order-4871.ts';
import {CAMPAIGN_FIELDS} from './secondary-site-state.ts';
import {registeredCampaign} from './world-map-context.ts';
import type {CampaignState} from './world-map-state.ts';
import type {EncounterGroup261} from './caravan-encounter-state-261.ts';

type Generated261=Extract<CampMapResult256,{status:'ready'}>;
export type BattlefieldGeneration261={status:'ready';result:Generated261;runtimeAfter:ReturnType<typeof finishMapGenerationRuntime256>;current():boolean}|Extract<CampMapResult256,{status:'blocked'}>;
/** The parameterized existing Encounter kernel owns every physical generation
 * step; this adapter captures the true moving caravan and shared runtime. It
 * neither spawns a scenario nor pays/finishes a travel segment for admission. */
export function* prepareBattlefieldGeneration261(input:CampaignState,groupId:number,size:number):Generator<CampMapProgress256,BattlefieldGeneration261,void> {
 const root=registeredCampaign(input),maps=root.worldMaps,groups=root.worldGroups,runtime=maps?.generationRuntime;
 const blocked=(phase:string,reason:string):BattlefieldGeneration261=>({status:'blocked',phase,reason});
 if((Number(root.schemaVersion)!==261&&(Number(root.schemaVersion)!==262&&Number(root.schemaVersion)!==263))||root.planet?.revision!==3||!root.worldFactions||!maps||!groups||!runtime||!validMapGenerationRuntime256(runtime)||!Number.isInteger(size)||size<75||size>110)return blocked('owner','Actual261 geographical encounter owner required');
 const record=groups.groups.find(r=>r.state.id===groupId) as EncounterGroup261|undefined,g=record?.state;
 if(!record||record.localMapId!==null||!record.encounters261||!g||!('members'in g)||!['travelling','at-site','stationary','awaiting-entry'].includes(g.phase))return blocked('group','Actual admitted away caravan required');
 if(maps.sites.some(s=>s.tile===g.tile)||root.worldFactions.settlements.some(s=>s.tile===g.tile)||maps.retired.some(s=>s.tile===g.tile&&s.reason!=='battlefield-empty'&&(s.markerUntilCore===undefined||s.markerUntilCore>root.tick*10)))return blocked('tile-owner','An existing world object prevents a new encounter map');
 if(root.gameProfile?.storyteller!=='cassandra-partial'||root.gameProfile.difficulty!=='adventure-story')return blocked('profile','Actual admitted AdventureStory context required');
 const tick=root.tick,rng=root.rng,nextId=root.nextId,planet=root.planet,geography=planet.geography,recordState=record.state;
 const captured=captureMapGenerationRuntime256(runtime,size,size),runtimeBefore=JSON.stringify(runtime),groupBefore=JSON.stringify(record),mapMembership=maps.sites.slice();
 // Never stringify geography or clone a whole campaign; generation reads these
 // same immutable shared references and publishes only once after all yields.
 const campaign=Object.fromEntries(CAMPAIGN_FIELDS.filter(k=>Object.hasOwn(root,k)).map(k=>[k,root[k]])) as CampMapInputs256['campaign'];
 const retained=captureCampRetainedAnimals256(root),retainedBefore=JSON.stringify(retained);
 const current=()=>registeredCampaign(input)===root&&root.tick===tick&&root.rng===rng&&root.nextId===nextId&&root.worldMaps===maps&&root.worldGroups===groups&&root.planet===planet&&planet.geography===geography&&maps.generationRuntime===runtime&&JSON.stringify(runtime)===runtimeBefore&&groups.groups.includes(record)&&record.state===recordState&&JSON.stringify(record)===groupBefore&&maps.sites.length===mapMembership.length&&maps.sites.every((s,i)=>s===mapMembership[i])&&JSON.stringify(retained)===retainedBefore;
 const provenance={source:'actual ordered caravan incident261',atTick:tick,nextId,tile:g.tile};
 const gen=assembleEncounterCamp256({campaign,tile:g.tile,size,calendarOrigin:maps.calendarOrigin,daysPassedSinceSettle:Math.floor(tick/6000),provenance,
  angular:portableLocalRoadAngular256,context:{tutorial:false,nomadicFactor:.5,layoutRects:[],usedRects:[]},chunks:{adjacentPermutation:captured.adjacentPermutation,provenance},
  animals:{pawnKindOrder:CORE_4871_PAWN_KIND_ORDER,unspawned:retained,runtimeRng:rng,provenance},fog:{rootsToUnfog:[],...captured.edgeContext?{edgeContext:captured.edgeContext}:{},provenance}});
 let result:CampMapResult256;
 try{for(;;){if(!current())return blocked('stale','Actual encounter generation source changed');const step=gen.next();if(step.done){result=step.value;break;}yield step.value;}}
 finally{gen.return({status:'blocked',phase:'cancelled',reason:'Unpublished incident map discarded'});}
 if(result.status==='blocked')return result;
 if(!current()||!result.worldAnimalGeneration.current())return blocked('stale','Actual generated WorldPawn ownership changed');
 const runtimeAfter=finishMapGenerationRuntime256(runtime,result);
 return {status:'ready',result,runtimeAfter,current:()=>current()&&result.status==='ready'&&result.worldAnimalGeneration.current()};
}
