import type { LocalSite } from './site.ts';
import type { Tile,World } from './types.ts';
import type { StoneKind } from './geology.ts';
import { siteSample } from './site-noise.ts';

// Core 1.6.4871 Buildings_Natural. Unsupported minerals keep their weight;
// their occasion is consumed without silently awarding more useful ore.
export const SITE_MINERALS=[
  {id:'steel',weight:1,min:30,max:40},{id:'machinery',weight:1,min:3,max:6},
  {id:'silver',weight:.1,min:4,max:12},{id:'gold',weight:.07,min:2,max:8},
  {id:'uranium',weight:.12,min:6,max:12},{id:'plasteel',weight:.05,min:2,max:8},
  {id:'jade',weight:.065,min:2,max:8},
] as const;
type Mineral=typeof SITE_MINERALS[number];
export interface OreOccasion { mineral:Mineral['id'];center:number;requested:number;cells:number[] }
export interface OreGenerationReport { requested:number;occasions:OreOccasion[] }
const rates={flat:4,'small-hills':8,'large-hills':11} as const;
const roundEven=(n:number):number=>n-Math.floor(n)===.5?Math.floor(n)+Math.floor(n)%2:Math.round(n);
export const siteOreBudget=(width:number,height:number,hilliness:LocalSite['hilliness']):number=>roundEven(width*height/roundEven(10000/rates[hilliness]));
function chooseMineral(roll:number):Mineral {
  let remaining=roll*2.405;
  for(const mineral of SITE_MINERALS){remaining-=mineral.weight;if(remaining<0)return mineral;}
  return SITE_MINERALS[SITE_MINERALS.length-1]!;
}
function neighbors(i:number,width:number,height:number):number[] {
  const x=i%width,z=Math.floor(i/width);
  return [x>0?i-1:-1,x+1<width?i+1:-1,z>0?i-width:-1,z+1<height?i+width:-1].filter(n=>n>=0);
}

/** A common budget, centres in natural rock (including hidden cells), and
 * compact peripheral growth. Our finite candidate order and non-overwrite
 * rule differ from Core's random retry/overwrite implementation. */
export function generateSiteOres(world:Pick<World,'seed'|'width'|'height'|'tiles'>,site:LocalSite,stoneAt:(x:number,z:number)=>StoneKind):OreGenerationReport {
  const {width,height,seed,tiles}=world,requested=siteOreBudget(width,height,site.hilliness);
  const candidates:number[]=[],used:number[]=[],occasions:OreOccasion[]=[];
  const margin=Math.min(5,Math.floor((Math.min(width,height)-1)/2));
  for(let z=margin;z<height-margin;z++)for(let x=margin;x<width-margin;x++)if(tiles[z*width+x]!.terrain==='rock')candidates.push(z*width+x);
  candidates.sort((a,b)=>siteSample(seed,a,0,1100)-siteSample(seed,b,0,1100)||a-b);
  let cursor=0;
  for(let attempt=0;attempt<requested;attempt++) {
    let origin:number|undefined;
    while(cursor<candidates.length) {
      const cell=candidates[cursor++]!;
      if(tiles[cell]!.ore||used.some(i=>(i%width-cell%width)**2+(Math.floor(i/width)-Math.floor(cell/width))**2<25))continue;
      origin=cell;break;
    }
    if(origin===undefined)break;
    used.push(origin);
    const mineral=chooseMineral(siteSample(seed,attempt,0,1101));
    const count=mineral.min+Math.floor(siteSample(seed,attempt,0,1102)*(mineral.max-mineral.min+1));
    const occasion:OreOccasion={mineral:mineral.id,center:origin,requested:count,cells:[]};occasions.push(occasion);
    if(mineral.id!=='steel'&&mineral.id!=='machinery')continue;
    const ore:NonNullable<Tile['ore']>=mineral.id,frontier=[origin],seen=new Set(frontier),ox=origin%width,oz=Math.floor(origin/width);
    const score=(i:number):number=>(i%width-ox)**2+(Math.floor(i/width)-oz)**2+siteSample(seed,i,attempt,1103)*6;
    while(frontier.length&&occasion.cells.length<count) {
      let best=0;for(let k=1;k<frontier.length;k++)if(score(frontier[k]!)<score(frontier[best]!))best=k;
      const cell=frontier.splice(best,1)[0]!;
      if(tiles[cell]!.ore||tiles[cell]!.terrain==='water')continue;
      occasion.cells.push(cell);
      for(const next of neighbors(cell,width,height))if(!seen.has(next)){seen.add(next);frontier.push(next);}
    }
    for(const cell of occasion.cells)tiles[cell]={terrain:'rock',stone:stoneAt(cell%width,Math.floor(cell/width)),ore};
  }
  return {requested,occasions};
}
