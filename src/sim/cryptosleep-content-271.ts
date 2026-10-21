import type {Cell,Orientation} from './types.ts';

/** Ordinary player casket, Core1.6.4871rev590. Pure physical/construction facts;
 * the live holder, clinical suspension and actions have separate authorities. */
export const CRYPTOSLEEP_RESEARCH_POINTS_271=2000;
export const CRYPTOSLEEP_CONSTRUCTION_271=Object.freeze({
 ingredients:Object.freeze([{item:'steel' as const,quantity:180},{item:'uranium' as const,quantity:5},{item:'component' as const,quantity:4},{item:'advanced-component' as const,quantity:1}].map(p=>Object.freeze(p))),
 work:320,coreWork:3200,
});
export const CRYPTOSLEEP_PHYSICS_271=Object.freeze({width:1,depth:2,constructionSkill:8,maxHitPoints:250,flammability:.5,support:'Medium' as const,pathCostCore:42,rotatable:true,minifiable:false,quality:false,power:false});
const directions=[[0,1],[1,0],[0,-1],[-1,0]] as const;
export function cryptosleepCells271(at:Cell,rotation:Orientation):Cell[]{
 const [dx,dz]=directions[rotation];return [{x:at.x,z:at.z},{x:at.x+dx,z:at.z+dz}];
}
