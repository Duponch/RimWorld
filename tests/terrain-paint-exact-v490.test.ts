// Independent goldens acquired on the original renderer BEFORE the V490 candidate.
// Explicit presentation-only NUM fixtures from tests132/133/436/458; no SIM/save claim.
// The fixture freezes recorded outputs, not an implementation of the paint algorithm.
import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createWorld} from '../src/sim/engine';
import type {World,Tile,Terrain} from '../src/sim/types';
import {createTerrainPaintTexture,patchTerrainPaintTexture,singleTerrainPaintPatchRect,terrainPaintPixelsPerCell,TERRAIN_COLORS,ARID_GRASS_COLOR,GROUND_FOG_PIGMENT} from '../src/render/TerrainLayer';
const originalSourceSHA='4a23b8c3e2cf98b3de92d307c6e8a2de525b71bf8914abceb23f1db066f97bd3';
const baselineGoldenSHA='1e96882661602f0dac74087dbdd166ef08f6259567057227076581c6549389b9';
const hash=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const bytes=(a:Uint8Array)=>Buffer.from(a.buffer,a.byteOffset,a.byteLength);
const terrains:Terrain[]=['grass','soil','gravel','water','water-deep','water-shallow','rough-stone','smoothed-stone','sand','ocean-shallow','ocean-deep','river-shallow','river-chest-deep','soil-natural','marshy-soil','mossy-soil','mud','soft-sand','ice','riverbank','packed-dirt','rich-soil','marsh','rock'];
const stones=['granite','limestone','marble','sandstone','slate'] as const;
function fixture(seed:number,width:number,height:number,fog=false):World{
 const base=createWorld(seed,8,8),w={...base,width,height,tiles:Array.from({length:width*height},(_,i):Tile=>{const terrain=terrains[(i+Math.floor(i/width)*3)%terrains.length]!;return terrain==='rock'||terrain==='rough-stone'||terrain==='smoothed-stone'?{terrain,stone:stones[i%stones.length]!}:{terrain};})};
 w.site={revision:3,tileId:0,mapSeed:w.seed,biome:fog?'arid-shrubland':'temperate-forest',hilliness:'flat',river:'none',stones:['granite','marble'],coastAngle:null,mutatorCode:0};
 if(fog){w.exploration={revision:1};w.tiles=w.tiles.map((tile,i)=>{if(i%7!==0)return tile;return {fogged:true,get terrain():never{throw Error('Hidden terrain getter must not be read');},get stone():never{throw Error('Hidden stone getter must not be read');},get ore():never{throw Error('Hidden ore getter must not be read');}};});}
 return w;
}
type RecordRow={name:string;width:number;height:number;scale:number;rgbaBytes:number;rgbaSHA256:string;paletteBytes:number;paletteSHA256:string;painted?:number;changed?:number[];rect?:ReturnType<typeof singleTerrainPaintPatchRect>;deferUpload?:boolean};
test('V490 exact RGBA and palette retain independent pre-candidate goldens for every paint and patch',()=>{
 const raw=readFileSync(new URL('./fixtures/terrain-paint-baseline-v490.json',import.meta.url));
 expect(hash(raw),'Recorded before the candidate, unchanged fixture bytes').toBe(baselineGoldenSHA);
 const golden=JSON.parse(raw.toString());
 expect(golden.protocol).toBe('terrain-paint-before-candidate-golden-v490-1');
 expect(golden.sourcePath).toBe('src/render/TerrainLayer.ts');
 expect(golden.sourceSHA256,'Provenance only: no pin on the current implementation').toBe(originalSourceSHA);
 const rows:RecordRow[]=[],configuration={terrains:{...TERRAIN_COLORS},aridGrass:ARID_GRASS_COLOR,groundFog:GROUND_FOG_PIGMENT};
 const snapshot=(name:string,w:World,t:ReturnType<typeof createTerrainPaintTexture>,extra:Partial<RecordRow>={})=>{const data=t.image.data as Uint8Array,palette=t.userData.terrainPalette as Uint8Array;expect(data).toBeInstanceOf(Uint8Array);expect(palette).toBeInstanceOf(Uint8Array);rows.push({name,width:t.image.width,height:t.image.height,scale:terrainPaintPixelsPerCell(w),rgbaBytes:data.byteLength,rgbaSHA256:hash(bytes(data)),paletteBytes:palette.byteLength,paletteSHA256:hash(bytes(palette)),...extra});};
 const freshEqual=(w:World,t:ReturnType<typeof createTerrainPaintTexture>)=>{const fresh=createTerrainPaintTexture(w);try{expect(bytes(t.image.data as Uint8Array).equals(bytes(fresh.image.data as Uint8Array))).toBe(true);expect(bytes(t.userData.terrainPalette as Uint8Array).equals(bytes(fresh.userData.terrainPalette as Uint8Array))).toBe(true);}finally{fresh.dispose();}};
 const cases=[{name:'mixed-scale8',world:fixture(143,20,12),scale:8},{name:'arid-hidden-fog-scale8',world:fixture(436,20,12,true),scale:8},{name:'mixed-strip-scale7',world:fixture(133,257,8),scale:7},{name:'mixed-strip-scale1',world:fixture(458,1025,8),scale:1}];
 for(const c of cases){const w=c.world,clock=[w.tick,w.rng,w.nextId],texture=createTerrainPaintTexture(w);try{
  expect(terrainPaintPixelsPerCell(w)).toBe(c.scale);snapshot(c.name,w,texture);freshEqual(w,texture);
  const patch=(suffix:string,indices:number[],deferUpload=false)=>{const rect=singleTerrainPaintPatchRect(w,indices),painted=patchTerrainPaintTexture(texture,w,indices,deferUpload);freshEqual(w,texture);snapshot(c.name+'/'+suffix,w,texture,{painted,changed:indices.slice(),rect,deferUpload});return {painted,rect};};
  if(c.name==='mixed-scale8'){
   const middle=5*w.width+6;w.tiles[middle]={terrain:'water-deep'};const one=patch('one-nonzero-rect',[middle],true);expect(one.rect&&one.rect.x>0&&one.rect.y>0).toBe(true);
   const sixteen=Array.from({length:16},(_,i)=>2*w.width+2+i);for(const [n,i]of sixteen.entries())w.tiles[i]=n%2?{terrain:'smoothed-stone',stone:stones[n%5]!}:{terrain:'river-shallow'};patch('sixteen-overlapping-rects',sixteen);
   const seventeen=Array.from({length:17},(_,i)=>7*w.width+1+i);for(const [n,i]of seventeen.entries())w.tiles[i]=n%2?{terrain:'rough-stone',stone:stones[n%5]!}:{terrain:'sand'};expect(patch('seventeen-full-fallback',seventeen,true).painted).toBe(texture.image.width*texture.image.height);
   w.tiles[middle]={terrain:'grass'};w.tiles[middle+1]={terrain:'water'};patch('overlap-A',[middle,middle+1]);w.tiles[middle]={terrain:'smoothed-stone',stone:'marble'};w.tiles[middle+w.width]={terrain:'water-shallow'};patch('overlap-B',[middle,middle+w.width],true);
   const edges=[0,w.width-1,w.width*(w.height-1),w.width*w.height-1];for(const i of edges)w.tiles[i]={terrain:'ocean-deep'};patch('four-clipped-corners',edges);
  }else if(c.name==='arid-hidden-fog-scale8'){
   const reveal=5*w.width+5;expect(w.tiles[reveal]!.fogged).toBe(true);w.tiles[reveal]={terrain:'water-deep'};patch('same-tick-fog-reveal',[reveal]);
  }else{
   const i=3*w.width+5;w.tiles[i]={terrain:'water-deep'};const p=patch('nonzero-coast-patch',[i],true);expect(p.rect&&p.rect.x>0&&p.rect.y>0).toBe(true);
  }
  expect([w.tick,w.rng,w.nextId]).toEqual(clock);
 }finally{texture.dispose();}}
 expect(rows).toHaveLength(13);
 expect(configuration).toEqual(golden.configuration);
 expect(rows).toEqual(golden.rows);
},30000);
