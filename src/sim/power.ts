import { PowerTopologyCache, bestPowerParent, validPowerParent, connectedPowerGroups } from './power-topology.ts';
import { powerWatts } from './power-rules.ts';
import type { World, Structure } from './types.ts';

const owners=new WeakMap<World,PowerTopologyCache>();
function cache(world:World):PowerTopologyCache {let c=owners.get(world);if(!c){c=new PowerTopologyCache();owners.set(world,c);}return c;}
/** Retain a valid parent, including when its source runs out of fuel. */
export function reconcilePower(world:World):void {
  if(!world.structures.some(s=>s.power))return;
  const topology=cache(world).read(world);
  for(const s of world.structures)if(s.kind==='standing-lamp'&&s.power) {
    const p=s.power;
    if(p.parentId===null||!validPowerParent(topology,s,p.parentId)) {
      const parent=bestPowerParent(topology,s);
      if(parent!==p.parentId){p.parentId=parent;p.on=false;}
      if(parent===null)p.on=false;
    }
  }
}
function randomPart(world:World,parts:Structure[]):Structure {
  let n=world.rng;n^=n<<13;n^=n>>>17;n^=n<<5;world.rng=n>>>0;
  return parts[Math.floor(world.rng/0x100000000*parts.length)]!;
}
function roundEven(n:number):number {const f=Math.floor(n);return n-f===.5?f+f%2:Math.round(n);}
/** Core's gradual randomized startup/shedding, without batteries. Ten small
 * reference-time boundaries avoid aliased modulo periods (e.g. 200/6 = 33).
 * Our random stream and integer W are independent of Unity's implementation. */
export function advancePower(world:World):void {
  reconcilePower(world);
  if(!world.structures.some(s=>s.power))return;
  // No actor/fuel mutation occurs inside this call. Balanced fully active
  // networks cannot change on a reference boundary: skip their ten temporary
  // candidate scans while preserving the order of RNG draws for every other net.
  const groups=connectedPowerGroups(world,cache(world).read(world)).filter(parts=>
    parts.some(s=>!s.power!.on&&(s.kind!=='wood-generator'||!!s.fuel?.ticks))||parts.reduce((n,s)=>n+powerWatts(s),0)<0);
  for(let sub=0;sub<10;sub++) {
    const coreTick=(world.tick-1)*10+sub+1;
    for(const parts of groups) {
      let balance=parts.reduce((n,s)=>n+powerWatts(s),0);
      if(balance>=0) {
        const waiting=parts.filter(s=>!s.power!.on&&(s.kind!=='wood-generator'||!!s.fuel?.ticks));
        if(!waiting.length||coreTick%Math.max(30,Math.floor(200/waiting.length)))continue;
        for(let n=0;n<Math.max(1,roundEven(waiting.length*.05));n++) {
          const s=randomPart(world,waiting),cost=s.kind==='wood-generator'?-1000:30;
          if(!s.power!.on&&balance>=cost){s.power!.on=true;balance-=cost;}
        }
      } else if(coreTick%20===0) {
        const active=parts.filter(s=>powerWatts(s)<0);
        for(let n=0;n<Math.max(1,roundEven(active.length*.05))&&active.length;n++)randomPart(world,active).power!.on=false;
      }
    }
  }
}
