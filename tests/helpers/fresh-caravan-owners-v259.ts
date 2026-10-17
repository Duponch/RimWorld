import {expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {generateGeographicWorldDraft256} from '../../src/sim/world-geographic-draft.ts';
import {defaultWorldGenerationSettings} from '../../src/sim/world-generation-settings.ts';
import {captureGeneratedGeography256} from '../../src/sim/world-geography-owner-256.ts';
import {createGeographicNewGame256} from '../../src/sim/geographic-new-game-256.ts';
import {ACTUAL_SHRINES_750_256} from '../../src/sim/ancient-temple-orchestration-256.ts';
import {createStartingCandidateRoster} from '../../src/sim/starting-candidates.ts';
import {startingOriginalRequestFromRoster256} from '../../src/sim/starting-original-request-256.ts';
import {prepareActualCampEntry256,prepareActualSettlementEntry257} from '../../src/sim/group-camp-entry-256.ts';
import {registeredMap,registeredMapId,flushRegisteredMap} from '../../src/sim/world-map-context.ts';
import {serializeCampaign,deserializeCampaign,validateWorld} from '../../src/sim/serialization.ts';
import {campaignPresentation} from '../../src/sim/secondary-site-presentation.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../../src/bridge/snapshots.ts';
import {GroupCampaignRuntime256} from '../../src/sim/group-campaign-runtime-256.ts';
import {GroupCaravanPhysical256} from '../../src/sim/group-caravan-physical-256.ts';
import {createGroupCampaignGeometry256} from '../../src/sim/group-campaign-geometry-256.ts';
import {preparePlanetNavigation256} from '../../src/sim/planet-route-256.ts';
import {applyCommand,stepWorld} from '../../src/sim/engine.ts';
import {enableRaids} from '../../src/sim/raids.ts';
import {createRaidGroup} from '../../src/sim/raid-spawn.ts';
import {raidEntries} from '../../src/sim/raid-space.ts';
import {createMedicalRecord,addResolvedInjury,medicalStatus} from '../../src/sim/injury-state.ts';
import {reconcilePawnHealth} from '../../src/sim/health.ts';
import {addMaterial,refreshStock} from '../../src/sim/materials.ts';
import {dropRetainingIdentity} from '../../src/sim/ground-placement.ts';
import {caravanPawnCapacityGrams256} from '../../src/sim/group-animal-capacity-256.ts';
import {writeTestFileSync} from '../test-output.ts';
import type {CampaignState} from '../../src/sim/world-map-state.ts';
import type {World,Pawn,Command} from '../../src/sim/types.ts';
import type {AwayGroup,PreparingGroup} from '../../src/sim/group-capture.ts';
import type {WildAnimal} from '../../src/sim/wildlife-state.ts';

export function drain259<Y,T>(iterator:Generator<Y,T,void>):T {let step=iterator.next();while(!step.done)step=iterator.next();return step.value;}
export function checkpoint259(root:CampaignState,label:string):string {
 try{const raw=serializeCampaign(root);writeTestFileSync(`artifacts/caravan-owners-v259/${label}.json`,raw);return raw;}
 catch(error){writeTestFileSync(`artifacts/caravan-owners-v259/${label}-INVALID-DIAGNOSTIC.json`,JSON.stringify(root));writeTestFileSync(`artifacts/caravan-owners-v259/${label}-INVALID-ERROR.txt`,String(error));throw error;}
}
export function require259(root:CampaignState):asserts root is World {
 if(Number(root.schemaVersion)!==259||root.planet?.revision!==3||!root.worldFactions||!root.worldPawns||!root.worldMaps?.generationRuntime||!('pawns'in root))throw Error('True259 geographic campaign producers are required before this QA');
 expect(validateWorld(root)).toEqual([]);
}
/** Exactly one new globe and genuine250² Crashlanded factory per invocation.
 * Fixed previously observed V408 world choices are declared; no seed retry,
 * terrain repair, favorable-site search, old save or metadata graft occurs.
 */
export function fresh259(){
 const resume=process.env.ELSEWHERE_OWNER259_RESUME_INITIAL;
 if(resume){
  const raw=readFileSync(resume,'utf8'),sha=process.env.ELSEWHERE_OWNER259_RESUME_INITIAL_SHA256;
  if(!sha||createHash('sha256').update(raw).digest('hex')!==sha)throw Error('Exact acquired initial checkpoint SHA256 required');
  const root=deserializeCampaign(raw);require259(root);
  if(root.tick!==0||root.width!==250||root.height!==250||root.planet!.revision!==3||root.planet!.geography.surface.seedText!=='Camp2274 preview 256 🌲'||root.planet!.homeTile!==50388||root.startingArrival?.phase!=='incoming'||root.worldMaps!.sites.length!==1)throw Error('Resume only the exact new factory before its first tick, never an older played branch');
  const originals=root.startingArrival.pods.map(p=>p.pawn),run=actual259(root);run.until(()=>root.startingArrival?.phase==='opened',500);expect(root.pawns).toEqual(expect.arrayContaining(originals));return run;
 }
 const settings:ReturnType<typeof defaultWorldGenerationSettings>={...defaultWorldGenerationSettings(),rainfall:4,temperature:2};
 const draft=drain259(generateGeographicWorldDraft256({seed:'Camp2274 preview 256 🌲',settings,tick:0,nextThingId:1,playerDef:'PlayerColony',playerName:'QA259 neuve'}));
 const geography=captureGeneratedGeography256(draft),roster=createStartingCandidateRoster(259017),startingParty=startingOriginalRequestFromRoster256(259017,roster);
 const root=drain259(createGeographicNewGame256({draft,geography,tile:50388,size:250,scenario:'crashlanded',startingParty},{shrines750:ACTUAL_SHRINES_750_256}));require259(root);
 const originals=root.startingArrival&&'pods'in root.startingArrival?root.startingArrival.pods.map(p=>p.pawn):[];
 if(originals.length!==3||originals.some(p=>p.worldAffiliation259?.factionId!==root.worldFactions!.playerFactionId||p.worldAffiliation259.hostFactionId!==null))throw Error('Starting roster259 header missing at its real birth, before capsule opening');
 if(root.worldFactions!.factions.some(f=>!f.lifecycle259)||root.worldFactions!.leaders.some(l=>l.pawn.worldAffiliation259?.factionId!==l.factionId))throw Error('Faction/leader259 producer missing at true new-world birth');
 checkpoint259(root,'new-game-before-first-tick');const run=actual259(root);run.until(()=>root.startingArrival?.phase==='opened',500);expect(root.pawns).toEqual(expect.arrayContaining(originals));return run;
}
export function actual259(root:World){
 require259(root);if(root.planet?.revision===3)preparePlanetNavigation256(root.planet);const runtime=new GroupCampaignRuntime256(createGroupCampaignGeometry256(root),new GroupCaravanPhysical256());runtime.bootstrap(root);
 const command=(c:Command)=>{const result=applyCommand(root,c,runtime);if(!result.ok)checkpoint259(root,`command-refused-${c.type}`);expect(result.ok,result.reason??JSON.stringify(c)).toBe(true);};
 const step=()=>stepWorld(root,1,undefined,runtime);
 const until=(done:()=>boolean,limit=4000)=>{for(let n=0;n<limit&&!done();n++)step();if(!done()){checkpoint259(root,'failed-boundary');throw Error(`259 bounded progression failed at tick${root.tick}`);}};
 const local=(id=root.worldMaps!.selectedMapId!)=>{const map=registeredMap(root,id);if(!map)throw Error('Actual local map missing');return map;};
 const state=(id:number)=>root.worldGroups!.groups.find(r=>r.state.id===id)?.state;
 const preparing=(id:number)=>{const g=state(id);if(!g||!('manifest'in g))throw Error('Actual formation absent');return g as PreparingGroup;};
 const away=(id:number)=>{const g=state(id);if(!g||!('members'in g))throw Error('Actual away caravan absent');return g as AwayGroup;};
 return {root,runtime,command,step,until,local,state,preparing,away};
}
export type Actual259=ReturnType<typeof actual259>;
/** Initial finite supplies are declared prepared on their actual LOCAL holder,
 * before the next scenario baseline. No travel receipt or holder is fabricated.
 */
export function preparedFood259(map:World,holder:Pawn|WildAnimal){
 for(const [item,quantity]of [['survival-meal',10],['berries',2],['pemmican',2],['simple-meal',2],['simple-meal',3]] as const)addMaterial(map,'food',quantity,{type:'inventory',pawnId:holder.id},item);
 refreshStock(map);flushRegisteredMap(map);
}
/** Preparation repair only: the starter cat has no caravan carrying capacity.
 * Its erroneously prepared supplies use the real local drop/placement kernel,
 * preserving every pile and quantity at its actual holder, before baseline.
 * Never called by product formation or automatically for a played inventory. */
export function dropPreparedPetSupplies259(map:World,pet:WildAnimal){
 if(caravanPawnCapacityGrams256(pet)!==0)return;
 for(const pile of map.piles.filter(p=>p.owner.type==='inventory'&&p.owner.pawnId===pet.id))if(!dropRetainingIdentity(map,pile,pet))throw Error('Prepared non-carrier supplies have no real ground placement');
 refreshStock(map);flushRegisteredMap(map);
}
export function start259(run:Actual259,map:World,members:readonly Pawn[],destination:number,animalIds:readonly number[]=[]){
 run.command({type:'group-start',originMapId:registeredMapId(map)!,memberIds:members.map(p=>p.id),animalIds:[...animalIds],sources:[],destination});
 const id=run.root.worldGroups!.selectedGroupId!;expect(run.preparing(id).admission?.revision).toBe(2);return id;
}
export function camp259(run:Actual259,id:number){
 run.until(()=>run.away(id).phase==='at-site',10000);
 const before=serializeCampaign(run.root),entry=drain259(prepareActualCampEntry256(run.root,id));expect(serializeCampaign(run.root)).toBe(before);
 if(entry.status!=='ready'){checkpoint259(run.root,'camp-entry-refused');throw Error(`${entry.phase}: ${entry.reason}`);}
 const result=entry.commit();expect(result.ok,result.reason).toBe(true);const map=run.local();expect(map.width).toBe(200);expect(map.height).toBe(200);return map;
}
/** Existing incident constructor chooses a real Pirate instance at birth.
 * Initial bruises declare this QA patient's condition before formation baseline;
 * there is no fabricated capture, faction, guest status or live Raid metadata.
 */
export function newDownedRaider259(run:Actual259,map:World):Pawn {
 enableRaids(map);const sites=raidEntries(map,map.raids!.rng,1);if(!sites)throw Error('Actual incident producer has no physical edge entry');
 const group=createRaidGroup(map,{count:1,sites,random:{rng:map.raids!.rng}});if(!group)throw Error('Actual new Pirate incident refused');
 const patient=map.pawns.find(p=>p.id===group.members[0])!;
 if(!patient.worldAffiliation259||patient.worldAffiliation259.factionId===map.worldFactions!.playerFactionId||patient.worldAffiliation259.hostFactionId!==null||patient.prisoner)throw Error('Pirate259 birth producer is not connected');
 // The real raid moves inland before the declared initial injury. No body is
 // teleported away from its true edge entry to manufacture a carry journey.
 run.until(()=>Math.min(patient.x,patient.z,map.width-1-patient.x,map.height-1-patient.z)>=12,1800);
 patient.health??=createMedicalRecord(map.tick);for(const part of ['left-arm','right-arm','left-leg','right-leg'] as const)addResolvedInjury(patient.health,part,'bruise',16000,()=>.9);addResolvedInjury(patient.health,'torso','bruise',8000,()=>.9);expect(medicalStatus(patient.health)).toBe('downed');reconcilePawnHealth(map,patient,undefined,true);flushRegisteredMap(map);return patient;
}
/** Same-tick full and changed delta, exact RAW and one true interval replay.
 * Every encoder witness is a detached capture, never a mutable prior World.
 */
export function transport259(run:Actual259,label:string){
 const raw=checkpoint259(run.root,label),copy=deserializeCampaign(raw);require259(copy);expect(serializeCampaign(copy)).toBe(raw);
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();let packet=decoder.adopt(structuredClone(encoder.encode(run.root,0,0)));expect(packet.status).toBe('applied');if(packet.status!=='applied')throw Error('Full259 rejected');expect(packet.world).toEqual(campaignPresentation(run.root));
 const replay=actual259(copy),selected=run.root.worldGroups!.selectedGroupId;
 run.command({type:'group-select',groupId:null});replay.command({type:'group-select',groupId:null});
 packet=decoder.adopt(structuredClone(encoder.encode(run.root,0,0)));expect(packet.status).toBe('applied');if(packet.status!=='applied')throw Error('Delta259 rejected');expect(packet.world).toEqual(campaignPresentation(run.root));
 if(selected!==null){run.command({type:'group-select',groupId:selected});replay.command({type:'group-select',groupId:selected});}
 run.step();replay.step();const exact=serializeCampaign(run.root);expect(serializeCampaign(copy)).toBe(exact);writeTestFileSync(`artifacts/caravan-owners-v259/${label}-after-exact-interval.json`,exact);return run;
}
/** Called on a replay branch containing the actual captured original(s).
 * Real map-abandon must transfer rather than duplicate compact living records.
 */
export function removed259(run:Actual259,mapId:number,originalIds:readonly number[]){
 const result=applyCommand(run.root,{type:'map-abandon',mapId,confirm:true},run.runtime);expect(result.ok,result.reason).toBe(true);
 expect(run.root.worldMaps!.retired.some(r=>r.id===mapId)).toBe(true);const compact=run.root.worldGroups!.abandonedContents.find(c=>c.mapId===mapId)!;
 for(const id of originalIds){const rows=run.root.worldPawns!.owners.filter(r=>r.actor.id===id);expect(rows).toHaveLength(1);expect(compact.humans.some(h=>h.id===id)).toBe(false);if(rows[0]!.kind==='human')expect(rows[0]!.actor.worldAffiliation259).toMatchObject({hostFactionId:null,guestStatus:'Guest'});}
 transport259(run,'actual-MapRemoved-no-compact-duplicate');
}
/** Only after the real max1 campaign has abandoned its former settlement(s).
 * Uses private LaterGeoSettle API after ROOT hunk integration; no Camp shortcut.
 */
export function laterGeoSettle259(run:Actual259,id:number){
 expect(run.root.worldMaps!.sites.filter(m=>m.kind==='settlement')).toHaveLength(0);const g=run.away(id),people=[...g.members],things=[...g.items],tick=run.root.tick;
 const entry=drain259(prepareActualSettlementEntry257(run.root,id));if(entry.status!=='ready')throw Error(`${entry.phase}: ${entry.reason}`);
 const result=entry.commit();expect(result.ok,result.reason).toBe(true);const map=run.local();expect(map.width).toBe(250);expect(map.height).toBe(250);expect(run.root.tick).toBe(tick);expect(map).not.toHaveProperty('startingArrival');expect(map.pawns).toEqual(expect.arrayContaining(people));for(const p of things)expect(map.piles).toContain(p);expect(run.root.worldMaps!.sites.filter(m=>m.kind==='settlement')).toHaveLength(1);return map;
}
