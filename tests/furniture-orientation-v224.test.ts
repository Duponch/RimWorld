import { expect,test } from 'vitest';
import { habitatParts } from '../src/render/habitat-parts';
import { industryParts } from '../src/render/industry-parts';
import { televisionParts } from '../src/render/recreation-parts';
import type { Placement } from '../src/render/primitives';
import { createWorld } from '../src/sim';
import { cookingSpot } from '../src/sim/cooking-bills';
import { footprintCells } from '../src/sim/definitions';
import { televisionWatchCells } from '../src/sim/television-recreation';
import type { Cell,Orientation,Structure } from '../src/sim/types';

// Independent expected directions: saved rotations are also the face the
// placement preview must show. Neighbouring furniture cannot override them.
const directions=[[0,1],[1,0],[0,-1],[-1,0]] as const;
const rotations=[0,1,2,3] as const;
const dot=(a:Cell,b:Cell,d:readonly [number,number])=>(a.x-b.x)*d[0]+(a.z-b.z)*d[1];
function structure(kind:Structure['kind'],orientation:Orientation,id=100):Structure {
  return {id,kind,x:10,z:10,orientation,footprint:'standard',material:kind==='armchair'?'cloth':'steel',quality:'normal'};
}
function backrest(parts:Placement[],kind:'dining-chair'|'armchair'):Placement {
  const candidates=parts.filter(part=>part.sy===(kind==='dining-chair'?.42:.50));
  expect(candidates).toHaveLength(1);return candidates[0]!;
}
function staysInside(parts:Placement[],cells:Cell[]):void {
  const xs=cells.map(cell=>cell.x),zs=cells.map(cell=>cell.z);
  for(const part of parts){
    const cosine=Math.abs(Math.cos(part.ry??0)),sine=Math.abs(Math.sin(part.ry??0));
    const halfX=(cosine*part.sx!+sine*part.sz!)/2,halfZ=(sine*part.sx!+cosine*part.sz!)/2;
    expect(part.x-halfX).toBeGreaterThanOrEqual(Math.min(...xs)-.500001);
    expect(part.x+halfX).toBeLessThanOrEqual(Math.max(...xs)+.500001);
    expect(part.z-halfZ).toBeGreaterThanOrEqual(Math.min(...zs)-.500001);
    expect(part.z+halfZ).toBeLessThanOrEqual(Math.max(...zs)+.500001);
  }
}

test('all saved chair rotations put the back behind the front and preserve a deliberate manual choice near tables or research',()=>{
  const world=createWorld(224,20,20);
  for(const kind of ['dining-chair','armchair'] as const)for(const orientation of rotations){
    const seat=structure(kind,orientation),direction=directions[orientation];world.structures=[seat];
    const footprint=footprintCells(seat),initial=JSON.stringify(world),parts=habitatParts(world),back=backrest(parts,kind);
    expect(dot(back,seat,direction)).toBeLessThan(0);
    expect(Math.abs((back.x-seat.x)*direction[1]-(back.z-seat.z)*direction[0])).toBeLessThan(1e-10);
    expect(parts.every(part=>part.ry===orientation*Math.PI/2)).toBe(true);
    staysInside(parts,footprint);expect(JSON.stringify(world)).toBe(initial);expect(footprintCells(seat)).toEqual(footprint);
    if(kind==='armchair'){
      const cushion=parts.find(part=>part.sy===.14)!;expect(dot(cushion,seat,direction)).toBeGreaterThan(0);
      const arms=parts.filter(part=>part.sy===.36);expect(arms).toHaveLength(2);
      for(const arm of arms)expect(dot(arm,seat,direction)).toBeGreaterThan(0);
    }
    // Tables deliberately behind this manual chair and a desk beside it do
    // not silently rotate the model to face a convenient neighbouring target.
    for(const context of ['table','chess-table','hi-tech-research-bench'] as const){
      world.structures=[seat,{...structure(context,orientation,101),x:seat.x-direction[0]*2,z:seat.z-direction[1]*2}];
      const before=JSON.stringify(world);expect(habitatParts(world).filter(part=>part.key===seat.id)).toEqual(parts);
      expect(JSON.stringify(world)).toBe(before);
    }
  }
});

test('every advanced research monitor exposes its screen toward the real service and keyboard without rotating the desk footprint',()=>{
  const world=createWorld(224,20,20);
  for(const orientation of rotations){
    const desk=structure('hi-tech-research-bench',orientation),direction=directions[orientation];world.structures=[desk];
    const cells=footprintCells(desk),service=cookingSpot(desk),center={x:desk.x+direction[0]*.5,z:desk.z+direction[1]*.5};
    expect(dot(service,center,direction)).toBeLessThan(0);
    const initial=JSON.stringify(world),parts=industryParts(world);
    const screens=parts.filter(part=>part.color===0x6caaa9),cases=parts.filter(part=>part.color===0x455761),keyboards=parts.filter(part=>part.color===0xd9d2b2);
    expect(screens).toHaveLength(4);expect(cases).toHaveLength(4);expect(keyboards).toHaveLength(4);
    for(const [index,screen] of screens.entries()){
      const casing=cases[index]!,keyboard=keyboards[index]!;
      // A viewer at cookingSpot must meet the coloured face before the body.
      expect(dot(screen,casing,direction)).toBeLessThan(0);
      expect(dot(keyboard,casing,direction)).toBeLessThan(0);
      expect(dot(screen,center,direction)-screen.sz!/2).toBeLessThan(dot(casing,center,direction)-casing.sz!/2);
      expect(Math.abs((screen.x-casing.x)*direction[1]-(screen.z-casing.z)*direction[0])).toBeLessThan(1e-10);
      expect(screen.ry).toBe(orientation*Math.PI/2);
    }
    staysInside(parts,cells);expect(JSON.stringify(world)).toBe(initial);expect(footprintCells(desk)).toEqual(cells);
  }
});

test('TV still faces its front rectangle, a correctly rotated viewer seat faces it, and a wrong archived rotation stays explicit',()=>{
  const world=createWorld(224,20,20);
  for(const orientation of rotations){
    const tv={...structure('tube-television',orientation),power:{on:true,parentId:102}},direction=directions[orientation];
    const seat={...structure('armchair',((orientation+2)%4) as Orientation,101),x:tv.x+direction[0]*2,z:tv.z+direction[1]*2};
    world.structures=[tv,seat];const initial=JSON.stringify(world),screen=televisionParts(world).find(part=>part.color===0xa8cec5)!;
    expect(dot(screen,tv,direction)).toBeGreaterThan(0);
    expect(screen.ry).toBe(orientation*Math.PI/2);expect(televisionWatchCells(tv)).toContainEqual({x:seat.x,z:seat.z});
    const parts=habitatParts(world),back=backrest(parts,'armchair'),towardTv=[-direction[0],-direction[1]] as const;
    expect(dot(back,seat,towardTv)).toBeLessThan(0);expect(JSON.stringify(world)).toBe(initial);
    // V223's six TV seats have tv.orientation rather than the opposite.
    // This fixture preserves that authoring error: render must not repair the
    // archived World or erase the player's deliberate chair orientation.
    seat.orientation=orientation;const archived=JSON.stringify(world),wrongBack=backrest(habitatParts(world),'armchair');
    expect(dot(wrongBack,seat,towardTv)).toBeGreaterThan(0);
    expect(televisionWatchCells(tv)).toContainEqual({x:seat.x,z:seat.z});expect(JSON.stringify(world)).toBe(archived);
  }
});
