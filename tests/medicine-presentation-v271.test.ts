import {expect,test} from 'vitest';
import {createWorld,applyCommand} from '../src/sim/engine.ts';
import {DRUG_PRODUCTION_RESEARCH_COST} from '../src/sim/research.ts';
import {constructionRecipe} from '../src/sim/construction-materials.ts';
import {drugLabParts} from '../src/render/drug-lab-parts.ts';
import {pileSurfaces} from '../src/render/pile-surfaces.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {WORLD_SCALE} from '../src/world/scale.ts';
import type {Structure} from '../src/sim/types.ts';

test('manual laboratory needs drug research and its complete physical construction costs',()=>{
  const w=createWorld(271,32,32);w.jobs=[];w.resources=[];w.structures=[];w.piles=[];w.tiles=w.tiles.map(()=>({terrain:'grass'}));
  const command={type:'designate' as const,kind:'drug-lab' as const,x:12,z:12,orientation:1 as const,material:'wood' as const};
  expect(applyCommand(w,command).ok).toBe(false);expect(w.jobs).toHaveLength(0);
  w.research={project:null,points:0,drugProduction:{points:DRUG_PRODUCTION_RESEARCH_COST,completedAt:0}};
  expect(applyCommand(w,command).ok).toBe(true);
  expect(constructionRecipe(w.jobs[0]!)).toMatchObject({ingredients:[{item:'wood',quantity:50},{item:'steel',quantity:75},{item:'component',quantity:6}]});
  expect(footprintCells(w.jobs[0]!)).toHaveLength(3);
  expect(constructionRecipe({kind:'drug-lab',material:'steel'})).toMatchObject({ingredients:[{item:'steel',quantity:125},{item:'component',quantity:6}]});
});

test('chemistry furniture rotates as one resident batch and has a surface on every occupied cell',()=>{
  const w=createWorld(271,32,32);w.structures=[];
  const s:Structure={id:w.nextId++,kind:'drug-lab',x:10,z:10,orientation:0,footprint:'standard',material:'steel',bills:[]};w.structures=[s];
  const baseline=drugLabParts(w);expect(baseline.length).toBeGreaterThan(15);
  for(const orientation of [0,1,2,3] as const){
    s.orientation=orientation;const rotated=drugLabParts(w),angle=orientation*Math.PI/2;
    expect(rotated.length).toBe(baseline.length);
    rotated.forEach((p,i)=>{const b=baseline[i]!,x=b.x-s.x,z=b.z-s.z;
      expect(p.x).toBeCloseTo(s.x+x*Math.cos(angle)+z*Math.sin(angle));expect(p.z).toBeCloseTo(s.z+z*Math.cos(angle)-x*Math.sin(angle));
      expect(p.key).toBe(s.id);expect(p.ry).toBe(angle);expect(p.y).toBe(b.y);
    });
    for(const cell of footprintCells(s))expect(pileSurfaces(w).get(cell.z*w.width+cell.x)?.y).toBe(WORLD_SCALE.stonecutterHeight);
  }
  expect(s.power).toBeUndefined();
});
