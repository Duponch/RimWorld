import {isAncientMonumentKind256} from './ancient-monument-props-256.ts';
import {addFilth} from './filth.ts';
import {isLocalRoadProp256} from './local-road-props-256.ts';
import type {Cell,Structure,World} from './types.ts';
/** Optional physical leavings. This preview owns the mutable filth header and
 * records. Its count draw precedes recipe rounding; rejection of a later
 * salvage/owner preflight adopts neither stream, IDs nor filth. */
export function planLocalRoadPropRubble256(w:World,s:Structure,at:Cell,rng:number){
 if(w.schemaVersion<256||!isLocalRoadProp256(s.kind)&&!isAncientMonumentKind256(s.kind))return;
 let n=rng;n^=n<<13;n^=n>>>17;n^=n<<5;n>>>=0;
 const trial:World={...w,filth:w.filth?{...w.filth,items:w.filth.items.map(f=>({...f}))}:undefined};
 addFilth(trial,at,'building-rubble',1+Math.floor(n/4294967296*3));
 return {rng:n,nextId:trial.nextId,filth:trial.filth};
}
