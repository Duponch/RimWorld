import {mkdir,writeFile} from 'node:fs/promises';
import {createWorld} from '../src/sim/engine.ts';
import {constructionPreviewParts} from '../src/render/construction-preview-parts.ts';
import {geometryPortraitSvg,placementGeometry} from '../src/render/item-portrait.ts';

const world=createWorld(42,32),parts=constructionPreviewParts(world,[{kind:'electric-crematorium',x:0,z:0,orientation:0,material:'granite-blocks'}]);
const entries=[...parts.boxes,...parts.rotatedBoxes].map(placement=>({geometry:placementGeometry(placement),placement}));
if(entries.length!==19)throw Error(`Unexpected crematorium model: ${entries.length}`);
const output=new URL('../public/assets/ui/elsewhere/v314/',import.meta.url);await mkdir(output,{recursive:true});
await writeFile(new URL('electric-crematorium.svg',output),geometryPortraitSvg(entries,'construction:electric-crematorium'),'utf8');
for(const entry of entries)entry.geometry.dispose();
console.log('Wrote only v314/electric-crematorium.svg from the actual authored model.');
