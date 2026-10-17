import {isSchema256Or257} from './schema-compatibility-257.ts';
/** Ordered SIM entry of one real away group. A yielded generation candidate
 * never becomes a map; source, generation statics and allocation commit once.
 * No bootstrap/migration synthesizes the required registry owner here. */
import {draftActualGroupCamp256} from './group-camp-draft-256.ts';
import {campRuntimeSlotWritable256} from './camp-entry-recipients-256.ts';
import {registeredCampaign} from './world-map-context.ts';
import {enterRegisteredSite} from './world-map-authority.ts';
import {captureMapGenerationRuntime256,finishMapGenerationRuntime256,validMapGenerationRuntime256} from './map-generation-runtime-256.ts';
import {portableLocalRoadAngular256} from './local-road-angular-256.ts';
import type {CampaignState} from './world-map-state.ts';
import type {CampMapProgress256} from './camp-map-assembly-256.ts';
import type {CommandResult} from './types.ts';

type Entry256={status:'ready';commit(select?:boolean):CommandResult}|{status:'blocked';phase:string;reason:string};
/** The existing AdventureStory profile is Core Medium: its
 * nomadicMineableResourcesFactor is0.5. No other/tutorial profile is guessed. */
export function* prepareActualCampEntry256(input:CampaignState,groupId:number):Generator<CampMapProgress256,Entry256,void> {return yield* prepareActualLocalEntry257(input,groupId,'camp');}
export function* prepareActualSettlementEntry257(input:CampaignState,groupId:number):Generator<CampMapProgress256,Entry256,void> {return yield* prepareActualLocalEntry257(input,groupId,'settle');}
function* prepareActualLocalEntry257(input:CampaignState,groupId:number,mode:'camp'|'settle'):Generator<CampMapProgress256,Entry256,void> {
 const root=registeredCampaign(input),registry=root.worldMaps,state=registry?.generationRuntime;
 const blocked=(phase:string,reason:string):Entry256=>({status:'blocked',phase,reason});
 if(!isSchema256Or257(root.schemaVersion)||root.planet?.revision!==3||!registry||!state||!validMapGenerationRuntime256(state))return blocked('runtime-owner','Actual geographic campaign generation owner is missing');
 if(root.gameProfile?.revision!==1||root.gameProfile.storyteller!=='cassandra-partial'||root.gameProfile.difficulty!=='adventure-story')return blocked('generation-profile','Actual admitted no-tutorial AdventureStory context required');
 if(mode==='settle'&&(registry.mapSize.width!==250||registry.mapSize.height!==250))return blocked('settlement-size','La taille de colonie géographique admise est250×250.');
 const size=mode==='settle'?250:200,before=JSON.stringify(state),captured=captureMapGenerationRuntime256(state,size,size);
 const same=()=>registeredCampaign(input)===root&&root.worldMaps===registry&&registry.generationRuntime===state&&JSON.stringify(state)===before;
 // These new-map working arrays are created by the actual generation call,
 // mirroring ClearWorkingData. They are not a filtered WorldPawns roster.
 const generator=draftActualGroupCamp256(root,groupId,{angular:portableLocalRoadAngular256,context:{tutorial:false,nomadicFactor:0.5,layoutRects:[],usedRects:[]},
  adjacentPermutation:captured.adjacentPermutation,fog:{rootsToUnfog:[],...captured.edgeContext?{edgeContext:captured.edgeContext}:{}},animalRuntimeRng:root.rng},mode);
 let result:ReturnType<typeof generator.next>;
 try {
  for(;;){if(!same())return blocked('stale-generation-owner','Actual generation owner changed');result=generator.next();if(result.done)break;yield result.value;}
 }finally {generator.return({status:'blocked',phase:'cancelled',reason:'Unpublished Camp entry discarded'});}
 const draft=result.value;if(draft.status==='blocked')return draft;
 if(!same()||!draft.current(root))return blocked('stale-entry','Actual Camp source changed');
 // All preparation that can throw precedes the existing physical entry
 // transaction. Assignment after a successful entry cannot consume RNG/IDs.
 const next=finishMapGenerationRuntime256(state,draft.runtimeAfter);
 let used=false;
 return {status:'ready',commit(select=true){
  if(used||!same()||!draft.current(root)||!campRuntimeSlotWritable256(root))return {ok:false,reason:'La carte préparée ne correspond plus au groupe courant.'};
  used=true;const result=enterRegisteredSite(root,groupId,mode,select,draft);
  if(result.ok)registry.generationRuntime=next;
  return result;
 }};
}
