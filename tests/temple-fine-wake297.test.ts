import {expect,test} from 'vitest';
import {emptyGeographicLandscape256} from '../src/sim/generation.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {spawnFunctionalTempleThreat256} from '../src/sim/temple-threat-generation-256.ts';
import {wakeUnfoggedTempleMechs256,validTempleMechField256} from '../src/sim/temple-mech-duty-256.ts';
import {finishExplorationReveal256} from '../src/sim/exploration-runtime-256.ts';
import {advanceWorldCore297} from '../src/sim/engine.ts';
import {effectiveCore297} from '../src/sim/core-phase-297.ts';
import {damageStructure,structureMaxHp} from '../src/sim/thing-damage.ts';
import type {World} from '../src/sim/types.ts';

/** Declared 32² Temple fixture, reusing the existing temple-threats256 producer
 * and its partial planet/Lord envelopes. Current schema comes from the genuine
 * constructor; phases below are played by the real engine. Not a valid Whole,
 * saved campaign, native observation or proof of complete Temple generation. */
function fixture(){
 const w=emptyGeographicLandscape256(991,32,32);w.tiles=Array.from({length:1024},()=>({terrain:'soil-natural'}));w.nextId=100;
 w.site={revision:3,tileId:0,mapSeed:991,biome:'temperate-forest',hilliness:'flat',river:'none',stones:['granite','slate'],coastAngle:null,mutatorCode:0};
 w.planet={revision:3} as World['planet'];w.campaignMap={revision:2,nextLordId:100} as World['campaignMap'];
 w.worldFactions={revision:1,contentModel:'original-faction-content-v1',generatedAt:0,playerFactionId:1,nextFactionId:9,nextSettlementId:1,relations:[],settlements:[],leaders:[],factions:[
  {id:7,def:'Insect',hidden:true,name:'Insectes préparés',randomKey:7,colorFromSpectrum:0,leaderOwnerId:null},
  {id:8,def:'Mechanoid',hidden:true,name:'Mécanoïdes préparés',randomKey:8,colorFromSpectrum:0,leaderOwnerId:null}]};
 w.gameProfile={revision:1,storyteller:'cassandra-partial',difficulty:'adventure-story',saveMode:'reloadable'};
 spawnFunctionalTempleThreat256(w,{minX:20,minZ:15,maxX:22,maxZ:17},{kind:'mechs',count:3},new WorldGenerationRandom(5),{lordIds:{nextId:0},working:{adjacentPermutation:[0,1,2,3,4,5,6,7],adjacentUses:0}});
 w.exploration={revision:1};for(const t of w.tiles)t.fogged=true;
 expect(w.schemaVersion).toBe(297);expect(w.phaseCore297).toBe(0);return w;
}
function advance(w:World,n:number){for(let i=0;i<n;i++){const core=effectiveCore297(w);expect(advanceWorldCore297(w).core).toBe(core+1);}expect(effectiveCore297(w)).toBe(n);}

test('real fine phases reveal the same sleeping group once at the committed Core, without spending RNG or IDs',()=>{
 for(const phase of [1,7,9]){
  const w=fixture();advance(w,phase);const originals=[...w.mechanoids!],nextId=w.nextId,rng=w.rng,seen=originals[0]!,cell=seen.z*w.width+seen.x;
  finishExplorationReveal256(w,{changedCells:[],interiorCells:[]});expect(originals.every(m=>m.temple!.awakeAtCore===null)).toBe(true);
  delete w.tiles[cell]!.fogged;finishExplorationReveal256(w,{changedCells:[cell],interiorCells:[cell]});
  expect(w.mechanoids).toEqual(originals);for(const m of originals){expect(w.mechanoids!.find(x=>x.id===m.id)).toBe(m);expect(m.temple!.awakeAtCore).toBe(phase);expect(validTempleMechField256(m,297,w.tick,effectiveCore297(w))).toBe(true);}
  expect(w.nextId).toBe(nextId);expect(w.rng).toBe(rng);expect(w.raids).toBeUndefined();const events=w.events.length;
  wakeUnfoggedTempleMechs256(w);expect(w.events).toHaveLength(events);expect(effectiveCore297(w)).toBe(phase);
 }
});

test('actual fatal blocker removal at Core7 completes the real fog callback and wakes the original group',()=>{
 const w=fixture();for(let z=0;z<32;z++)w.tiles[z*32+16]={terrain:'rock',stone:'granite',fogged:true};
 for(let z=0;z<32;z++)for(let x=0;x<16;x++)delete w.tiles[z*32+x]!.fogged;
 w.tiles[16*32+16]={terrain:'soil-natural',fogged:true};const wall={id:w.nextId++,kind:'wall' as const,x:16,z:16,orientation:0 as const,footprint:'standard' as const,material:'wood' as const};w.structures.push(wall);
 advance(w,7);const originals=[...w.mechanoids!],rng=w.rng,nextId=w.nextId;
 expect(damageStructure(w,wall,1,'bullet')).toBe(true);expect(originals.every(m=>m.temple!.awakeAtCore===null)).toBe(true);
 expect(damageStructure(w,wall,structureMaxHp(wall),'bullet')).toBe(true);expect(w.structures).not.toContain(wall);
 for(const m of originals){expect(w.tiles[m.z*w.width+m.x]!.fogged).toBeUndefined();expect(m.temple!.awakeAtCore).toBe(7);expect(w.mechanoids).toContain(m);}
 expect(w.nextId).toBe(nextId);expect(w.rng).toBe(rng);expect(effectiveCore297(w)).toBe(7);
});

test('no eligible sleeper performs no physical clock read; historical notification retains its literal macro timestamp',()=>{
 const w=fixture();Object.defineProperty(w,'phaseCore297',{enumerable:true,configurable:true,get(){throw Error('No eligible sleeper may read physical phase');}});
 // All sleepers are still fogged; then all are dead. Both paths remain inert.
 wakeUnfoggedTempleMechs256(w);for(const m of w.mechanoids!){m.state='dead';delete w.tiles[m.z*w.width+m.x]!.fogged;}wakeUnfoggedTempleMechs256(w);
 // Explicit historical scalar notification probe, not a migrated/saved World.
 const old=fixture();Object.assign(old,{schemaVersion:256,tick:1});Object.defineProperty(old,'phaseCore297',{get(){throw Error('Historical clock must stay unread');}});
 const m=old.mechanoids![0]!;delete old.tiles[m.z*old.width+m.x]!.fogged;wakeUnfoggedTempleMechs256(old);expect(old.mechanoids!.every(x=>x.temple!.awakeAtCore===10)).toBe(true);
});
