import {mkdir,writeFile} from 'node:fs/promises';
import {registerHooks} from 'node:module';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import type {ItemId} from '../src/sim/items.ts';
registerHooks({resolve(specifier,context,nextResolve){try{return nextResolve(specifier,context);}catch(error){if((error as NodeJS.ErrnoException).code==='ERR_MODULE_NOT_FOUND'&&specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier))return nextResolve(`${specifier}.ts`,context);throw error;}}});
const option=(name:string)=>process.argv.find(value=>value.startsWith(name+'='))?.slice(name.length+1);
const project=resolve(option('--source-root')??'.'),output=resolve(option('--output-dir')??join(project,'public/assets/ui/elsewhere/v384'));
const {itemPortraitSvg}=await import(pathToFileURL(join(project,'src/render/item-portrait.ts')).href);
await mkdir(output,{recursive:true});
for(const item of ['cloth-tuque','muffalo-wool-tuque','unfinished-tuque'] as const satisfies readonly ItemId[]){
  const svg:string=itemPortraitSvg(item);if(!svg.includes('<path '))throw Error(`Empty original icon: ${item}`);
  await writeFile(join(output,`item-${item}.svg`),svg,'utf8');
}
console.log('Wrote only the three original V384 cap inventory icons.');
