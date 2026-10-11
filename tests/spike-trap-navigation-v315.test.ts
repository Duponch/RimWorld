import { expect,test } from 'vitest';
import { captureSpikeTrapContacts,initialSpikeTrapState,spikeTrapKnowsOf,spikeTrapPhysicalCell,spikeTrapPlacementAllowed,spikeTrapSpringChance,spikeTrapTargetKey,SPIKE_TRAP_SEARCH_COST } from '../src/sim/spike-trap-state.ts';
import { canStandAt,captureStandability,furnitureDelay,navigationCosts } from '../src/sim/furniture-travel.ts';
import { blockedCells,reachableCells,routeToCell,routeCost } from '../src/sim/pathfinding.ts';
import { candidateAccess } from '../src/sim/candidate-access.ts';
import { searchCandidates } from '../src/sim/work-planner.ts';
import { startTravel } from '../src/sim/movement.ts';
import { animalNavigation,moveAnimal } from '../src/sim/wildlife-navigation.ts';
import { processMechanoidCombat } from '../src/sim/mechanoid-combat.ts';
import { LightEnvironmentCache } from '../src/sim/light-environment.ts';
import { OUTSIDE_ALLOWED_AREA_SEARCH_COST } from '../src/sim/allowed-area-state.ts';
import { medicalCamp } from './scenarios/health.ts';
import { huntingCamp } from './scenarios/hunting.ts';
import { mechanoidCombatCamp,fixtureMechanoid } from './scenarios/mechanoid-combat-v213.ts';
import type { Cell,Job,Structure,World } from '../src/sim/types.ts';

function camp(count=1){const w=medicalCamp(count,32),p=w.pawns[0]!;w.structures=[];w.jobs=[];w.resources=[];w.piles=[];w.packed=[];w.tiles=w.tiles.map(()=>({terrain:'soil'}));p.x=5;p.z=5;return {w,p};}
function trap(w:World,x=6,z=5):Structure {const s:Structure={id:w.nextId++,kind:'spike-trap',x,z,orientation:0,footprint:'standard',material:'wood',spikeTrap:{autoRebuild:false,touching:[]}};w.structures.push(s);return s;}
function animalCamp(){const w=huntingCamp(),p=w.pawns[0]!,a=w.wildlife!.animals[0]!;w.structures=[];w.jobs=[];w.resources=[];w.piles=[];w.packed=[];w.tiles=w.tiles.map(()=>({terrain:'soil'}));w.wildlife!.animals=[a];Object.assign(a,{x:5,z:5,path:[],state:'idle',rest:1});delete a.motion;return {w,p,a};}
function plan(w:World,x:number,z:number,construction:'blueprint'|'frame'='blueprint'):Job {const j:Job={id:w.nextId++,kind:'spike-trap',x,z,orientation:0,footprint:'standard',material:'wood',construction,status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}};w.jobs.push(j);return j;}
const hasCell=(path:readonly Cell[],cell:Cell)=>path.some(c=>c.x===cell.x&&c.z===cell.z);

