import {expect,test} from 'vitest';
import {emptyGeographicLandscape256} from '../src/sim/generation';
import {spawnActualHive256} from '../src/sim/cave-hive-spawn-256';
import {planActualHiveRuntime256} from '../src/sim/cave-hive-runtime-256';
import {depositHiveSlime256} from '../src/sim/cave-hive-filth-256';
import {WorldGenerationRandom} from '../src/sim/world-generation-random';
import type {World} from '../src/sim/types';

// Isolated physical-owner fixture reused from starting-hive-flags-v256 and
// temple-threats-v256. Partial Planet marker is deliberate: NOT an admitted
// World, serialized SAVE, played Engine, Native or seed-parity certificate.
// Schema/tick below are declared fixture inputs before any owner is captured.
function fixture(version:296|297|298){
 const w=emptyGeographicLandscape256(991,32,32);w.tiles=Array.from({length:1024},()=>({terrain:'soil-natural'}));w.nextId=100;
 (w as unknown as {schemaVersion:number}).schemaVersion=version;
 w.site={revision:3,tileId:0,mapSeed:991,biome:'temperate-forest',hilliness:'flat',river:'none',stones:['granite','slate'],coastAngle:null,mutatorCode:0};
 w.planet={revision:3} as World['planet'];
 w.worldFactions={revision:1,contentModel:'original-faction-content-v1',generatedAt:0,playerFactionId:1,nextFactionId:8,nextSettlementId:1,relations:[],settlements:[],leaders:[],factions:[{id:7,def:'Insect',hidden:true,name:'Insectes préparés',randomKey:7,colorFromSpectrum:0,leaderOwnerId:null}]};
 w.gameProfile={revision:1,storyteller:'cassandra-partial',difficulty:'adventure-story',saveMode:'reloadable'};
 return w;
}
const context=(w:World)=>({adjacentPermutation:[0,1,2,3,4,5,6,7],adjacentUses:0,runtimeWildlifeRng:w.rng,enemyReproductionRateFactor:.5,lordIds:{nextId:0}});
const options={spawnInsectsImmediately:false,canSpawnHives:true,canSpawnInsects:true,dormant:false,aggressive:true,spawnJellyImmediately:false,extras:false} as const;
const contents=(w:World)=>(w.filth?.items??[]).map(({grownCore:_,nextCheckCore:__,...item})=>item);

test('macro Hive plan uses confirmed Slime receipts without touching originals before commit or changing gameplay RNG/GenAdj',()=>{
 const outputs=[];
 for(const version of [296,297,298] as const){
  const w=fixture(version),ctx=context(w),generation=new WorldGenerationRandom(17);
  const made=spawnActualHive256(w,16*32+16,generation,ctx,options);expect(made.status).toBe('ready');if(made.status!=='ready')throw Error(made.reason);
  // Disable unrelated birth/product clocks in this component fixture. The
  // genuine xorshift stream seed1 makes its FIRST MTB draw <1/10000; no mock,
  // search, discarded engine run or runtime producer changes its draw order.
  Object.assign(made.hive.caveHive,{awakeAtCore:0,wasActivated:true,nextPawnSpawnCore:1000000,nextHiveSpawnCore:1000000,jellyLeftCore:1000000,podLeftCore:1000000,lastCore:0});
  w.tick=1;w.rng=1;
  const before=JSON.stringify(w),ctxBefore=JSON.stringify(ctx),generationBefore=generation.state;
  const plan=planActualHiveRuntime256(w,ctx);
  expect(plan.status,plan.status==='blocked'?plan.reason:'').toBe('ready');
  expect(JSON.stringify(w)).toBe(before);expect(JSON.stringify(ctx)).toBe(ctxBefore);expect(generation.state).toEqual(generationBefore);
  if(plan.status!=='ready')throw Error(plan.reason);expect(plan.commit()).toBe(true);expect(plan.commit()).toBe(false);
  expect(w.rng).not.toBe(1);expect(made.hive.caveHive.lastCore).toBe(10);
  const grown=(w.filth?.items??[]).filter(f=>f.grownCore>0);expect(grown.length).toBeGreaterThan(0);
  if(version===296)expect(grown.some(f=>f.grownCore<10)).toBe(true);
  else for(const f of grown){expect(f.grownCore).toBe(10);expect(f.nextCheckCore).toBeGreaterThan(f.grownCore);}
  outputs.push({rng:w.rng,nextId:w.nextId,filth:contents(w),component:made.hive.caveHive,adjacentPermutation:ctx.adjacentPermutation,adjacentUses:ctx.adjacentUses,lordIds:ctx.lordIds});
 }
 expect(outputs[1]).toEqual(outputs[0]);expect(outputs[2]).toEqual(outputs[0]);
});

test('runtime child Hive retains its interior birth clock while its ten Slime receipts use the current physical frontier',()=>{
 const outputs=[];
 for(const version of [296,297,298] as const){
  const w=fixture(version);w.tick=2;const ctx={...context(w),atCore:17},random=new WorldGenerationRandom(17),rng=w.rng;
  const made=spawnActualHive256(w,16*32+16,random,ctx,{...options,runtime:true});
  expect(made.status).toBe('ready');if(made.status!=='ready')throw Error(made.reason);
  expect(made.hive.caveHive.madeAtCore).toBe(17);expect(w.rng).toBe(rng);
  expect(w.filth!.items.length).toBeGreaterThan(0);
  for(const f of w.filth!.items){expect(f.grownCore).toBe(version===296?17:20);expect(f.nextCheckCore).toBeGreaterThan(f.grownCore);}
  outputs.push({generation:random.state,nextId:w.nextId,filth:contents(w),component:made.hive.caveHive,adjacentPermutation:ctx.adjacentPermutation,adjacentUses:ctx.adjacentUses,lordIds:ctx.lordIds});
 }
 expect(outputs[1]).toEqual(outputs[0]);expect(outputs[2]).toEqual(outputs[0]);
});

test('strict physical Slime admission still rejects an interior substep before any original, RNG or GenAdj changes',()=>{
 for(const version of [297,298] as const){
  const w=fixture(version);w.tick=2;const ctx=context(w),random=new WorldGenerationRandom(17);
  const before=JSON.stringify(w),contextBefore=JSON.stringify(ctx),randomBefore=random.state;
  expect(()=>depositHiveSlime256(w,16*32+16,random,ctx,17)).toThrow('Invalid actual Hive Slime substep');
  expect(JSON.stringify(w)).toBe(before);expect(JSON.stringify(ctx)).toBe(contextBefore);expect(random.state).toEqual(randomBefore);
 }
});
