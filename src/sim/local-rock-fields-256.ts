/** Original generation-only spatial rock/roof fields. Natural rock choices
 * come from the tile-only selector; spatial noise uses the actual map seed.
 * Caves remove rock edifices, not their natural roof. Ore scattering is a
 * subsequent step and is not manufactured by this field. */
import {WorldGenerationRandom} from './world-generation-random.ts';
import {createWorldPerlin} from './world-coherent-noise.ts';
import type {WorldNaturalRock} from './world-site-geography.ts';
const f=Math.fround;
const ROCKS=['sandstone','granite','limestone','slate','marble'] as const;
export interface LocalRockFields256 {stones:WorldNaturalRock[];edifices:Uint8Array;roof:Uint8Array;seeds:{stone:WorldNaturalRock;seed:number}[]}
/** Numeric roof codes:0 absent,1 thin,2 thick; they are generation-local, not
 * a newly introduced persistent wire format or a roof-support shortcut. */
export function generateLocalRockFields256(input:{mapSeed:number;width:number;height:number;naturalRocks:readonly WorldNaturalRock[];waterCovered:boolean;elevation:Float32Array;caves:Float32Array;onNaturalSpawn?(cell:number,stone:WorldNaturalRock):void}):LocalRockFields256 {
 const {width,height,mapSeed,naturalRocks,elevation,caves}=input;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<8||height<8||width>400||height>400||!Number.isInteger(mapSeed)||mapSeed< -2147483648||mapSeed>0xffffffff||typeof input.waterCovered!=='boolean'||elevation.length!==width*height||caves.length!==width*height||naturalRocks.length<2||naturalRocks.length>3||new Set(naturalRocks).size!==naturalRocks.length||naturalRocks.some(id=>!ROCKS.includes(id)))throw Error('Invalid actual natural-rock provenance');
 const random=new WorldGenerationRandom(mapSeed),seeds=naturalRocks.map(stone=>({stone,seed:random.integer(0,2147483647)})),noises=seeds.map(row=>createWorldPerlin({frequency:f(.005),lacunarity:2,persistence:.5,octaves:6,seed:row.seed,quality:'medium'})),stones:WorldNaturalRock[]=[],edifices=new Uint8Array(width*height),roof=new Uint8Array(width*height);
 for(let z=0;z<height;z++)for(let x=0;x<width;x++){
  const cell=z*width+x,e=elevation[cell]!,c=caves[cell]!;if(!Number.isFinite(e)||!Number.isFinite(c)||c<0)throw Error('Invalid actual rock/cave field');
  let selected=0,score=-999999;for(let n=0;n<noises.length;n++){const value=f(noises[n]!(x,0,z));if(value>score){score=value;selected=n;}}stones.push(naturalRocks[selected]!);
  if(!input.waterCovered&&e>f(.7)){if(c<=0){input.onNaturalSpawn?.(cell,naturalRocks[selected]!);edifices[cell]=1;}if(e>f(f(.7)*f(1.14)))roof[cell]=2;else if(e>f(f(.7)*f(1.04)))roof[cell]=1;}
 }
 const seen=new Uint8Array(roof.length),queue=new Int32Array(roof.length);
 for(let root=0;root<roof.length;root++){
  if(seen[root]||!roof[root])continue;let head=0,tail=1;queue[0]=root;seen[root]=1;
  while(head<tail){const cell=queue[head++]!,x=cell%width;const visit=(next:number)=>{if(!seen[next]&&roof[next]){seen[next]=1;queue[tail++]=next;}};
   if(cell>=width)visit(cell-width);if(x+1<width)visit(cell+1);if(cell+width<roof.length)visit(cell+width);if(x>0)visit(cell-1);
  }
  if(tail<20)for(let i=0;i<tail;i++)roof[queue[i]!]=0;
 }
 return {stones,edifices,roof,seeds};
}
