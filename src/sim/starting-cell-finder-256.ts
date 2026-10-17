import {assertLocalDimensions256} from './local-cell-selection-256.ts';
import type {Cell} from './types.ts';
import type {WorldGenerationRandom} from './world-generation-random.ts';

/** Original scalar implementation of the current near-cell search. The
 * inclusive upper map boundary and the two separately shuffled axes matter:
 * replacing this with a radial scan changes both candidates and the stream. */
export function findStartingRandomCellNear256(
 width:number,height:number,root:Readonly<Cell>,radius:number,
 allows:(cell:Readonly<Cell>)=>boolean,random:Pick<WorldGenerationRandom,'integer'>,
 maxTries=-1,
):Cell|null {
 assertLocalDimensions256(width,height);
 if(!Number.isInteger(root.x)||!Number.isInteger(root.z)||root.x<0||root.z<0||root.x>=width||root.z>=height
  ||!Number.isInteger(radius)||radius<0||!Number.isInteger(maxTries)||maxTries< -1)throw Error('Invalid actual near-cell search');
 const originalArea=(radius*2+1)**2,loX=Math.max(0,root.x-radius),hiX=Math.min(width,root.x+radius),
  loZ=Math.max(0,root.z-radius),hiZ=Math.min(height,root.z+radius),limited=maxTries>=0&&maxTries<originalArea;
 for(let attempt=0;attempt<(limited?maxTries:20);attempt++){
  const cell={x:loX===hiX?loX:random.integer(loX,hiX+1),z:loZ===hiZ?loZ:random.integer(loZ,hiZ+1)};
  if(allows(cell))return cell;
 }
 if(limited)return null;
 const xs=Array.from({length:hiX-loX+1},(_,i)=>loX+i),zs=Array.from({length:hiZ-loZ+1},(_,i)=>loZ+i);
 const shuffle=(values:number[])=>{for(let end=values.length-1;end>0;end--){const at=random.integer(0,end+1),old=values[end]!;values[end]=values[at]!;values[at]=old;}};
 shuffle(xs);shuffle(zs);
 for(const x of xs)for(const z of zs){const cell={x,z};if(allows(cell))return cell;}
 return null;
}

export interface StartingDropReaders256 {
 /** Actual physical admission, including all earlier incoming capsules. */
 goodDropSpot(cell:Readonly<Cell>):boolean;
 passDoorsReachable(from:Readonly<Cell>,to:Readonly<Cell>):boolean;
 roomAt(cell:Readonly<Cell>):Readonly<{id:number;psychologicallyOutdoors:boolean}>|null;
}
/** One-cell, roof-punching initial pod destination. No fallback is silently
 * substituted here: the caller must execute DropThingGroupsNear's real
 * walkable/no-thick-roof fallback after an exhausted result. */
export function findStartingPodDropSpot256(width:number,height:number,center:Readonly<Cell>,
 readers:StartingDropReaders256,random:Pick<WorldGenerationRandom,'integer'>):Cell|null {
 const valid=(cell:Readonly<Cell>)=>cell.x>=0&&cell.z>=0&&cell.x<width&&cell.z<height
  &&readers.goodDropSpot(cell)&&readers.passDoorsReachable(center,cell);
 const search=(allows:(cell:Readonly<Cell>)=>boolean)=>{
  for(let radius=5;radius<=16;radius++){const found=findStartingRandomCellNear256(width,height,center,radius,allows,random);if(found)return found;}return null;
 };
 const room=readers.roomAt(center);
 if(room&&!room.psychologicallyOutdoors){
  const same=search(cell=>valid(cell)&&readers.roomAt(cell)?.id===room.id);if(same)return same;
  const indoors=search(cell=>valid(cell)&&readers.roomAt(cell)?.psychologicallyOutdoors===false);if(indoors)return indoors;
 }
 return search(valid);
}
