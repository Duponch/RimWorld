import {expect,test} from 'vitest';
import {smoothFloorCamp458} from './scenarios/smooth-floor-v458.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';
import {applyCommand} from '../src/sim/engine.ts';
import {smoothFloorReason281,canDesignateSmoothFloor281,canTouchSmoothFloor281,smoothingSpeed281,advanceSmoothFloor281} from '../src/sim/smooth-floor-281.ts';
import {captureStructureNavigation} from '../src/sim/structure-navigation.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {pawnBody} from '../src/sim/health-rules.ts';
import {xpRequired} from '../src/sim/skills.ts';
import {workProgress} from '../src/sim/work-progress.ts';
import {initializeSnowSurface,setSnowDepth,snowDepthAt} from '../src/sim/snow-surface.ts';
import {addFilth} from '../src/sim/filth.ts';
import {newDoorState} from '../src/sim/door-rules.ts';
import {addMaterial} from '../src/sim/materials.ts';
import type {World,Structure} from '../src/sim/types.ts';

/** Declared surface boundary only; the separate physical loop earns its rough
 * granite through real mining, never by using this preparation as its oracle. */
function rough(){const f=smoothFloorCamp458();f.world.tiles[f.cell.z*f.world.width+f.cell.x]={terrain:'rough-stone',stone:f.stone};return {...f,w:f.world,p:f.world.pawns[0]!};}

test.each(['granite','limestone','marble','sandstone','slate'] as const)('the %s substrate has closed prospective admission, with no materials or research',stone=>{
 const {w,cell}=rough();w.tiles[cell.z*w.width+cell.x]!.stone=stone;const before=JSON.stringify(w);
 expect(canDesignateSmoothFloor281(w,cell)).toEqual({ok:true});
 for(const version of [280,282])expect(canDesignateSmoothFloor281({...w,schemaVersion:version} as unknown as World,cell).ok).toBe(false);
 expect(canDesignateSmoothFloor281(w,{x:9,z:14}).ok).toBe(false);expect(canDesignateSmoothFloor281(w,{x:22,z:14}).ok).toBe(false);
 expect(JSON.stringify(w)).toBe(before);
});

test('only a full impassable edifice blocks admission; real piles and partial furniture remain possible targets',()=>{
 const pile=rough();addMaterial(pile.w,'wood',1,{type:'ground',...pile.cell},'wood');
 expect(canDesignateSmoothFloor281(pile.w,pile.cell).ok).toBe(true);
 expect(canDesignateSmoothFloor281(pile.w,pile.cell,undefined,captureStructureNavigation(pile.w)).ok).toBe(true);
 const furniture=rough();fixtureBuilding(furniture.w,'bed',furniture.cell.x,furniture.cell.z);
 expect(canDesignateSmoothFloor281(furniture.w,furniture.cell).ok).toBe(true);
 expect(canDesignateSmoothFloor281(furniture.w,furniture.cell,undefined,captureStructureNavigation(furniture.w)).ok).toBe(true);
 const solid=rough();fixtureBuilding(solid.w,'wall',solid.cell.x,solid.cell.z);
 expect(canDesignateSmoothFloor281(solid.w,solid.cell).ok).toBe(false);
 expect(canDesignateSmoothFloor281(solid.w,solid.cell,undefined,captureStructureNavigation(solid.w)).ok).toBe(false);
});

test('Touch admits the target, cardinal and one open diagonal corner; two blocked corners or a door-only corner refuse it',()=>{
 const {w,cell}=rough(),actor={x:cell.x-1,z:cell.z-1};
 expect(canTouchSmoothFloor281(w,cell,cell)).toBe(true);expect(canTouchSmoothFloor281(w,{x:cell.x-1,z:cell.z},cell)).toBe(true);expect(canTouchSmoothFloor281(w,actor,cell)).toBe(true);
 fixtureBuilding(w,'wall',actor.x,cell.z);expect(canTouchSmoothFloor281(w,actor,cell)).toBe(true);
 const door:Structure=fixtureBuilding(w,'door',cell.x,actor.z);door.door=newDoorState(w.tick);expect(canTouchSmoothFloor281(w,actor,cell)).toBe(false);
 expect(canTouchSmoothFloor281(w,actor,cell,captureStructureNavigation(w))).toBe(false);expect(canTouchSmoothFloor281(w,{x:cell.x-2,z:cell.z},cell)).toBe(false);
});

test('real sight loss uses the smoothing factor and blindness ignores worker glow, without changing historical construction statistics',()=>{
 const {p}=rough();expect(smoothingSpeed281(p,1)).toBe(1);expect(smoothingSpeed281(p,0)).toBeCloseTo(.8,12);
 p.health=createMedicalRecord(0);p.health.missing=[{part:'left-eye',bornAt:0,nonFresh:true},{part:'right-eye',bornAt:0,nonFresh:true}];
 expect(pawnBody(p).capacities.sight).toBe(0);expect(smoothingSpeed281(p,0)).toBeCloseTo(.7,12);expect(smoothingSpeed281(p,1)).toBeCloseTo(.7,12);
});

test('the actual producer captures speed before a level gain, learns only real work and clears snow before the final terrain effect',()=>{
 const {w,p,cell}=rough();Object.assign(p,cell);p.skills.construction.xp=xpRequired(8)-1;
 if(!w.snow)initializeSnowSurface(w);setSnowDepth(w,cell.z*w.width+cell.x,.5);expect(addFilth(w,cell,'dirt')).toBe(true);
 expect(applyCommand(w,{type:'designate',kind:'smooth-floor',...cell})).toMatchObject({ok:true});const job=w.jobs.find(j=>j.kind==='smooth-floor')!;
 expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:job.id,queue:false})).toMatchObject({ok:true});
 const beforeRng=w.rng,filthIds=w.filth!.items.map(f=>f.id);
 expect(advanceSmoothFloor281(w,p,job,1)).toBe(false);expect(workProgress(job)).toBeCloseTo(1.7,12);expect(p.skills.construction.level).toBe(9);
 expect(snowDepthAt(w,cell.z*w.width+cell.x)).toBe(0);expect(w.tiles[cell.z*w.width+cell.x]!.terrain).toBe('rough-stone');expect(w.filth!.items.map(f=>f.id)).toEqual(filthIds);expect(w.rng).toBe(beforeRng);
});

test('a current job skips duplicate scans while new admission still rejects a second designation',()=>{
 const {w,cell}=rough();expect(applyCommand(w,{type:'designate',kind:'smooth-floor',...cell})).toMatchObject({ok:true});const job=w.jobs[0]!;
 expect(smoothFloorReason281(w,cell)).toContain('déjà');
 // With an actual job ID, only the local substrate/edifice matters. Public/RAW
 // guards own their linear duplicate Set; this query must not enumerate jobs.
 const current={...w,get jobs(){throw Error('Current-job query scanned all intents');}} as unknown as World;
 expect(smoothFloorReason281(current,cell,job.id,captureStructureNavigation(w))).toBeUndefined();
});
