import {beforeAll,test,expect} from 'vitest';
import {generateGeographicWorldDraft256} from '../src/sim/world-geographic-draft.ts';
import {defaultWorldGenerationSettings} from '../src/sim/world-generation-settings.ts';
import {captureGeneratedGeography256} from '../src/sim/world-geography-owner-256.ts';
import {createGeographicPlanet256} from '../src/sim/planet-factory-256.ts';
import {prepareGeographicPhysicalMap256,type GeographicPhysicalMapInputs256} from '../src/sim/geographic-map-physical-256.ts';
import {startingPawn} from '../src/sim/starting-pawns.ts';
import {newDoorState} from '../src/sim/door-rules.ts';
import {readyDoorEntry,updateDoors} from '../src/sim/doors.ts';
import {captureActualFogPhysical256} from '../src/sim/exploration-physical-256.ts';
import {floodUnfog256} from '../src/sim/exploration-flood-256.ts';
import {canDesignate,applyCommand} from '../src/sim/engine.ts';
import {queryArea} from '../src/sim/designation.ts';
import {advanceMining} from '../src/sim/mining.ts';
import {rockMaxHP,PICK_DAMAGE} from '../src/sim/mining-rules.ts';
import {damageStructure,structureMaxHp} from '../src/sim/thing-damage.ts';
import {createLocalRoadProp256} from '../src/sim/local-road-props-256.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import type {Job,World} from '../src/sim/types.ts';
let input:GeographicPhysicalMapInputs256;
beforeAll(()=>{
 const it=generateGeographicWorldDraft256({seed:'Elsewhere',settings:defaultWorldGenerationSettings(),tick:0,nextThingId:1,playerDef:'PlayerColony',playerName:'Colonie'});let n=it.next();while(!n.done)n=it.next();
 const draft=n.value,geography=captureGeneratedGeography256(draft),tile=geography.surface.tiles.find(t=>t.biome==='temperate-forest'&&t.hilliness==='flat')!;
 input={planet:createGeographicPlanet256({geography,factions:draft.factions,homeTile:tile.id,adoptedAt:0,nextGroupId:1}),factions:draft.factions,tile:tile.id,width:32,height:32,tick:0,calendarOrigin:90000,nextId:draft.nextThingId,rng:123456,definitionContext:{isStartingMap:true,mapInitializing:true,tutorial:false,usedRectCells:new Set()}};
},120000);
/** True geographic owner plus EXPLICITLY PREPARED 32² physical test geometry.
 * Not a generated scenario, complete valid RAW, played campaign or native run. */
function fixture(){const w=prepareGeographicPhysicalMap256(input).world;delete w.roofing;
 w.tiles=Array.from({length:1024},()=>({terrain:'soil-natural',fogged:true}));w.exploration={revision:1};
 for(let z=0;z<32;z++)w.tiles[z*32+16]={terrain:'rock',stone:'granite',fogged:true};
 const p=startingPawn(w.nextId++,'Témoin',15,16,0,80,w.seed);w.pawns.push(p);
 floodUnfog256(w,16*32+15,captureActualFogPhysical256(w));return {w,p};
}
const pending=(w:World,x:number,z:number):Job=>({id:w.nextId++,kind:'mine',x,z,orientation:0,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}});
test('actual door threshold reveals the other side and retires a blind empty Mine through normal cancellation',()=>{
 const {w,p}=fixture();w.tiles[16*32+16]={terrain:'soil-natural',fogged:true};
 const door={id:w.nextId++,kind:'door' as const,x:16,z:16,orientation:0 as const,footprint:'standard' as const,material:'wood' as const,door:newDoorState(0)};w.structures.push(door);
 expect(canDesignate(w,{type:'designate',kind:'wall',x:20,z:16}).ok).toBe(false);
 expect(applyCommand(w,{type:'designate',kind:'mine',x:20,z:16})).toEqual({ok:true});const job=w.jobs.find(j=>j.kind==='mine')!;expect(job).toBeDefined();
 expect(readyDoorEntry(w,p,{x:16,z:16})).toBe(false);expect(door.door.explorationApproacherId).toBe(p.id);
 w.tick=1;updateDoors(w);expect(w.tiles[16*32+20]!.fogged).toBe(true);expect(w.jobs.includes(job)).toBe(true);
 w.tick=2;updateDoors(w);expect(w.tiles[16*32+20]!.fogged).toBeUndefined();expect(door.door.explorationApproacherId).toBeUndefined();expect(w.jobs.includes(job)).toBe(false);expect(p.jobId).toBe(null);
});
test('blind area mining admits rock and empty cells uniformly without inventing work on the empty intent',()=>{
 const {w}=fixture(),selected=queryArea(w,{type:'area',action:'mine',from:{x:16,z:16},to:{x:20,z:16}});
 expect(selected.ok).toBe(true);if(!selected.ok)throw Error(selected.reason);expect(selected.cells).toEqual([528,529,530,531,532]);
 const empty=pending(w,20,16);w.jobs.push(empty);const again=queryArea(w,{type:'area',action:'mine',from:{x:20,z:16},to:{x:20,z:16}});expect(again.ok&&again.cells).toEqual([]);expect(empty.progress).toBe(0);expect(empty.reservedBy).toBe(null);
});
test('true final mining removes the blocker then reveals, leaving current completed job to its existing caller',()=>{
 const {w,p}=fixture(),index=16*32+16,tile=w.tiles[index]!;tile.miningDamage=rockMaxHP(tile)-PICK_DAMAGE;
 const job=pending(w,16,16);job.status='active';job.reservedBy=p.id;p.jobId=job.id;w.jobs.push(job);const empty=pending(w,20,16);w.jobs.push(empty);
 let finished=false;for(let i=0;i<100&&!finished;i++){w.tick++;finished=advanceMining(w,p,job);}
 expect(finished).toBe(true);expect(w.tiles[index]!.terrain).toBe('rough-stone');expect(w.tiles[16*32+20]!.fogged).toBeUndefined();expect(w.jobs.includes(job)).toBe(true);expect(w.jobs.includes(empty)).toBe(false);
});
test('installed full destruction reveals only after its successful actual removal',()=>{
 const {w}=fixture();w.tiles[16*32+16]={terrain:'soil-natural',fogged:true};const wall={id:w.nextId++,kind:'wall' as const,x:16,z:16,orientation:0 as const,footprint:'standard' as const,material:'wood' as const};w.structures.push(wall);
 expect(damageStructure(w,wall,1,'bullet')).toBe(true);expect(w.tiles[16*32+20]!.fogged).toBe(true);
 expect(damageStructure(w,wall,structureMaxHp(wall),'bullet')).toBe(true);expect(w.structures.includes(wall)).toBe(false);expect(w.tiles[16*32+20]!.fogged).toBeUndefined();
});
test('a guessed hidden original cannot be claimed through a direct command; discovery leaves the original available',()=>{
 const {w}=fixture(),s=createLocalRoadProp256('ancient-road-lamp',w.nextId++,20,16,new WorldGenerationRandom(87));w.structures.push(s);
 const before=JSON.stringify({s,nextId:w.nextId,rng:w.rng});expect(applyCommand(w,{type:'claim-road-prop',structureId:s.id}).code).toBe('missing-target');expect(JSON.stringify({s,nextId:w.nextId,rng:w.rng})).toBe(before);
 floodUnfog256(w,16*32+20,captureActualFogPhysical256(w));expect(applyCommand(w,{type:'claim-road-prop',structureId:s.id}).ok).toBe(true);expect(s.factionId).toBe(w.worldFactions!.playerFactionId);
});
