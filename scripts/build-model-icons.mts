import {mkdir,writeFile} from 'node:fs/promises';
import * as THREE from 'three/webgpu';
import {createWorld} from '../src/sim/engine.ts';
import {resolveSite} from '../src/sim/site.ts';
import {ITEM_DEFINITIONS,type ItemId} from '../src/sim/items.ts';
import {STRUCTURE_DEFINITIONS} from '../src/sim/definitions.ts';
import {isFloorKind} from '../src/sim/flooring.ts';
import type {StructureKind,World} from '../src/sim/types.ts';
import {constructionPreviewParts,createTimberGeometry} from '../src/render/construction-preview-parts.ts';
import {geometryPortraitSvg,itemPortraitSvg,placementGeometry,type GeometryPortraitEntry} from '../src/render/item-portrait.ts';
import {ResourceLayer} from '../src/render/ResourceLayer.ts';
import {material} from '../src/render/primitives.ts';
import {RockLayer} from '../src/render/RockLayer.ts';
import {PlantClusterLayer} from '../src/render/PlantClusterLayer.ts';
import {CropLayer} from '../src/render/CropLayer.ts';
import {isClusterPlantSpecies,RESIDENT_CROP_KINDS} from '../src/render/flora-presentation.ts';
import {ARCHITECT_ATLAS_IDS,ARCHITECT_ICON_ORDER} from '../src/ui/architect-icons.ts';
import {UI_ICONS,CURSOR_KINDS} from '../src/ui/tool-cursors.ts';
import {PICTOGRAM_IDS,pictogramSvg} from '../src/ui/pictograms.ts';

// This offline artefact uses the same builders as the map. No screenshot of a
// placeholder, running game, DOM, GPU renderer or external image service.
const output=new URL('../public/assets/ui/elsewhere/v304/',import.meta.url);await mkdir(output,{recursive:true});
const world=createWorld(42,32);world.site=resolveSite(42,{hilliness:'flat',biome:'temperate-forest'});
world.structures=[];world.resources=[];world.piles=[];world.packed=[];world.jobs=[];world.stockpiles=[];world.growingZones=[];
for(const tile of world.tiles){tile.terrain='soil';delete tile.ore;}
const timber=createTimberGeometry(false),eaves=createTimberGeometry(true);
const icons=new Map<string,string>();
const write=async(id:string,svg:string)=>{if(!svg.includes('<path')&&!svg.includes('<polygon')&&!svg.includes('<circle'))throw Error(`Empty icon: ${id}`);icons.set(id,svg);await writeFile(new URL(`${id}.svg`,output),svg,'utf8');};
function building(id:string):string {
  const spec=isFloorKind(id)?{kind:'lay-floor' as const,floor:id,x:0,z:0}:{kind:id as StructureKind,x:0,z:0,orientation:0 as const};
  const parts=constructionPreviewParts(world,[spec]);
  const entries:GeometryPortraitEntry[]=[...parts.boxes,...parts.rotatedBoxes].map(placement=>({geometry:placementGeometry(placement),placement}));
  for(const placement of parts.timberWalls)entries.push({geometry:timber,placement});
  for(const placement of parts.timberEaves)entries.push({geometry:eaves,placement});
  return geometryPortraitSvg(entries,`construction:${id}`);
}
for(const id of ARCHITECT_ICON_ORDER){
  if(PICTOGRAM_IDS.includes(id))await write(id,pictogramSvg(id));
  else if(Object.hasOwn(STRUCTURE_DEFINITIONS,id)||isFloorKind(id))await write(id,building(id));
  else throw Error(`No authored icon for ${id}`);
}
for(const id of ['small-sculpture','large-sculpture'])await write(id,building(id));
await write('passion',pictogramSvg('passion'));
for(const id of Object.keys(ITEM_DEFINITIONS) as ItemId[])if(!['corpse','mech-corpse'].includes(ITEM_DEFINITIONS[id].kind))await write(`item-${id}`,itemPortraitSvg(id));

