import type {Pawn} from './types.ts';
import type {AwayGroup,GroupTravelCapture} from './group-capture.ts';
import type {GroupSegment,GroupState,GroupStop} from './group-state.ts';
import type {PlanetState} from './planet-state.ts';
import {planetEdgeCost,tileHour,validPlanetRoute,type PlanetCostContext} from './planet-navigation.ts';
import {isColonist} from './affiliation.ts';
import {hasMentalBreak} from './mental-state.ts';
const f=Math.fround;
/** Current human ownership, never mere faction colour or capacity of any one
 * passenger. Animal owners are an explicit separate raccord. */
export const groupPlayerOwner256=(p:Pawn):boolean=>isColonist(p)&&!p.prisoner&&!p.visitor&&(!p.worldAffiliation259||p.worldAffiliation259.hostFactionId===null&&p.worldAffiliation259.guestStatus==='Guest')&&p.state!=='dead'&&!p.health?.death;
export function groupOwnersCannotMove256(members:readonly Pawn[]):readonly number[] {
 const owners=members.filter(groupPlayerOwner256);
 return !owners.length||owners.every(p=>p.state==='downed')||owners.every(hasMentalBreak)?owners.map(p=>p.id):[];
}
export function validProspectiveGroupSegment256(s:GroupSegment,version=256):boolean {
 if(!Number.isSafeInteger(s.from)||s.from<0||!Number.isSafeInteger(s.to)||s.to<0||![s.totalCore,s.remainingCore].every(v=>Number.isFinite(v)&&Math.abs(v)<=Number.MAX_SAFE_INTEGER&&f(v)===v)||s.totalCore<=0||s.remainingCore>s.totalCore)return false;
 // Reform applies the signed retained fraction to the NEW cost. Its legitimate
 // negative result may exceed one ordinary overshoot; never clamp paid progress.
 return s.remainingCore>=(version>=261?-f(s.totalCore*16):-f(f(Math.max(1,f(s.totalCore/30000)))*16));
}
export interface GroupRouteIntervalContext256 {
 version?:number;
 /** Existing actual mass capture, shared by overload and cost. */
 travel:GroupTravelCapture;cost:PlanetCostContext;deltaCore:number;
 /** Query the real destination world object/settlement registry. */
 validFinalPushDestination(tile:number):boolean;
}
export type GroupRouteIntervalResult256={state:GroupState;event:'arrived'|null};
/** Prospective callback for MotionRuntime.beforeTween. One delta payment,
 * never delta fake PatherTick calls; the old group-trip kernel stays literal. */
export function advanceGroupRouteInterval256(planet:PlanetState,g:AwayGroup,c:GroupRouteIntervalContext256):GroupRouteIntervalResult256 {
 if(!Number.isSafeInteger(c.deltaCore)||c.deltaCore<1||c.deltaCore>16||c.cost.mass!==c.travel.mass)throw Error('Invalid caravan route interval');
 if(g.phase!=='travelling')return {state:g,event:null};
 const halt=(stop:GroupStop):GroupRouteIntervalResult256=>({state:{...g,stop},event:null});
 if(g.paused)return halt({kind:'paused'});
 const owners=g.members.filter(groupPlayerOwner256),incapable=groupOwnersCannotMove256(g.members);
 if(!owners.length)throw Error('Caravan has no real player owner');
 if(incapable.length)return halt({kind:'incapacity',pawnIds:[...incapable]});
 if(c.travel.mass.grams>c.travel.mass.capacityGrams)return halt({kind:'overload',grams:c.travel.mass.grams,capacityGrams:c.travel.mass.capacityGrams});
 const boundary=g.segment?.to??g.tile;
 if(!validPlanetRoute(planet,g.route,boundary,g.destination))return halt({kind:'unreachable',destination:g.destination});
 const finalPush=!!g.segment&&g.segment.to===g.destination&&c.validFinalPushDestination(g.destination)&&Math.ceil(g.segment.remainingCore)<=10000;
 const hour=tileHour(planet,g.tile,c.cost.homeCivilCore);
 if(c.travel.anyRestNeed&&(hour<6||hour>22)&&!finalPush)return halt({kind:'night'});
 if(g.segment){
  if(!validProspectiveGroupSegment256(g.segment,c.version))throw Error('Invalid prospective caravan segment');
  if(g.segment.remainingCore>0){const payment=f(f(Math.max(1,f(g.segment.totalCore/30000)))*c.deltaCore);
   return {state:{...g,stop:null,segment:{...g.segment,remainingCore:f(g.segment.remainingCore-payment)}},event:null};}
 }
 const at:AwayGroup=g.segment?{...g,tile:g.segment.to,segment:null,stop:null}:g;
 if(at.tile===at.destination){const phase=at.tile===planet.homeTile?'awaiting-entry':'at-site';return {state:{...at,phase,stop:{kind:phase},route:[at.tile],segment:null},event:'arrived'};}
 const to=at.route[1],cost=to===undefined?undefined:planetEdgeCost(planet,at.tile,to,c.cost);
 if(to===undefined||cost===undefined)return {state:{...at,stop:{kind:'unreachable',destination:at.destination}},event:null};
 const totalCore=f(cost),segment={from:at.tile,to,totalCore,remainingCore:totalCore};
 if(!validProspectiveGroupSegment256(segment))throw Error('Invalid caravan edge cost');
 return {state:{...at,route:at.route.slice(1),segment,stop:null},event:null};
}
