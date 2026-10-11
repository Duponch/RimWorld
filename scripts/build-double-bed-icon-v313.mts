import {mkdir,writeFile} from 'node:fs/promises';
import {createWorld} from '../src/sim/engine.ts';
import {constructionPreviewParts} from '../src/render/construction-preview-parts.ts';
import {geometryPortraitSvg,placementGeometry} from '../src/render/item-portrait.ts';

// Only this new portrait is written. The same finished geometry supplies the
// construction ghost; all historical icon files remain byte-identical.
const world=createWorld(42,32),parts=constructionPreviewParts(world,[{kind:'double-bed',x:0,z:0,orientation:0,material:'wood'}]);
const entries=[...parts.boxes,...parts.rotatedBoxes].map(placement=>({geometry:placementGeometry(placement),placement}));
if(entries.length!==6)throw Error(`Unexpected double-bed model: ${entries.length}`);
const output=new URL('../public/assets/ui/elsewhere/v313/',import.meta.url);await mkdir(output,{recursive:true});
await writeFile(new URL('double-bed.svg',output),geometryPortraitSvg(entries,'construction:double-bed'),'utf8');
for(const entry of entries)entry.geometry.dispose();
console.log('Wrote only v313/double-bed.svg from the six authored model parts.');
