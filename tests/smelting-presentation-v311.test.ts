import { expect,test,vi } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/index';
import { smeltingParts } from '../src/render/smelting-parts';
import { buildFurniture } from '../src/render/FurnitureLayer';
import { constructionPreviewParts } from '../src/render/construction-preview-parts';
import { PawnLayer } from '../src/render/PawnLayer';
import { itemCargoKind } from '../src/render/item-presentation';
import { pawnWorkPose,WORK_POSE } from '../src/render/work-presentation';
import { actionProgress } from '../src/render/action-feedback';
import { cookingSpot } from '../src/sim/cooking-bills';
import { productionWorkTotal } from '../src/sim/production-recipes';
import { queryPawnStatus } from '../src/sim/diagnostics';
import type { Structure } from '../src/sim/types';
import type { BoxBatches } from '../src/render/BoxBatches';
import type { Placement } from '../src/render/primitives';

function fixture(){
  const world=createWorld(311,32,32);world.resources=[];world.jobs=[];world.piles=[];world.packed=[];
  const station:Structure={id:world.nextId++,kind:'electric-smelter',x:12,z:12,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:null},bills:[]};
  world.structures=[station];return {world,station};
}

test('smelter is bounded in the three-cell footprint and rotates without moving its service edge into machinery',()=>{
  const {world,station}=fixture(),base=smeltingParts(world);expect(base.length).toBeGreaterThan(8);
  for(const part of base){
    expect(Math.abs(part.x-station.x)+(part.sx??1)/2).toBeLessThanOrEqual(1.500001);
    expect(Math.abs(part.z-station.z)+(part.sz??1)/2).toBeLessThanOrEqual(.500001);
    expect(part.y-(part.sy??1)/2).toBeGreaterThanOrEqual(-.000001);expect(part.key).toBe(station.id);
  }
  for(const orientation of [0,1,2,3] as const){
    station.orientation=orientation;const rotated=smeltingParts(world),angle=orientation*Math.PI/2;
    expect(rotated).toHaveLength(base.length);
    for(let i=0;i<base.length;i++){
      const before=base[i]!,after=rotated[i]!,x=before.x-station.x,z=before.z-station.z;
      expect(after.x).toBeCloseTo(station.x+x*Math.cos(angle)+z*Math.sin(angle));
      expect(after.z).toBeCloseTo(station.z+z*Math.cos(angle)-x*Math.sin(angle));expect(after.key).toBe(station.id);
    }
    const spot=cookingSpot(station);expect(Math.hypot(spot.x-station.x,spot.z-station.z)).toBe(1);
  }
  const before=structuredClone(world),parts=smeltingParts(world);expect(world).toEqual(before);
  station.power!.on=false;world.tick+=10;expect(smeltingParts(world)).toEqual(parts);
});

test('completed machine and ghost use the same authored geometry in the existing furniture batch',()=>{
  const {world,station}=fixture(),parts=smeltingParts(world),batches:{name:string;parts:Placement[]}[]=[];
  buildFurniture(world,new THREE.Group(),false,{set:(_g:THREE.Group,name:string,parts:Placement[])=>batches.push({name,parts})} as unknown as BoxBatches);
  expect(batches.filter(b=>b.parts.some(p=>p.key===station.id))).toHaveLength(1);
  expect(batches.find(b=>b.parts.some(p=>p.key===station.id))!.name).toBe('furniture');
  expect(batches.flatMap(b=>b.parts).filter(p=>p.key===station.id).map(({targetId,...p})=>p)).toEqual(parts.map(({targetId,...p})=>p));
  const preview=constructionPreviewParts({...world,structures:[]},[{kind:station.kind,x:station.x,z:station.z,orientation:0,material:'steel'}]);
  const strip=({key,targetId,...p}:Placement)=>p;
  const sorted=(p:Placement[])=>p.map(strip).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  expect(sorted([...preview.boxes,...preview.rotatedBoxes])).toEqual(sorted(parts));
});

test('source weapon and recovered metal reuse resident cargo; work counter and TSL construction do not mutate the world',()=>{
  const {world,station}=fixture(),pawn=world.pawns[0]!;
  world.piles=[{id:world.nextId++,kind:'weapon',item:'bolt-action-rifle',quantity:1,owner:{type:'pawn',pawnId:pawn.id},weapon:{quality:'normal',hitPoints:100}}];
  const errors:string[]=[],log=vi.spyOn(console,'error').mockImplementation(message=>errors.push(String(message)));
  let layer:PawnLayer|undefined;
  try{
    layer=new PawnLayer();
    const before=structuredClone(world);layer.update(world,1,true);expect(world).toEqual(before);
    const cargo=layer.feedbackSource!.getAttribute('aCargo') as THREE.InstancedBufferAttribute;
    expect(cargo.getX(0)).toBe(itemCargoKind('bolt-action-rifle'));expect(cargo.getY(0)).toBe(1);
    layer.update(world,1,false);expect(layer.feedbackSource!.getAttribute('aCargo')).toBe(cargo);
    world.piles=[{id:world.nextId++,kind:'steel',item:'steel',quantity:15,owner:{type:'pawn',pawnId:pawn.id}}];
    layer.update(world,1,true);expect(cargo.getX(0)).toBe(itemCargoKind('steel'));expect(cargo.getY(0)).toBe(1);expect(errors).toEqual([]);
    const spot=cookingSpot(station);pawn.state='working';pawn.cooking={recipe:'smelt-weapon',stationId:station.id,billId:1,spot,actionCell:spot,phase:'work',ingredients:[],progress:productionWorkTotal('smelt-weapon')/2,productId:null,storageId:null};
    expect(pawnWorkPose(pawn,undefined,station.kind)).toBe(WORK_POSE.craft);
    expect(actionProgress(world,pawn)).toMatchObject({kind:'production',fraction:.5,total:1600000,completed:800000});
    expect(queryPawnStatus(world,pawn).reason).toBe('Fond une arme (50 %).');
    pawn.cooking.phase='output';pawn.state='moving';expect(actionProgress(world,pawn)).toBeUndefined();
  }finally{log.mockRestore();layer?.dispose();}
});
