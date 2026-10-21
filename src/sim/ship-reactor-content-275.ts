import type {Cell,Orientation} from './types.ts';

/** Core1.6.4871rev590 XML physical facts. Startup and raid ownership live in
 * their own authorities; the electrical plant does not wait for startup. */
export const SHIP_RESEARCH_POINTS_275=Object.freeze({basics:4000,reactor:6000});
export const SHIP_RESEARCH_PROJECTS_275=Object.freeze(['ship-basics','ship-reactor'] as const);
export const isShipResearchProject275=(value:unknown):value is typeof SHIP_RESEARCH_PROJECTS_275[number]=>value==='ship-basics'||value==='ship-reactor';
export const SHIP_REACTOR_CONSTRUCTION_275=Object.freeze({
 ingredients:Object.freeze([{item:'steel' as const,quantity:350},{item:'plasteel' as const,quantity:280},{item:'uranium' as const,quantity:70},{item:'advanced-component' as const,quantity:8}].map(p=>Object.freeze(p))),
 work:6500,coreWork:65000,
});
export const SHIP_REACTOR_PHYSICS_275=Object.freeze({width:6,depth:7,constructionSkill:8,maxHitPoints:500,flammability:0,support:'Heavy' as const,rotatable:true,defaultOrientation:1 as Orientation,blocksMovement:true,blocksLight:true,blocksWind:true,minifiable:false,quality:false,roof:false,powerWatts:1000,transmitsPower:true,fuel:false,flick:false,breakdown:false,leavesResourcesWhenKilled:true});

/** Native occupied rectangle about the stored Position, including the even
 * dimension's one-cell shift under rotation. No historical shape is changed. */
export function shipReactorRect275(at:Cell,rotation:Orientation=SHIP_REACTOR_PHYSICS_275.defaultOrientation):{x:number;z:number;width:number;depth:number} {
 const horizontal=rotation===1||rotation===3;
 return {x:at.x+(rotation===0?-2:-3),z:at.z+(rotation===3?-2:-3),width:horizontal?7:6,depth:horizontal?6:7};
}
export function shipReactorContains275(at:Cell,cell:Cell,rotation:Orientation=SHIP_REACTOR_PHYSICS_275.defaultOrientation):boolean {
 const horizontal=rotation===1||rotation===3,dx=cell.x-at.x,dz=cell.z-at.z,minX=rotation===0?-2:-3,minZ=rotation===3?-2:-3;
 return dx>=minX&&dx<minX+(horizontal?7:6)&&dz>=minZ&&dz<minZ+(horizontal?6:7);
}
export function shipReactorCells275(at:Cell,rotation:Orientation=SHIP_REACTOR_PHYSICS_275.defaultOrientation):Cell[] {
 const rect=shipReactorRect275(at,rotation);
 return Array.from({length:42},(_,i)=>({x:rect.x+i%rect.width,z:rect.z+Math.floor(i/rect.width)}));
}
