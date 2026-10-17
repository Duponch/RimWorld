import {expect,test} from 'vitest';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {enableWildlife} from '../src/sim/wildlife.ts';
import {damageNaturalRoofCell256} from '../src/sim/roof-natural-damage-256.ts';
import {designateRoofArea,finishRoofJob,reconcileRoofSupport} from '../src/sim/roofing.ts';
import {roofKindAt} from '../src/sim/roof-rules.ts';
import {validHumanBodyShape} from '../src/sim/burial-save.ts';
import {advanceMining} from '../src/sim/mining.ts';
import {collapsedRockAt256,excavatedCollapsedRock256,validCollapsedRock256,registerCollapsedRockIdentities256} from '../src/sim/collapsed-rocks-256.ts';
import type {Job,Terrain,Tile} from '../src/sim/types.ts';
function camp(){const w=deconstructionCamp();Object.assign(w,{schemaVersion:256});return w;}
function roofJob(w:ReturnType<typeof camp>,kind:'remove-roof'|'build-roof',i:number):Job{return {id:w.nextId++,kind,x:i%w.width,z:Math.floor(i/w.width),orientation:0,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}};}

test('new natural thin collapse damages real person/animal/plant/ground things, including steelHP100',()=>{
 const w=camp(),p=w.pawns[0]!,i=p.z*w.width+p.x;
 w.resources.push({id:w.nextId++,kind:'rice',x:p.x,z:p.z,amount:1,growth:1,growthTick:w.tick,damage:149});
 delete w.wildlife;enableWildlife(w,1);const animal=w.wildlife!.animals[0]!;expect(animal).toBeDefined();animal.x=p.x;animal.z=p.z;
 addMaterial(w,'wood',3,{type:'ground',x:p.x,z:p.z},'wood');const wood=w.piles.find(a=>a.item==='wood')!;wood.damage=149;
 addMaterial(w,'steel',10,{type:'ground',x:p.x+1,z:p.z},'steel');const steel=w.piles.find(a=>a.item==='steel')!;steel.owner={type:'ground',x:p.x,z:p.z};
 w.roofing={constructed:[],build:[],remove:[],cursor:0,natural:{thin:[i],thick:[]}};
 damageNaturalRoofCell256(w,i,false);
 expect(p.health?.injuries.length||p.health?.missing.length).toBeGreaterThan(0);expect(animal.health).toBeDefined();
 expect(w.resources).toEqual([]);expect(w.piles).not.toContain(wood);expect(steel.damage).toBeGreaterThanOrEqual(15);expect(steel.damage).toBeLessThanOrEqual(30);
 expect(w.destroyed?.items?.wood).toBe(3);expect(w.destroyed?.resources?.rice).toBe(1);
});

test('thick leaves its roof and real zero-yield rock after retiring held possessions and actual bodies',()=>{
 const w=camp(),p=w.pawns[0]!,i=p.z*w.width+p.x,personId=p.id;
 w.resources.push({id:w.nextId++,kind:'rice',x:p.x,z:p.z,amount:1,growth:1,growthTick:w.tick});
 delete w.wildlife;enableWildlife(w,1);const animal=w.wildlife!.animals[0]!;animal.x=p.x;animal.z=p.z;const animalId=animal.id;
 addMaterial(w,'wood',2,{type:'inventory',pawnId:p.id},'wood');addMaterial(w,'steel',10,{type:'ground',x:p.x,z:p.z},'steel');
 w.roofing={constructed:[],build:[],remove:[],cursor:0,natural:{thin:[],thick:[i]}};
 expect(reconcileRoofSupport(w,false,{x:p.x-1,z:p.z})).toBe(1);
 expect(roofKindAt(w,i)).toBe('natural-thick');expect(w.tiles[i]!.terrain).toBe('rock');expect(collapsedRockAt256(w.tiles[i]!)).toMatchObject({terrain:'grass'});
 expect(w.pawns.find(a=>a.id===personId)).toBe(p);expect(p.state).toBe('dead');expect(p.body?.lostAt).toBe(w.tick);expect(p.body?.pileId).toBeUndefined();
 expect(validHumanBodyShape(p.body,256,w.tick)).toBe(true);expect(validHumanBodyShape(p.body,255,w.tick)).toBe(false);
 expect(w.piles.some(a=>a.owner.type==='inventory'&&a.owner.pawnId===p.id)).toBe(false);expect(w.wildlife!.animals.some(a=>a.id===animalId)).toBe(false);
 expect(w.destroyed?.items?.steel).toBe(10);expect(w.destroyed?.items?.wood).toBe(2);expect(w.resources).toEqual([]);
});

test('mining a collapsed rock really works at contact and restores its exact substrate without drop/RNG',()=>{
 const w=camp(),p=w.pawns[0]!,i=p.z*w.width+p.x+1,id=w.nextId++;
 const before={terrain:'marsh' as const,bridge:true as const,snowDepth:.2};
 w.tiles[i]={...before,terrain:'rock',collapsedRock:{id,terrain:before.terrain}} as typeof w.tiles[number];
 const rng=w.rng,piles=w.piles.length,job:Job={...roofJob(w,'build-roof',i),kind:'mine'};
 let done=false;for(let n=0;n<2000&&!done;n++){w.tick++;done=advanceMining(w,p,job);}
 expect(done).toBe(true);expect(w.tiles[i]).toEqual(before);expect(w.rng).toBe(rng);expect(w.piles.length).toBe(piles);
});

test('thick removal never creates an intention; building nearby does not convert a natural roof',()=>{
 const w=camp(),i=16*32+16;fixtureBuilding(w,'wall',16,16);w.roofing={constructed:[],build:[],remove:[],cursor:0,natural:{thin:[i+1],thick:[i+2]}};
 designateRoofArea(w,[i+2],'remove-roof');expect(w.roofing.remove).toEqual([]);
 designateRoofArea(w,[i+1,i+2,i+3],'build-roof');finishRoofJob(w,roofJob(w,'build-roof',i+3));
 expect(w.roofing.natural).toEqual({thin:[i+1],thick:[i+2]});expect(w.roofing.constructed).toContain(i+3);expect(w.roofing.constructed).not.toContain(i+1);
 designateRoofArea(w,[i+1],'remove-roof');finishRoofJob(w,roofJob(w,'remove-roof',i+1));expect(roofKindAt(w,i+1)).toBeUndefined();expect(roofKindAt(w,i+2)).toBe('natural-thick');
});

test('collapsed marker is future strict, keeps actual identity and exact original terrain',()=>{
 const isTerrain=(v:unknown):v is Terrain=>v==='grass'||v==='marsh',tile={terrain:'rock',collapsedRock:{id:7,terrain:'marsh'}};
 expect(validCollapsedRock256(tile,255,8,isTerrain)).toBe(false);expect(validCollapsedRock256(tile,256,8,isTerrain)).toBe(true);
 expect(validCollapsedRock256({terrain:'rock',collapsedRock:undefined},256,8,isTerrain)).toBe(false);
 let read=0;const bad=Object.defineProperty({terrain:'rock'},'collapsedRock',{get(){read++;throw Error('getter');}});
 expect(validCollapsedRock256(bad,256,8,isTerrain)).toBe(false);expect(read).toBe(0);
 expect(registerCollapsedRockIdentities256([tile as Tile],new Set([7]))).toBe(false);
 expect(excavatedCollapsedRock256(tile as Tile)).toEqual({terrain:'marsh'});
});
