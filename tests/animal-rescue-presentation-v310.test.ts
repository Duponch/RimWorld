import { expect,test } from 'vitest';
import type { Structure } from '../src/sim/types';
import * as THREE from 'three/webgpu';
import { animalRescueCamp } from './helpers/animal-rescue-v310';
import { applyCommand } from '../src/sim/index';
import { validateWorld,serializeWorld,deserializeWorld } from '../src/sim/serialization';
import { addMaterial,refreshStock } from '../src/sim/materials';
import { animalSpotAvailable } from '../src/sim/animal-rest';
import { syncCarriedAnimals } from '../src/sim/animal-rest-state';
import { createMedicalRecord,addResolvedInjury } from '../src/sim/injury-state';
import { animalSleepingSpotParts } from '../src/render/animal-sleeping-spot-parts';
import { constructionPreviewParts } from '../src/render/construction-preview-parts';
import { PawnLayer } from '../src/render/PawnLayer';
import { WildlifeLayer } from '../src/render/WildlifeLayer';
import { animalActivity } from '../src/ui/animal-activity';
import { equipmentInspectionView } from '../src/ui/equipment-inspection';
import { animalRescueReason } from '../src/sim/animal-rescue';

test('free animal marking immediately preserves plants, zones and piles, but rejects massifs and structures',()=>{
  const {world:w}=animalRescueCamp(),cell={x:15,z:12};
  w.stockpiles.push({id:w.nextId++,x:cell.x,z:cell.z,capacity:500,priority:2,filters:{wood:true,food:false}});
  w.resources.push({id:w.nextId++,kind:'tree',x:cell.x,z:cell.z,amount:20});
  addMaterial(w,'chunk',1,{type:'ground',...cell},'granite-chunk');refreshStock(w);
  const before={piles:structuredClone(w.piles),resources:structuredClone(w.resources),stockpiles:structuredClone(w.stockpiles),rng:w.rng};
  expect(applyCommand(w,{type:'designate',kind:'animal-sleeping-spot',...cell})).toEqual({ok:true});
  expect(w.jobs).toHaveLength(0);expect(w.piles).toEqual(before.piles);expect(w.resources).toEqual(before.resources);expect(w.stockpiles).toEqual(before.stockpiles);expect(w.rng).toBe(before.rng);
  const spot=w.structures[0]!;expect(animalSpotAvailable(w,spot,w.wildlife!.animals[0]!)).toBe(false);
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  expect(applyCommand(w,{type:'designate',kind:'animal-sleeping-spot',...cell}).ok).toBe(false);
  w.tiles[13*w.width+15]!.terrain='rock';
  expect(applyCommand(w,{type:'designate',kind:'animal-sleeping-spot',x:15,z:13}).ok).toBe(false);
  expect(applyCommand(w,{type:'designate',kind:'animal-sleeping-spot',x:16,z:13,orientation:1}).ok).toBe(false);
});

test('changing spot role preserves actual sleeping posture and clears normal ownership; deletion preserves the animal',()=>{
  const {world:w,sleeperId}=animalRescueCamp(),a=w.wildlife!.animals.find(a=>a.id===sleeperId)!;
  expect(applyCommand(w,{type:'designate',kind:'animal-sleeping-spot',x:a.x,z:a.z})).toEqual({ok:true});
  const spot=w.structures[0]!;a.state='sleeping';a.animalRest={spotId:spot.id,phase:'sleep'};a.domestic!.bedId=spot.id;
  a.health={...createMedicalRecord(w.tick),body:a.species};addResolvedInjury(a.health,'left-front-leg','bruise',500,()=>.999999);
  expect(applyCommand(w,{type:'animal-spot-medical',spotId:spot.id,enabled:true})).toEqual({ok:true});
  expect(a.state).toBe('sleeping');expect(a.domestic!.bedId).toBeUndefined();expect(a.animalRest).toEqual({spotId:spot.id,phase:'sleep'});expect(validateWorld(w)).toEqual([]);
  expect(applyCommand(w,{type:'animal-spot-medical',spotId:spot.id,enabled:false})).toEqual({ok:true});
  expect(a.state).toBe('sleeping');expect(a.domestic!.bedId).toBe(spot.id);expect(validateWorld(w)).toEqual([]);
  const physical={id:a.id,x:a.x,z:a.z,health:structuredClone(a.health),food:a.food};
  expect(applyCommand(w,{type:'designate',kind:'deconstruct',targetId:spot.id,x:spot.x,z:spot.z})).toEqual({ok:true});
  expect(w.structures).toHaveLength(0);expect(w.jobs).toHaveLength(0);expect(a.animalRest).toBeUndefined();expect(a.domestic!.bedId).toBeUndefined();
  expect(a).toMatchObject(physical);expect(validateWorld(w)).toEqual([]);
});

