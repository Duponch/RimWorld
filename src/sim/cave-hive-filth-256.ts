/** Actual generation Slime on the same existing filth owner. Draw order and
 * the real shared GenAdj permutation follow the already adopted970 operation. */
import type {World} from './types.ts';
import {captureActualLocalDistricts256} from './actual-local-districts-256.ts';
import {terrainAcceptsFilth256} from './natural-terrain-runtime-256.ts';
import {isFloorKind} from './flooring.ts';
import {ensureFilth,filthCheckPeriod} from './filth-rules.ts';
import type {WorldGenerationRandom} from './world-generation-random.ts';
export interface HiveAdjacentRuntime256 {adjacentPermutation:number[];adjacentUses:number}
const directions=[[0,1],[1,0],[0,-1],[-1,0],[1,-1],[1,1],[-1,1],[-1,-1]] as const;
export function depositHiveSlime256(w:World,cell:number,random:Pick<WorldGenerationRandom,'integer'|'value'|'float'>,context:HiveAdjacentRuntime256,atCore=w.tick*10):boolean {
 const n=w.width*w.height;
 if(w.schemaVersion!==256||w.site?.revision!==3||!Number.isSafeInteger(cell)||cell<0||cell>=n||context.adjacentPermutation.length!==8||new Set(context.adjacentPermutation).size!==8||context.adjacentPermutation.some(i=>!Number.isInteger(i)||i<0||i>7)||!Number.isSafeInteger(context.adjacentUses)||context.adjacentUses<0)throw Error('Missing actual Hive slime/GenAdj frontier');
 if(!Number.isSafeInteger(atCore)||atCore<Math.max(0,(w.tick-1)*10)||atCore>w.tick*10)throw Error('Invalid actual Hive Slime substep');
 const physical=captureActualLocalDistricts256(w),now=atCore;
 const deposit=(i:number,propagate:boolean):boolean=>{
  const x=i%w.width,z=Math.floor(i/w.width),existing=w.filth?.items.find(f=>f.x===x&&f.z===z&&f.kind==='slime');
  if(!physical.normalWalkable(i)||existing&&existing.thickness>=5){
   if(propagate){if(!Number.isSafeInteger(context.adjacentUses+1))throw Error('Exhausted actual adjacent-use counter');context.adjacentUses++;
    for(let at=7;at>0;at--){const other=random.integer(0,at+1);[context.adjacentPermutation[at],context.adjacentPermutation[other]]=[context.adjacentPermutation[other]!,context.adjacentPermutation[at]!];}
    for(const direction of context.adjacentPermutation){const [dx,dz]=directions[direction]!,nx=x+dx,nz=z+dz;if(nx>=0&&nx<w.width&&nz>=0&&nz<w.height&&deposit(nz*w.width+nx,false))return true;}
   }return false;
  }
  if(existing){existing.thickness++;existing.grownCore=now;return true;}
  const tile=w.tiles[i]!;if(tile.floor&&!isFloorKind(tile.floor))throw Error('Unresolved real Hive filth floor');
  // All admitted surface/floor definitions have FilthMultiplier1. The sole
  // Core override StrawMatting is not an admitted floor, never defaulted here.
  if(random.value()>1||!terrainAcceptsFilth256(tile))return false;
  if(!Number.isSafeInteger(w.nextId+1))throw Error('Exhausted actual Hive slime identity');
  const period=filthCheckPeriod(w),phase=(Math.imul(i,1103515245)>>>0)%period;
  ensureFilth(w).items.push({id:w.nextId++,kind:'slime',x,z,thickness:1,grownCore:now,expiresAfterCore:Math.trunc(Math.fround(random.float(35,40)*60000)),nextCheckCore:now+((phase-now%period+period)%period||period)});
  return true;
 };
 return deposit(cell,true);
}
