import {caveRadialPattern256} from './local-cave-radial-256.ts';
import type {Cell} from './types.ts';
/** One original source Thing and the actual spawned contents of each cell.
 * Unlike a terrain capacity, itemCount includes the active pod itself. */
export interface StartingPlaceThing256 {readonly id:number;readonly category:'item'|'pawn';readonly stackLimit:number;readonly quantity:number;readonly downed:boolean;readonly saveCompressible:boolean}
export interface StartingPlaceCell256 {
 readonly canSpawn:boolean;readonly sameRoom:boolean;readonly passDoorsReachable:boolean;
 readonly itemCount:number;readonly maxItems:number;readonly haulDestinationAccepts:boolean;
 readonly saveCompressiblePresent:boolean;readonly matchingStackSpace:number;
 readonly fullFill:boolean;readonly preventDropping:boolean;readonly door:boolean;
 readonly workTable:boolean;readonly downedPawn:boolean;readonly anyPawn:boolean;readonly selectablePlant:boolean;
}
export function startingPlaceQuality256(thing:StartingPlaceThing256,facts:StartingPlaceCell256):0|1|2|3|4 {
 if(!facts.canSpawn||thing.saveCompressible&&facts.saveCompressiblePresent
  ||thing.category==='item'&&facts.matchingStackSpace===0&&facts.itemCount>=facts.maxItems||!facts.haulDestinationAccepts)return 0;
 if(!facts.sameRoom)return facts.passDoorsReachable?2:1;
 if(facts.matchingStackSpace>0)return 4;
 if(facts.fullFill||facts.preventDropping||facts.door||facts.workTable||facts.downedPawn||thing.downed&&facts.anyPawn)return 2;
 return facts.selectablePlant?3:4;
}
/** No RNG. The three prefixes deliberately revisit the inner cells and keep
 * the FIRST equal-quality candidate in native radial order. */
export function findStartingPlaceNear256(center:Readonly<Cell>,thing:StartingPlaceThing256,
 read:(cell:Readonly<Cell>,thing:StartingPlaceThing256)=>StartingPlaceCell256):Cell|null {
 const pattern=caveRadialPattern256(12.9),middle=caveRadialPattern256(3).count;
 let quality=0,best:Cell|null=null;
 for(const count of [9,middle,pattern.count]){
  for(let i=0;i<count;i++){const offset=pattern.offsets[i]!,cell={x:center.x+offset[0],z:center.z+offset[1]},next=startingPlaceQuality256(thing,read(cell,thing));if(next>quality){quality=next;best=cell;}if(quality===4)break;}
  if(quality>=3)return best;
 }
 return quality>0?best:null;
}

export interface StartingDirectTarget256 {readonly id:number;readonly quantity:number;readonly stackLimit:number;readonly compatible:boolean}
export type StartingDirectOperation256={kind:'absorb';targetId:number;quantity:number}|{kind:'spawn';id:number;quantity:number;split:boolean};
/** Pure physical plan for one direct placement. Existing stacks are examined
 * in descending quantity order. Native equal-stack Sort ties are supplied by
 * the actual domain caller; no ID sort is invented. SplitOff allocates only
 * the fraction spawned, while the original keeps the remainder and its ID. */
export function planStartingPlaceDirect256(thing:StartingPlaceThing256,cell:StartingPlaceCell256,
 orderedTargets:readonly StartingDirectTarget256[],nextId:number):Readonly<{operations:readonly StartingDirectOperation256[];remaining:number;nextId:number;complete:boolean}> {
 if(!Number.isSafeInteger(thing.quantity)||thing.quantity<1||!Number.isSafeInteger(thing.stackLimit)||thing.stackLimit<1||!Number.isSafeInteger(nextId)||nextId<1)throw Error('Invalid original starting Thing');
 let remaining=thing.quantity;const operations:StartingDirectOperation256[]=[];
 for(let i=0;i<orderedTargets.length;i++){
  const target=orderedTargets[i]!;
  if(!Number.isSafeInteger(target.quantity)||target.quantity<1||target.quantity>target.stackLimit||i>0&&target.quantity>orderedTargets[i-1]!.quantity)throw Error('Invalid actual sorted cell Things');
  if(thing.stackLimit<=1||!target.compatible)continue;
  const amount=Math.min(remaining,target.stackLimit-target.quantity);if(amount>0){operations.push({kind:'absorb',targetId:target.id,quantity:amount});remaining-=amount;}if(remaining===0)break;
 }
 let slots=thing.category==='item'?cell.maxItems-cell.itemCount:remaining+1;
 if(slots<=0&&thing.stackLimit<=1)slots=1;
 for(let i=0;remaining>0&&i<slots;i++){
  const quantity=Math.min(remaining,thing.stackLimit),split=remaining>thing.stackLimit;
  if(split&&!Number.isSafeInteger(nextId+1))throw Error('Starting SplitOff namespace exhausted');
  operations.push({kind:'spawn',id:split?nextId++:thing.id,quantity,split});remaining-=quantity;
 }
 return Object.freeze({operations:Object.freeze(operations),remaining,nextId,complete:remaining===0});
}
