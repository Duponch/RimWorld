import {it,expect} from 'vitest';
import {createFilthAtlas,filthDecal,FILTH_ATLAS} from '../src/render/filth-appearance';
import {FILTH_KINDS,type FilthRecord} from '../src/sim/filth-rules';
it('keeps six historical slots and allocates actual visible variants for both new rubble kinds',()=>{
 expect(FILTH_KINDS.slice(0,6)).toEqual(['dirt','trash','blood','ash','vomit','corpse-bile']);
 const atlas=createFilthAtlas();expect(atlas.height/FILTH_ATLAS.tileSize*FILTH_ATLAS.columns).toBeGreaterThanOrEqual(FILTH_KINDS.length*FILTH_ATLAS.variants);
 for(const kind of ['rock-rubble','building-rubble'] as const){
  const f:FilthRecord={id:1,x:10,z:10,kind,thickness:1,grownCore:0,expiresAfterCore:45*60000,nextCheckCore:1},before=JSON.stringify(f),decal=filthDecal(f,0),tile=decal.tile;
  expect(tile).toBeGreaterThanOrEqual(24);expect(tile).toBeLessThan(32);let visible=0;
  const left=tile%FILTH_ATLAS.columns*FILTH_ATLAS.tileSize,top=Math.floor(tile/FILTH_ATLAS.columns)*FILTH_ATLAS.tileSize;
  for(let y=0;y<FILTH_ATLAS.tileSize;y++)for(let x=0;x<FILTH_ATLAS.tileSize;x++)visible+=atlas.data[((top+y)*atlas.width+left+x)*4+3]!>0?1:0;
  expect(visible).toBeGreaterThan(0);expect(JSON.stringify(f)).toBe(before);
 }
});
