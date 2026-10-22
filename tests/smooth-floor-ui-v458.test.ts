import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {smoothFloorCamp458} from './scenarios/smooth-floor-v458.ts';
import {toolDefinitions} from '../src/ui/layout.ts';
import {architectToolAvailable} from '../src/ui/architect-availability.ts';
import {ARCHITECT_ICON_URLS} from '../src/ui/architect-icons.ts';
import {pictogramSvg} from '../src/ui/pictograms.ts';
import {queryArea} from '../src/sim/designation.ts';
import {applyCommand} from '../src/sim/engine.ts';
import {DesignationIconLayer,designationIconInstances,designationPreviewIconInstances} from '../src/render/DesignationIconLayer.ts';
import {actionProgress} from '../src/render/action-feedback.ts';
import {advanceSmoothFloor281} from '../src/sim/smooth-floor-281.ts';
import {pawnWorkPose,WORK_POSE} from '../src/render/work-presentation.ts';
import type {World} from '../src/sim/types.ts';

test('the clear floor tool shares an original action pictogram and remains closed outside its actual supported schema',()=>{
 const {world}=smoothFloorCamp458(),tool=toolDefinitions.find(t=>t.id==='smooth-floor')!;
 expect(tool.title).toBe('Lisser le sol');expect(tool.category).toBe('floors');expect(tool.hint).toContain('sans matériau');expect(tool.hint).not.toMatch(/schéma|migration|prototype|qualité/i);
 expect(architectToolAvailable(world,'smooth-floor')).toBe(true);for(const version of [280,282])expect(architectToolAvailable({...world,schemaVersion:version} as unknown as World,'smooth-floor')).toBe(false);
 expect(ARCHITECT_ICON_URLS['smooth-floor']).toContain('data:image/svg+xml');expect(pictogramSvg('smooth-floor')).toContain('data-pictogram="smooth-floor"');
});

test('the shared rectangle projects only compatible cells and its same resident icons survive confirmation without resetting the World or actor progress',()=>{
 const f=smoothFloorCamp458(),w=f.world,p=w.pawns[0]!;
 // Declared UI boundary surface; actual excavation is the separate loop test.
 for(const c of [f.cell,f.secondCell])w.tiles[c.z*w.width+c.x]={terrain:'rough-stone',stone:f.stone};
 const area={type:'area' as const,action:'smooth-floor' as const,from:f.cell,to:{x:16,z:14}},before=JSON.stringify(w),q=queryArea(w,area);
 if(!q.ok)throw Error(q.reason);expect(q.selected).toBe(3);expect(q.skipped).toBe(1);expect(q.cells).toHaveLength(2);
 const preview=designationPreviewIconInstances(w,'smooth-floor',q.cells);expect(preview).toHaveLength(2);expect(JSON.stringify(w)).toBe(before);
 expect(applyCommand(w,area)).toMatchObject({ok:true});expect(designationIconInstances(w)).toEqual(preview);
 const layer=new DesignationIconLayer(()=>undefined);try{
  layer.update(w);const positions=layer.mesh.geometry.getAttribute('designationPosition') as THREE.InstancedBufferAttribute,version=positions.version;layer.update(w);expect(positions.version).toBe(version);expect(layer.mesh.geometry.instanceCount).toBe(2);
  const job=w.jobs.find(j=>j.kind==='smooth-floor')!;Object.assign(p,f.cell);expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:job.id,queue:false})).toMatchObject({ok:true});
  expect(advanceSmoothFloor281(w,p,job,1)).toBe(false);expect(actionProgress(w,p)).toMatchObject({kind:'job',total:280});expect(actionProgress(w,p)!.completed).toBeGreaterThan(0);expect(pawnWorkPose(p,job)).toBe(WORK_POSE.ground);
  layer.update(w);expect(layer.mesh.geometry.getAttribute('designationPosition')).toBe(positions);expect(positions.version).toBe(version);
 }finally{layer.dispose();}
});
