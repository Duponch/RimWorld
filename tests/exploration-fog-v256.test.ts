import {rememberExplorationApproacher256,consumeExplorationApproacher256,validExplorationDoorApproacher256,type ExplorationDoorState256} from '../src/sim/exploration-door-256.ts';
import {expect,test} from 'vitest';
import {validateExploration256,validExplorationHeader256,validExplorationTile256} from '../src/sim/exploration-save-256.ts';
import {foggedCell256,retainExplorationCell256,type ExplorationMap256} from '../src/sim/exploration-state-256.ts';
import {captureActualFogPhysical256,type ActualFogMap256} from '../src/sim/exploration-physical-256.ts';
import {floodUnfog256,notifyFogBlockerRemoved256,notifyExplorationDoor256,notifyExplorationSpawn256,explorationDoorNeedsReveal256} from '../src/sim/exploration-flood-256.ts';
import {initializeExploration256} from '../src/sim/exploration-initial-256.ts';
import {knownCell256,knownSpawnedThing256,explorationCellAction256,blindMineDesignation256,pendingBlindMine256} from '../src/sim/exploration-visibility-256.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
/** Declared isolated real physical fields, never cast to/stepped as World. */
function map(width=9,height=9):ActualFogMap256 {return {schemaVersion:256,site:{revision:3},width,height,tiles:Array.from({length:width*height},()=>({terrain:'soil-natural'})),structures:[],jobs:[]};}
function covered(input:ActualFogMap256):ActualFogMap256 {input.exploration={revision:1};for(const tile of input.tiles)tile.fogged=true;return input;}
const basic={standable:()=>true,roofed:()=>false};
test('strict local marker/cells reject historical own undefined, wrong flag and missing Site3 marker before any migration',()=>{
 const a=map();expect(validateExploration256(a,256)).toHaveLength(1);a.exploration={revision:1};expect(validateExploration256(a,256)).toEqual([]);a.tiles[1]!.fogged=true;expect(validateExploration256(a,256)).toEqual([]);expect(validateExploration256(a,255)).toHaveLength(1);
 expect(validExplorationHeader256({site:{revision:2},exploration:undefined},255)).toBe(false);expect(validExplorationHeader256({site:{revision:2},exploration:{revision:1}},256)).toBe(false);
 const holes=Array(1);expect(validateExploration256({site:{revision:3},exploration:{revision:1},tiles:holes},256)).toHaveLength(1);
 expect(validExplorationTile256({terrain:'soil',fogged:undefined},255,false)).toBe(false);expect(validExplorationTile256({terrain:'soil-natural',fogged:false},256,true)).toBe(false);expect(validExplorationTile256({terrain:'soil-natural',fogged:true},256,false)).toBe(false);
 let invoked=false;const getter={site:{revision:3},get exploration(){invoked=true;return {revision:1};}};expect(validExplorationHeader256(getter,256)).toBe(false);expect(invoked).toBe(false);
});
test('initial cardinal flood traverses literal water and roof-independent space but reveals only one full blocker border',()=>{
 const a=map();for(let z=0;z<9;z++)for(let x=3;x<=4;x++)a.tiles[z*9+x]={terrain:'rock'};a.tiles[10]={terrain:'water-deep'};
 const before=structuredClone(a),random=new WorldGenerationRandom(19),physical=captureActualFogPhysical256(a);
 const result=initializeExploration256(a,{start:10,rootsToUnfog:[],readers:basic},physical,random);
 expect(result.reveal.interiorCells).toHaveLength(27);expect(random.state.counter).toBe(0);expect(foggedCell256(a,10)).toBe(false);expect(foggedCell256(a,12)).toBe(false);expect(foggedCell256(a,13)).toBe(true);expect(foggedCell256(a,17)).toBe(true);
 expect(a.tiles.map(({fogged,...tile})=>tile)).toEqual(before.tiles);expect(a.structures).toEqual(before.structures);
});
test('blocked true start uses actual standable/nonroof radial5; explicit roots unmask their full footprint even if they cannot flood',()=>{
 const a=map();a.tiles[40]={terrain:'rock'};const physical=captureActualFogPhysical256(a),random=new WorldGenerationRandom(4);
 const result=initializeExploration256(a,{start:40,rootsToUnfog:[40],readers:{standable:c=>c===39,roofed:()=>false}},physical,random);
 expect(result.root).toBe(39);expect(foggedCell256(a,40)).toBe(false);expect(random.state.counter).toBe(0);
});
test('a removed full blocker reveals only after actual commit beside known nonblocker; replacement/hidden destruction grant nothing',()=>{
 const a=covered(map());for(let z=0;z<9;z++)a.tiles[z*9+4]={terrain:'rock',fogged:true};delete a.tiles[39]!.fogged;
 const removed={origin:40,cells:[40],makeFog:true,wasSpawned:true,willReplace:false};const old=a.tiles[40]!;a.tiles[40]=retainExplorationCell256(old,{terrain:'rough-stone'});
 expect(a.tiles[40]!.fogged).toBe(true);const physical=captureActualFogPhysical256(a);
 expect(notifyFogBlockerRemoved256(a,{...removed,willReplace:true},physical).changedCells).toEqual([]);
 const reveal=notifyFogBlockerRemoved256(a,removed,physical);expect(reveal.interiorCells.length).toBeGreaterThan(0);expect(foggedCell256(a,41)).toBe(false);
 const hidden=covered(map());hidden.tiles[40]={terrain:'rough-stone',fogged:true};expect(notifyFogBlockerRemoved256(hidden,removed,captureActualFogPhysical256(hidden)).changedCells).toEqual([]);
});
test('door reveal follows confirmed40% player/host approach, not render pose, hostile/open-only or every normal movement',()=>{
 const a=covered(map());for(let z=0;z<9;z++)a.tiles[z*9+4]={terrain:'rock',fogged:true};a.tiles[40]={terrain:'soil-natural',fogged:true};a.structures.push({id:1,kind:'door',x:4,z:4,orientation:0,footprint:'standard'});
 const physical=captureActualFogPhysical256(a),context={playerOwned:true,hostPlayer:false,approaching:true,openness:.39};
 expect(notifyExplorationDoor256(a,40,context,physical).changedCells).toEqual([]);expect(notifyExplorationDoor256(a,40,{...context,openness:1,playerOwned:false},physical).changedCells).toEqual([]);
 const result=notifyExplorationDoor256(a,40,{...context,openness:.5},physical);expect(result.interiorCells.length).toBeGreaterThan(0);expect(foggedCell256(a,39)).toBe(false);expect(foggedCell256(a,41)).toBe(false);expect(explorationDoorNeedsReveal256(a,40)).toBe(false);
});
test('real owned spawn reveals once; load rehydration and hostile spawn never replay discovery or mutate ownership',()=>{
 const a=covered(map()),physical=captureActualFogPhysical256(a),before=structuredClone(a);
 expect(notifyExplorationSpawn256(a,40,{playerOwned:true,playerControlled:true,respawningAfterLoad:true},physical).changedCells).toEqual([]);expect(a).toEqual(before);
 expect(notifyExplorationSpawn256(a,40,{playerOwned:false,playerControlled:false,respawningAfterLoad:false},physical).changedCells).toEqual([]);
 const cells:number[]=[];expect(notifyExplorationSpawn256(a,40,{playerOwned:true,playerControlled:false,respawningAfterLoad:false},physical,{cellUnfogged:c=>cells.push(c)}).changedCells).toHaveLength(81);expect(new Set(cells).size).toBe(81);expect(floodUnfog256(a,40,physical).changedCells).toEqual([]);
});
test('missing real MapEdge callback refuses before marker; fully exhausted actual fallback keeps fog rather than clearing map',()=>{
 const a=map(),before=structuredClone(a),random=new WorldGenerationRandom(8),physical=captureActualFogPhysical256(a);
 expect(()=>initializeExploration256(a,{start:null,rootsToUnfog:[],readers:basic},physical,random)).toThrow(/reachability/);expect(a).toEqual(before);expect(random.state.counter).toBe(0);
 const result=initializeExploration256(a,{start:null,rootsToUnfog:[],readers:{standable:()=>false,roofed:()=>false,canReachMapEdgeNoPassClosedDoorsOrWater:()=>false}},physical,random);
 expect(result.root).toBeNull();expect(result.reveal.changedCells).toEqual([]);expect(a.tiles.every(t=>t.fogged===true)).toBe(true);expect(random.state.counter).toBeGreaterThan(2000);expect(result.random).toEqual(random.state);
});
test('player reads cannot expose a hidden Thing; blind Mine admits without terrain probe and is not a generic AI blocker',()=>{
 const a=covered(map());delete a.tiles[0]!.fogged;
 expect(knownCell256(a,1)).toBe(false);expect(knownSpawnedThing256(a,[1,2])).toBe(false);expect(knownSpawnedThing256(a,[0,1])).toBe(true);
 for(const action of ['inspect','build-center','zone-add','plant-designation'] as const)expect(explorationCellAction256(a,1,action)).toBe(false);
 const pending={id:7,kind:'mine' as const,x:1,z:0,orientation:0 as const,footprint:'standard' as const,status:'pending' as const,reservedBy:null,progress:0,escrow:{wood:0,food:0}};expect(pendingBlindMine256(a,pending)).toBe(true);expect(pendingBlindMine256(a,{...pending,progress:1})).toBe(false);
 expect(explorationCellAction256(a,1,'mine-designation')).toBe(true);expect(blindMineDesignation256(a,1)).toBe(true);expect(a.tiles[1]!.terrain).toBe('soil-natural');
 const before=structuredClone(a);knownCell256(a,1);expect(a).toEqual(before);const legacy:ExplorationMap256={schemaVersion:255,width:1,height:1,site:{revision:2},tiles:[{terrain:'soil'}]};expect(knownCell256(legacy,0)).toBe(true);
});

