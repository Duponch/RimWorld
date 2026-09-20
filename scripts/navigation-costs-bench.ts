import { performance } from 'node:perf_hooks';
import { cpus,platform,release } from 'node:os';
import { cpSync,mkdirSync,mkdtempSync,readFileSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { deepStrictEqual } from 'node:assert';
import { gunzipSync } from 'node:zlib';
import { createScenarioWorld } from '../src/sim/new-game.ts';
import { createWorld } from '../src/sim/engine.ts';
import { navigationCosts } from '../src/sim/furniture-travel.ts';
import { blockedCells } from '../src/sim/pathfinding.ts';
import { doorCorners } from '../src/sim/door-rules.ts';
import { scaleNavigationCosts } from '../src/sim/navigation-costs.ts';
import { WeightedSearch } from '../src/sim/weighted-search.ts';
import type { NavigationCostLookup } from '../src/sim/navigation-costs.ts';
import type { World } from '../src/sim/types.ts';

// Run at the repository root after npm ci, with sources frozen. The tracked
// archive contains exactly three project-authored modules before optimization.
// Other dependencies are copied from this checkout: this isolates the cost
// implementation change, not every future change to simulation rules.
const hash=(text:string|Uint8Array)=>createHash('sha256').update(text).digest('hex');
const sourceFiles=['furniture-travel.ts','weighted-search.ts','wildlife-navigation.ts'];
const archiveBytes=readFileSync(new URL('../tests/fixtures/navigation-costs-v83-before.json.gz',import.meta.url)),baselineArchiveSha256=hash(archiveBytes);
if(baselineArchiveSha256!=='44a135bd6f58d5c7c9402eba21c9f2f3cba7d6ed8251ef1e2b3724bcb7b971ce')throw new Error('Unexpected navigation baseline archive SHA-256.');
const archive=JSON.parse(gunzipSync(archiveBytes).toString('utf8')) as {format:number;files:{name:string;sha256:string;source:string}[]};
if(archive.format!==1||archive.files.length!==3||new Set(archive.files.map(f=>f.name)).size!==3||archive.files.some(f=>!sourceFiles.includes(f.name)||hash(f.source)!==f.sha256))throw new Error('Invalid navigation baseline modules.');
mkdirSync(resolve('tmp'),{recursive:true});
const baseline=resolve(mkdtempSync(resolve('tmp/navigation-costs-v83-')),'sim');
cpSync(resolve('src/sim'),baseline,{recursive:true});
for(const file of archive.files)writeFileSync(resolve(baseline,file.name),file.source);
// Both generations of cost/search modules resolve inside their own tree.
// Keep the disposable reference tree for diagnosis; production is never swapped.
const importOld=(file:string)=>import(pathToFileURL(resolve(baseline,file)).href);
const oldFurniture=await importOld('furniture-travel.ts'),oldSearch=await importOld('weighted-search.ts');
const samples=Number(process.env.NAVIGATION_SAMPLES??30),warmups=5;
if(!Number.isInteger(samples)||samples<10||samples>1000)throw new Error('NAVIGATION_SAMPLES must be an integer from 10 to 1000.');
const sourceHashes=Object.fromEntries(sourceFiles.map(file=>[file,{before:hash(readFileSync(resolve(baseline,file),'utf8')),after:hash(readFileSync(resolve('src/sim',file),'utf8'))}]));
const worlds:{label:string;world:World}[]=[
  {label:'site-start-250-42',world:createScenarioWorld(42,250,'crashlanded',{hilliness:'small-hills'})},
  {label:'legacy-camp-250-42',world:createWorld(42,250,250)},
];
if(process.env.NAVIGATION_WORLD)worlds.push({label:'provided-checkpoint',world:JSON.parse(readFileSync(resolve(process.env.NAVIGATION_WORLD),'utf8'))});
const oldScale=(m:ReadonlyMap<number,number>|undefined,factor:number)=>m?new Map([...m].map(([i,v])=>[i,v*factor])):undefined;
type Capture=ReturnType<typeof navigationCosts>;
const versions=[
  {label:'before',capture:(w:World)=>oldFurniture.navigationCosts(w),Search:oldSearch.WeightedSearch,scale:oldScale},
  {label:'after',capture:navigationCosts,Search:WeightedSearch,scale:(m:NavigationCostLookup|undefined,factor:number)=>scaleNavigationCosts(m,factor)},
];
const stats=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b),round=(v:number)=>Number(v.toFixed(3));return {samples:values.length,medianMs:round(sorted[Math.floor(sorted.length*.5)]!),p95Ms:round(sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))]!),maxMs:round(sorted.at(-1)!),rawMs:values.map(round)};};
const rows=[];let checksum=0;
for(const {label,world} of worlds) {
  const blocked=blockedCells(world),corners=doorCorners(world),pawn=world.pawns[0];
  const start=pawn?pawn.z*world.width+pawn.x:blocked.findIndex(v=>v===0);
  if(start<0)throw new Error('No navigation origin');
  const probes=Array.from({length:16},(_,i)=>Math.floor(i*(world.tiles.length-1)/15));
  const captures=versions.map(v=>v.capture(world));
  for(let i=0;i<world.tiles.length;i++)for(const key of ['costs','floors'] as const) {
    deepStrictEqual(captures[0][key]?.get(i),captures[1][key]?.get(i));deepStrictEqual(captures[0][key]?.has(i)??false,captures[1][key]?.has(i)??false);
  }
  deepStrictEqual(captures[0].repeaters,captures[1].repeaters);deepStrictEqual(captures[0].stops,captures[1].stops);
  const capturesMs=[[],[]] as number[][];
  for(let run=-warmups;run<samples;run++)for(const v of run%2===0?[0,1]:[1,0]) {
    const now=performance.now(),n=versions[v]!.capture(world) as Capture;for(const probe of probes)checksum+=(n.costs?.get(probe)??0)+(n.floors.get(probe)??0);
    const ms=performance.now()-now;if(run>=0)capturesMs[v]!.push(ms);
  }
  for(const v of [0,1])rows.push({world:label,tick:world.tick,phase:'capture',version:versions[v]!.label,...stats(capturesMs[v]!)});
  for(const factor of [1,3]) {
    // A complete oracle comparison includes every cost and every tie parent.
    const full=versions.map((v,i)=>{
      const n=captures[i],extra=factor===1?n.costs:v.scale(n.costs,factor),floors=factor===1?n.floors:v.scale(n.floors,factor);
      return new v.Search(world.width,world.height,start,blocked,extra,n.repeaters,floors,corners).finish();
    });
    deepStrictEqual(full[0].parents,full[1].parents);deepStrictEqual(full[0].costs,full[1].costs);
    const reachable:number[]=[];for(let i=0;i<world.tiles.length;i++)if(Number.isFinite(full[0].costs[i])&&i!==start)reachable.push(i);
    const goals=probes.map((_,i)=>new Set([reachable[Math.floor(i*(reachable.length-1)/15)]!]));
    const times=[[],[]] as number[][];
    for(let run=-warmups;run<samples;run++)for(const i of run%2===0?[0,1]:[1,0]) {
      const v=versions[i]!,now=performance.now(),n=v.capture(world),extra=factor===1?n.costs:v.scale(n.costs,factor),floors=factor===1?n.floors:v.scale(n.floors,factor);
      const field=new v.Search(world.width,world.height,start,blocked,extra,n.repeaters,floors,corners).finish(goals[(run+warmups)%goals.length]);
      const ms=performance.now()-now;checksum+=field.visited;if(run>=0)times[i]!.push(ms);
    }
    for(const v of [0,1])rows.push({world:label,tick:world.tick,phase:factor===1?'capture-and-human-search':'capture-and-animal-scaled-search',version:versions[v]!.label,...stats(times[v]!)});
  }
}
console.log(JSON.stringify({protocol:'Sequential paired CPU navigation microbenchmark; 5 warmups, alternating before/after order, exact complete-field costs and parents verified before samples. Animal row measures integer scaling on the same obstacle mask, not animal behavior or frame rate. No mutation, simulation advancement, worker or rendering.',
  environment:{node:process.version,platform:platform(),release:release(),cpu:cpus()[0]?.model},baselineArchiveSha256,sourceHashes,
  compactLookupSha256:hash(readFileSync(resolve('src/sim/navigation-costs.ts'),'utf8')),
  worlds:worlds.map(({label,world})=>({label,sha256:hash(JSON.stringify(world)),size:[world.width,world.height],tick:world.tick,pawns:world.pawns.length,piles:world.piles.length})),rows,checksum},null,2));
