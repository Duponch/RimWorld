/** Rare component searches use the actual live door owner, never the fresh
 * generator's closed-door precondition. No reader is cached across changes. */
import type {World,Structure,Cell} from './types.ts';
import {isColonist} from './affiliation.ts';
import {carrierOf} from './rescue-state.ts';
import {animalCarrier} from './animal-rest-state.ts';
import {prisonBreakActive} from './prison-break-state.ts';
import {isPassageDoor,DOOR_CLOSE_DELAY} from './door-rules.ts';
import {captureGeographicGenerationReachability256,type ActualGenerationRegion256} from './geographic-generation-reachability-256.ts';
import {captureRandomClosewalk256,tryRandomClosewalkCellNear256} from './random-closewalk-256.ts';
import type {WorldGenerationRandom} from './world-generation-random.ts';
const same=(a:Cell,b:Cell)=>a.x===b.x&&a.z===b.z;
/** Building_Door.FreePassage/WillCloseSoon translated onto the existing
 * DoorState clock (10Core/local tick). No fully-open visual threshold is added. */
export function hiveDoorFreePassage256(w:World,s:Structure):boolean {
 const d=s.door;if(!d)throw Error('Actual passage lacks its real door state');
 if(!d.open)return false;if(d.holdOpen)return true;
 const position=(p:Cell&{motion?:{end:number;from:Cell}|null})=>p.motion&&p.motion.end>w.tick?p.motion.from:p;
 const pawns=w.pawns.filter(p=>!carrierOf(w,p.id)&&!(p.state==='dead'&&(p.body?.pileId!==undefined||p.body?.lostAt!==undefined))),animals=(w.wildlife?.animals??[]).filter(a=>!animalCarrier(w,a.id));
 const blocked=pawns.some(p=>same(position(p),s))||animals.some(a=>same(position(a),s))||w.piles.some(p=>p.owner.type==='ground'&&same(p.owner,s))||w.packed.some(p=>p.owner.type==='ground'&&same(p.owner,s));
 if(!blocked&&(d.closeAt!==null&&d.closeAt>w.tick&&d.closeAt-w.tick<=(DOOR_CLOSE_DELAY*10+1)/10||w.tick<d.lastTouch+12))return false;
 for(const p of pawns){
  const at=position(p),next=p.motion&&p.motion.end>w.tick?p:p.path[0],canOpen=(isColonist(p)||!!p.visitor||p.prisoner?.releasedAt!==undefined||prisonBreakActive(p))&&(!p.prisoner||p.prisoner.releasedAt!==undefined||prisonBreakActive(p))&&(!d.forbidden||prisonBreakActive(p));
  if(p.state!=='downed'&&p.state!=='dead'&&canOpen&&Math.abs(at.x-s.x)+Math.abs(at.z-s.z)<=1&&(same(at,s)||!!next&&same(next,s)))return false;
 }
 return true;
}
export function captureHiveClosewalk256(w:World){
 const passage=new Map<number,boolean>();for(const s of w.structures)if(isPassageDoor(s.kind))passage.set(s.z*w.width+s.x,hiveDoorFreePassage256(w,s));
 const reach=captureGeographicGenerationReachability256(w,passage),capture=captureRandomClosewalk256(w,reach);
 const allowed=(r:ActualGenerationRegion256)=>r.type==='normal'||r.type==='portal'&&passage.get(r.cells[0]!)===true;
 return {reach,physical:capture.physical,tryCell(root:number,radius:number,random:Pick<WorldGenerationRandom,'integer'|'float'|'value'>,validator?:(cell:number)=>boolean){return tryRandomClosewalkCellNear256(capture,root,radius,random,validator,allowed);}};
}
