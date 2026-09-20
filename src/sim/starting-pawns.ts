import { startingSkills } from './skills.ts';
import { initialRecreation } from './recreation-rules.ts';
import { defaultSchedule } from './schedule.ts';
import type { Pawn } from './types.ts';

/** Keep actor allocation outside the terrain generator's hot nested loops.
 * In Node 24.11.1/V8 13.6, optimized literal allocation there reproduced shared
 * mutable numeric defaults across successive worlds. This small factory also
 * keeps scenario profiles separate from terrain/geology generation. */
export function startingPawn(id:number,name:string,x:number,z:number,index:number,recreation:number):Pawn {
  return {
    medicalCare:'industrial',skills:startingSkills(index),recreation:initialRecreation(recreation),foodPolicyId:1,
    schedule:defaultSchedule(),restZeroTicks:0,collapsePending:false,id,name,x,z,
    hunger:90-index*5,rest:90-index*3,mood:80,comfort:50,memories:[],
    orders:{active:null,queue:[]},jobId:null,haul:null,cooking:null,need:null,bedId:null,
    needCooldown:0,state:'idle',
    priorities:{basic:3,hunt:2,research:3,patient:1,bedrest:3,doctor:1,mine:2,gather:2,build:2,haul:3,grow:2,cook:2,craft:2},
    path:[],moveCooldown:0,planCooldown:0,
  };
}
