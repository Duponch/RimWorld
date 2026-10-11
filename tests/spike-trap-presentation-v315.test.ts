import {expect,test} from 'vitest';
import {spikeTrapParts} from '../src/render/spike-trap-parts.ts';
import {constructionPreviewParts} from '../src/render/construction-preview-parts.ts';
import {ItemMeshAtlas} from '../src/render/item-mesh-atlas.ts';
import {ITEM_SHAPES,createItemGeometry} from '../src/render/item-geometry.ts';
import {occupancyOf} from '../src/sim/occupancy.ts';
import {structureBeauty} from '../src/sim/room-beauty.ts';
import {medicalCamp} from './scenarios/health.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';

test.each(['wood','steel','granite-blocks'] as const)('finished trap and fixed ghost share twelve bounded parts, %s',material=>{
 const world=medicalCamp(),s={...fixtureBuilding(world,'spike-trap',14,14),material,spikeTrap:{autoRebuild:false,touching:[]}};world.structures=[s];
 const before=structuredClone(world),finished=spikeTrapParts(world),preview=constructionPreviewParts(world,[{kind:s.kind,x:s.x,z:s.z,orientation:0,material}]);
 const normalize=(parts:typeof finished)=>parts.map(({key,targetId,ry=0,...part})=>({...part,ry}));
 expect(finished).toHaveLength(12);expect(finished.filter(p=>p.shape==='trap-spike')).toHaveLength(4);
 expect(normalize([...preview.boxes,...preview.rotatedBoxes])).toEqual(normalize(finished));expect(world).toEqual(before);
 for(const p of finished){expect(Math.abs(p.x-s.x)+(p.sx??1)/2).toBeLessThanOrEqual(.5);expect(Math.abs(p.z-s.z)+(p.sz??1)/2).toBeLessThanOrEqual(.5);expect(p.y+(p.sy??1)/2).toBeLessThanOrEqual(.626);}
 expect(structureBeauty(s)).toBe(-18);expect(occupancyOf('spike-trap')).toMatchObject({clearItems:false,items:true,zones:true,store:true});
});
test('stake primitive adds one immutable resident slot while preserving all earlier indices and submission ranges',()=>{
 const atlas=new ItemMeshAtlas(),geometry=createItemGeometry('trap-spike');
 expect(ITEM_SHAPES.at(-1)).toBe('trap-spike');expect(atlas.shapes.at(-1)).toBe('trap-spike');
 expect(atlas.slot('trap-spike')).toBe(ITEM_SHAPES.length);expect(atlas.verticesPerSlot).toBe(168);expect(atlas.isSmall('trap-spike')).toBe(true);
 expect(atlas.smallGeometry.drawRange.count).toBe(96);expect(geometry.index!.count).toBeLessThanOrEqual(96);
 expect(geometry.boundingBox!.max.y).toBeCloseTo(.5);expect(geometry.boundingBox!.min.y).toBeCloseTo(-.5);
 for(let i=0;i<ITEM_SHAPES.length-1;i++)expect(atlas.slot(ITEM_SHAPES[i]!)).toBe(i+1);
 geometry.dispose();atlas.dispose();
});
