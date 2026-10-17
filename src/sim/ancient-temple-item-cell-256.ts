import type {MonumentRect256} from './ancient-monument-plan-256.ts';
import type {WorldGenerationRandom} from './world-generation-random.ts';
const roundEven=(n:number)=>{const floor=Math.floor(n),fraction=n-floor;return fraction>.5||fraction===.5&&floor%2===1?floor+1:floor;};
/** Actual CellFinder.TryFindRandomCellInsideWith: max(round(sqrt(area)),5)
 * random inclusive x/z probes, THEN the full z-major list shuffled once.
 * CanResolve and Resolve each call this independently; never reuse result1.
 * The rectangle is already clipped/admitted by the real temple envelope. */
export function findAncientTempleItemCell256(rect:MonumentRect256,allows:(cell:number)=>boolean,width:number,random:Pick<WorldGenerationRandom,'integer'>):number|null {
 const {minX,minZ,maxX,maxZ}=rect;if(![minX,minZ,maxX,maxZ,width].every(Number.isSafeInteger)||width<1||width>400||minX<0||minZ<0||maxX<minX||maxZ<minZ||maxX>=width||maxZ>=400)throw Error('Invalid actual temple item rectangle');
 const w=maxX-minX+1,h=maxZ-minZ+1,tries=Math.max(roundEven(Math.fround(Math.sqrt(Math.fround(w*h)))),5);
 const coordinate=(min:number,max:number)=>min===max?min:random.integer(min,max+1);
 for(let i=0;i<tries;i++){const x=coordinate(minX,maxX),z=coordinate(minZ,maxZ),cell=z*width+x;if(allows(cell))return cell;}
 const cells=Array.from({length:w*h},(_,i)=>(minZ+Math.floor(i/w))*width+minX+i%w);
 for(let i=cells.length-1;i>0;i--){const j=random.integer(0,i+1);[cells[i],cells[j]]=[cells[j]!,cells[i]!];}
 for(const cell of cells)if(allows(cell))return cell;return null;
}