// Plants use the real merged resource geometry at rest, including its colours.
for(const [kind,species]of [['tree','oak'],['tree','birch'],['tree','pine'],['tree','poplar'],['tree','drago'],['tree','saguaro'],['tree',undefined],['berries','berry-bush'],['berries',undefined],['healroot','healroot-wild'],['healroot',undefined],['wild-plant','agave'],['wild-plant','moss'],['wild-plant','grass'],['wild-plant','tall-grass'],['wild-plant','brambles'],['rock',undefined],['rice',undefined],['cotton',undefined],['potato',undefined],['corn',undefined]] as const){
  const mat=material(0xffffff,{vertexColors:true});
  const view={...world,resources:[{id:1,kind,x:3,z:3,amount:30,growth:1,...species?{species}:{} }]} as World;
  const layer=isClusterPlantSpecies(species)?new PlantClusterLayer(mat):(RESIDENT_CROP_KINDS as readonly string[]).includes(kind)?new CropLayer(mat):new ResourceLayer(new THREE.Group(),mat);
  layer.update(view,true);const entries:GeometryPortraitEntry[]=[];
  layer.group.traverse(object=>{
    if(object instanceof THREE.InstancedMesh){const matrix=new THREE.Matrix4(),point=new THREE.Vector3(),quaternion=new THREE.Quaternion(),scale=new THREE.Vector3(),tint=new THREE.Color(),rotation=new THREE.Euler();for(let i=0;i<object.count;i++){object.getMatrixAt(i,matrix);matrix.decompose(point,quaternion,scale);rotation.setFromQuaternion(quaternion);object.getColorAt(i,tint);entries.push({geometry:object.geometry,placement:{x:point.x,y:point.y,z:point.z,sx:scale.x,sy:scale.y,sz:scale.z,rx:rotation.x,ry:rotation.y,rz:rotation.z,color:tint.getHex()}});}}
    else if(object instanceof THREE.Mesh)entries.push({geometry:object.geometry,placement:{x:0,y:0,z:0}});
  });
  await write(`resource-${species??kind}`,geometryPortraitSvg(entries,`resource:${species??kind}`));layer.dispose();mat.dispose();
}
for(const stone of ['granite','limestone','marble','sandstone','slate','steel','gold','machinery','plasteel']as const){
  const tiles=world.tiles.map(tile=>({...tile}));tiles[3*world.width+3]={terrain:'rock',fertility:0,...['steel','gold','machinery','plasteel'].includes(stone)?{ore:stone as 'steel'}:{stone:stone as 'granite'}};
  const layer=new RockLayer(material(0xffffff,{vertexColors:true}));layer.update({...world,tiles},true);
  const geometry=layer.mesh.geometry.clone(),indices=geometry.index!;geometry.setIndex(Array.from(indices.array).slice(36,layer.stats.indexCount));
  await write(`mountain-${stone}`,geometryPortraitSvg([{geometry,placement:{x:0,y:0,z:0}}],`mountain:${stone}`));geometry.dispose();layer.dispose();
}
function atlas(ids:readonly string[],columns:number,rows:number):string {
  const body=ids.map((id,i)=>{const svg=icons.get(id)??(PICTOGRAM_IDS.includes(id)?pictogramSvg(id):undefined);if(!svg)throw Error(`Missing atlas image: ${id}`);const inside=svg.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');const logical=svg.includes('viewBox="0 0 64 64"')?64:96;return `<g transform="translate(${i%columns*96} ${Math.floor(i/columns)*96}) scale(${96/logical})">${inside}</g>`;}).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${columns*96}" height="${rows*96}" viewBox="0 0 ${columns*96} ${rows*96}">${body}</svg>`;
}
await writeFile(new URL('architect-1.svg',output),atlas(ARCHITECT_ATLAS_IDS[0],6,5));await writeFile(new URL('architect-2.svg',output),atlas(ARCHITECT_ATLAS_IDS[1],6,5));
const uiModels:Readonly<Record<string,string>>={wood:'item-wood',steel:'item-steel',component:'item-component',silver:'item-silver',medicine:'item-medicine',blocks:'item-granite-blocks',food:'item-rice',meal:'item-simple-meal'};
await writeFile(new URL('ui.svg',output),atlas(UI_ICONS.map(id=>uiModels[id]??id),4,5));
const cursorBodies:Record<string,string>={pointer:pictogramSvg('pointer').replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,''),link:'<path d="M24 49V20c0-8 10-8 10 0v15-28c0-7 10-7 10 0v28-13c0-7 10-7 10 0v18-8c0-7 10-7 10 0v18c0 18-35 24-44 5L8 40c-6-9 2-16 8-10l8 8z"/>',wait:'<path d="M18 8h30M18 56h30M23 8c0 15 19 20 19 24S23 41 23 56M42 8c0 15-19 20-19 24s19 9 19 24"/><path d="m25 51 8-10 7 10z" fill="#ffc23c"/>',zoom:'<circle cx="26" cy="26" r="18"/><path d="m40 40 17 17M17 26h18M26 17v18"/>',text:'<path d="M21 6h22M32 6v52M21 58h22"/>',grab:'<path d="M18 34V16c0-7 8-7 8 0v14-23c0-7 9-7 9 0v23-21c0-7 9-7 9 0v23-15c0-7 9-7 9 0v29c0 19-29 20-36 8L7 37c-5-8 4-13 10-6z"/>',grabbing:'<path d="M14 31V20c0-8 10-8 10 0v5-12c0-7 10-7 10 0v11-8c0-7 10-7 10 0v10-5c0-7 10-7 10 0v25c0 17-32 16-37 6L7 36c-4-9 4-14 9-6z"/>',forbidden:'<circle cx="32" cy="32" r="25"/><path d="m15 15 34 34" stroke="#ff6b5e" stroke-width="6"/>',resize:'<path d="m8 8 48 48M8 25V8h17M39 56h17V39"/>'};
const cursorAtlas=CURSOR_KINDS.map((kind,i)=>`<g transform="translate(${i%3*96+9.6} ${Math.floor(i/3)*96+9.6}) scale(1.2)" fill="#fff7e9" stroke="#262238" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">${cursorBodies[kind]}</g>`).join('');
await writeFile(new URL('cursors.svg',output),`<svg xmlns="http://www.w3.org/2000/svg" width="288" height="288" viewBox="0 0 288 288">${cursorAtlas}</svg>`);
timber.dispose();eaves.dispose();
console.log(JSON.stringify({output:output.pathname,models:icons.size,architect:ARCHITECT_ICON_ORDER.length,items:Object.keys(ITEM_DEFINITIONS).length,atlases:4},null,2));
