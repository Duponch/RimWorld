/** Original bounded cell selection. The caller supplies actual districts and
 * physical admission; no fictitious map or synthetic reachable component. */
import type {WorldGenerationRandom} from './world-generation-random.ts';
export function assertLocalDimensions256(width:number,height:number):void {
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>400||height>400)throw Error('Invalid actual local dimensions');
}
/** A returned null is a real exhausted search; invalid margins consume no RNG. */
export function findLocalNotEdgeCell256(width:number,height:number,margin:number,allows:(cell:number)=>boolean,random:WorldGenerationRandom):number|null {
 assertLocalDimensions256(width,height);if(!Number.isInteger(margin)||margin<0)throw Error('Invalid cell-search margin');
 if(margin>Math.floor(width/2)||margin>Math.floor(height/2))return null;
 for(let attempt=0;attempt<1000;attempt++){const x=random.integer(margin,width-margin),z=random.integer(margin,height-margin),cell=z*width+x;if(allows(cell))return cell;}return null;
}
export interface ActualCentralCellReaders256 {
 standable(cell:number):boolean;
 district(cell:number):Readonly<{touchesMapEdge:boolean;cellCount:number}>|null;
 extra?(cell:number):boolean;
}
/** The final fallback intentionally checks ONLY standability, as distinct from
 * the progressively widened district/extra checks. Set invalidOnFailure for
 * callers which must not accept that fallback. */
export function findLocalCentralCell256(input:{width:number;height:number;tightness:number;minimumDistrictCells:number;invalidOnFailure?:boolean;readers:ActualCentralCellReaders256},random:WorldGenerationRandom):number|null {
 const {width,height,tightness,minimumDistrictCells,readers}=input;assertLocalDimensions256(width,height);
 if(!Number.isInteger(tightness)||tightness<1||!Number.isInteger(minimumDistrictCells)||minimumDistrictCells<0)throw Error('Invalid central-cell search');
 const accepts=(cell:number)=>{if(!readers.standable(cell))return false;const district=readers.district(cell);return !!district&&district.touchesMapEdge&&district.cellCount>=minimumDistrictCells&&(!readers.extra||readers.extra(cell));};
 for(let divisor=tightness;divisor>=1;divisor--){const band=Math.trunc(width/divisor),margin=Math.trunc((width-band)/2),cell=findLocalNotEdgeCell256(width,height,margin,accepts,random);if(cell!==null)return cell;}
 if(input.invalidOnFailure)return null;
 for(let attempt=0;attempt<1000;attempt++){const x=random.integer(0,width),z=random.integer(0,height),cell=z*width+x;if(readers.standable(cell))return cell;}return null;
}
