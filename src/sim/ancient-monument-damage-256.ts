/** Generation-plan damage. No World, ID allocation, leavings or clinical hit. */
import type {WorldGenerationRandom} from './world-generation-random.ts';
export interface MonumentDamageThing256 {type:'thing';kind:string;x:number;z:number;hitPoints:number;maxHitPoints:number}
export interface MonumentDamageFloor256 {type:'floor';kind:string;x:number;z:number;burnedKind?:string}
export type MonumentDamageBuildable256=MonumentDamageThing256|MonumentDamageFloor256;
export interface MonumentDamageRect256 {minX:number;minZ:number;maxX:number;maxZ:number}
export type MonumentRandom256=Pick<WorldGenerationRandom,'integer'|'float'|'value'|'boolean'>;
const f=Math.fround;
const even=(n:number)=>{const a=Math.floor(n),t=n-a;return t===.5?a%2?a+1:a:Math.round(n);};
/** Lazy swap-with-last order: RNG is consumed only as the loop progresses.
 * DamageBuildings materializes the whole order before processing it. */
export function* monumentRandomOrder256<T>(source:readonly T[],random:Pick<MonumentRandom256,'integer'>):Generator<T> {
 const pool=[...source];for(let left=pool.length;left>0;left--){const i=random.integer(0,left);yield pool[i]!;pool[i]=pool[left-1]!;}
}
export function damageAncientMonument256<T extends MonumentDamageBuildable256>(source:readonly T[],rect:MonumentDamageRect256,random:MonumentRandom256,exponent=f(1.32)):{buildables:(T|MonumentDamageFloor256)[];destroyed:number;direction:number} {
 const width=rect.maxX-rect.minX+1,depth=rect.maxZ-rect.minZ+1;
 if(!Number.isInteger(width)||!Number.isInteger(depth)||width<=0||depth<=0||!Number.isFinite(exponent)||exponent<=0)throw Error('Invalid ancient damage rectangle');
 for(const b of source)if(!Number.isInteger(b.x)||!Number.isInteger(b.z)||b.type==='thing'&&(!Number.isSafeInteger(b.maxHitPoints)||b.maxHitPoints<1))throw Error('Invalid actual ancient buildable');
 const direction=random.integer(0,4),order=[...monumentRandomOrder256(source,random)],kept=new Set<MonumentDamageBuildable256>(source),copies=new Map<MonumentDamageBuildable256,MonumentDamageBuildable256>();let destroyed=0;
 const at=(x:number,z:number,kind:string)=>[...kept].some(b=>b.type==='thing'&&b.kind===kind&&b.x===x&&b.z===z);
 for(const b of order){
  // Removed disconnected doors remain in the materialized traversal, just as
  // the original detached sketch object does; Remove then becomes a no-op.
  let exposure=f((direction%2?b.x-rect.minX:b.z-rect.minZ)/(direction%2?width:depth));
  if(direction===1||direction===2)exposure=f(1-exposure);
  const chance=f(Math.pow(exposure,exponent));
  if(chance>=1||chance>0&&random.value()<chance){
   kept.delete(b);destroyed++;
   if(b.type==='floor'&&b.burnedKind){const burned:MonumentDamageFloor256={type:'floor',kind:b.burnedKind,x:b.x,z:b.z};kept.add(burned);}
   for(const [dx,dz] of [[0,1],[1,0],[0,-1],[-1,0]])for(const door of [...kept])if(door.type==='thing'&&door.kind==='door'&&door.x===b.x+dx!&&door.z===b.z+dz!&&![[0,1],[1,0],[0,-1],[-1,0]].some(([a,c])=>at(door.x+a!,door.z+c!,'wall')))kept.delete(door);
   if(destroyed>f(f(source.length)*f(.65)))break;
  }else if(b.type==='thing'){
   const hp=even(f(f(f(b.maxHitPoints)*f(1-exposure))*random.float(1,f(1.2))));
   copies.set(b,{...b,hitPoints:Math.max(1,Math.min(b.maxHitPoints,hp))});
  }
 }
 return {buildables:[...kept].map(b=>(copies.get(b)??{...b}) as T|MonumentDamageFloor256),destroyed,direction};
}
