import {mkdir,writeFile} from 'node:fs/promises';
import {registerHooks} from 'node:module';
// Use the browser sources' extensionless TypeScript resolution for this
// asset generator, without changing the runtime imports.
registerHooks({resolve(specifier,context,nextResolve){
  try{return nextResolve(specifier,context);}catch(error){
    if((error as NodeJS.ErrnoException).code==='ERR_MODULE_NOT_FOUND'&&specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier))return nextResolve(`${specifier}.ts`,context);
    throw error;
  }
}});
const {createWorld}=await import('../src/sim/engine.ts');
const {constructionPreviewParts}=await import('../src/render/construction-preview-parts.ts');
const {placementsPortraitSvg}=await import('../src/render/item-portrait.ts');

// Write only this new original portrait, from the finished/ghost floor marks.
const world=createWorld(42,32),parts=constructionPreviewParts(world,[{kind:'sleeping-spot',x:0,z:0,orientation:0}]);
if(parts.boxes.length!==9||parts.rotatedBoxes.length)throw Error('Unexpected sleeping spot model');
const output=new URL('../public/assets/ui/elsewhere/v336/',import.meta.url);await mkdir(output,{recursive:true});
await writeFile(new URL('sleeping-spot.svg',output),placementsPortraitSvg(parts.boxes,'construction:sleeping-spot'),'utf8');
console.log('Wrote v336/sleeping-spot.svg from its nine authored floor marks.');
