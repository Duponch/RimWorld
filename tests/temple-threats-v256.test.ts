import {expect,test} from 'vitest';
import {emptyGeographicLandscape256,generateWorld} from '../src/sim/generation.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {spawnFunctionalTempleThreat256} from '../src/sim/temple-threat-generation-256.ts';
import {mechanicalDuty256,wakeTempleMechGroup256,validTempleMechField256} from '../src/sim/temple-mech-duty-256.ts';
import {validMechanoidShape,validateMechanoids} from '../src/sim/mechanoid-save.ts';
import {finishExplorationReveal256} from '../src/sim/exploration-runtime-256.ts';
import {processMechanoidCombat} from '../src/sim/mechanoid-combat.ts';
import {admitMechanoidRangedOrder,mechanoidRangedQueries} from '../src/sim/mechanoid-ranged.ts';
import {captureWorldShotGrid} from '../src/sim/combat-world.ts';
import {blockedCells} from '../src/sim/pathfinding.ts';
import {activeCombatThreat} from '../src/sim/combat-target.ts';
import {createMechaMedicalRecord,commitMechanoidImpact} from '../src/sim/mechanoid-health.ts';
import {addResolvedInjury} from '../src/sim/injury-state.ts';
import {validCaveHiveBuilding256,validateCaveHiveOwners256} from '../src/sim/cave-hive-save-256.ts';
import {planActualHiveRuntime256} from '../src/sim/cave-hive-runtime-256.ts';
import {spawnActualHive256,CAVE_HIVE_INITIAL_OPTIONS_256} from '../src/sim/cave-hive-spawn-256.ts';
import {planTempleHiveItemsAside256} from '../src/sim/temple-hive-items-256.ts';
import {enabledHivePoints256,createFunctionalHiveInsect256} from '../src/sim/temple-hive-production-256.ts';
import type {World} from '../src/sim/types.ts';
import type {ActualHive256} from '../src/sim/cave-hive-state-256.ts';
import type {HiveRuntimeFrontier256} from '../src/sim/cave-hive-runtime-256.ts';

/** Small prepared physical fixtures for isolated owners and transitions. The
 * planet marker is deliberately partial: these are never factory/RAW-world,
 * native observer, full snapshot or seed-parity certificates. */
function fixture():World {
 const w=emptyGeographicLandscape256(991,32,32);w.tiles=Array.from({length:1024},()=>({terrain:'soil-natural'}));w.nextId=100;
 w.site={revision:3,tileId:0,mapSeed:991,biome:'temperate-forest',hilliness:'flat',river:'none',stones:['granite','slate'],coastAngle:null,mutatorCode:0};
 w.planet={revision:3} as World['planet'];w.campaignMap={revision:2,nextLordId:100} as World['campaignMap'];
 w.worldFactions={revision:1,contentModel:'original-faction-content-v1',generatedAt:0,playerFactionId:1,nextFactionId:9,nextSettlementId:1,relations:[],settlements:[],leaders:[],factions:[
  {id:7,def:'Insect',hidden:true,name:'Insectes préparés',randomKey:7,colorFromSpectrum:0,leaderOwnerId:null},
  {id:8,def:'Mechanoid',hidden:true,name:'Mécanoïdes préparés',randomKey:8,colorFromSpectrum:0,leaderOwnerId:null}]};
 w.gameProfile={revision:1,storyteller:'cassandra-partial',difficulty:'adventure-story',saveMode:'reloadable'};return w;
}
const rectangle={minX:10,minZ:10,maxX:20,maxZ:20};
const owners=()=>({lordIds:{nextId:0},working:{adjacentPermutation:[0,1,2,3,4,5,6,7],adjacentUses:0}});
function fog(w:World){w.exploration={revision:1};for(const t of w.tiles)t.fogged=true;}
function templeHive(w:World){const own=owners();spawnFunctionalTempleThreat256(w,rectangle,{kind:'hives',count:1},new WorldGenerationRandom(441),own);return {hive:w.structures.find((s):s is ActualHive256=>s.kind==='insect-hive')!,context:{...own.working,lordIds:own.lordIds,enemyReproductionRateFactor:.5} satisfies HiveRuntimeFrontier256};}
function commit(w:World,context:HiveRuntimeFrontier256){const p=planActualHiveRuntime256(w,context);if(p.status!=='ready')throw Error(p.reason);expect(p.commit()).toBe(true);}

