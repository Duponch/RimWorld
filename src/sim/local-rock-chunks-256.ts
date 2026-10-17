/** Original generation-only chunk/rubble operation, at real step970 AFTER
 * intervening roads/ruins/critical structures. Caller supplies those owners'
 * actual masks and allocator frontier. It does not manufacture clear cells. */
import type {WorldGenerationRandom} from './world-generation-random.ts';
import {createWorldPerlin} from './world-coherent-noise.ts';
import type {WorldNaturalRock} from './world-site-geography.ts';
import {assertLocalDimensions256} from './local-cell-selection-256.ts';
const f=Math.fround;
const directions=Object.freeze([[0,1],[1,0],[0,-1],[-1,0],[1,-1],[1,1],[-1,1],[-1,-1]] as const);
const stones=['sandstone','granite','limestone','slate','marble'] as const;
export interface GeneratedChunk256 {id:number;cell:number;stone:WorldNaturalRock;item:`${WorldNaturalRock}-chunk`;quantity:1}
export interface GeneratedRubble256 {id:number;cell:number;thickness:number;grownCore:number;expiresAfterCore:number}
export interface LocalChunkInputs256 {
 readonly width:number;readonly height:number;readonly elevation:Float32Array;readonly waterCovered:boolean;readonly underground:boolean;
 readonly chunkDensityFactors:readonly number[];readonly rocks:readonly WorldNaturalRock[];
 /** Actual rock choice may intentionally have no mineable chunk. */
 readonly rockHasChunk:Readonly<Record<WorldNaturalRock,boolean>>;
 readonly nextId:number;readonly atCore:number;
 readonly physical:{
  readonly edifices:Uint8Array;readonly items:Uint8Array;readonly doors:Uint8Array;readonly heavy:Uint8Array;
  /** Any category OTHER than Plant/Item/Pawn, includes existing filth. */
  readonly rubbleBlocked:Uint8Array;readonly walkableByAny:Uint8Array;
  readonly vacuum:Uint8Array;readonly acceptsUnnaturalFilth:Uint8Array;readonly filthMultiplier:Float32Array;
 };
 readonly rubble:readonly GeneratedRubble256[];
 /** Exact current static AdjacentCells8WayRandomized permutation. A genuinely
  * uninitialized list is 0..7, but that must come from Init provenance. */
 readonly adjacentPermutation:readonly number[];
}
function validate(input:LocalChunkInputs256):void {
 const {width,height,physical:p}=input;assertLocalDimensions256(width,height);const n=width*height;
 if(input.elevation.length!==n||input.elevation.some(value=>!Number.isFinite(value))||typeof input.waterCovered!=='boolean'||typeof input.underground!=='boolean'||!Number.isSafeInteger(input.nextId)||input.nextId<1||!Number.isSafeInteger(input.atCore)||input.atCore<0||input.chunkDensityFactors.some(value=>!Number.isFinite(value))||!input.rocks.length||input.rocks.some(value=>!stones.includes(value))||stones.some(stone=>typeof input.rockHasChunk[stone]!=='boolean')||!p||[p.edifices,p.items,p.doors,p.heavy,p.rubbleBlocked,p.walkableByAny,p.vacuum,p.acceptsUnnaturalFilth].some(mask=>mask.length!==n||mask.some(value=>value!==0&&value!==1))||p.filthMultiplier.length!==n||p.filthMultiplier.some(value=>!Number.isFinite(value))||input.adjacentPermutation.length!==8||new Set(input.adjacentPermutation).size!==8||input.adjacentPermutation.some(value=>!Number.isInteger(value)||value<0||value>7))throw Error('Missing actual chunk-step provenance');
 const ids=new Set<number>(),cells=new Set<number>();for(const row of input.rubble){if(!Number.isSafeInteger(row.id)||row.id<1||row.id>=input.nextId||ids.has(row.id)||!Number.isInteger(row.cell)||row.cell<0||row.cell>=n||cells.has(row.cell)||!Number.isInteger(row.thickness)||row.thickness<1||row.thickness>5||!Number.isSafeInteger(row.grownCore)||row.grownCore<0||row.grownCore>input.atCore||!Number.isInteger(row.expiresAfterCore)||row.expiresAfterCore<0||p.rubbleBlocked[row.cell]!==1)throw Error('Invalid actual initial rubble owner');ids.add(row.id);cells.add(row.cell);}
}
export function generateLocalRockChunks256(input:LocalChunkInputs256,random:WorldGenerationRandom){
 validate(input);const {width,height,physical:p,atCore}=input,n=width*height,items=p.items.slice(),blocked=p.rubbleBlocked.slice(),chunks:GeneratedChunk256[]=[],rubble=input.rubble.map(row=>({...row})),byCell=new Map(rubble.map(row=>[row.cell,row])),permutation=[...input.adjacentPermutation];let nextId=input.nextId,adjacentUses=0;
 const allocate=()=>{if(!Number.isSafeInteger(nextId+1))throw Error('Exhausted actual physical identity allocator');return nextId++;};
 if(input.waterCovered)return {chunks,rubble,nextId,adjacentPermutation:permutation,adjacentUses,random:random.state,noiseSeed:null};
 const noiseSeed=random.integer(0,999999),noise=createWorldPerlin({frequency:f(.015),lacunarity:2,persistence:.5,octaves:6,quality:'medium',seed:noiseSeed});
 let chance=f(.006);for(const factor of input.chunkDensityFactors)chance=f(chance*f(factor));
 const neighbor=(cell:number,direction:number)=>{const offset=directions[direction]!,x=cell%width+offset[0],z=Math.trunc(cell/width)+offset[1];return x<0||z<0||x>=width||z>=height?null:z*width+x;};
 const deposit=(cell:number,propagate:boolean):boolean=>{
  const existing=byCell.get(cell);if(p.vacuum[cell])return false;
  if(!p.walkableByAny[cell]||existing&&existing.thickness>=5){
   if(propagate){adjacentUses++;for(let i=7;i>0;i--){const other=random.integer(0,i+1);[permutation[i],permutation[other]]=[permutation[other]!,permutation[i]!];}
    for(const direction of permutation){const target=neighbor(cell,direction);if(target!==null&&deposit(target,false))return true;}
   }return false;
  }
  if(existing){existing.thickness++;existing.grownCore=atCore;return true;}
  // Filth_RubbleRock's default mask is Unnatural, so this draw precedes
  // terrain acceptance even where a multiplier>=1 always admits it.
  if(random.value()>p.filthMultiplier[cell]!)return false;
  if(!p.acceptsUnnaturalFilth[cell])return false;
  const row:GeneratedRubble256={id:allocate(),cell,thickness:1,grownCore:atCore,expiresAfterCore:Math.trunc(f(random.float(45,50)*60000))};rubble.push(row);byCell.set(cell,row);blocked[cell]=1;return true;
 };
 for(let z=0;z<height;z++)for(let x=0;x<width;x++){
  const root=z*width+x,threshold=f(chance*f(noise(x,0,z)+1));
  if(!(input.elevation[root]!<f(.55)||input.underground)||!(random.value()<threshold))continue;
  const stone=input.rocks[random.integer(0,input.rocks.length)]!;if(!input.rockHasChunk[stone])continue;
  const forbidden=random.integer(0,4);let cursor=root;
  for(;;){
   const direction=random.integer(0,4);if(direction===forbidden)continue;
   const target=neighbor(cursor,direction);if(target===null||p.edifices[target]||items[target]||!input.underground&&input.elevation[target]!>f(.55)||!p.heavy[target]||p.doors[target])break;
   cursor=target;chunks.push({id:allocate(),cell:cursor,stone,item:`${stone}-chunk`,quantity:1});items[cursor]=1;
   for(let around=0;around<9;around++){if(!(random.value()<f(.5)))continue;const cell=around===8?cursor:neighbor(cursor,around);if(cell!==null&&!blocked[cell])deposit(cell,true);}
  }
 }
 return {chunks,rubble,nextId,adjacentPermutation:permutation,adjacentUses,random:random.state,noiseSeed};
}
