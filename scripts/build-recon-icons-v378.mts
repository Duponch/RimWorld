import {mkdir,writeFile} from 'node:fs/promises';
import {registerHooks} from 'node:module';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import type {World} from '../src/sim/types.ts';

// The existing browser modules use extensionless relative TypeScript imports.
registerHooks({resolve(specifier,context,nextResolve){
  try{return nextResolve(specifier,context);}catch(error){
    if((error as NodeJS.ErrnoException).code==='ERR_MODULE_NOT_FOUND'&&specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier))return nextResolve(`${specifier}.ts`,context);
    throw error;
  }
}});
const option=(name:string)=>process.argv.find(value=>value.startsWith(name+'='))?.slice(name.length+1);
const project=resolve(option('--source-root')??'.'),output=resolve(option('--output-dir')??join(project,'public/assets/ui/elsewhere/v378'));
const source=(path:string)=>pathToFileURL(join(project,path)).href;
const {itemPortraitSvg,geometryPortraitSvg}=await import(source('src/render/item-portrait.ts'));
const THREE=await import('three/webgpu');
const {writeRockCell,ROCK_VERTICES}=await import(source('src/render/RockSurface.ts'));
const {writeRockPigment}=await import(source('src/render/rock-pigment.ts'));

// Generate only the three prospective inventory icons. No atlas or old SVG
// is regenerated; these are orthographic views of the game's authored parts.
const icons=new Map<string,string>([
  ['item-uranium',itemPortraitSvg('uranium')],
  ['item-recon-armor',itemPortraitSvg('recon-armor')],
  ['item-unfinished-recon-armor',itemPortraitSvg('unfinished-recon-armor')],
]);
// The real inspector already requests mountain-${tile.ore}; project the same
// resident rock cell and pigment builders, without a scene, renderer or DOM.
const view:Pick<World,'seed'|'width'|'height'|'tiles'>={seed:42,width:3,height:3,tiles:Array.from({length:9},()=>({terrain:'soil'}))};
view.tiles[4]={terrain:'rock',stone:'granite',ore:'uranium'};
const positions=new Float32Array(ROCK_VERTICES*3),colors=new Float32Array(ROCK_VERTICES*3),indices=writeRockCell(view,1,1,positions,0);
writeRockPigment(view,1,1,colors,0);
const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setIndex(indices);
icons.set('mountain-uranium',geometryPortraitSvg([{geometry,placement:{x:0,y:0,z:0}}],'mountain:uranium'));geometry.dispose();
await mkdir(output,{recursive:true});
for(const [name,svg] of icons){if(!svg.includes('<path '))throw Error('Empty authored portrait: '+name);await writeFile(join(output,name+'.svg'),svg,'utf8');}
console.log('Wrote only four v378 SVG portraits from existing authored item/rock geometry: '+[...icons.keys()].join(', '));
