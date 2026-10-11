import {mkdir,writeFile} from 'node:fs/promises';
import {registerHooks} from 'node:module';
// The browser sources use extensionless relative TypeScript imports. This
// generator supplies the same resolution without changing those sources.
registerHooks({resolve(specifier,context,nextResolve){
  try{return nextResolve(specifier,context);}catch(error){
    if((error as NodeJS.ErrnoException).code==='ERR_MODULE_NOT_FOUND'&&specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier))return nextResolve(`${specifier}.ts`,context);
    throw error;
  }
}});
const {createWorld}=await import('../src/sim/engine.ts');
const {constructionPreviewParts}=await import('../src/render/construction-preview-parts.ts');
const {geometryPortraitSvg,placementGeometry}=await import('../src/render/item-portrait.ts');

// Asset creation only: both portraits are projections of the finished model.
// No historical atlas, icon, save or reference is rewritten.
const world=createWorld(42,32),output=new URL('../public/assets/ui/elsewhere/v320/',import.meta.url);
await mkdir(output,{recursive:true});
for(const kind of ['shelf','small-shelf'] as const){
  const parts=constructionPreviewParts(world,[{kind,x:0,z:0,orientation:0,material:'wood'}]);
  const entries=[...parts.boxes,...parts.rotatedBoxes].map(placement=>({geometry:placementGeometry(placement),placement}));
  if(entries.length!==8)throw Error(`Unexpected ${kind} model: ${entries.length}`);
  await writeFile(new URL(`${kind}.svg`,output),geometryPortraitSvg(entries,`construction:${kind}`),'utf8');
  for(const entry of entries)entry.geometry.dispose();
}
console.log('Wrote only the two v320 shelf portraits from their shared authored geometry.');
