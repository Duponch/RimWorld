import {mkdir,writeFile} from 'node:fs/promises';
import {cropGeometry} from '../src/render/CropLayer.ts';
import {geometryPortraitSvg,itemPortraitSvg} from '../src/render/item-portrait.ts';

// ROOT executes this only after sources and tests are frozen. Every portrait
// projects the same authored geometry used on the map and for carried items.
const crop=cropGeometry('haygrass');
const icons=[
  ['hay.svg',itemPortraitSvg('hay')],
  ['kibble.svg',itemPortraitSvg('kibble')],
  ['haygrass.svg',geometryPortraitSvg([{geometry:crop,placement:{x:0,y:0,z:0,color:0xc6b56b}}],'crop:haygrass')],
] as const;
crop.dispose();
if(icons.some(([,svg])=>!svg.includes('<path ')))throw Error('Fodder portrait contains no authored faces');
const output=new URL('../public/assets/ui/elsewhere/v316/',import.meta.url);
await mkdir(output,{recursive:true});
for(const [name,svg] of icons)await writeFile(new URL(name,output),svg,'utf8');
console.log('Wrote only v316/hay.svg, kibble.svg and haygrass.svg from the actual authored models.');