test('Temple mechanical originals sleep outside the raid calendar and resume their closed format',()=>{
 const w=fixture(),o=owners();spawnFunctionalTempleThreat256(w,rectangle,{kind:'mechs',count:5},new WorldGenerationRandom(441),o);
 expect(w.mechanoids).toHaveLength(5);expect(o.lordIds.nextId).toBe(1);expect(w.nextId).toBe(105);expect(w.raids).toBeUndefined();
 expect(w.mechanoids!.every(m=>m.temple?.group===0&&m.temple.awakeAtCore===null&&!m.raid&&!activeCombatThreat(m))).toBe(true);
 for(const m of w.mechanoids!){expect(['scyther','lancer','pikeman']).toContain(m.mechKind);expect(validMechanoidShape(JSON.parse(JSON.stringify(m)),256,0)).toBe(true);expect(validMechanoidShape(m,255,0)).toBe(false);expect(mechanicalDuty256(w,m)).toBeUndefined();}
 expect(validateMechanoids(w)).toEqual([]);
});

test('real reveal wakes every member exactly once, retaining IDs and leaving raid opportunities alone',()=>{
 const w=fixture();spawnFunctionalTempleThreat256(w,rectangle,{kind:'mechs',count:3},new WorldGenerationRandom(5),owners());fog(w);w.tick=1;
 const members=[...w.mechanoids!],seen=members[0]!,ids=members.map(m=>m.id),nextId=w.nextId,rng=w.rng;
 finishExplorationReveal256(w,{changedCells:[],interiorCells:[]});expect(seen.temple!.awakeAtCore).toBeNull();
 const cell=seen.z*w.width+seen.x;delete w.tiles[cell]!.fogged;finishExplorationReveal256(w,{changedCells:[cell],interiorCells:[cell]});
 expect(w.mechanoids).toEqual(members);expect(members.map(m=>m.id)).toEqual(ids);expect(members.every(m=>m.temple!.awakeAtCore===10&&mechanicalDuty256(w,m)?.phase==='assault')).toBe(true);
 const count=w.events.length;wakeTempleMechGroup256(w,seen,10);expect(w.events).toHaveLength(count);expect(w.nextId).toBe(nextId);expect(w.rng).toBe(rng);expect(w.raids).toBeUndefined();
});

test('real accepted mechanical harm wakes the group before assault, without a synthetic active raid',()=>{
 const w=fixture();spawnFunctionalTempleThreat256(w,rectangle,{kind:'mechs',count:2},new WorldGenerationRandom(81),owners());w.tick=1;
 const m=w.mechanoids![0]!,record=createMechaMedicalRecord(1,m.mechKind),part=`${m.mechKind}-thorax` as const;
 addResolvedInjury(record,part,'bruise',1000,()=>.9);
 expect(commitMechanoidImpact(w,m,record,{rng:w.rng},10)).toBe(true);expect(m.health!.injuries).toHaveLength(1);
 expect(w.mechanoids!.every(m=>m.temple!.awakeAtCore===10)).toBe(true);expect(w.raids).toBeUndefined();
});

test('the common melee decision spends no search while asleep and acquires actual contact after wake',()=>{
 const w=fixture(),o=owners();spawnFunctionalTempleThreat256(w,rectangle,{kind:'mechs',count:1},new WorldGenerationRandom(5),o);w.tick=1;
 const m=w.mechanoids![0]!;m.mechKind='scyther';m.x=15;m.z=15;
 const p=generateWorld(3,32,32).pawns[0]!;p.id=10;p.x=16;p.z=15;w.pawns=[p];
 const budget={remaining:3,pairs:32768},getBlocked=()=>new Uint8Array(1024),unusedLight=()=>{throw Error('Contact must not travel');};
 processMechanoidCombat(w,m,getBlocked,budget,unusedLight);expect(budget).toEqual({remaining:3,pairs:32768});expect(m.melee).toBeUndefined();
 wakeTempleMechGroup256(w,m,10);processMechanoidCombat(w,m,getBlocked,budget,unusedLight);expect(m.melee?.order?.targetId).toBe(p.id);expect(w.raids).toBeUndefined();
});

test('Temple membership rejects accessors/undefined, sleeping intentions and inconsistent groups',()=>{
 const w=fixture();spawnFunctionalTempleThreat256(w,rectangle,{kind:'mechs',count:2},new WorldGenerationRandom(5),owners());const m=w.mechanoids![0]!;
 let reads=0;const forged={...m};Object.defineProperty(forged,'temple',{enumerable:true,get(){reads++;return m.temple;}});expect(validTempleMechField256(forged,256,0)).toBe(false);expect(reads).toBe(0);
 expect(validTempleMechField256({...m,temple:undefined},256,0)).toBe(false);expect(validTempleMechField256({...m,path:[{x:m.x+1,z:m.z}]},256,0)).toBe(false);
 w.tick=1;m.temple!.awakeAtCore=10;expect(validateMechanoids(w)).toContain('Inconsistent Temple mechanical wake state');
});

