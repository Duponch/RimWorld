import {describe,it,expect,vi} from 'vitest';
import {processHivePriority256,advanceHiveStructureMelee256} from '../src/sim/cave-hive-lord-256.ts';
import type {World,Structure} from '../src/sim/types.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';
import type {animalNavigation} from '../src/sim/wildlife-navigation.ts';

const insect=():WildAnimal=>({id:1,species:'megascarab',sex:'female',ageTicks:600000,x:2,z:2,food:1,rest:1,state:'idle',path:[],nextDecision:0,hive:{factionId:7,lordId:9,spawnerId:null}});
function scene(a:WildAnimal):World {
  // Narrow prepared scene: these tests exercise grid admission, not generation.
  return {tick:10,rng:123,width:5,height:5,structures:[],pawns:[],wildlife:{rng:456,animals:[a],hiveLords:[]}} as unknown as World;
}
const forbidden=()=>{throw new Error('Rejected actor requested a map grid');};
describe('hive grid admission remains behind existing actor and job guards',()=>{
  it('does not build navigation or physical grids for ordinary wildlife or detached insects',()=>{
    for(const detached of [false,true]){
      const a=insect();if(detached)a.hive!.lordId=null;else delete a.hive;
      const w=scene(a),before=JSON.stringify(w),take=vi.fn(()=>false);
      expect(processHivePriority256(w,a,forbidden,forbidden,take)).toBe(false);
      expect(advanceHiveStructureMelee256(w,a,100,forbidden)).toBe(false);
      expect(take).not.toHaveBeenCalled();expect(JSON.stringify(w)).toBe(before);
    }
  });
  it('does not build grids for missing Lords or inactive actors',()=>{
    for(const state of ['idle','dead','downed'] as const){
      const a=insect();a.state=state;const w=scene(a),before=JSON.stringify(w);
      expect(processHivePriority256(w,a,forbidden,forbidden,forbidden)).toBe(false);
      expect(JSON.stringify(w)).toBe(before);
    }
  });
  it('keeps physical corner rejection, current target identity, and search budget for an active mixed scene',()=>{
    const a=insect(),ordinary={...insect(),id:2,hive:undefined},w=scene(a);
    const target={id:3,x:3,z:3,state:'idle'};w.pawns=[target] as unknown as World['pawns'];
    w.wildlife!.animals.push(ordinary);
    w.worldFactions={factions:[{id:7,def:'Insect'}]} as World['worldFactions'];
    w.structures.push({id:20,kind:'insect-hive',factionId:7,x:1,z:1,orientation:0,footprint:'standard'});
    w.wildlife!.hiveLords!.push({id:9,factionId:7,aggressive:false,phase:'defend-expand',lastHarmCore:100,memberIds:[1],assignedHives:[{pawnId:1,hiveId:20}]});
    a.hiveJob={kind:'attack',targetId:3};
    const physical=new Uint8Array(25);physical[2*5+3]=1;physical[3*5+2]=1;
    const calls:string[]=[],nav=()=>{calls.push('nav');return {} as ReturnType<typeof animalNavigation>;},grid=()=>{calls.push('physical');return physical;},take=vi.fn(()=>false);
    const before=JSON.stringify(w);
    expect(processHivePriority256(w,ordinary,forbidden,forbidden,forbidden)).toBe(false);
    expect(processHivePriority256(w,a,nav,grid,take)).toBe(true);
    expect(calls).toEqual(['nav','physical']);expect(take).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(w)).toBe(before);
    // Opening a single flank admits contact with that same target and no draw.
    physical[2*5+3]=0;a.path=[{x:1,z:2}];calls.length=0;
    expect(processHivePriority256(w,a,nav,grid,forbidden)).toBe(true);
    expect(a.path).toEqual([]);expect(a.hiveJob).toEqual({kind:'attack',targetId:3});
    expect(calls).toEqual(['nav','physical']);expect(w.rng).toBe(123);expect(w.wildlife!.rng).toBe(456);
  });
  it('does not build a physical grid for an absent structure attack or committed movement',()=>{
    const a=insect(),w=scene(a);
    for(const job of [undefined,{kind:'attack',targetId:40} as const,{kind:'attack',targetId:40,structure:true} as const]){
      a.hiveJob=job;
      expect(advanceHiveStructureMelee256(w,a,100,forbidden)).toBe(false);
    }
    expect(a.hiveJob).toBeUndefined();
    a.hiveJob={kind:'attack',targetId:40,structure:true};
    a.motion={from:{x:1,z:2},to:{x:2,z:2},start:9,end:11,speedFactor:1,terrainDelay:0};
    expect(advanceHiveStructureMelee256(w,a,100,forbidden)).toBe(false);
    expect(a.hiveJob.targetId).toBe(40);expect(w.rng).toBe(123);
  });
  it('reads the current physical grid once for a real structure target, before any damage draw',()=>{
    const a=insect(),w=scene(a),target:Structure={id:40,kind:'wall',x:3,z:3,orientation:0,footprint:'standard'};
    w.structures.push(target);a.hiveJob={kind:'attack',targetId:40,structure:true};
    const physical=new Uint8Array(25);physical[2*5+3]=1;physical[3*5+2]=1;
    const grid=vi.fn(()=>physical),before=JSON.stringify(w);
    expect(advanceHiveStructureMelee256(w,a,100,grid)).toBe(false);
    expect(grid).toHaveBeenCalledTimes(1);expect(w.structures[0]).toBe(target);expect(JSON.stringify(w)).toBe(before);
  });
});