test('knowledge and spring probabilities follow affiliation, including mental hostility and released guests',()=>{
  const {w,p}=camp(),{a}=animalCamp(),m=fixtureMechanoid(w,8,5);
  expect(spikeTrapSpringChance(w,p)).toBe(.005);p.faction='colony';expect(spikeTrapSpringChance(w,p)).toBe(.005);
  const angry=structuredClone(p);angry.mental={below:[0,0,0],cooldown:0,catharsis:[],crisis:{kind:'berserk',age:0,target:null,waitUntil:0,targetId:null,jobUntilCore:null}};
  expect(spikeTrapKnowsOf(w,angry)).toBe(true);expect(spikeTrapSpringChance(w,angry)).toBe(.005);
  p.faction='outlanders';expect(spikeTrapKnowsOf(w,p)).toBe(true);expect(spikeTrapSpringChance(w,p)).toBe(0);
  p.faction='outlaws';expect(spikeTrapKnowsOf(w,p)).toBe(false);expect(spikeTrapSpringChance(w,p)).toBe(1);
  p.prisoner={capturedAt:w.tick,initialResistance:0,resistance:0,mode:'release',releasedAt:w.tick,chatDay:0,chatCount:0,rng:1};
  expect(spikeTrapKnowsOf(w,p)).toBe(true);expect(spikeTrapSpringChance(w,p)).toBe(0);
  expect(spikeTrapSpringChance(w,a)).toBe(.2);a.manhunter={startedAtCore:w.tick*10,rng:1,zeroRestTicks:0};expect(spikeTrapSpringChance(w,a)).toBe(1);
  a.domestic={since:w.tick,care:'herbal',tameness:5,nextDecay:w.tick+45000};expect(spikeTrapKnowsOf(w,a)).toBe(true);expect(spikeTrapSpringChance(w,a)).toBe(.005);
  expect(spikeTrapKnowsOf(w,m)).toBe(false);expect(spikeTrapSpringChance(w,m)).toBe(1);
});
test('contact stays at original cell throughout the complete delayed edge, including the last Core sub-tick',()=>{
  const {w,p}=camp();p.x=6;p.motion={from:{x:5,z:5},to:{x:6,z:5},start:w.tick,end:w.tick+7.25,stuns:[{start:w.tick+1,end:w.tick+2}]};
  expect(spikeTrapPhysicalCell(p,p.motion.end*10-.001)).toEqual({x:5,z:5});
  expect(spikeTrapPhysicalCell(p,p.motion.end*10)).toEqual({x:6,z:5});
  expect(spikeTrapPhysicalCell(p,p.motion.end*10+50)).toEqual({x:6,z:5});
});
test('sparse contact capture preserves namespaces and excludes both kinds of carried patient',()=>{
  const {w,p}=camp(3),human=w.pawns[1]!,other=w.pawns[2]!,{a}=animalCamp(),s=trap(w,5,5),m=fixtureMechanoid(w,5,5);
  a.id=human.id;Object.assign(a,{x:5,z:5,state:'downed'});w.wildlife={profile:'temperate-hares-v1',rng:1,animals:[a],eatenPlants:0,eatenNutrition:0,eatenItems:0};
  Object.assign(human,{x:5,z:5,state:'downed'});Object.assign(other,{x:5,z:5,state:'dead'});
  p.rescue={patientId:human.id,bedId:0,phase:'carry'};p.animalRescue={animalId:a.id,spotId:0,phase:'carry'};
  let capture=captureSpikeTrapContacts(w,w.tick*10),actors=capture.actors.get(s.z*w.width+s.x)!;
  expect(actors.map(spikeTrapTargetKey)).toEqual([`pawn:${p.id}`,`mech:${m.id}`]);expect(capture.traps.get(s.z*w.width+s.x)).toBe(s);
  delete p.rescue;delete p.animalRescue;capture=captureSpikeTrapContacts(w,w.tick*10);actors=capture.actors.get(s.z*w.width+s.x)!;
  expect(actors).toContain(human);expect(actors).toContain(a);expect(actors).not.toContain(other);
  expect(new Set(actors.map(spikeTrapTargetKey)).size).toBe(4);
  w.structures=[];w.packed=[{building:s,owner:{type:'ground',x:s.x,z:s.z}}];plan(w,5,5);
  expect(captureSpikeTrapContacts(w,w.tick*10).traps.size).toBe(0);
});
test('new installation takes the current Home toggle without copying an old contact or packed toggle',()=>{
  const {w}=camp(),c={x:6,z:5};w.home=[c.z*w.width+c.x];const a=initialSpikeTrapState(w,c);expect(a).toEqual({autoRebuild:true,touching:[]});
  a.touching.push('pawn:1');expect(initialSpikeTrapState(w,c).touching).toEqual([]);w.home=[];expect(initialSpikeTrapState(w,c).autoRebuild).toBe(false);
});
test('eight-neighbour placement counts finished traps, plans, frames and installation destinations, ignoring exactly one identity',()=>{
  const {w}=camp(),c={x:6,z:5},s=trap(w,5,4);expect(spikeTrapPlacementAllowed(w,c)).toBe(false);expect(spikeTrapPlacementAllowed(w,c,s.id)).toBe(true);
  const j=plan(w,7,6);expect(spikeTrapPlacementAllowed(w,c,s.id)).toBe(false);j.construction='frame';expect(spikeTrapPlacementAllowed(w,c,s.id)).toBe(false);
  w.structures=[];j.kind='install';j.furniture={structureId:s.id,kind:'spike-trap'};expect(spikeTrapPlacementAllowed(w,c,s.id)).toBe(false);
  expect(spikeTrapPlacementAllowed(w,c,j.id)).toBe(true);j.x=8;j.z=7;expect(spikeTrapPlacementAllowed(w,c)).toBe(true);
});
test('trap costs are actor-specific, additive to terrain/material, and generic standability remains open',()=>{
  const {w,p}=camp(),s=trap(w),i=s.z*w.width+s.x;w.tiles[i]={terrain:'rich-soil'};
  expect(canStandAt(w,s)).toBe(true);expect(captureStandability(w)(s)).toBe(true);expect(blockedCells(w)[i]).toBe(0);
  expect(navigationCosts(w,p).costs!.get(i)).toBe(SPIKE_TRAP_SEARCH_COST+67);expect(navigationCosts(w).costs!.get(i)).toBe(67);
  w.piles.push({id:w.nextId++,kind:'steel',item:'steel',quantity:1,owner:{type:'ground',x:s.x,z:s.z}});
  expect(navigationCosts(w,p).costs!.get(i)).toBe(26667+467);expect(navigationCosts(w,p).floors.get(i)).toBe(26667+467);
  expect(furnitureDelay(w,p,s)).toBeCloseTo(5.4);expect(furnitureDelay(w,{x:p.x,z:p.z},s)).toBe(1.4);
  p.faction='outlaws';expect(navigationCosts(w,p).costs!.get(i)).toBe(467);expect(furnitureDelay(w,p,s)).toBe(1.4);
});
test('known trap avoidance reaches both eager and lazy shared planners without spending a second search',()=>{
  const {w,p}=camp(),s=trap(w),target={x:7,z:5},blocked=blockedCells(w),budget={remaining:1,pairs:100,stats:{searches:[] as {pawnId:number;mode:'all'|'nearest'|'full';visited:number;unreachedGroups:number}[]}};
  const before={rng:w.rng,state:structuredClone(s.spikeTrap),pawn:{x:p.x,z:p.z,path:structuredClone(p.path),motion:structuredClone(p.motion)}};
  const full=reachableCells(w,p,blocked,new Set()),fullPath=routeToCell(w,target,full)!;expect(hasCell(fullPath,s)).toBe(false);
  const lazy=searchCandidates(w,p,blocked,new Set(),budget,true)!;expect(routeToCell(w,target,lazy)).toEqual(fullPath);expect(budget.remaining).toBe(0);expect(budget.stats.searches).toHaveLength(1);
  expect(searchCandidates(w,p,blocked,new Set(),budget,true)).toBeNull();
  expect(routeToCell(w,target,candidateAccess(w,p,blocked,new Set()))).toEqual(fullPath);
  expect({rng:w.rng,state:s.spikeTrap,pawn:{x:p.x,z:p.z,path:p.path,motion:p.motion}}).toEqual(before);
  p.faction='outlaws';expect(routeToCell(w,target,reachableCells(w,p,blocked,new Set()))).toEqual([{x:6,z:5},target]);
});
test('allowed-area crossing penalty and trap avoidance coexist without an extra physical area delay',()=>{
  const {w,p}=camp(),s=trap(w),i=s.z*w.width+s.x;w.allowedAreas=[{id:w.nextId++,label:'Origine',color:1,cells:[p.z*w.width+p.x]}];p.allowedAreaId=w.allowedAreas[0]!.id;
  const reach=reachableCells(w,p,blockedCells(w),new Set(),new Set([i])),path=routeToCell(w,s,reach)!;
  expect(routeCost(w,path,reach)).toBe(1000+26667+OUTSIDE_ALLOWED_AREA_SEARCH_COST);
  const plain=structuredClone(w);plain.structures=[];const q=plain.pawns[0]!;
  expect(startTravel(plain,q,s)).toBe(true);expect(startTravel(w,p,s)).toBe(true);
  expect(p.motion!.end-p.motion!.start-(q.motion!.end-q.motion!.start)).toBeCloseTo(4);expect(p.motion!.terrainDelay).toBe(4);
});
test('real human movement pays trap delay once and only on entry, not on departure',()=>{
  const {w,p}=camp(),s=trap(w);expect(startTravel(w,p,s)).toBe(true);const first=p.motion!;
  expect(first.terrainDelay).toBe(4);expect(first.end-first.start).toBeCloseTo(3/(first.speedFactor??1)+4);
  w.tick=Math.ceil(first.end);expect(startTravel(w,p,{x:7,z:5})).toBe(true);expect(p.motion!.terrainDelay??0).toBe(0);
});
test('animal routes share the existing flood and physical trap delay stays four ticks despite search scaling',()=>{
  const {w,a}=animalCamp(),s=trap(w),goal={x:7,z:5};let nav=animalNavigation(w);expect(hasCell(nav.route(a,[goal])!,s)).toBe(false);
  a.manhunter={startedAtCore:w.tick*10,rng:1,zeroRestTicks:0};expect(nav.route(a,[goal])).toEqual([{x:6,z:5},goal]);
  a.domestic={since:w.tick,care:'herbal',tameness:5,nextDecay:w.tick+45000};expect(hasCell(nav.route(a,[goal])!,s)).toBe(false);
  a.path=[{x:s.x,z:s.z}];moveAnimal(w,a,nav.step);expect(a.motion!.terrainDelay).toBe(4);expect(a.motion!.end-a.motion!.start).toBeCloseTo(3/a.motion!.speedFactor!+4);
});
test('packed traps and blueprints produce no avoidance or walking delay; frames keep only their ordinary frame cost',()=>{
  const {w,p}=camp(),s=trap(w),i=s.z*w.width+s.x;w.structures=[];w.packed=[{building:s,owner:{type:'ground',x:s.x,z:s.z}}];const j=plan(w,s.x,s.z);
  expect(navigationCosts(w,p).costs?.get(i)??0).toBe(0);expect(furnitureDelay(w,p,s)).toBe(0);
  j.construction='frame';expect(navigationCosts(w,p).costs!.get(i)).toBe(467);expect(furnitureDelay(w,p,s)).toBe(1.4);
});
test('real mechanical travel remains ignorant and pays no trap walking delay',()=>{
  const {w,m}=mechanoidCombatCamp(),s=trap(w,m.x+1,m.z);m.path=[{x:s.x,z:s.z}];m.planCooldown=20;
  const plain=structuredClone(w),q=plain.mechanoids!.find(a=>a.id===m.id)!;plain.structures=plain.structures.filter(a=>a.id!==s.id);
  const baselineLight=new LightEnvironmentCache();processMechanoidCombat(plain,q,()=>blockedCells(plain),{remaining:0,pairs:0},()=>baselineLight.read(plain));
  const light=new LightEnvironmentCache();processMechanoidCombat(w,m,()=>blockedCells(w),{remaining:0,pairs:0},()=>light.read(w));
  expect(m.x).toBe(s.x);expect(q.x).toBe(s.x);expect(m.motion).toBeDefined();expect(q.motion).toBeDefined();
  expect(m.motion).toEqual(q.motion);expect(spikeTrapPhysicalCell(m,w.tick*10)).toEqual(m.motion!.from);
});
