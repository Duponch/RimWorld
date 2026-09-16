import { createWorld, applyCommand, addGroundMaterial, refreshStock } from '../../src/sim/index.ts';
import { newCampfireFuel } from '../../src/sim/fuel.ts';
import { newCookingBill } from '../../src/sim/cooking-bills.ts';

/** Synthetic camp on a natural 250² map. Five workers share each station,
 * with cooking, fuel delivery, stock hauling, sowing and construction enabled.
 * Setup is not player progression; the separate colony journey checks that. */
export function cookingFixture(count:number) {
  const w=createWorld(42,250,250),template=w.pawns[0]!;
  const groups=Math.ceil(count/5),columns=Math.min(5,groups),rows=Math.ceil(groups/columns);
  w.piles=[];w.resources=w.resources.filter(r=>r.x<85||r.x>85+columns*12||r.z<85||r.z>85+rows*12);
  for(let z=85;z<=85+rows*12;z++)for(let x=85;x<=85+columns*12;x++)w.tiles[z*w.width+x]={terrain:'grass'};
  w.pawns=Array.from({length:count},(_,i)=>{
    const group=Math.floor(i/5),x=88+group%columns*12,z=88+Math.floor(group/columns)*12;
    return {...structuredClone(template),id:w.nextId++,x:x+i%5,z,hunger:100,rest:100,priorities: { doctor: 0,craft:2,mine:0,gather:0,build:2,haul:2,grow:2,cook:1}};
  });
  for(let i=0;i<groups;i++) {
    const x=88+i%columns*12,z=88+Math.floor(i/columns)*12;
    const fire={id:w.nextId++,kind:'campfire' as const,x:x+2,z:z+3,orientation:0 as const,footprint:'standard' as const,fuel:newCampfireFuel(),bills:[{...newCookingBill(w.nextId++),mode:'until' as const,target:20}]};
    fire.fuel.ticks=0; // An empty initial fixture, so every camp needs physical refuelling.
    w.structures.push(fire);
    addGroundMaterial(w,'wood',65,{x:x-1,z:z+2},'wood');
    addGroundMaterial(w,'food',75,{x:x+5,z:z+2},'rice');addGroundMaterial(w,'food',35,{x:x+5,z:z+3},'berries');
    for(const command of [
      {type:'area' as const,action:'stockpile' as const,from:{x:x+4,z:z+5},to:{x:x+6,z:z+6},filters:{wood:false,food:true},priority:2,capacity:75},
      {type:'area' as const,action:'growing' as const,from:{x:x-1,z:z+5},to:{x:x+1,z:z+6}},
      {type:'designate' as const,kind:'wall' as const,x:x+7,z:z+3},
    ])if(!applyCommand(w,command).ok)throw new Error(`Invalid camp fixture ${i}`);
  }
  refreshStock(w);return w;
}
