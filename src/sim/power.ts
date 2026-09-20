import { PowerTopologyCache, bestPowerParent, validPowerParent, connectedPowerGroups } from './power-topology.ts';
import { powerWatts,powerPotential,isPowerTrader } from './power-rules.ts';
import { isPowerConnector } from './power-grid.ts';
import { BATTERY_START_RESERVE,BATTERY_START_THRESHOLD,batteryQuanta,leakBattery,chargeBatteries,dischargeBatteries,type BatteryOwner } from './power-battery.ts';
import type { World, Structure } from './types.ts';

const owners=new WeakMap<World,PowerTopologyCache>();
function cache(world:World):PowerTopologyCache {let c=owners.get(world);if(!c){c=new PowerTopologyCache();owners.set(world,c);}return c;}
/** Retain a valid parent, including when its source runs out of fuel. */
export function reconcilePower(world:World):void {
  if(!world.structures.some(s=>s.power))return;
  const topology=cache(world).read(world);
  for(const s of world.structures)if(isPowerConnector(s.kind)&&s.power) {
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
const wantsPower=(s:Structure):boolean=>isPowerTrader(s.kind)&&s.power!.switchOn!==false&&(s.kind!=='wood-generator'||!!s.fuel?.ticks);
/** Core's gradual randomized startup/shedding. Ten small
 * reference-time boundaries avoid aliased modulo periods (e.g. 200/6 = 33).
 * Our random stream and integer W are independent of Unity's implementation. */
export function advancePower(world:World):void {
  reconcilePower(world);
  const batteries=[...world.structures,...world.packed.map(p=>p.building)].filter((s):s is Structure&BatteryOwner=>!!s.battery);
  if(!world.structures.some(s=>s.power)&&!batteries.length)return;
  // No actor/fuel mutation occurs inside this call. Balanced fully active
  // networks cannot change on a reference boundary: skip their ten temporary
  // candidate scans while preserving the order of RNG draws for every other net.
  const groups=connectedPowerGroups(world,cache(world).read(world)).filter(parts=>
    parts.some(s=>s.battery||!s.power!.on&&wantsPower(s))||parts.reduce((n,s)=>n+powerWatts(s,world),0)<0)
    .map(parts=>({parts:parts.filter(s=>isPowerTrader(s.kind)),storage:parts.filter((s):s is Structure&BatteryOwner=>!!s.battery)}));
  for(let sub=0;sub<10;sub++) {
    const coreTick=(world.tick-1)*10+sub+1;
    for(const battery of batteries)leakBattery(battery.battery);
    for(const {parts,storage} of groups) {
      let balance=parts.reduce((n,s)=>n+powerWatts(s,world),0);
      const stored=storage.reduce((n,s)=>n+batteryQuanta(s.battery),0);
      if(stored+balance*2>=0) {
        const available=stored-(storage.length&&stored>=BATTERY_START_THRESHOLD?BATTERY_START_RESERVE:0);
        const waiting=available+balance*2>=0?parts.filter(s=>!s.power!.on&&wantsPower(s)):[];
        if(waiting.length&&coreTick%Math.max(30,Math.floor(200/waiting.length))===0)for(let n=0;n<Math.max(1,roundEven(waiting.length*.05));n++) {
          const s=randomPart(world,waiting),cost=-powerPotential(s,world);
          if(!s.power!.on&&stored+balance*2>=cost*2){s.power!.on=true;balance-=cost;}
        }
        if(balance>0)chargeBatteries(storage,balance,coreTick);
        else if(balance<0)dischargeBatteries(storage,-balance*2,coreTick);
      } else if(coreTick%20===0) {
        const active=parts.filter(s=>powerWatts(s,world)<0);
        for(let n=0;n<Math.max(1,roundEven(active.length*.05))&&active.length;n++)randomPart(world,active).power!.on=false;
      }
    }
  }
}
