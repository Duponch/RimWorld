import {test,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../src/sim/serialization.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {registeredMap} from '../src/sim/world-map-context.ts';
import {planetTile,planetTiles} from '../src/sim/planet-geography-256.ts';
import {preparePlanetNavigation256} from '../src/sim/planet-route-256.ts';
import {createGroupCampaignGeometry256} from '../src/sim/group-campaign-geometry-256.ts';
import {GroupCampaignRuntime256} from '../src/sim/group-campaign-runtime-256.ts';
import {GroupCaravanPhysical256} from '../src/sim/group-caravan-physical-256.ts';
import {previewGroupReform260} from '../src/sim/group-reform-260.ts';
import {prepareActualBattlefieldEntry261} from '../src/sim/caravan-battlefield-entry-261.ts';
import {caravanMapAllowed261} from '../src/sim/caravan-incidents-261.ts';
import * as incidentChance from '../src/sim/caravan-incident-calculation-261.ts';
import * as retreatExit from '../src/sim/caravan-player-retreat-261.ts';
import {playerRetreatJoinTile261} from '../src/sim/caravan-player-retreat-261.ts';
import {validGroupEncounterFields261} from '../src/sim/caravan-registry-save-261.ts';
import {validGroupCommand} from '../src/sim/group-command-shape.ts';
import {writeTestFileSync} from './test-output.ts';
import type {CampaignState} from '../src/sim/world-map-state.ts';
import type {World} from '../src/sim/types.ts';
const INPUT_SHA='70dea3811dab70e7225cced4c715c8438b1d7aecec6aa173ac72eaa52115e699',sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const sources=[{pileId:36326,quantity:10},{pileId:2308,quantity:10},{pileId:36331,quantity:9},{pileId:36332,quantity:7}];
function admitted(w:CampaignState):asserts w is World {if(Number(w.schemaVersion)!==261||!('pawns'in w)||w.planet?.revision!==3||!w.worldMaps||!w.worldGroups||!w.worldPawns)throw Error('Actual261 full campaign required');expect(validateWorld(w)).toEqual([]);}
function input(){const p=process.env.REFORM415_BASELINE_MANIFEST;if(!p)throw Error('Acquired Camp736 manifest required; no factory or departure fallback');const m=JSON.parse(readFileSync(p,'utf8'));expect(m).toMatchObject({schemaVersion:260,status:'complete-reform-targeted-passed',sha256:INPUT_SHA,baselineTick:736});const raw=readFileSync(m.path,'utf8');expect(sha(raw)).toBe(INPUT_SHA);const root=deserializeCampaign(raw);admitted(root);expect(serializeCampaign(root)).toBe(raw.replace(/^\{"schemaVersion":260,/, '{"schemaVersion":261,'));expect(root.worldMaps!.sites.map(s=>[s.id,s.kind])).toEqual([[0,'settlement'],[1,'camp']]);expect(root.worldGroups!.groups).toEqual([]);return {root,raw,path:m.path};}
function restored(raw:string){const root=deserializeCampaign(raw);admitted(root);return root;}
function runtime(root:World){if(root.planet?.revision!==3)throw Error('Actual planet required');preparePlanetNavigation256(root.planet);const r=new GroupCampaignRuntime256(createGroupCampaignGeometry256(root),new GroupCaravanPhysical256());r.bootstrap(root);return r;}
function away(root:World,id:number){const r=root.worldGroups!.groups.find(r=>r.state.id===id);if(!r||!('members'in r.state))throw Error('Actual away owner missing');return {record:r,g:r.state};}
function actualNeighbour(root:World,from:number){const planet=root.planet;if(planet?.revision!==3)throw Error('Actual planet absent');const t=planetTile(planet,from);if(!t)throw Error('Actual tile absent');const id=t.neighbours.find(id=>caravanMapAllowed261(root,id));if(id===undefined)throw Error('No actual free land neighbour; preserve refusal, no substitute seed/biome');return id;}
function drain<Y,T>(g:Generator<Y,T,void>):T {let s=g.next();while(!s.done)s=g.next();return s.value;}
const opt=test.skipIf(process.env.TRAVEL261_RETREAT_SIM!=='1');
// A pure geometry witness only: real acquired planet, no invented caravan,
// actor, route or owner is admitted to the World to obtain another origin.
opt('join geography uses actual same/adjacent tiles independent of any origin-map field',()=>{const {root}=input(),planet=root.planet!;if(planet.revision!==3)throw Error('Actual planet required');const from=39970,to=planetTile(planet,from)!.neighbours[0]!;expect(playerRetreatJoinTile261(planet,from,from)).toBe(true);expect(playerRetreatJoinTile261(planet,from,to)).toBe(true);const nonNeighbour=planetTiles(planet).find(t=>t.id!==from&&!planetTile(planet,from)!.neighbours.includes(t.id));expect(nonNeighbour).toBeDefined();expect(playerRetreatJoinTile261(planet,from,nonNeighbour!.id)).toBe(false);});

opt('acquired736: real incident producer→Battlefield→individual edge exits, middle RAW and same-tile join with retained exactly once, no victory',()=>{
 let {root,path}=input(),run=runtime(root);const originalHome=serializeCampaign(root),groupId=root.planet!.nextGroupId,firstDestination=actualNeighbour(root,39970);
 const first={originMapId:1,memberIds:[7,8],sources,destination:firstDestination},preview=previewGroupReform260(registeredMap(root,1)!,first);expect(preview.ok).toBe(true);if(!preview.ok)throw Error(preview.reason);
 expect(applyCommand(root,{type:'group-reform',...first,quote:preview.quote},run).ok).toBe(true);expect(away(root,groupId).record.encounters261).toEqual({revision:1});expect(away(root,groupId).record.story261).toBeUndefined();
 // Declared incident stimulus: only the occurrence gate is imposed. Faction,
 // roster/IDs/items/PRNG/pending/story and the full generation stay real.
 // Never describes this occasion as a naturally observed MTB draw.
 let armed=false;const chance=vi.spyOn(incidentChance,'caravanIncidentOccurs261').mockImplementation((_b,kind)=>armed&&kind==='ambush');
 try{
  for(let n=0;n<1500&&away(root,groupId).g.tile!==firstDestination;n++)stepWorld(root,1,undefined,run);
  expect(away(root,groupId).g.tile).toBe(firstDestination);const destination=actualNeighbour(root,firstDestination);
  expect(applyCommand(root,{type:'caravan-order',groupId,destination,action:null},run).ok).toBe(true);
  for(let n=0;n<600&&!away(root,groupId).record.pending261;n++){
   const {g}=away(root,groupId);armed=root.tick%100===99&&!!g.segment&&g.segment.remainingCore>10&&g.phase==='travelling'&&caravanMapAllowed261(root,g.tile);stepWorld(root,1,undefined,run);
  }
  const encounter=away(root,groupId),pending=encounter.record.pending261;expect(pending?.kind).toBe('ambush');if(!pending)throw Error('True producer did not admit the declared occasion inside the bound');expect(pending.decision).toBe('forced');expect(pending.people.length).toBeGreaterThan(0);
  const members=encounter.g.members.slice(),items=encounter.g.items.slice(),oldRoute={tile:encounter.g.tile,destination:encounter.g.destination,segment:structuredClone(encounter.g.segment)},foreignIds=pending.people.map(p=>p.id);
  expect(oldRoute.segment).not.toBeNull();const generated=drain(prepareActualBattlefieldEntry261(root,groupId));expect(generated.status).toBe('ready');if(generated.status!=='ready')throw Error(generated.reason);expect(generated.commit().ok).toBe(true);
  const mapId=root.worldMaps!.selectedMapId!,site=root.worldMaps!.sites.find(s=>s.id===mapId)!;expect(site.kind).toBe('battlefield');expect(site.battlefield261!.won).toBe(false);expect(site.story261!.lastFire.ambush).toBe(root.tick*10);expect(site.battlefield261!.retained.next?.leftFraction).toBe(Math.fround(Math.fround(oldRoute.segment!.remainingCore)/Math.fround(oldRoute.segment!.totalCore)));expect(site.battlefield261!.retained.destination?.tile).toBe(oldRoute.destination);
  let map=registeredMap(root,mapId)!;for(const p of members)expect(map.pawns.find(q=>q.id===p.id)).toBe(p);for(const p of items)expect(map.piles.find(q=>q.id===p.id)).toBe(p);for(const id of foreignIds)expect(map.pawns.find(p=>p.id===id)).toBeDefined();
  writeTestFileSync('artifacts/travel261-retreat/00-actual-battlefield-before-first-exit-RAW.json',JSON.stringify(root));admitted(root);const story=structuredClone(site.story261),beforeRefusal=serializeCampaign(root),refused=previewGroupReform260(map,{originMapId:mapId,memberIds:[7,8],sources:[]});expect(refused.ok).toBe(false);expect(applyCommand(root,{type:'group-reform',originMapId:mapId,memberIds:[7,8],sources:[],quote:'reform260:visible-enemies'},run).ok).toBe(false);expect(serializeCampaign(root)).toBe(beforeRefusal);
  const firstExitId=root.planet!.nextGroupId;expect(applyCommand(root,{type:'group-start',retreat261:true,originMapId:mapId,memberIds:[7],sources:[],destination:oldRoute.destination},run).ok).toBe(true);
  for(let n=0;n<500&&root.worldGroups!.groups.find(r=>r.state.id===firstExitId)?.localMapId!==null;n++)stepWorld(root,1,undefined,run);
  const exit=away(root,firstExitId);expect(exit.g.members.map(p=>p.id)).toEqual([7]);expect(exit.g.departedAt).toBe(root.tick);expect(exit.g.lastPersonalTick).toBe(root.tick);expect(exit.record.story261).toEqual(story);expect(exit.g.destination).toBe(oldRoute.destination);expect(exit.g.segment).not.toBeNull();expect(exit.g.segment!.remainingCore).toBe(Math.fround(exit.g.segment!.totalCore*Math.fround(Math.fround(oldRoute.segment!.remainingCore)/Math.fround(oldRoute.segment!.totalCore))));expect(exit.record.retreat261).toEqual({revision:1,autoJoinable:true});expect(exit.g.members[0]!.draft).toBeUndefined();
  map=registeredMap(root,mapId)!;expect(map.pawns.find(p=>p.id===8)).toBeDefined();expect(map.pawns.find(p=>p.id===7)).toBeUndefined();expect(root.worldMaps!.sites.find(s=>s.id===mapId)!.battlefield261!.won).toBe(false);expect(root.worldMaps!.sites.find(s=>s.id===mapId)!.battlefield261!.retained).toEqual({passStory:false,next:null,destination:null});writeTestFileSync('artifacts/travel261-retreat/01-first-owner-left-RAW-BEFORE-ADMISSION.json',JSON.stringify(root));admitted(root);
  const middle=serializeCampaign(root);writeTestFileSync('artifacts/travel261-retreat/01-first-owner-left-second-still-on-map.json',middle);root=restored(middle);expect(serializeCampaign(root)).toBe(middle);run=runtime(root);
  // An ordinary player pause keeps the first real caravan on its same actual
  // tile for the later join. No route, fraction, actor or clock is edited.
  expect(applyCommand(root,{type:'group-pause',groupId:firstExitId,paused:true},run).ok).toBe(true);const secondIntent=root.planet!.nextGroupId,pausedRemaining=away(root,firstExitId).g.segment!.remainingCore;
  expect(applyCommand(root,{type:'group-start',retreat261:true,originMapId:mapId,memberIds:[8],sources:[],destination:oldRoute.destination},run).ok).toBe(true);
  // Adversarial negative seam at the genuine edge. Equal clones are rejected
  // before commit; restore the same originals before normal true departure.
  const prepareExit=retreatExit.preparePlayerRetreatDeparture261;let joinSealObserved=false;const exitSeal=vi.spyOn(retreatExit,'preparePlayerRetreatDeparture261').mockImplementation((...args:Parameters<typeof prepareExit>)=>{const plan=prepareExit(...args);if(plan.ok&&plan.targetId!==undefined&&!joinSealObserved){const target=root.worldGroups!.groups.find(r=>r.state.id===plan.targetId)!;const state=target.state;if(!('members'in state))throw Error('Real JOIN target absent');expect(plan.current()).toBe(true);target.state=structuredClone(state);expect(plan.current()).toBe(false);target.state=state;const items=state.items;state.items=items.map(i=>structuredClone(i));expect(plan.current()).toBe(false);state.items=items;const field=root.worldMaps!.sites.find(s=>s.id===mapId)!.battlefield261!,retained=field.retained;field.retained=structuredClone(retained);expect(plan.current()).toBe(false);field.retained=retained;const donor=root.worldGroups!.groups.find(r=>r.state.id===args[1].id)!;for(const [owner,key]of [[root.worldGroups!,'groups'],[donor,'state'],[donor,'localMapId']] as const){Object.defineProperty(owner,key,{writable:false});expect(plan.current()).toBe(false);Object.defineProperty(owner,key,{writable:true});}expect(plan.current()).toBe(true);joinSealObserved=true;}return plan;});
  try{
  for(let n=0;n<500&&root.worldMaps!.sites.some(s=>s.id===mapId);n++)stepWorld(root,1,undefined,run);
  }finally{exitSeal.mockRestore();}expect(joinSealObserved).toBe(true);
  expect(root.worldMaps!.sites.some(s=>s.id===mapId)).toBe(false);expect(root.worldMaps!.retired.find(s=>s.id===mapId)).toMatchObject({kind:'battlefield',reason:'battlefield-empty'});expect(root.worldGroups!.groups.find(r=>r.state.id===secondIntent)).toBeUndefined();
  const joined=away(root,firstExitId);expect(joined.g.members.map(p=>p.id).sort((a,b)=>a-b)).toEqual([7,8]);expect(joined.record.story261).toEqual(story);expect(joined.record.story261!.recent.filter(i=>i==='ambush')).toHaveLength(1);expect(joined.g.destination).toBe(oldRoute.destination);expect(joined.g.segment?.remainingCore).toBe(pausedRemaining);expect(joined.g.members.every(p=>!p.draft)).toBe(true);for(const id of [7,8])expect(root.worldPawns!.owners.some(r=>r.actor.id===id)).toBe(false);
  admitted(root);const raw=serializeCampaign(root);writeTestFileSync('artifacts/travel261-retreat/02-joined-retained-before-exact-reload.json',raw);expect(serializeCampaign(deserializeCampaign(raw))).toBe(raw);expect(sha(readFileSync(path,'utf8'))).toBe(INPUT_SHA);writeTestFileSync('artifacts/travel261-retreat/proof.json',JSON.stringify({notice:'Declared occurrence-gate stimulus; true actors/maps/edge owners. No natural MTB, victory or GPU/performance claim.',sourceSHA:INPUT_SHA,firstExitId,absorbedIntent:secondIntent,mapId,foreignIds,story,oldRoute,exactMiddleReload:true,exactFinalReload:true,originalInitialSHA:sha(originalHome)},null,2));
 }finally{chance.mockRestore();}
},120_000);

opt('retreat refuses the acquired ordinary Camp without changing a single admitted byte',()=>{const {root}=input(),run=runtime(root),raw=serializeCampaign(root);expect(applyCommand(root,{type:'group-start',retreat261:true,originMapId:1,memberIds:[7],sources:[],destination:0},run).ok).toBe(false);expect(serializeCampaign(root)).toBe(raw);expect(validateWorld(root)).toEqual([]);});
test('retreat command marker is closed261 only and rejects own undefined, duplicate members or an invented field',()=>{const c={type:'group-start',retreat261:true,originMapId:2,memberIds:[7],sources:[],destination:0};expect(validGroupCommand(c,261)).toBe(true);for(const version of [259,260,262])expect(validGroupCommand(c,version)).toBe(false);expect(validGroupCommand({...c,retreat261:undefined},261)).toBe(false);expect(validGroupCommand({...c,memberIds:[7,7]},261)).toBe(false);expect(validGroupCommand({...c,won:true},261)).toBe(false);});
opt('old260 rejects a future retreat marker before neutral migration; source bytes stay immutable',()=>{const {raw,path}=input(),bad=JSON.parse(raw);bad.retreat261={revision:1};expect(()=>deserializeCampaign(JSON.stringify(bad))).toThrow();expect(sha(readFileSync(path,'utf8'))).toBe(INPUT_SHA);});

// Invalid envelope probes only; no World, actor or persistent intent admitted.
test('retreat marker rejects getters before read, symbols, nonenumerable and own undefined',()=>{const c={version:261,atCore:0,tileCount:1,factionIds:new Set<number>(),mapIds:new Set<number>(),settlements:[]},record=(retreat261:object)=>({state:{memberIds:[7]},encounters261:{revision:1},retreat261});for(const key of ['revision','autoJoinable']){let reads=0;const marker:Record<string,unknown>={revision:1};Object.defineProperty(marker,key,{enumerable:true,get(){reads++;return key==='revision'?1:true;}});expect(validGroupEncounterFields261(record(marker),c,10)).toBe(false);expect(reads).toBe(0);}const hidden={};Object.defineProperty(hidden,'revision',{value:1,enumerable:false});for(const marker of [hidden,{revision:1,[Symbol('future')]:true},{revision:1,autoJoinable:undefined},{revision:undefined}])expect(validGroupEncounterFields261(record(marker),c,10)).toBe(false);});
