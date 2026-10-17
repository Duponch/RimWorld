/** Original Core4871 one-sided mountain falloff. It is applied before caves
 * and coastline elevation, not an independently generated rock rectangle. */
import {WorldGenerationRandom} from './world-generation-random.ts';
import {createWorldPerlin} from './world-coherent-noise.ts';
const f=Math.fround;
export interface LocalMountainPlan256 {width:number;height:number;angle:number;seed:number}
export function localMountainPlan256(width:number,height:number,oceanCoast:number|null,lakeCoast:number|null,random:WorldGenerationRandom):LocalMountainPlan256 {
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<8||height<8||width>400||height>400||[oceanCoast,lakeCoast].some(a=>a!==null&&(!Number.isFinite(a)||a<0||a>=360)))throw Error('Invalid actual mountain orientation');
 return {width,height,angle:oceanCoast??lakeCoast??random.integer(0,360),seed:random.integerValue()};
}
export function createLocalMountainField256(plan:LocalMountainPlan256):(x:number,z:number)=>number {
 if(!Number.isInteger(plan.width)||!Number.isInteger(plan.height)||plan.width<8||plan.height<8||plan.width>400||plan.height>400||!Number.isFinite(plan.angle)||plan.angle<0||plan.angle>=360||!Number.isInteger(plan.seed)||plan.seed< -2147483648||plan.seed>2147483647)throw Error('Invalid actual mountain plan');
 const frequency=f(.003),a=createWorldPerlin({frequency,lacunarity:2,persistence:.5,octaves:2,seed:plan.seed,quality:'medium'}),b=createWorldPerlin({frequency,lacunarity:2,persistence:.5,octaves:2,seed:(plan.seed+1)|0,quality:'medium'}),angle=plan.angle*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle),span=f(plan.width*f(.15)),offset=f(-plan.width*f(.2));
 return (x,z)=>{const px=x+a(x,0,z)*20+f(-plan.width/2),pz=z+b(x,0,z)*20+f(-plan.height/2),position=cos*px+sin*pz+offset;return f(Math.min(1,Math.max(0,(position/span)*.5+.5)));};
}
export function mountainElevation256(existing:number,falloff:number,waterCovered:boolean):number {
 if(!Number.isFinite(existing)||!Number.isFinite(falloff)||falloff<0||falloff>1||typeof waterCovered!=='boolean')throw Error('Invalid actual mountain elevation');
 return Math.min(f(existing+falloff),waterCovered?0:3.4028234663852886e38);
}
