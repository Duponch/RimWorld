import { createWorld, applyCommand, addGroundMaterial, refreshStock } from '../../src/sim/index';

/** Synthetic one-cell corridor: two opposite hauling trips must cross a table. */
export function furnitureTrafficFixture() {
  const w=createWorld(42,16,16);w.tiles=w.tiles.map(()=>({terrain:'water'}));
  for(let x=1;x<=14;x++)w.tiles[8*16+x]={terrain:'grass'};
  w.resources=[];w.piles=[];w.structures=[];w.jobs=[];w.pawns=w.pawns.slice(0,2);
  for(const [i,p] of w.pawns.entries())Object.assign(p,{x:i?14:1,z:8,hunger:100,rest:100,schedule:Array(24).fill('anything'),priorities:{craft:2,mine:2,build:0,gather:0,grow:0,cook:0,haul:1}});
  w.structures.push({id:w.nextId++,kind:'table',x:7,z:8,orientation:1,footprint:'standard'});
  addGroundMaterial(w,'wood',10,{x:12,z:8},'wood');addGroundMaterial(w,'food',10,{x:3,z:8},'rice');
  for(const c of [{type:'stockpile' as const,x:2,z:8,enabled:true,filters:{wood:true,food:false}}, {type:'stockpile' as const,x:13,z:8,enabled:true,filters:{wood:false,food:true}}])if(!applyCommand(w,c).ok)throw new Error('Fixture storage');
  for(const [i,p] of w.pawns.entries()) {
    if(!applyCommand(w,{type:'order-haul',pawnId:p.id,target:{type:'pile',pileId:w.piles.find(q=>q.item===(i?'rice':'wood'))!.id},queue:false}).ok)throw new Error('Fixture haul');
    applyCommand(w,{type:'priority',pawnId:p.id,work:'haul',value:0});
  }
  refreshStock(w);return w;
}
