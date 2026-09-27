import { expect,test } from 'vitest';
import { pawnGeometry } from '../src/render/pawn-geometry';
import { animalParts } from '../src/render/animal-shape';
import { graveParts } from '../src/render/grave-parts';
import { createWorld } from '../src/sim/index';
import { initialGrave } from '../src/sim/burial';

test('the shared human rig overlaps shoulders and hips while the holstered revolver points down',()=>{
  const geometry=pawnGeometry(),point=geometry.getAttribute('position'),bone=geometry.getAttribute('boneId'),dye=geometry.getAttribute('dye');
  const bounds=(accept:(i:number)=>boolean)=>{
    const result={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};
    for(let i=0;i<point.count;i++)if(accept(i)){
      result.minX=Math.min(result.minX,point.getX(i));result.maxX=Math.max(result.maxX,point.getX(i));
      result.minY=Math.min(result.minY,point.getY(i));result.maxY=Math.max(result.maxY,point.getY(i));
    }
    return result;
  };
  const trunk=bounds(i=>bone.getX(i)===0&&dye.getX(i)===1);
  const legs=bounds(i=>bone.getX(i)===4||bone.getX(i)===5);
  const arms=bounds(i=>bone.getX(i)===3);
  expect(trunk.minY).toBeLessThan(legs.maxY-.08);
  expect(trunk.maxY).toBeGreaterThan(arms.minY+.08);
  expect(trunk.maxX).toBeGreaterThan(arms.minX);
  const gunCenters:number[]=[];
  for(let i=0;i<point.count;i++)if(dye.getX(i)===-1&&i%36===0){
    let sum=0;for(let j=0;j<36;j++)sum+=point.getY(i+j);
    gunCenters.push(sum/36);
  }
  expect(gunCenters).toHaveLength(3);
  expect(gunCenters[0]).toBeLessThan(gunCenters[2]!); // barrel below grip
  geometry.dispose();
});

test('every quadruped keeps upper legs inside its body proxy',()=>{
  for(const species of ['hare','snow-hare','deer','muffalo','gazelle','dromedary']){
    const parts=animalParts(species),body=parts[0]!;
    const bodyBottom=body.center[1]-body.size[1]/2;
    const legs=parts.filter(p=>p.bone===1||p.bone===2);
    expect(legs.length).toBeGreaterThanOrEqual(2);
    expect(legs.some(p=>p.center[1]+p.size[1]/2>bodyBottom+.07)).toBe(true);
  }
});

test('the grave marker is a planted upright cross for every orientation',()=>{
  const world=createWorld(17,32,32);
  for(const orientation of [0,1,2,3] as const){
    world.structures=[{id:world.nextId++,kind:'grave',x:12,z:12,orientation,footprint:'standard',grave:initialGrave()}];
    const [soil,shaft,beam]=graveParts(world);
    expect(soil).toBeDefined();expect(shaft).toBeDefined();expect(beam).toBeDefined();
    expect(shaft!.sy).toBeGreaterThan(shaft!.sx!*5);
    expect(beam!.sx).toBeGreaterThan(beam!.sy!*3);
    expect(beam!.y).toBeGreaterThan(shaft!.y);
    expect(shaft!.x).toBe(beam!.x);expect(shaft!.z).toBe(beam!.z);
    expect(shaft!.ry).toBe(soil!.ry);
  }
});
