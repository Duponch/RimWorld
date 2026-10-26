import {expect,test} from 'vitest';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction';
import {registeredMap,flushRegisteredMap} from '../src/sim/world-map-context';
import {reconcileRoofSupport} from '../src/sim/roofing';
import {roofKindAt} from '../src/sim/roof-rules';
import {addMaterial} from '../src/sim/materials';
import type {Job} from '../src/sim/types';

test('natural thin collapse reads the unflushed registered home-map removal and preserves an ordinary unsupplied blueprint',()=>{
  const root=deconstructionCamp(),wall=fixtureBuilding(root,'wall',16,16),i=16*root.width+16;
  const actual=registeredMap(root,root.worldMaps!.rootMapId!)!,oldStructures=root.structures,oldJobs=root.jobs,oldRoof=root.roofing;
  expect(actual).not.toBe(root);
  // Generic physical removal frontier: the live map replaced local arrays,
  // and its caller has not flushed the tick's completed work to root yet.
  actual.structures=actual.structures.filter(s=>s!==wall);
  const blueprint:Job={id:actual.nextId++,kind:'bed',material:'wood',x:16,z:16,orientation:0,footprint:'standard',
    construction:'blueprint',reservedBy:null,status:'pending',progress:0,escrow:{wood:0,food:0}};
  actual.jobs=[blueprint];actual.roofing={constructed:[],build:[],remove:[],cursor:0,natural:{thin:[i],thick:[]}};
  expect(root.structures).toContain(wall);expect(root.jobs).toBe(oldJobs);
  expect(reconcileRoofSupport(actual,false,wall)).toBe(1);
  expect(actual.structures).not.toContain(wall);expect(roofKindAt(actual,i)).toBeUndefined();
  expect(actual.jobs).toEqual([blueprint]);expect(actual.jobs[0]).toBe(blueprint);expect(actual.tiles[i]!.terrain).toBe('grass');
  // Projection adoption changes the active local owner, never an early root
  // array/roof flush. The caller still owns the ordinary end-of-tick flush.
  expect(root.structures).toBe(oldStructures);expect(root.structures).toContain(wall);expect(root.jobs).toBe(oldJobs);expect(root.roofing).toBe(oldRoof);
  expect(actual.nextId).toBe(root.nextId);expect(actual.rng).toBe(root.rng);
  flushRegisteredMap(actual);expect(root.structures).not.toContain(wall);expect(root.jobs[0]).toBe(blueprint);expect(roofKindAt(root,i)).toBeUndefined();
});

test('natural thick collapse consumes only the actual home-map frame deliveries instead of resurrecting its stale root support',()=>{
  const root=deconstructionCamp(),wall=fixtureBuilding(root,'wall',16,16),i=16*root.width+16;
  const actual=registeredMap(root,root.worldMaps!.rootMapId!)!,oldStructures=root.structures,oldJobs=root.jobs,oldPiles=root.piles;
  actual.structures=actual.structures.filter(s=>s!==wall);actual.piles=[];
  const frame:Job={id:actual.nextId++,kind:'bed',material:'wood',x:16,z:16,orientation:0,footprint:'standard',
    construction:'frame',reservedBy:null,status:'pending',progress:0,escrow:{wood:0,food:0}};
  actual.jobs=[frame];addMaterial(actual,'wood',8,{type:'job',jobId:frame.id},'wood');const delivered=actual.piles[0]!,deliveredId=delivered.id;
  actual.roofing={constructed:[],build:[],remove:[],cursor:0,natural:{thin:[],thick:[i]}};
  expect(reconcileRoofSupport(actual,false,wall)).toBe(1);
  expect(actual.structures).not.toContain(wall);expect(actual.jobs).not.toContain(frame);expect(actual.jobs).toEqual([]);
  expect(actual.piles.some(p=>p.id===deliveredId)).toBe(false);
  // Thick collapse performs its existing second crush pass: the quarter
  // leavings deposited under this roof on pass one are then destroyed too.
  expect(actual.piles.filter(p=>p.item==='wood')).toEqual([]);expect(actual.destroyed?.items?.wood).toBe(8);
  expect(actual.tiles[i]!.terrain).toBe('rock');expect(actual.tiles[i]!.collapsedRock).toBeDefined();expect(roofKindAt(actual,i)).toBe('natural-thick');
  expect(root.structures).toBe(oldStructures);expect(root.structures).toContain(wall);expect(root.jobs).toBe(oldJobs);expect(root.piles).toBe(oldPiles);
  expect(actual.nextId).toBe(root.nextId);expect(actual.rng).toBe(root.rng);
  flushRegisteredMap(actual);expect(root.structures).not.toContain(wall);expect(root.jobs).toEqual([]);expect(root.destroyed?.items?.wood).toBe(8);
});
