import { performance } from 'node:perf_hooks';
import { cpus,platform,release } from 'node:os';
import { generateSiteWorld } from '../src/sim/site-generation.ts';
import { HILLINESS,resolveSite } from '../src/sim/site.ts';
import { siteOreBudget } from '../src/sim/site-ores.ts';

const seeds=[0,1,7,19,42,65,75,85,114,271,409,503,661,809,997,1234,1907,2026,4093,8191,16381,32749,65521,123456,271828,314159,1000003,2147483647,4294967294,4294967295],size=250;
const rows=[];
for(const hilliness of HILLINESS)for(const seed of seeds) {
  const site=resolveSite(seed,{hilliness}),start=performance.now(),world=generateSiteWorld(seed,size,size,site),ms=performance.now()-start;
  const terrains:Record<string,number>={},ores:Record<string,number>={},resources:Record<string,number>={};
  for(const tile of world.tiles){terrains[tile.terrain]=(terrains[tile.terrain]??0)+1;if(tile.ore)ores[tile.ore]=(ores[tile.ore]??0)+1;}
  for(const resource of world.resources)resources[resource.kind]=(resources[resource.kind]??0)+1;
  const berries=world.resources.filter(r=>r.kind==='berries'),chunks=world.piles.filter(p=>p.kind==='chunk');
  const chunkCells=new Set(chunks.flatMap(p=>p.owner.type==='ground'?[p.owner.z*size+p.owner.x]:[]));
  const neighboringChunks=[...chunkCells].filter(i=>[-size,-1,1,size].some(d=>chunkCells.has(i+d)&&Math.abs(i%size-(i+d)%size)<=1)).length;
  let exposedOre=0;
  world.tiles.forEach((tile,i)=>{if(tile.ore&&[-size,-1,1,size].some(d=>world.tiles[i+d]&&Math.abs(i%size-(i+d)%size)<=1&&world.tiles[i+d]!.terrain!=='rock'))exposedOre++;});
  rows.push({seed,hilliness,size,generationMs:Number(ms.toFixed(2)),terrain:terrains,ore:ores,oreBudget:siteOreBudget(size,size,hilliness),exposedOre,
    resources,chunks:chunks.length,chunksWithCardinalNeighbor:neighboringChunks,berriesHarvestable:berries.filter(r=>r.growth!>.65).length,berriesFullyGrown:berries.filter(r=>r.growth===1).length});
}
console.log(JSON.stringify({protocol:'V83 site-local generation only; 30 seeds per relief, one sample each, ordered flat/small/large. Timings include initial JIT costs; they do not establish simulation/render guarantees or the full Core generator distribution.',
  environment:{node:process.version,platform:platform(),release:release(),cpu:cpus()[0]?.model},rows},null,2));
