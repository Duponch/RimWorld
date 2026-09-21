import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { createScenarioWorld } from '../src/sim/new-game.ts';
import { stepWorld,validateWorld,applyCommand } from '../src/sim/index.ts';
import { harvestable,choppable } from '../src/sim/plants.ts';
import { SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { countedProducts,newCookingBill } from '../src/sim/cooking-bills.ts';
import { PRODUCTION_RECIPES,isRecipeProduct } from '../src/sim/production-recipes.ts';
import { ITEM_DEFINITIONS } from '../src/sim/items.ts';
import { isAnimalMeat } from '../src/sim/biome-items.ts';
const stats=(values:number[])=>{const s=[...values].sort((a,b)=>a-b);return{n:s.length,p50:s[Math.floor(s.length*.5)],p95:s[Math.floor(s.length*.95)],max:s.at(-1)};};
const rows=[];
for(const biome of ['temperate-forest','boreal-forest','arid-shrubland'] as const){
  const started=performance.now(),w=createScenarioWorld(42,250,'crashlanded',{biome,hilliness:'small-hills'}),generationMs=performance.now()-started;
  const plants=w.resources.filter(r=>harvestable(w,r)||choppable(w,r)).sort((a,b)=>(a.x-w.pawns[0]!.x)**2+(a.z-w.pawns[0]!.z)**2-(b.x-w.pawns[0]!.x)**2-(b.z-w.pawns[0]!.z)**2).slice(0,12);
  for(const r of plants)applyCommand(w,{type:'designate',kind:r.kind==='tree'?'chop':'harvest',x:r.x,z:r.z});
  const enc=new SnapshotEncoder();enc.encode(w,0,6);const ticks:number[]=[],snapshots:number[]=[];
  for(let i=0;i<360;i++){let t=performance.now();stepWorld(w);ticks.push(performance.now()-t);if(i%5===0){t=performance.now();enc.encode(w,0,6);snapshots.push(performance.now()-t);}}
  const errors=validateWorld(w);if(errors.length)throw Error(errors.join('; '));
  rows.push({biome,generationMs,resources:w.resources.length,animals:w.wildlife!.animals.length,completed:w.completed,stepMs:stats(ticks),snapshotMs:stats(snapshots)});
  // Same decisions and inventory; isolate removed catalogue allocation.
  const bills=(Object.keys(PRODUCTION_RECIPES) as (keyof typeof PRODUCTION_RECIPES)[]).map(r=>newCookingBill(1,r));
  const uncached=(b:typeof bills[number])=>{
    const products=new Set(Object.keys(ITEM_DEFINITIONS).filter(item=>b.recipe==='butcher-creature'?isAnimalMeat(item):isRecipeProduct(b.recipe,item as keyof typeof ITEM_DEFINITIONS)));
    const stored=new Set(w.stockpiles.map(z=>z.z*w.width+z.x));
    return w.piles.reduce((n,p)=>n+(products.has(p.item)&&(p.owner.type==='pawn'&&b.recipe!=='butcher-creature'||p.owner.type==='ground'&&stored.has(p.owner.z*w.width+p.owner.x))?p.quantity:0),0);
  };
  for(const b of bills)if(uncached(b)!==countedProducts(w,b))throw Error('Counter differs');
  const measure=(count:(b:typeof bills[number])=>number)=>{let checksum=0;const t=performance.now();for(let i=0;i<2000;i++)for(const b of bills)checksum+=count(b);return{ms:performance.now()-t,checksum};};
  const counterUncached=measure(uncached),counterCached=measure(b=>countedProducts(w,b));
  if(counterUncached.checksum!==counterCached.checksum)throw Error('Counter checksum differs');
  Object.assign(rows.at(-1)!,{counterUncached,counterCached});
  console.log(JSON.stringify(rows.at(-1)));
}
writeFileSync('artifacts/biomes-cpu-v91.json',JSON.stringify({protocol:'Three 250² new sites, three original colonists, 12 gathering commands, 360 consecutive ticks. Short workload, not a multi-day autonomy proof.',rows},null,2));
