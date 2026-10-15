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
const project=resolve(option('--source-root')??'.'),output=resolve(option('--output-dir')??join(project,'public/assets/ui/elsewhere/v382'));
const source=(path:string)=>pathToFileURL(join(project,path)).href;
const {geometryPortraitSvg}=await import(source('src/render/item-portrait.ts'));
const THREE=await import('three/webgpu');
const {writeRockCell,ROCK_VERTICES}=await import(source('src/render/RockSurface.ts'));
const {writeRockPigment}=await import(source('src/render/rock-pigment.ts'));

// Project only the new surface-silver rock from original resident geometry.
const view:Pick<World,'seed'|'width'|'height'|'tiles'>={seed:42,width:3,height:3,tiles:Array.from({length:9},()=>({terrain:'soil'}))};
view.tiles[4]={terrain:'rock',stone:'granite',ore:'silver'};
const positions=new Float32Array(ROCK_VERTICES*3),colors=new Float32Array(ROCK_VERTICES*3),indices=writeRockCell(view,1,1,positions,0);
writeRockPigment(view,1,1,colors,0);
const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setIndex(indices);
const svg=geometryPortraitSvg([{geometry,placement:{x:0,y:0,z:0}}],'mountain:silver');geometry.dispose();
await mkdir(output,{recursive:true});
if(!svg.includes('<path '))throw Error('Empty authored silver portrait.');
await writeFile(join(output,'mountain-silver.svg'),svg,'utf8');
console.log('Wrote one v382 SVG from existing authored rock geometry.');
