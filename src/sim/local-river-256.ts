/** Generation-only river centreline/depth and terrain decisions. Actual
 * mutator init and post-terrain streams are supplied separately: a node is
 * born during the later step, not while the bend fields are initialized. */
import {WorldGenerationRandom} from './world-generation-random.ts';
import {createWorldPerlin} from './world-coherent-noise.ts';
import {NATURAL_TERRAIN_DEFINITIONS_256,NATURAL_TERRAIN_BINDINGS_256,type NaturalTerrainId256} from './local-terrain-definitions-256.ts';
import type {LocalBiomeRules256} from './local-biome-rules-v256.ts';
const f=Math.fround;
export interface RiverPoint256 {x:number;z:number}
export interface LocalRiverNoisePlan256 {width:number;height:number;center:RiverPoint256;bendSeed:number;shallowSeed:number;bankSeed:number;widthSeed:number}
export interface LocalRiverNode256 {start:RiverPoint256;end:RiverPoint256;width:number;seed:number}
function dimensions(width:number,height:number){if(!Number.isInteger(width)||!Number.isInteger(height)||width<8||height<8||width>400||height>400)throw Error('Invalid actual river dimensions');}
export function localRiverNoisePlan256(width:number,height:number,random:WorldGenerationRandom):LocalRiverNoisePlan256 {
 dimensions(width,height);return {width,height,center:{x:Math.trunc(f(random.float(.3,.7)*width)),z:Math.trunc(f(random.float(.3,.7)*height))},bendSeed:random.integerValue(),shallowSeed:random.integerValue(),bankSeed:random.integerValue(),widthSeed:random.integerValue()};
}
const dot=(a:RiverPoint256,b:RiverPoint256)=>f(f(a.x*b.x)+f(a.z*b.z));
const minus=(a:RiverPoint256,b:RiverPoint256):RiverPoint256=>({x:f(a.x-b.x),z:f(a.z-b.z)});
const length=(a:RiverPoint256)=>f(Math.sqrt(dot(a,a)));
const normalize=(a:RiverPoint256):RiverPoint256=>{const n=length(a);return n>f(1e-5)?{x:f(a.x/n),z:f(a.z/n)}:{x:0,z:0};};
function roundEven(value:number):number {const lower=Math.floor(value),fraction=value-lower;return fraction<.5?lower:fraction>.5?lower+1:lower%2===0?lower:lower+1;}
export function localRiverNode256(plan:LocalRiverNoisePlan256,heading:number,riverWidth:number,postTerrainRandom:WorldGenerationRandom):LocalRiverNode256 {
 dimensions(plan.width,plan.height);if(!Number.isFinite(heading)||heading<0||heading>=360||![4,6,14,30].includes(riverWidth)||!Number.isInteger(plan.center.x)||!Number.isInteger(plan.center.z)||plan.center.x<0||plan.center.x>=plan.width||plan.center.z<0||plan.center.z>=plan.height)throw Error('Invalid actual visible river');
 const angle=f(f(f(450-heading)%360)*f(Math.PI/180)),slope=f(Math.tan(angle)),{x,z}=plan.center,left=-25,right=plan.width+25,bottom=-25,top=plan.height+25,points:RiverPoint256[]=[];
 const keep=(p:RiverPoint256)=>{if(p.x>=left&&p.x<=right&&p.z>=bottom&&p.z<=top)points.push(p);};
 keep({x:left,z:f(f(slope*f(left-x))+z)});keep({x:right,z:f(f(slope*f(right-x))+z)});
 if(slope!==0){keep({x:f(f(f(bottom-z)/slope)+x),z:bottom});keep({x:f(f(f(top-z)/slope)+x),z:top});}
 if(points.length<2)throw Error('Visible river misses its padded map rectangle');
 const a=points[0]!,b=points[1]!,direction=minus(b,a),flatAngle=f(f(Math.atan2(direction.x,direction.z))*f(180/Math.PI)),normalizedAngle=(flatAngle+360)%360;
 const forward=roundEven(f(normalizedAngle-heading))%360===0;
 return {start:forward?a:b,end:forward?b:a,width:riverWidth,seed:postTerrainRandom.integerValue()};
}
function field(frequency:number,persistence:number,octaves:number,seed:number){const noise=createWorldPerlin({frequency:f(frequency),lacunarity:2,persistence,octaves,seed,quality:'medium'});return (x:number,z:number)=>f(noise(x,0,z));}
export function createLocalRiverField256(plan:LocalRiverNoisePlan256,node:LocalRiverNode256){
 dimensions(plan.width,plan.height);if(![4,6,14,30].includes(node.width)||![plan.bendSeed,plan.shallowSeed,plan.bankSeed,plan.widthSeed,node.seed].every(n=>Number.isInteger(n)&&n>=-2147483648&&n<=2147483647)||![node.start.x,node.start.z,node.end.x,node.end.z].every(Number.isFinite))throw Error('Invalid river scalar plan');
 const bend=createWorldPerlin({frequency:f(.007),lacunarity:2,persistence:1,octaves:2,seed:plan.bendSeed,quality:'medium'}),shallow=field(.03,.5,3,plan.shallowSeed),bank=field(.03,2,2,plan.bankSeed),widthNoise=createWorldPerlin({frequency:f(.02),lacunarity:2,persistence:1,octaves:3,seed:plan.widthSeed,quality:'medium'}),direction=minus(node.end,node.start),distance=length(direction),normal=normalize({x:-direction.z,z:direction.x}),factor=f(6/node.width),squared=dot(direction,direction);
 if(squared===0)throw Error('Zero-length actual river node');
 function displaced(t:number):RiverPoint256 {
  t=f(t);const amplitude=f(f(-4*f(t*t))+f(4*t)),along=f(t*distance),value=f(bend(f(along*factor),0,node.seed)),amount=f(value*40);
  return {x:f(f(node.start.x+f(t*direction.x))+f(f(amount*normal.x)*amplitude)),z:f(f(node.start.z+f(t*direction.z))+f(f(amount*normal.z)*amplitude))};
 }
 // This Core call site passes Vector2, implicitly converted to Vector3(x,z,0),
 // unlike IntVec3 terrain samples (x,0,z). The axes are observably different.
 const halfWidth=(x:number,z:number)=>f(f(node.width/2)*f(1+f(f(f(widthNoise(x,z,0))*f(.15))*factor)));
 return {displaced,halfWidth,sample(x:number,z:number){
  const position={x:f(x),z:f(z)},t=f(dot(minus(position,node.start),direction)/squared);let depth=-3.4028234663852886e38;
  if(t>=0&&t<=1){const point=displaced(t),previous=displaced(f(t-f(.001))),tangent=normalize(minus(previous,point)),perpendicular={x:-tangent.z,z:tangent.x},width=halfWidth(x,z);
   depth=f(width-Math.abs(dot(minus(position,point),perpendicular)));
  }
  return {depth,width:node.width,shallow:Math.abs(shallow(x,z)),bank:bank(x,z)};
 }};
}
export interface LocalRiverSample256 {depth:number;width:number;shallow:number;bank:number}
export function riverTerrainDecision256(existing:NaturalTerrainId256,edifice:boolean,sample:LocalRiverSample256,rules:LocalBiomeRules256):{terrain?:NaturalTerrainId256;elevation?:-1;destroyEdifice:boolean;clearRoof:boolean;collapseRoof:boolean} {
 if(![sample.depth,sample.width,sample.shallow,sample.bank].every(Number.isFinite)||![4,6,14,30].includes(sample.width))throw Error('Invalid actual river sample');
 const current=NATURAL_TERRAIN_DEFINITIONS_256[existing],range=rules.terrainOverrides.riverbankSizeRange?.split('~').map(Number)??[6,8],bankWidth=range[0]!+roundEven(f(sample.bank*f(range[1]!-range[0]!))),caveBank=f(bankWidth*f(.3)),destroyEdifice=edifice&&sample.depth> -caveBank,clearRoof=sample.depth> -caveBank&&sample.width>20;
 const result:{terrain?:NaturalTerrainId256;elevation?:-1;destroyEdifice:boolean;clearRoof:boolean;collapseRoof:boolean}={destroyEdifice,clearRoof,collapseRoof:destroyEdifice&&!clearRoof};
 if(!current.water||current.river||existing==='marsh'){
  const terrain=sample.depth>4&&sample.shallow>f(.2)?rules.terrainOverrides.waterMovingChestDeepTerrain??'WaterMovingChestDeep':sample.depth>0?rules.terrainOverrides.waterMovingShallowTerrain??'WaterMovingShallow':undefined;
  if(terrain!==undefined){result.terrain=NATURAL_TERRAIN_BINDINGS_256[terrain];result.elevation=-1;return result;}
 }
 if(!edifice&&(!current.water||existing==='marsh')&&rules.terrainsByFertility.some(row=>NATURAL_TERRAIN_BINDINGS_256[row.terrain]===existing)&&sample.depth> -bankWidth)result.terrain=NATURAL_TERRAIN_BINDINGS_256[rules.terrainOverrides.riverbankTerrain??'Riverbank'];
 return result;
}
