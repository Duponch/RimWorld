import {expect,test} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction';
import {smithyParts267} from '../src/render/smithy-parts267';
import {constructionPreviewParts} from '../src/render/construction-preview-parts';
import {pileSurfaces} from '../src/render/pile-surfaces';
import {footprintCells} from '../src/sim/definitions';
import type {Structure} from '../src/sim/types';

test('both original forge models stay inside the rotated physical footprint and share previews',()=>{
 const w=deconstructionCamp();w.pawns=[];w.packed=[];w.structures=[];
 for(const kind of ['fueled-smithy','electric-smithy'] as const)for(const orientation of [0,1,2,3] as const){
  const s:Structure={id:100,kind,x:12,z:12,orientation,footprint:'standard',material:'steel',bills:[]};w.structures=[s];const before=structuredClone(w),model=smithyParts267(w),preview=constructionPreviewParts(w,[{kind,x:12,z:12,orientation,material:'steel'}]);
  expect(model.length).toBeGreaterThan(25);expect(model.every(p=>p.targetId===s.id&&!p.shape)).toBe(true);
  expect(preview.boxes.map(({key,targetId,...p})=>p)).toEqual(model.map(({key,targetId,...p})=>p));
  const limitX=orientation%2?.5:1.5,limitZ=orientation%2?1.5:.5;
  for(const p of model){for(const value of [p.x,p.y,p.z,p.sx,p.sy,p.sz,p.ry])expect(Number.isFinite(value)).toBe(true);const angle=p.ry!,hx=Math.abs(Math.cos(angle))*p.sx!/2+Math.abs(Math.sin(angle))*p.sz!/2,hz=Math.abs(Math.sin(angle))*p.sx!/2+Math.abs(Math.cos(angle))*p.sz!/2;expect(Math.abs(p.x-s.x)+hx).toBeLessThanOrEqual(limitX+.001);expect(Math.abs(p.z-s.z)+hz).toBeLessThanOrEqual(limitZ+.001);}
  const surfaces=pileSurfaces(w);for(const c of footprintCells(s))expect(surfaces.get(c.z*w.width+c.x)).toEqual({x:0,y:.87,z:0,scale:.65});expect(w).toEqual(before);
 }
});

test('static forge geometry does not invent fuel, heat or power dependent per-frame pieces',()=>{
 const w=deconstructionCamp();w.pawns=[];w.packed=[];const s:Structure={id:100,kind:'electric-smithy',x:12,z:12,orientation:0,footprint:'standard',material:'steel',power:{on:false,parentId:null}};w.structures=[s];const off=smithyParts267(w);s.power!.on=true;expect(smithyParts267(w)).toEqual(off);s.breakdown={brokenAt:w.tick};expect(smithyParts267(w)).toEqual(off);
});
