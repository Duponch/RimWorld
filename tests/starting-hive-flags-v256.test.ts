import {expect,test} from 'vitest';
import {START_STRUCTURE_PHYSICS_256} from '../src/sim/player-start-physics-256';
import {STARTING_PLACE_STRUCTURES_256} from '../src/sim/starting-place-facts-256';
import {captureStartingPlacePhysics256} from '../src/sim/starting-place-physics-256';
import {emptyGeographicLandscape256} from '../src/sim/generation';
import {spawnActualHive256} from '../src/sim/cave-hive-spawn-256';
import {validCaveHiveBuilding256} from '../src/sim/cave-hive-save-256';
import {validAncientCasketBuilding256} from '../src/sim/ancient-casket-physical-256';
import {WorldGenerationRandom} from '../src/sim/world-generation-random';
import {CORE_STARTING_ARRIVAL_PROFILE_256,type CoreStartingArrivalPending256} from '../src/sim/starting-pod-state-256';
import type {AncientCasket256} from '../src/sim/ancient-casket-state-256';
import type {World,StructureKind} from '../src/sim/types';

test('every admitted structure has explicit placement flags matching its physical DefID',()=>{
 const kinds=Object.keys(START_STRUCTURE_PHYSICS_256) as StructureKind[];
 expect(Object.keys(STARTING_PLACE_STRUCTURES_256).sort()).toEqual([...kinds].sort());
 for(const kind of kinds)expect(STARTING_PLACE_STRUCTURES_256[kind].defId).toBe(START_STRUCTURE_PHYSICS_256[kind].defId);
 for(const [kind,defId] of [['insect-hive','Hive'],['glow-pod','GlowPod']] as const){
  expect(STARTING_PLACE_STRUCTURES_256[kind]).toEqual({defId,workTable:false,preventDropping:false,maxItems:1,hasInteractionCell:false,interactionOffset:'(0,0,0)',multipleInteractionOffsets:''});
  expect(START_STRUCTURE_PHYSICS_256[kind]).toMatchObject({passability:1,edifice:true,door:false,fullFill:false});
 }
});

/** Prepared small physical context, not an executed world/seed/UI certificate.
 * The Hive is produced by its real builder; the empty ancient holder and
 * generated props retain their distinct physical kinds and footprints. */
function fixture(){
 const w=emptyGeographicLandscape256(50388,32,32);w.tiles=Array.from({length:1024},()=>({terrain:'soil-natural'}));w.nextId=100;
 w.site={revision:3,tileId:0,mapSeed:50388,biome:'temperate-forest',hilliness:'flat',river:'none',stones:['granite','slate'],coastAngle:null,mutatorCode:0};w.planet={revision:3} as World['planet'];
 w.worldFactions={revision:1,contentModel:'original-faction-content-v1',generatedAt:0,playerFactionId:1,nextFactionId:8,nextSettlementId:1,relations:[],settlements:[],leaders:[],factions:[{id:7,def:'Insect',hidden:true,name:'Insectes préparés',randomKey:7,colorFromSpectrum:0,leaderOwnerId:null}]};
 const made=spawnActualHive256(w,24*32+24,new WorldGenerationRandom(17),{adjacentPermutation:[0,1,2,3,4,5,6,7],adjacentUses:0,runtimeWildlifeRng:w.rng,enemyReproductionRateFactor:.5,lordIds:{nextId:0}},
  {spawnInsectsImmediately:false,canSpawnHives:true,canSpawnInsects:true,dormant:true,aggressive:true,spawnJellyImmediately:false});
 if(made.status!=='ready')throw Error(made.reason);
 const pod={id:w.nextId++,kind:'glow-pod' as const,x:27,z:30,orientation:0 as const,footprint:'standard' as const,factionId:7,glowPod:{revision:1 as const,madeAtCore:0,ageCore:-1}};w.structures.push(pod);
 const casket:AncientCasket256={id:w.nextId++,kind:'ancient-cryptosleep-casket',x:4,z:4,orientation:0,footprint:'standard',factionId:null,casket:{revision:1,groupId:0,contentsKnown:false,heldAt:0,humans:[],animals:[],items:[]}};w.structures.push(casket);
 for(const [kind,x,z] of [['column',2,9],['urn',5,9],['stele-large',8,9],['stele-grand',12,9],['sarcophagus',17,9],['ancient-road-barrier',2,15],['ancient-road-lamp',6,15],['ship-chunk',10,15],['torch-lamp',14,15],['electric-stove',16,20],['wall',3,20]] as const)w.structures.push({id:w.nextId++,kind,x,z,orientation:0,footprint:'standard'});
 const arrival:CoreStartingArrivalPending256={profile:CORE_STARTING_ARRIVAL_PROFILE_256,phase:'landed',start:0,landAt:0,openAt:110,personalTick:0,atCore:0,pods:[],openedCells:[]};
 return {w,hive:made.hive,pod,casket,arrival};
}

test('the real placement capture accepts Hive, GlowPod, casket, ruins and road props without losing distinct flags',()=>{
 const {w,hive,pod,casket,arrival}=fixture();expect(validCaveHiveBuilding256(hive,256,w)).toBe(true);expect(validCaveHiveBuilding256(pod,256,w)).toBe(true);expect(validAncientCasketBuilding256(casket,256,w,w.tick)).toBe(true);
 const before=JSON.stringify(w),read=captureStartingPlacePhysics256(w,arrival,{x:16,z:16},new Map(),[]),thing={id:900,category:'item' as const,quantity:1,stackLimit:75,downed:false,saveCompressible:false};
 for(const s of [hive,pod,casket])expect(read(s,thing)).toMatchObject({fullFill:false,preventDropping:false,door:false,workTable:false,maxItems:1});
 expect(read({x:16,z:20},thing).workTable).toBe(true);expect(read({x:3,z:20},thing).fullFill).toBe(true);
 expect(STARTING_PLACE_STRUCTURES_256['ancient-cryptosleep-casket']).toMatchObject({hasInteractionCell:true,interactionOffset:'(1,0,0)'});
 expect(STARTING_PLACE_STRUCTURES_256['insect-hive'].hasInteractionCell).toBe(false);expect(STARTING_PLACE_STRUCTURES_256['glow-pod'].hasInteractionCell).toBe(false);
 expect(JSON.stringify(w)).toBe(before);
});

test('an unregistered physical kind still refuses before any placement or owner mutation',()=>{
 const {w,arrival}=fixture();w.structures.push({id:w.nextId++,kind:'unknown-starting-kind' as StructureKind,x:30,z:30,orientation:0,footprint:'standard'});
 const before=JSON.stringify(w);expect(()=>captureStartingPlacePhysics256(w,arrival,{x:16,z:16},new Map(),[])).toThrow();expect(JSON.stringify(w)).toBe(before);
});