test('the existing ranged admission accepts an awake Temple duty without borrowing mechActive',()=>{
 const w=fixture();spawnFunctionalTempleThreat256(w,rectangle,{kind:'mechs',count:1},new WorldGenerationRandom(5),owners());w.tick=1;
 const m=w.mechanoids![0]!;m.mechKind='lancer';m.x=15;m.z=15;const p=generateWorld(3,32,32).pawns[0]!;p.id=10;p.x=20;p.z=15;w.pawns=[p];
 const order={targetKey:`pawn:${p.id}` as const,cell:{x:m.x,z:m.z},path:[]},grid=captureWorldShotGrid(w),blocked=blockedCells(w,true),queries=mechanoidRangedQueries(w,()=>grid,()=>blocked);
 expect(admitMechanoidRangedOrder(w,m,order,10,queries)).toBe(false);wakeTempleMechGroup256(w,m,10);expect(admitMechanoidRangedOrder(w,m,order,10,queries)).toBe(true);
 expect(m.ranged?.stance?.phase).toBe('warmup');expect(m.temple!.goal).toEqual({x:15,z:15});expect(w.raids).toBeUndefined();expect(validateMechanoids(w)).toEqual([]);
});

test('Temple Hive birth has real dormant enabled components and no immediate insect cohort',()=>{
 const w=fixture(),{hive,context}=templeHive(w);expect(w.wildlife!.animals).toEqual([]);expect(hive.caveHive).toMatchObject({temple:true,awakeAtCore:null,canSpawnPawns:true,canSpawnHives:true,nextPawnSpawnCore:-1,wasActivated:false});
 expect(validCaveHiveBuilding256(JSON.parse(JSON.stringify(hive)),256,w)).toBe(true);expect(validCaveHiveBuilding256(hive,255,w)).toBe(false);expect(validateCaveHiveOwners256(w,256,context.lordIds)).toEqual([]);
 const invalid=structuredClone(hive);delete invalid.caveHive.temple;expect(validCaveHiveBuilding256(invalid,256,w)).toBe(false);
 invalid.caveHive.temple=true;invalid.caveHive.spawnedPawnIds=[4];expect(validCaveHiveBuilding256(invalid,256,w)).toBe(false);
});

test('fogged Hive keeps production, reproduction and maintenance stopped across the actual tick',()=>{
 const w=fixture(),{hive,context}=templeHive(w);fog(w);const before={jelly:hive.caveHive.jellyLeftCore,pod:hive.caveHive.podLeftCore,nextHive:hive.caveHive.nextHiveSpawnCore,nextId:w.nextId,rng:w.rng};w.tick=1;commit(w,context);
 expect(hive.caveHive).toMatchObject({awakeAtCore:null,nextPawnSpawnCore:-1,wasActivated:false,maintenanceCore:0,jellyLeftCore:before.jelly,podLeftCore:before.pod,nextHiveSpawnCore:before.nextHive});expect(w.wildlife!.animals).toEqual([]);expect(w.nextId).toBe(before.nextId);expect(w.rng).toBe(before.rng);expect(validCaveHiveBuilding256(hive,256,w)).toBe(true);
});

test('unfog produces the initial real cohort, then the due clock adds a new original and preserves the earlier ones',()=>{
 const w=fixture(),{hive,context}=templeHive(w);fog(w);delete w.tiles[hive.z*w.width+hive.x]!.fogged;w.tick=1;commit(w,context);
 expect(hive.caveHive.awakeAtCore).toBe(1);expect(enabledHivePoints256(w,hive)).toBeGreaterThanOrEqual(200);expect(enabledHivePoints256(w,hive)).toBeLessThanOrEqual(500);
 const originals=[...w.wildlife!.animals],ids=originals.map(a=>a.id),next=w.nextId;expect(originals.every(a=>a.hive?.spawnerId===hive.id&&a.growthTracker?.value===1)).toBe(true);expect(validateCaveHiveOwners256(w,256,context.lordIds)).toEqual([]);
 hive.caveHive.nextPawnSpawnCore=11;w.tick=2;commit(w,context);expect(w.wildlife!.animals.length).toBeGreaterThan(originals.length);for(const a of originals)expect(w.wildlife!.animals.find(p=>p.id===a.id)).toBe(a);expect(w.wildlife!.animals.some(a=>a.id>=next&&!ids.includes(a.id))).toBe(true);expect(hive.caveHive.nextPawnSpawnCore).toBeGreaterThan(20);
});