test('last actual approach survives route cancellation/load and is consumed at confirmed40%, regardless of life/locality or affiliation',()=>{
 const a=covered(map());a.structures.push({id:1,kind:'door',x:4,z:4,orientation:0,footprint:'standard'});
 const state:ExplorationDoorState256={open:true};let captures=0;
 const capture=()=>{captures++;return captureActualFogPhysical256(a);};
 // These are actual resolved owner facts; no route/life/local field is required.
 const owners=new Map([[2,{id:2,playerOwned:true,hostPlayer:false}],[3,{id:3,playerOwned:false,hostPlayer:false}],[4,{id:4,playerOwned:false,hostPlayer:true}]]);
 const resolve=(id:number)=>owners.get(id);
 rememberExplorationApproacher256(a,state,2,true);rememberExplorationApproacher256(a,state,3,false);expect(state.explorationApproacherId).toBe(3);
 const loaded=structuredClone(state);expect(validExplorationDoorApproacher256(loaded,256,true,5,resolve)).toBe(true);expect(loaded).toEqual(state);
 expect(consumeExplorationApproacher256(a,40,loaded,.39,resolve,capture).changedCells).toEqual([]);expect(loaded.explorationApproacherId).toBe(3);
 expect(consumeExplorationApproacher256(a,40,loaded,Math.fround(.4),resolve,capture).changedCells).toEqual([]);expect(Object.hasOwn(loaded,'explorationApproacherId')).toBe(false);expect(captures).toBe(0);
 rememberExplorationApproacher256(a,loaded,4,false);const result=consumeExplorationApproacher256(a,40,loaded,.5,resolve,capture);expect(result.changedCells.length).toBeGreaterThan(0);expect(captures).toBe(1);expect(Object.hasOwn(loaded,'explorationApproacherId')).toBe(false);
 expect(consumeExplorationApproacher256(a,40,loaded,1,resolve,capture).changedCells).toEqual([]);expect(captures).toBe(1);
 const bad={open:true,explorationApproacherId:99};expect(()=>consumeExplorationApproacher256(a,40,bad,1,resolve,capture)).toThrow(/owner/);expect(bad.explorationApproacherId).toBe(99);
 expect(validExplorationDoorApproacher256(state,255,false,5,resolve)).toBe(false);expect(validExplorationDoorApproacher256(state,256,false,5,resolve)).toBe(false);expect(validExplorationDoorApproacher256({open:true,explorationApproacherId:undefined},256,true,5,resolve)).toBe(false);expect(validExplorationDoorApproacher256(bad,256,true,100,resolve)).toBe(false);
 let read=false;expect(validExplorationDoorApproacher256({get explorationApproacherId(){read=true;return 2;}},256,true,5,resolve)).toBe(false);expect(read).toBe(false);
 const closed:ExplorationDoorState256={open:false,explorationApproacherId:2};rememberExplorationApproacher256(a,closed,3,false);expect(closed.explorationApproacherId).toBe(2);expect(consumeExplorationApproacher256(a,40,closed,1,resolve,capture).changedCells).toEqual([]);expect(closed.explorationApproacherId).toBe(2);
});
