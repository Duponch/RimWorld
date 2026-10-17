/** Prospective climate equations, independently expressed from numeric Core
 * facts. Noise samples must come from the versioned world noise source at the
 * actual radius100 centre. This module never reads or changes a gameplay RNG. */
import {evaluateClimateCurve,remapWorldClimate,type WorldClimateSettings} from './world-climate-settings.ts';
import {surfaceVisibilityAxis,surfaceViewAngle,surfaceAngleDegrees,type SurfaceVector} from './world-surface-mesh.ts';
export type WorldRelief='flat'|'small-hills'|'large-hills'|'mountainous'|'impassable';
export interface WorldTerrainSamples {
 elevationMicro:number;elevationRidged:number;elevationMacroFactor:number;continents:number;
 temperatureOffset:number;rainfall:number;mountainLines:number;mountainHoles:number;
 hillMacro:number;hillMicro:number;swampMicro:number;swampMacro:number;
}
export interface WorldTerrainControls {continentBlend:number;microRidgedBlend:number}
export interface ReliefRandom {boolean():boolean;integer(min:number,maxExclusive:number):number}
export interface WorldEnvironment {
 latitude:number;longitude:number;elevation:number;temperature:number;rainfall:number;
 swampiness:number;hilliness:WorldRelief;
}
const f=Math.fround;
const clamp01=(n:number)=>Math.max(0,Math.min(1,n));
const blend=(a:number,b:number,control:number)=>{const weight=(control+1)/2;return (1-weight)*a+weight*b;};
const linear=(n:number,x0:number,x1:number,y0:number,y1:number)=>f(y0+f(f(f(n-x0)/f(x1-x0))*f(y1-y0)));
const inverse=(n:number,a:number,b:number)=>clamp01((n-a)/(b-a));
const reliefs=['flat','small-hills','large-hills','mountainous'] as const;
const TEMPERATURE_LATITUDE=[[0,30],[.1,29],[.5,7],[1,-37]] as const;
const RAIN_LATITUDE=[[0,1.12],[25,.94],[45,.7],[70,.3],[80,.05],[90,.05]] as const;
const SAMPLE_KEYS=['elevationMicro','elevationRidged','elevationMacroFactor','continents','temperatureOffset','rainfall','mountainLines','mountainHoles','hillMacro','hillMicro','swampMicro','swampMacro'] as const;
/** The border is an angular falloff. It never rescues a chosen start tile. */
function islandElevation(value:number,angleDegrees:number,viewDegrees:number):number {
 const inner=Math.max(2.5,f(.25*viewDegrees)),outer=Math.max(f(.8),f(f(.1)*viewDegrees));
 if(angleDegrees<f(viewDegrees-inner))return value;
 const edge=linear(angleDegrees,f(viewDegrees-inner),f(viewDegrees-outer),0,f(.62));
 const pivot=f(-.12);
 return value>pivot?pivot+(value-pivot)*f(1-f(f(.7)*edge))-f(f(.3)*edge):value-f(f(.3)*edge);
}
export function evaluateWorldEnvironment(center:SurfaceVector,settings:WorldClimateSettings,s:WorldTerrainSamples,controls:WorldTerrainControls,random:ReliefRandom):WorldEnvironment {
 if(!center.every(Number.isFinite)||Math.hypot(...center)===0||!Number.isFinite(controls.continentBlend)||!Number.isFinite(controls.microRidgedBlend))throw Error('Invalid world terrain input');
 for(const key of SAMPLE_KEYS)if(!Number.isFinite(s[key]))throw Error('Invalid world noise sample');
 const latitude=f(f(Math.asin(Math.max(-1,Math.min(1,f(center[1]/100)))))*f(57.29578));
 const longitude=f(f(Math.atan2(center[0],-center[2]))*f(57.29578)),axis=surfaceVisibilityAxis(settings.coverage);
 const angle=surfaceAngleDegrees(axis,center),view=surfaceViewAngle(settings.coverage);
 let continents=s.continents;
 if(settings.coverage<.55){const island=1-Math.min(1,angle/view);continents=blend(continents,2*island-1,f(.4));}
 const ridged=s.elevationRidged*(.5*s.elevationMacroFactor+.5);
 let elevationSignal=blend(blend(s.elevationMicro,ridged,controls.microRidgedBlend),continents,controls.continentBlend);
 if(settings.coverage<.9999)elevationSignal=islandElevation(elevationSignal,angle,view);
 const elevationGraph=(.5*elevationSignal+.5)**3*5500-500,elevation=f(elevationGraph);
 const latitudeTemperature=evaluateClimateCurve(TEMPERATURE_LATITUDE,f(Math.abs(latitude)/90));
 const cooling=f(clamp01(f(f(elevation-250)/4750))*40);
 const temperature=remapWorldClimate('temperature',settings.temperature,f(f(latitudeTemperature-cooling)+f(4*f(s.temperatureOffset))));
 const latitudeRain=evaluateClimateCurve(RAIN_LATITUDE,Math.abs(latitude));
 const altitudeFactor=f(.00022222222),altitudeBias=f(-500*altitudeFactor);
 let rain=Math.max(0,(.5*s.rainfall+.5)*latitudeRain*clamp01(1-(elevationGraph*altitudeFactor+altitudeBias)));
 if(rain<.12)rain=(rain+.12)/2;
 if(rain<.03)rain=(rain+.03)/2;
 const rainfallGraph=remapWorldClimate('rainfall',settings.rainfall,Math.max(0,Math.min(999,rain**1.5))*4000),rainfall=f(rainfallGraph);
 const mountainSignal=f(1-(1-Math.abs(s.mountainLines))*(s.mountainHoles>=f(-.3)&&s.mountainHoles<=1?1:0));
 let hilliness:WorldRelief;
 if(elevation<=0||mountainSignal>f(.235)){
  hilliness=elevation>0&&f(s.hillMicro)>f(.46)&&f(s.hillMacro)>f(-.3)?(random.boolean()?'small-hills':'large-hills'):'flat';
 }else if(mountainSignal>f(.12)){
  const draw=random.integer(0,4);if(!Number.isInteger(draw)||draw<0||draw>3)throw Error('Invalid relief random result');
  hilliness=reliefs[draw]!;
 }else hilliness=mountainSignal>f(.0363)?'mountainous':'impassable';
 const swampiness=hilliness==='flat'||hilliness==='small-hills'
  ?(.5*s.swampMicro+.5)*(.5*s.swampMacro+.5)*inverse(elevationGraph,750,650)*inverse(rainfallGraph,725,900):0;
 return {latitude,longitude,elevation,temperature:f(temperature),rainfall,swampiness:f(swampiness),hilliness};
}
