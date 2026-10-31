import {expect,test} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {enableWildlife} from '../src/sim/wildlife.ts';
import {animalNavigation,moveAnimal} from '../src/sim/wildlife-navigation.ts';
import {attachGeneratedAnimalGrowth256} from '../src/sim/animal-growth-runtime-256.ts';
import {adultAgeTicks} from '../src/sim/animal-life.ts';
import {initializeAnimalEggLayer256} from '../src/sim/animal-egg-local-v256.ts';
import {registeredMapId} from '../src/sim/world-map-context.ts';
import type {World} from '../src/sim/types.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';

type Case='eggLay'|'mating'|'areaReturn'|'maintain'|'attack';
/** Declared adult actor and already-selected canonical intent before the first
 * order. These cases qualify moveAnimal's real urgency capture, not job-giver
 * acquisition, generation, taming, lesson, maintenance or offspring outcomes. */
function prepared(kind:Case){
 const w=deconstructionCamp(0,32);enableWildlife(w,0);
 const species=kind==='eggLay'?'duck':kind==='areaReturn'?'labrador-retriever':(kind==='maintain'||kind==='attack')?'megascarab':'gazelle';
 const a:WildAnimal={id:w.nextId++,species,sex:kind==='mating'?'male':'female',ageTicks:adultAgeTicks(species),x:10,z:10,food:.1,rest:1,state:'moving',path:[{x:11,z:10},{x:12,z:10}],nextDecision:0};
 // Native7 stages require their original generation witness. The admitted
 // other species have their own intrinsic adult stage table.
 if(species==='gazelle')attachGeneratedAnimalGrowth256(a,0,298);
 w.wildlife!.animals.push(a);
 if(kind==='eggLay'){initializeAnimalEggLayer256(a);a.eggLayer!.progress=1;a.eggLay={target:{x:12,z:10},progress:0};}
 if(kind==='mating'){
  const female:WildAnimal={id:w.nextId++,species:'gazelle',sex:'female',ageTicks:adultAgeTicks('gazelle'),x:13,z:10,food:.1,rest:1,state:'idle',path:[],nextDecision:0};
  attachGeneratedAnimalGrowth256(female,0,298);w.wildlife!.animals.push(female);
  for(const p of [a,female])p.domestic={since:0,care:'none',tameness:5,nextDecay:6000};
  a.mating={femaleId:female.id,progress:0};
 }
 if(kind==='areaReturn'){
  const areaId=w.nextId++,mapId=registeredMapId(w)!;
  w.allowedAreas=[{id:areaId,label:'Prepared target',color:0x99aa77,cells:[10*w.width+12]}];
  a.domestic={since:0,care:'none',tameness:5,nextDecay:6000};
  a.animalMapAreas287={revision:1,assignments:[{mapId,choice:{kind:'allowed',areaId}}]};a.animalAreaReturn287={mapId,target:{x:12,z:10}};
 }
 if(kind==='maintain'||kind==='attack'){
  const hiveId=w.nextId++;
  a.hive={factionId:7,lordId:0,spawnerId:hiveId};a.hiveJob={kind:'maintain',hiveId,progressCore:0};
  w.structures.push({id:hiveId,kind:'insect-hive',x:13,z:10,orientation:0,footprint:'standard',factionId:7,
   caveHive:{revision:1,madeAtCore:0,awakeAtCore:0,chosenKind:'megascarab',spawnedPawnIds:[a.id],canSpawnPawns:false,nextPawnSpawnCore:-1,canSpawnHives:false,nextHiveSpawnCore:-1,wasActivated:false,jellyLeftCore:28000,podLeftCore:45000,healCore:0,maintenanceCore:60000}});
  w.wildlife!.hiveLords=[{id:0,factionId:7,aggressive:false,phase:'defend-expand',lastHarmCore:0,memberIds:[a.id],assignedHives:[{pawnId:a.id,hiveId}]}];
  if(kind==='attack'){const targetId=w.nextId++;w.structures.push({id:targetId,kind:'wall',x:13,z:11,orientation:0,footprint:'standard',material:'wood'});a.hiveJob={kind:'attack',targetId,structure:true};}
 }
 return {w,a};
}
function clearIntent(a:WildAnimal){delete a.eggLay;delete a.mating;delete a.animalAreaReturn287;delete a.hiveJob;}
function engage(w:World,a:WildAnimal){const nav=animalNavigation(w);expect(moveAnimal(w,a,nav.step)).toBe(true);return a.motion!;}

test.each(['eggLay','mating','areaReturn','maintain','attack'] as const)('the real producer captures default Jog for canonical %s while an ordinary wander remains Walk',kind=>{
 const {w,a}=prepared(kind),walk=structuredClone(a),jog=structuredClone(a);
 clearIntent(walk);clearIntent(jog);jog.flee={danger:{x:8,z:10},until:100};
 const rng=w.wildlife!.rng,nextId=w.nextId,edge=engage(w,a),jogEdge=engage(w,jog),walkEdge=engage(w,walk);
 // The existing purposeful Jog control uses the same species/stage/terrain;
 // absent a purposeful intent, native Walk's minimum is fifty Core.
 expect(edge.end-edge.start).toBe(jogEdge.end-jogEdge.start);
 expect(edge.end-edge.start).toBeLessThan(walkEdge.end-walkEdge.start);
 expect((walkEdge.end-walkEdge.start)*10).toBeGreaterThanOrEqual(50);
 expect(w.wildlife!.rng).toBe(rng);expect(w.nextId).toBe(nextId);
});

test('a newly visible purposeful intent cannot reprice a legacy edge already in flight',()=>{
 const {w,a}=prepared('mating');a.motion={from:{x:9,z:10},to:{x:10,z:10},start:0,end:3,speedFactor:1,terrainDelay:0};
 const old=a.motion,before=structuredClone(a),nav=animalNavigation(w);
 expect(moveAnimal(w,a,nav.step)).toBe(false);expect(a.motion).toBe(old);expect(a).toEqual(before);
});