test('a due enabled Hive really reproduces a child under its roof and advances the shared allocators once',()=>{
 const w=fixture(),{hive,context}=templeHive(w);fog(w);delete w.tiles[hive.z*w.width+hive.x]!.fogged;w.tick=1;commit(w,context);
 w.roofing={constructed:w.tiles.map((_,i)=>i),build:[],remove:[],cursor:0};hive.caveHive.nextHiveSpawnCore=11;const before=w.nextId;w.tick=2;commit(w,context);
 const children=w.structures.filter((s):s is ActualHive256=>s.kind==='insect-hive'&&s!==hive);expect(children).toHaveLength(1);expect(children[0]!.id).toBeGreaterThanOrEqual(before);expect(children[0]!.caveHive).toMatchObject({temple:true,madeAtCore:11,awakeAtCore:11,lastCore:20,canSpawnPawns:true,canSpawnHives:true});expect(hive.caveHive.nextHiveSpawnCore).toBeGreaterThan(20);expect(validateCaveHiveOwners256(w,256,context.lordIds)).toEqual([]);
});

test('a stale enabled production plan adopts neither insects, IDs, RNG nor component continuation',()=>{
 const w=fixture(),{hive,context}=templeHive(w);fog(w);delete w.tiles[hive.z*w.width+hive.x]!.fogged;w.tick=1;const before=JSON.stringify({hive:hive.caveHive,wildlife:w.wildlife,rng:w.rng,lord:context.lordIds});
 const plan=planActualHiveRuntime256(w,context);if(plan.status!=='ready')throw Error(plan.reason);expect(JSON.stringify({hive:hive.caveHive,wildlife:w.wildlife,rng:w.rng,lord:context.lordIds})).toBe(before);w.nextId++;expect(plan.commit()).toBe(false);expect(JSON.stringify({hive:hive.caveHive,wildlife:w.wildlife,rng:w.rng,lord:context.lordIds})).toBe(before);
});

test('ground-item relocation preflights every original and commits without loss, merge or new ID',()=>{
 const w=fixture(),cell=15*32+15;w.piles=[{id:20,kind:'wood',item:'wood',quantity:7,owner:{type:'ground',x:15,z:15}},{id:21,kind:'gold',item:'gold',quantity:3,owner:{type:'ground',x:15,z:15}}];
 w.packed=[{building:{id:22,kind:'stool',x:15,z:15,orientation:0,footprint:'standard'},owner:{type:'ground',x:15,z:15}}];const pack=w.packed[0]!,building=pack.building;
 const originals=[...w.piles],next=w.nextId,before=JSON.stringify(w.piles),plan=planTempleHiveItemsAside256(w,cell);expect(plan).not.toBeNull();expect(JSON.stringify(w.piles)).toBe(before);expect(plan!.commit()).toBe(true);expect(plan!.commit()).toBe(false);expect(w.piles).toEqual(originals);expect(w.piles.map(p=>[p.id,p.quantity])).toEqual([[20,7],[21,3]]);expect(w.nextId).toBe(next);expect(w.piles.every(p=>p.owner.type==='ground'&&(p.owner.x!==15||p.owner.z!==15))).toBe(true);expect(w.packed[0]).toBe(pack);expect(pack.building).toBe(building);expect(pack.owner).not.toEqual({type:'ground',x:15,z:15});
 const closed=fixture();closed.tiles=Array.from({length:1024},()=>({terrain:'water-deep'}));closed.tiles[cell]={terrain:'soil-natural'};closed.piles=structuredClone(originals).map(p=>({...p,owner:{type:'ground' as const,x:15,z:15}}));const frozen=JSON.stringify(closed.piles);expect(planTempleHiveItemsAside256(closed,cell)).toBeNull();expect(JSON.stringify(closed.piles)).toBe(frozen);
});

test('initial1120 can create a prospective insect without consuming or rewriting a retained same-species original',()=>{
 const retained=createFunctionalHiveInsect256({species:'megascarab',id:10,cell:{x:1,z:1},tick:0,random:new WorldGenerationRandom(8)}),before=JSON.stringify(retained),w=fixture(),o=owners();
 const made=spawnActualHive256(w,15*32+15,new WorldGenerationRandom(55),{...o.working,lordIds:o.lordIds,enemyReproductionRateFactor:.5,runtimeWildlifeRng:w.rng,unspawnedAnimals:[retained]},CAVE_HIVE_INITIAL_OPTIONS_256);
 expect(made.status).toBe('ready');expect(w.wildlife!.animals.length).toBeGreaterThan(0);expect(w.wildlife!.animals.every(a=>a.id!==retained.id)).toBe(true);expect(JSON.stringify(retained)).toBe(before);expect(w.wildlife!.animals).not.toContain(retained);
});