test('finished and preview animal spots use the same floor geometry, with distinct medical markings',()=>{
  const {world:w}=animalRescueCamp();const spot:Structure={id:w.nextId++,kind:'animal-sleeping-spot' as const,x:4,z:5,orientation:0 as const,footprint:'standard' as const};w.structures=[spot];
  const parts=animalSleepingSpotParts(w);expect(parts).toHaveLength(13);expect(Math.max(...parts.map(p=>p.y!+p.sy!/2))).toBeLessThan(.06);
  const preview=constructionPreviewParts({...w,structures:[]},[{kind:spot.kind,x:spot.x,z:spot.z,orientation:0}]);
  const strip=(p:typeof parts[number])=>{const {targetId,key,...geometry}=p;return geometry;};
  expect([...preview.boxes,...preview.rotatedBoxes].map(strip).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))))
    .toEqual(parts.map(strip).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
  spot.medical=true;const medical=animalSleepingSpotParts(w);expect(medical).toHaveLength(10);expect(medical[0]!.color).not.toBe(parts[0]!.color);
});

test('live carried patient shares resident carrier buffers without a corpse or repeated frame uploads',()=>{
  const {world:w,doctorId,animalId}=animalRescueCamp(),p=w.pawns.find(p=>p.id===doctorId)!,a=w.wildlife!.animals.find(a=>a.id===animalId)!;
  p.priorities.doctor=1;p.animalRescue={animalId:a.id,spotId:w.nextId++,phase:'carry'};p.state='moving';
  w.structures=[{id:p.animalRescue.spotId,kind:'animal-sleeping-spot',x:10,z:8,orientation:0,footprint:'standard',medical:true}];
  p.motion={from:{x:p.x-1,z:p.z},to:{x:p.x,z:p.z},start:w.tick-1,end:w.tick+1};syncCarriedAnimals(w,p);
  const before=structuredClone(w),pawns=new PawnLayer(),layer=new WildlifeLayer();pawns.update(w,1,true);layer.update(w,undefined,true,pawns);
  const mesh=layer.mesh.children.find(m=>m.name==='Wild muffalo — GPU rig')! as THREE.Mesh<THREE.InstancedBufferGeometry>,g=mesh.geometry,source=pawns.animalCorpseCarrier(p.id)!;
  expect(g.instanceCount).toBe(1);expect(g.getAttribute('aCarrier').getX(0)).toBe(1);expect(g.getAttribute('aAnimal').getZ(0)).toBe(1);
  for(const name of ['aFrom','aTo','aTravel'])for(let c=0;c<4;c++)expect(g.getAttribute(name).getComponent(0,c)).toBe(source.geometry.getAttribute(name).getComponent(source.index,c));
  const stream=g.getAttribute('aFrom') as THREE.InterleavedBufferAttribute,version=stream.data.version;
  layer.update(w,undefined,false,pawns);expect(stream.data.version).toBe(version);expect(w).toEqual(before);
  expect(animalActivity(w,a)).toContain(`Porté vers un couchage · ${p.name}`);expect(equipmentInspectionView(w,p).inventory).toContain(`Animal secouru transporté · ${a.id}`);
  expect(animalRescueReason(w,p,a)).toMatch(/engagé/);delete p.animalRescue;expect(animalRescueReason(w,p,a)).toBeUndefined();p.priorities.doctor=0;expect(animalRescueReason(w,p,a)).toMatch(/Médecin/);
  layer.dispose();pawns.dispose();
});
