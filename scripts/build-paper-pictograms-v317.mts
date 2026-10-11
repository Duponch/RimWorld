import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { PICTOGRAM_IDS, pictogramSvg } from '../src/ui/pictograms.ts';
import { ARCHITECT_ATLAS_IDS, ARCHITECT_ICON_URLS } from '../src/ui/architect-icons.ts';

/** Offline SVG adaptation only. Models and the historical atlas remain intact. */
const output = new URL('../public/assets/ui/elsewhere/v317/', import.meta.url);
await mkdir(output, { recursive: true });
for (const id of PICTOGRAM_IDS) await writeFile(new URL(`${id}.svg`, output), pictogramSvg(id), 'utf8');

const ui = ['mine','chop','harvest','cut','wood','steel','component','silver','medicine','blocks','food','meal','home','clock','people','research','leaf','eye','layers','pointer'];
const uiModels:Readonly<Record<string,string>> = { wood:'item-wood',steel:'item-steel',component:'item-component',silver:'item-silver',medicine:'item-medicine',blocks:'item-granite-blocks',food:'item-rice',meal:'item-simple-meal' };
function inside(svg:string):string { return svg.replace(/^<svg[^>]*>/,'').replace(/<\/svg>\s*$/,''); }
const cells:string[] = [];
for (const [index,id] of ui.entries()) {
  const model = uiModels[id];
  const svg = model ? await readFile(new URL(`../public/assets/ui/elsewhere/v304/${model}.svg`,import.meta.url),'utf8') : pictogramSvg(id);
  const logical = svg.includes('viewBox="0 0 64 64"') ? 64 : 96;
  cells.push(`<g transform="translate(${index%4*96} ${Math.floor(index/4)*96}) scale(${96/logical})">${inside(svg)}</g>`);
}
await writeFile(new URL('ui.svg',output),`<svg xmlns="http://www.w3.org/2000/svg" width="384" height="480" viewBox="0 0 384 480" data-style="paper-v317">${cells.join('')}</svg>`,'utf8');

// World designations and cursor fallbacks use the same pictures as their UI
// buttons, at the unchanged UV addresses. No extra texture or draw call.
for(const [atlas,ids] of ARCHITECT_ATLAS_IDS.entries()) {
  const markers:string[]=[];
  for(const [index,id] of ids.entries()) {
    const svg=await readFile(new URL(`../public${ARCHITECT_ICON_URLS[id]}`,import.meta.url),'utf8');
    const logical=svg.includes('viewBox="0 0 64 64"')?64:96;
    markers.push(`<g transform="translate(${index%6*96} ${Math.floor(index/6)*96}) scale(${96/logical})">${inside(svg)}</g>`);
  }
  await writeFile(new URL(`architect-${atlas+1}.svg`,output),`<svg xmlns="http://www.w3.org/2000/svg" width="576" height="480" viewBox="0 0 576 480" data-style="paper-v317">${markers.join('')}</svg>`,'utf8');
}

const cursorKinds = ['pointer','link','wait','zoom','text','grab','grabbing','forbidden','resize'];
const cursorCells = cursorKinds.map((kind,index)=>`<g transform="translate(${index%3*96+9.6} ${Math.floor(index/3)*96+9.6}) scale(1.2)">${inside(pictogramSvg(kind==='pointer'?'pointer':`cursor-${kind}`))}</g>`);
await writeFile(new URL('cursors.svg',output),`<svg xmlns="http://www.w3.org/2000/svg" width="288" height="288" viewBox="0 0 288 288" data-style="paper-v317">${cursorCells.join('')}</svg>`,'utf8');
await writeFile(new URL('manifest.json',output),JSON.stringify({
  version:317,
  style:'Authored flat paper pictograms; muted sage, taupe and slate; transparent SVG; no filters or gradients.',
  pictograms:PICTOGRAM_IDS,
  uiAtlas:{columns:4,rows:5,cellSize:96,ids:ui,preservedModelCells:uiModels},
  cursorAtlas:{columns:3,rows:3,cellSize:96,ids:cursorKinds},
  architectAtlases:{columns:6,rows:5,cellSize:96,ids:ARCHITECT_ATLAS_IDS},
  time:{0:'pause',1:'play',3:'speed-double',6:'speed-triple'},
  historicalAtlasesPreserved:['v304/architect-1.svg','v304/architect-2.svg','v304/ui.svg','v304/cursors.svg'],
},null,2)+'\n','utf8');
console.log(JSON.stringify({output:output.pathname,pictograms:PICTOGRAM_IDS.length,uiCells:ui.length,cursors:cursorKinds.length},null,2));
