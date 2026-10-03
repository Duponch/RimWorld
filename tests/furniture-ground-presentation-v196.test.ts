import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/index';
import type { StructureKind } from '../src/sim/types';
import { footprintCells } from '../src/sim/definitions';
import { PawnLayer } from '../src/render/PawnLayer';
import { MotionTimeline } from '../src/render/MotionTimeline';
import { furnitureSurfaces,travelHeight } from '../src/render/furniture-motion';
import { clearGroup } from '../src/render/primitives';

test('confirmed furniture entries, exits and shortened edges share ground-level body, cargo and selection endpoints',()=>{
  const world=createWorld(42,32,32),pawn=world.pawns[0]!;
  world.pawns=[pawn];world.jobs=[];world.resources=[];
  pawn.state='moving';pawn.path=[];pawn.need=null;pawn.jobId=null;
  const layer=new PawnLayer(),timeline=new MotionTimeline();
  const kinds:StructureKind[]=['stool','dining-chair','armchair','table','table-square','table-long','bed',
    'machining-table','hi-tech-research-bench','fabrication-bench','multi-analyzer','stonecutter',
    'art-bench','research-bench','tailor-bench','electric-tailor-bench','fueled-stove','electric-stove','butcher-table'];
  try {
    for(const kind of kinds)for(const orientation of [0,1,2,3] as const) {
      const structure={id:world.nextId++,kind,x:16,z:16,orientation,footprint:'standard' as const};
      world.structures=[structure];
      const cells=footprintCells(structure),first=cells[0]!,last=cells.at(-1)!;
      const beside=(cell:typeof first)=>[{x:cell.x-1,z:cell.z},{x:cell.x+1,z:cell.z},{x:cell.x,z:cell.z-1},{x:cell.x,z:cell.z+1}]
        .find(candidate=>!cells.some(occupied=>occupied.x===candidate.x&&occupied.z===candidate.z))!;
      for(const [fromCell,toCell] of [[beside(first),first],[last,beside(last)]])for(const shortened of [false,true]) {
        world.tick+=10;Object.assign(pawn,toCell);
        const segment={from:fromCell,to:toCell,start:world.tick,end:world.tick+4,
          ...(shortened?{edgeStart:world.tick-2,fromFraction:.35,toFraction:.75}:{})};
        pawn.motion={from:fromCell,to:toCell,start:segment.start,end:segment.end};
        pawn.moveCooldown=4;timeline.tracks.set(pawn.id,[segment]);timeline.tick=world.tick+1;
        const before=structuredClone(world);
        layer.update(world,1,true);layer.updateTravel(world,timeline);
        const geometry=layer.feedbackSource!,from=geometry.getAttribute('aFrom') as THREE.InstancedBufferAttribute;
        const to=geometry.getAttribute('aTo') as THREE.InstancedBufferAttribute;
        expect(from.getY(0),`${kind}:${orientation}:departure`).toBe(0);
        expect(to.getY(0),`${kind}:${orientation}:arrival`).toBe(0);
        for(const fraction of [0,.1,1/3,.5,2/3,.9,1])expect(travelHeight(from.getY(0),to.getY(0),fraction)).toBe(0);
        for(const attribute of ['aFrom','aTo','aTravel'])for(const mesh of [layer.group.children[1]!,layer.group.children[3]!]) {
          expect((mesh as THREE.Mesh).geometry.getAttribute(attribute)).toBe(geometry.getAttribute(attribute));
        }
        const versions=[from.version,to.version];layer.updateTravel(world,timeline);
        expect([from.version,to.version]).toEqual(versions); // same confirmed pose is also the paused pose
        expect(world).toEqual(before);
      }
    }
    expect(furnitureSurfaces(world)).toBe(furnitureSurfaces(createWorld(93,16,16)));
  } finally { clearGroup(layer.group); }
});

test('actual dining seats retain the seated rig instead of inheriting transit height',()=>{
  const world=createWorld(42,32,32),pawn=world.pawns[0]!;
  world.pawns=[pawn];world.jobs=[];world.resources=[];
  pawn.x=16;pawn.z=16;pawn.state='eating';pawn.motion=null;
  const layer=new PawnLayer();
  try {
    for(const kind of ['stool','dining-chair','armchair'] as const) {
      const seat={id:world.nextId++,kind,x:16,z:16,orientation:0 as const,footprint:'standard' as const};
      const table={id:world.nextId++,kind:'table' as const,x:16,z:17,orientation:0 as const,footprint:'standard' as const};
      world.structures=[seat,table];
      pawn.need={kind:'eat',phase:'ingest',sourcePileId:1,carryPileId:1,quantity:1,progress:1,
        dining:{target:{x:16,z:16},seatId:seat.id,tableId:table.id}};
      layer.update(world,1,true);
      const geometry=layer.feedbackSource!,motion=geometry.getAttribute('aMotion') as THREE.InstancedBufferAttribute;
      expect(motion.getZ(0)).toBe(3);
      expect((geometry.getAttribute('aTo') as THREE.InstancedBufferAttribute).getY(0)).toBe(0);
    }
  } finally { clearGroup(layer.group); }
});
