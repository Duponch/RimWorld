/** Scalar road-generation facts with original identifiers and no copied prose/assets. */
import type {WorldRoadId} from './world-roads.ts';
export type LocalRoadSurface256='bridge'|'packed-dirt'|'regional-flagstone'|'gravel'|'broken-asphalt';
export type LocalRoadProp256='ancient-road-barrier'|'ancient-road-lamp';
export interface LocalRoadStep256 {
 readonly target:LocalRoadSurface256|LocalRoadProp256|'bulldoze';
 readonly curve:readonly (readonly [number,number])[];
 readonly antialias:number; readonly onlyOrigin:boolean;
 readonly suppressWater:boolean; readonly spacing:number; readonly proximity:number;
}
export interface LocalRoadDefinition256 {
 readonly priority:number;readonly tilesPerSegment:number;readonly avoid:boolean;
 readonly steps:readonly LocalRoadStep256[];
}
const step=(target:LocalRoadStep256['target'],curve:LocalRoadStep256['curve'],
 antialias=1,onlyOrigin=false,suppressWater=false,spacing=0,proximity=0):LocalRoadStep256=>
 ({target,curve,antialias,onlyOrigin,suppressWater,spacing,proximity});
const bridge=(width:number)=>step('bridge',[[width,1],[width,0]],0,true);
export const LOCAL_ROAD_DEFINITIONS_256:Readonly<Record<WorldRoadId,LocalRoadDefinition256>>={
 'dirt-path':{priority:10,tilesPerSegment:15,avoid:true,steps:[
  bridge(1.1),step('packed-dirt',[[0,.9],[.6,.8],[.8,0]])]},
 'dirt-road':{priority:20,tilesPerSegment:15,avoid:true,steps:[
  bridge(1.4),step('packed-dirt',[[0,.9],[1.2,.8],[1.4,0]])]},
 'stone-road':{priority:30,tilesPerSegment:25,avoid:true,steps:[
  bridge(1.8),step('regional-flagstone',[[0,1],[1.8,1],[1.8,0]],0)]},
 'ancient-asphalt-road':{priority:40,tilesPerSegment:100,avoid:false,steps:[
  bridge(1.8),step('gravel',[[0,.8],[1.4,.8],[2,0]],1,false,true),
  step('broken-asphalt',[[0,.8],[1.4,.6],[1.8,0]]),
  step('ancient-road-barrier',[[0,.001],[2.2,.001],[2.3,.5],[2.5,0]],1,false,true),
  step('ancient-road-lamp',[[0,0],[1.8,0],[2.3,.4],[2.9,0]],1,false,true,12,4)]},
 'ancient-asphalt-highway':{priority:50,tilesPerSegment:400,avoid:false,steps:[
  step('bulldoze',[[0,1],[4,1],[4,0]]),bridge(3),
  step('gravel',[[0,.8],[2.8,.8],[3.2,0]],1,false,true),
  step('broken-asphalt',[[0,.9],[2.6,.8],[3,0]]),
  step('ancient-road-barrier',[[0,.003],[3.5,.003],[3.6,1],[3.7,0]],1,false,true),
  step('ancient-road-lamp',[[0,0],[3,0],[3.5,.8],[4,0]],1,false,true,8,4)]},
};
export const LOCAL_ROAD_PROP_FACTS_256={
 'ancient-road-barrier':{hitPoints:500,startingHp:[.5,1.3],pathCost:42,
  fill:.5,ignoreRepeatPathCost:true,impassable:false,rotatable:true,
  flammability:0,beauty:-10,work:600,steelCost:15},
 'ancient-road-lamp':{hitPoints:300,startingHp:[.5,1.3],pathCost:42,
  fill:.25,ignoreRepeatPathCost:false,impassable:false,rotatable:false,
  flammability:0,beauty:0,work:400,steelCost:15},
} as const;
