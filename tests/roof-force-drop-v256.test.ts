import {expect,test} from 'vitest';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction.ts';
import {hitSkyfallerRoof256} from '../src/sim/roofing.ts';
import {roofKindAt} from '../src/sim/roof-rules.ts';
import {collapsedRockAt256,excavatedCollapsedRock256} from '../src/sim/collapsed-rocks-256.ts';
import {validMiningDamage} from '../src/sim/mining-rules.ts';
import {addMaterial} from '../src/sim/materials.ts';
import type {Job,Tile,Structure} from '../src/sim/types.ts';
function camp(){const w=deconstructionCamp();Object.assign(w,{schemaVersion:256});return w;}

test('forced centre ignores its wall support while neighbouring pawn and roof holders stay protected',()=>{
 const w=camp(),center=16*w.width+16,p=w.pawns[0]!;
 p.x=17;p.z=16;const health=JSON.stringify(p.health),wall=fixtureBuilding(w,'wall',16,16) as Structure;fixtureBuilding(w,'wall',16,15);fixtureBuilding(w,'wall',17,15);
 w.roofing={constructed:[],build:[],remove:[],cursor:0,natural:{thin:[center-w.width,center,center+1].sort((a,b)=>a-b),thick:[]}};
 expect(hitSkyfallerRoof256(w,{x:16,z:16},w.tick*10)).toBe(true);
 expect(roofKindAt(w,center)).toBeUndefined();expect(wall.damage).toBeGreaterThanOrEqual(15);
 expect(roofKindAt(w,center-w.width)).toBe('natural-thin');expect(roofKindAt(w,center+1)).toBe('natural-thin');
 expect(JSON.stringify(p.health)).toBe(health);
});

test('already-present CollapsedRocks is genuinely retired and replaced, keeping exact substrate and zero yield',()=>{
 const w=camp(),index=16*w.width+16,oldId=w.nextId++;
 w.tiles[index]={terrain:'rock',bridge:true,snowDepth:.2,miningDamage:480,collapsedRock:{id:oldId,terrain:'marsh'}} as Tile;
 w.roofing={constructed:[],build:[],remove:[],cursor:0,natural:{thin:[],thick:[index]}};
 expect(hitSkyfallerRoof256(w,{x:16,z:16},w.tick*10)).toBe(true);
 const rock=collapsedRockAt256(w.tiles[index]!);expect(rock).toBeDefined();expect(rock?.id).not.toBe(oldId);expect(rock?.terrain).toBe('marsh');
 expect(w.tiles[index]!.miningDamage).toBeUndefined();expect(excavatedCollapsedRock256(w.tiles[index]!)).toEqual({terrain:'marsh',bridge:true,snowDepth:.2});
 expect(w.piles).toEqual([]);expect(roofKindAt(w,index)).toBe('natural-thick');
});

test('thin Crush uses real natural rock HP and future damage admission without granting a mining yield',()=>{
 const w=camp(),index=16*w.width+16;w.tiles[index]={terrain:'rock',stone:'granite'};
 w.roofing={constructed:[],build:[],remove:[],cursor:0,natural:{thin:[index],thick:[]}};
 expect(hitSkyfallerRoof256(w,{x:16,z:16},w.tick*10)).toBe(true);
 expect(w.tiles[index]!.miningDamage).toBeGreaterThanOrEqual(15);expect(w.tiles[index]!.miningDamage).toBeLessThanOrEqual(30);
 expect(validMiningDamage(w.tiles[index]!,256)).toBe(true);expect(validMiningDamage(w.tiles[index]!,255)).toBe(false);
 expect(w.piles).toEqual([]);expect(roofKindAt(w,index)).toBeUndefined();
});

test('fatal thin Crush preserves only the real prior ore contribution and retires the old mine intention',()=>{
 const w=camp(),index=16*w.width+16;
 w.tiles[index]={terrain:'rock',ore:'steel',miningDamage:1499,miningYield:.5};
 const job:Job={id:w.nextId++,kind:'mine',x:16,z:16,orientation:0,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}};w.jobs.push(job);
 w.roofing={constructed:[],build:[],remove:[],cursor:0,natural:{thin:[index],thick:[]}};
 expect(hitSkyfallerRoof256(w,{x:16,z:16},w.tick*10)).toBe(true);
 expect(w.tiles[index]!.terrain).toBe('rough-stone');expect(w.tiles[index]!.ore).toBeUndefined();expect(w.jobs).not.toContain(job);
 expect(w.piles.filter(p=>p.item==='steel').reduce((sum,p)=>sum+p.quantity,0)).toBe(20);
});

test('force-drop refuses a late loss overflow atomically, including original Things, roofs and streams',()=>{
 const w=camp(),index=16*w.width+16;addMaterial(w,'wood',2,{type:'ground',x:16,z:16},'wood');
 w.destroyed={count:0,lost:{},items:{wood:Number.MAX_SAFE_INTEGER}};
 w.roofing={constructed:[],build:[],remove:[],cursor:0,natural:{thin:[],thick:[index]}};
 const before=JSON.stringify(w),pile=w.piles[0],roof=w.roofing,tiles=w.tiles;
 expect(hitSkyfallerRoof256(w,{x:16,z:16},w.tick*10)).toBe(false);expect(JSON.stringify(w)).toBe(before);
 expect(w.piles[0]).toBe(pile);expect(w.roofing).toBe(roof);expect(w.tiles).toBe(tiles);
});

test('unroofed occupied cell leaves adjacent roof literal; invalid clock and old schema refuse before effects',()=>{
 const w=camp(),index=16*w.width+16;w.roofing={constructed:[index+1],build:[],remove:[],cursor:0};
 let before=JSON.stringify(w);expect(hitSkyfallerRoof256(w,{x:16,z:16},w.tick*10)).toBe(true);expect(JSON.stringify(w)).toBe(before);
 expect(hitSkyfallerRoof256(w,{x:16,z:16},w.tick*10+1)).toBe(false);expect(JSON.stringify(w)).toBe(before);
 Object.assign(w,{schemaVersion:255});before=JSON.stringify(w);
 expect(hitSkyfallerRoof256(w,{x:17,z:16},w.tick*10)).toBe(false);expect(JSON.stringify(w)).toBe(before);
});
