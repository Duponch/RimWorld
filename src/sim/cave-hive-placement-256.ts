/** Original generation-only morphology/selection. No owner is manufactured
 * here: the generator yields one chosen cell, and reads the actual map again
 * only AFTER the caller commits that hive and its real occupants/extras. */
import type {WorldGenerationRandom} from './world-generation-random.ts';
export interface CaveHivePlacementInput256 {
 readonly width:number;readonly height:number;readonly elevation:Float32Array;readonly caves:Float32Array;
 readonly allowCaveHives:boolean;readonly insectFactionId:number|null;
 hasFactionThing(cell:number):boolean;
 available(cell:number):boolean;
}
export const CAVE_HIVES_SEED_PART_256=349641510;
const CARDINAL=[[0,1],[1,0],[0,-1],[-1,0]] as const;
export function* caveHivePlacement256(input:CaveHivePlacementInput256,random:Pick<WorldGenerationRandom,'value'|'integer'>):Generator<number,void,number|undefined> {
 const {width,height,elevation,caves}=input,n=width*height;
 if(!Number.isSafeInteger(n)||width<1||height<1||!Number.isInteger(width)||!Number.isInteger(height)||elevation.length!==n||caves.length!==n||typeof input.allowCaveHives!=='boolean'||input.insectFactionId!==null&&(!Number.isSafeInteger(input.insectFactionId)||input.insectFactionId<1))throw Error('Invalid actual CaveHives1120 frontier');
 // Core exits before grids, morphology and RoundRandom on either disabled gate.
 if(!input.allowCaveHives||input.insectFactionId===null)return;
 const neighbors=(cell:number)=>{const x=cell%width,z=Math.floor(cell/width),out:number[]=[];for(const [dx,dz] of CARDINAL){const nx=x+dx,nz=z+dz;if(nx>=0&&nx<width&&nz>=0&&nz<height)out.push(nz*width+nx);}return out;};
 const rock=new Uint8Array(n),excluded=new Uint8Array(n),edges:number[]=[],faction:number[]=[];let caveCount=0;
 for(let i=0;i<n;i++){if(!Number.isFinite(elevation[i])||!Number.isFinite(caves[i]))throw Error('Nonfinite actual cave/elevation field');if(elevation[i]!>Math.fround(.7))rock[i]=1;if(caves[i]!>0)caveCount++;if(input.hasFactionThing(i)){faction.push(i);excluded[i]=1;}}
 // Dilate cardinal50, distance0 sources included, exactly one visit per cell.
 const flood=(sources:readonly number[],admit:(cell:number)=>boolean,visit:(cell:number,distance:number)=>void,max:number)=>{const seen=new Uint8Array(n),cells=[...sources],dist=sources.map(()=>0);for(const c of sources)seen[c]=1;for(let h=0;h<cells.length;h++){const cell=cells[h]!,distance=dist[h]!;visit(cell,distance);if(distance>=max)continue;for(const next of neighbors(cell))if(!seen[next]&&admit(next)){seen[next]=1;cells.push(next);dist.push(distance+1);}}};
 flood(faction,()=>true,cell=>{excluded[cell]=1;},50);
 // RoundRandom always draws, including a zero/integer ratio.
 const ratio=Math.fround(Math.fround(caveCount)/Math.fround(1000)),floor=Math.floor(ratio),count=floor+(random.value()<Math.fround(ratio-floor)?1:0);
 for(let i=0;i<n;i++)if(rock[i]){const x=i%width,z=Math.floor(i/width);if(x===0||z===0||x===width-1||z===height-1||neighbors(i).some(c=>!rock[c]))edges.push(i);}
 const possible:number[]=[];
 // GenMorphology's output HashSet retains FloodFiller insertion order, not
 // sorted cell order. No removals/re-additions occur in this output set.
 if(edges.length)flood(edges,cell=>rock[cell]===1,(cell,distance)=>{if(distance>=10&&caves[cell]!>0&&!excluded[cell])possible.push(cell);},Number.MAX_SAFE_INTEGER);
 const spawned:number[]=[];
 for(let attempt=0;attempt<count;attempt++){
  let selected:number|undefined,best=-1;
  for(let sample=0;sample<3;sample++){
   const pool=possible.filter(input.available);if(!pool.length)break;
   const cell=pool[random.integer(0,pool.length)]!,x=cell%width,z=Math.floor(cell/width);let nearest=-1;
   for(const hive of spawned){const dx=x-hive%width,dz=z-Math.floor(hive/width),distance=Math.fround(dx*dx+dz*dz);if(nearest<0||distance<nearest)nearest=distance;}
   if(selected===undefined||nearest>best){selected=cell;best=nearest;}
  }
  if(selected===undefined)continue;
  possible.splice(possible.indexOf(selected),1);
  const actualCell=yield selected;
  // An uncommitted placement must NEVER silently advance this GenStep.
  if(actualCell!==selected)throw Error('CaveHive selection requires the real committed hive cell before continuation');
  spawned.push(actualCell);
 }
}
