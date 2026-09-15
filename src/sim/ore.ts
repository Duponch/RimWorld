import type { Tile, World } from './types.ts';

/** Core resource rock; it inherits natural-rock pick damage (80), not 40. */
export const STEEL_ORE = Object.freeze({ hp: 1500, yield: 40, color: 0x725c53 });
export function validOre(tile: {terrain:unknown;ore?:unknown}, version:number):boolean {
  return tile.ore===undefined || version>=29 && tile.terrain==='rock' && tile.ore==='steel';
}

function sample(seed:number,cell:number):number {
  let n=seed^Math.imul(cell+1,0x1f123bb5)^0x452a9937;
  n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);
  return ((n^(n>>>16))>>>0)/4294967296;
}
/** Generation-only stream: connected 30–40-cell deposits in existing massifs.
 * Exposed seeds, compact growth, one-cell separation; no topology/RNG changes.
 * Density is a local valley preset, not a recreation of Core's world generator. */
export function generateSteel(world:Pick<World,'tiles'|'width'|'height'|'seed'>):void {
  const {tiles,width,height,seed}=world;
  const neighbors=(i:number):number[]=>{
    const x=i%width,z=Math.floor(i/width),out:number[]=[];
    if(x)out.push(i-1);if(x+1<width)out.push(i+1);if(z)out.push(i-width);if(z+1<height)out.push(i+width);
    return out;
  };
  const rocks=tiles.reduce((n,t)=>n+(t.terrain==='rock'?1:0),0);
  if(rocks<30)return;
  const candidates=tiles.flatMap((t,i)=>t.terrain==='rock'&&neighbors(i).some(j=>tiles[j]!.terrain!=='rock'&&tiles[j]!.terrain!=='water')?[i]:[])
    .sort((a,b)=>sample(seed,a)-sample(seed,b)||a-b);
  const budget=Math.max(1,Math.floor(rocks/500));
  let deposits=0,attempts=0;
  for(const origin of candidates) {
    if(deposits>=budget||attempts++>=budget*24)break;
    const eligible=(i:number)=>tiles[i]!.terrain==='rock'&&!tiles[i]!.ore&&!neighbors(i).some(j=>tiles[j]!.ore);
    if(!eligible(origin))continue;
    const target=30+Math.floor(sample(seed^0x3391,origin)*11),chosen:number[]=[],seen=new Set<number>([origin]),frontier=[origin];
    const ox=origin%width,oz=Math.floor(origin/width);
    const score=(i:number)=>Math.hypot(i%width-ox,Math.floor(i/width)-oz)+sample(seed^0x1271,i)*1.7;
    while(frontier.length&&chosen.length<target) {
      let best=0;for(let k=1;k<frontier.length;k++)if(score(frontier[k]!)<score(frontier[best]!))best=k;
      const i=frontier.splice(best,1)[0]!;chosen.push(i);
      for(const j of neighbors(i))if(!seen.has(j)&&eligible(j)){seen.add(j);frontier.push(j);}
    }
    if(chosen.length<30)continue;
    for(const i of chosen)tiles[i]={...tiles[i]!,ore:'steel'};
    deposits++;
  }
}

export const minedFloor=(tile:Tile):Tile=>({terrain:'rough-stone',...tile.stone?{stone:tile.stone}:{}});
