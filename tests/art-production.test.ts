import {expect,test} from 'vitest';
import {applyCommand,createWorld,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {constructionRecipe} from '../src/sim/construction-materials.ts';
import {PRODUCTION_RECIPES} from '../src/sim/production-recipes.ts';
import {addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import {groundCapacity,nearbyGround} from '../src/sim/ground-placement.ts';
import {artWorkTotal,type ArtMaterial,type ArtRecipe} from '../src/sim/art-rules.ts';
import {billWanted,countedProducts} from '../src/sim/cooking-bills.ts';
import {BeautyMapCache} from '../src/sim/room-beauty.ts';
import type {Command,Pawn,Structure,World} from '../src/sim/types.ts';

function prepared(people=1):{world:World;artist:Pawn} {
  const world=createWorld(104,32,32);
  world.tick=2000;world.tiles=world.tiles.map(()=>({terrain:'grass'}));
  world.resources=[];world.jobs=[];world.structures=[];world.piles=[];world.stockpiles=[];world.packed=[];
  world.pawns=world.pawns.slice(0,people);if(world.wildlife)world.wildlife.animals=[];
  delete world.arrivals;delete world.raids;
  for(const [index,pawn] of world.pawns.entries()) {
    pawn.x=8+index*2;pawn.z=8;pawn.hunger=100;pawn.rest=100;pawn.recreation.level=100;
    pawn.schedule.fill('work');
    for(const work of Object.keys(pawn.priorities) as (keyof Pawn['priorities'])[])pawn.priorities[work]=0;
    pawn.skills.construction.level=8;
  }
  return {world,artist:world.pawns[0]!};
}
function command(world:World,value:Command):void {
  const result=applyCommand(world,value);
  if(!result.ok)throw new Error(`${JSON.stringify(value)}: ${result.reason}`);
}
function until(world:World,done:()=>boolean,limit=8000):void {
  for(let n=0;n<limit&&!done();n++) {
    // Prepared art boundary: maintain needs while real hauling and work steps run.
    for(const pawn of world.pawns) {pawn.hunger=100;pawn.rest=100;pawn.recreation.level=100;}
    stepWorld(world);
    if(n%100===0)expect(validateWorld(world),`tick ${world.tick}`).toEqual([]);
  }
  expect(done(),`tick ${world.tick}; ${JSON.stringify(world.pawns.map(p=>({id:p.id,state:p.state,cooking:p.cooking})))}`).toBe(true);
}
function station(world:World):Structure {
  const bench:Structure={id:world.nextId++,kind:'art-bench',x:12,z:12,orientation:0,footprint:'standard',material:'wood',bills:[]};
  world.structures.push(bench);return bench;
}
function bill(world:World,bench:Structure,recipe:ArtRecipe,material:ArtMaterial,destination:'stockpile'|'drop'='drop'):void {
  command(world,{type:'bill-add',structureId:bench.id,recipe});
  const entry=bench.bills!.at(-1)!;
  const filters=Object.fromEntries(PRODUCTION_RECIPES[recipe].inputs.map(item=>[item,item===material]));
  command(world,{type:'bill-update',structureId:bench.id,billId:entry.id,settings:{...entry,filters,destination}});
}
function amount(world:World,item:string):number {return world.piles.filter(p=>p.item===item).reduce((sum,p)=>sum+p.quantity,0);}
function add(world:World,item:ArtMaterial,quantity:number,x:number,z:number):void {
  addGroundMaterial(world,item==='wood'?'wood':item==='steel'?'steel':'blocks',quantity,{x,z},item);
}
function workpiece(world:World){return world.piles.find(p=>p.item==='unfinished-sculpture');}
function sculpture(world:World){return world.packed.find(p=>p.building.kind==='small-sculpture'||p.building.kind==='large-sculpture');}

test('the art bench has two physical construction recipes; sculptures cannot be planned directly',()=>{
  expect(constructionRecipe({kind:'art-bench',material:'wood'}).ingredients).toEqual([{item:'wood',quantity:75},{item:'steel',quantity:50}]);
  expect(constructionRecipe({kind:'art-bench',material:'steel'}).ingredients).toEqual([{item:'steel',quantity:125}]);
  for(const material of ['wood','steel'] as const){
    const {world,artist}=prepared();artist.priorities.build=1;artist.priorities.haul=1;
    if(material==='wood'){add(world,'wood',75,5,11);add(world,'steel',50,6,11);}
    else {add(world,'steel',75,5,11);add(world,'steel',50,6,11);}
    refreshStock(world);
    command(world,{type:'designate',kind:'art-bench',material,x:12,z:12,orientation:1});
    until(world,()=>world.structures.some(s=>s.kind==='art-bench'),2500);
    const built=world.structures.find(s=>s.kind==='art-bench')!;
    expect(built).toMatchObject({material,orientation:1});
    expect(amount(world,'wood')+amount(world,'steel')).toBe(0);
    expect(validateWorld(world)).toEqual([]);
    const before=serializeWorld(world);
    expect(applyCommand(world,{type:'designate',kind:'small-sculpture',material:'wood',x:18,z:18}).ok).toBe(false);
    expect(serializeWorld(world)).toBe(before);
  }
});

test('a small wood bill consumes 50 wood, teaches Artistic, produces one authored package and installs it unchanged',()=>{
  const {world,artist}=prepared();artist.priorities.art=1;artist.priorities.build=1;artist.priorities.haul=1;
  artist.skills.artistic={level:8,xp:0,dailyXp:0,passion:1};artist.skills.crafting={level:6,xp:0,dailyXp:0,passion:0};
  const bench=station(world);add(world,'wood',50,7,12);refreshStock(world);bill(world,bench,'small-sculpture','wood');
  until(world,()=>!!workpiece(world),500);
  const unfinished=workpiece(world)!;expect(unfinished.artWork).toMatchObject({authorId:artist.id,material:'wood',recipe:'small-sculpture',parts:[50]});
  until(world,()=>!!sculpture(world)&&sculpture(world)!.owner.type==='ground',4000);
  const pack=sculpture(world)!,building=pack.building,id=building.id;
  expect(amount(world,'wood')).toBe(0);expect(workpiece(world)).toBeUndefined();
  expect(building).toMatchObject({kind:'small-sculpture',material:'wood',art:{authorId:artist.id}});
  expect(building.quality).toBeDefined();expect(artist.skills.artistic!.xp).toBeGreaterThan(0);
  expect(artist.skills.crafting!.xp).toBe(0);
  const before=new BeautyMapCache().read({width:world.width,height:world.height,tiles:world.tiles,structures:world.structures}).thingsAtIndex(20*world.width+20);
  command(world,{type:'install',structureId:id,x:20,z:20,orientation:0});
  until(world,()=>world.structures.some(s=>s.id===id),500);
  expect(world.packed.some(p=>p.building.id===id)).toBe(false);
  expect(world.structures.find(s=>s.id===id)).toBe(building);
  expect(world.structures.find(s=>s.id===id)?.art).toEqual({authorId:artist.id,createdAt:building.art!.createdAt});
  expect(new BeautyMapCache().read({width:world.width,height:world.height,tiles:world.tiles,structures:world.structures}).thingsAtIndex(20*world.width+20)).toBeGreaterThan(before);
  expect(validateWorld(world)).toEqual([]);
});

test('a large sculpture gathers 75 plus 25 of one stone; another material cannot silently complete a short bill',()=>{
  const {world,artist}=prepared();artist.priorities.art=1;
  const bench=station(world);add(world,'granite-blocks',75,7,12);add(world,'marble-blocks',25,8,12);
  refreshStock(world);bill(world,bench,'large-sculpture','granite-blocks');
  until(world,()=>world.tick>2100,150);
  expect(workpiece(world)).toBeUndefined();expect(amount(world,'granite-blocks')).toBe(75);expect(amount(world,'marble-blocks')).toBe(25);
  add(world,'granite-blocks',25,9,12);refreshStock(world);
  until(world,()=>!!workpiece(world),1000);
  const unfinished=workpiece(world)!;
  expect(unfinished.artWork!.parts.reduce((sum,n)=>sum+n,0)).toBe(100);
  expect([...unfinished.artWork!.parts].sort((a,b)=>a-b)).toEqual([25,75]);
  expect(unfinished.artWork!.material).toBe('granite-blocks');expect(amount(world,'marble-blocks')).toBe(25);
  // The long physical project has reached the work stage; prepare its final boundary.
  unfinished.artWork!.progress=artWorkTotal('large-sculpture','granite-blocks')-10000;
  artist.cooking!.progress=unfinished.artWork!.progress;
  until(world,()=>!!sculpture(world)&&sculpture(world)!.owner.type==='ground',400);
  expect(sculpture(world)!.building).toMatchObject({kind:'large-sculpture',material:'granite-blocks',art:{authorId:artist.id}});
  expect(amount(world,'granite-blocks')).toBe(0);expect(amount(world,'marble-blocks')).toBe(25);
  expect(validateWorld(world)).toEqual([]);
});

test('an interrupted author resumes the saved work; a second artist cannot claim the piece or its XP',()=>{
  const {world,artist}=prepared(2),other=world.pawns[1]!;artist.priorities.art=1;other.priorities.art=0;
  const bench=station(world);add(world,'wood',50,7,12);refreshStock(world);bill(world,bench,'small-sculpture','wood');
  until(world,()=>!!workpiece(world)?.artWork?.progress,900);
  const id=workpiece(world)!.id,progress=workpiece(world)!.artWork!.progress;
  command(world,{type:'priority',pawnId:artist.id,work:'art',value:0});
  command(world,{type:'priority',pawnId:other.id,work:'art',value:1});
  until(world,()=>world.tick>2200,250);
  expect(workpiece(world)?.artWork?.progress).toBe(progress);expect(other.cooking).toBeNull();
  expect(other.skills.artistic?.xp??0).toBe(0);
  const resumed=deserializeWorld(serializeWorld(world));expect(resumed.piles.find(p=>p.id===id)?.artWork).toEqual(workpiece(world)!.artWork);
  const restoredAuthor=resumed.pawns.find(p=>p.id===artist.id)!;
  command(resumed,{type:'priority',pawnId:restoredAuthor.id,work:'art',value:1});
  until(resumed,()=>!!sculpture(resumed),4000);
  expect(sculpture(resumed)!.building.art?.authorId).toBe(artist.id);
  expect(resumed.piles.find(p=>p.id===id)).toBeUndefined();
  expect(validateWorld(resumed)).toEqual([]);
});

test('a stockpile receives the same minified sculpture; an incompatible destination falls back to physical ground',()=>{
  for(const stores of [true,false]){
    const {world,artist}=prepared();artist.priorities.art=1;
    const bench=station(world);add(world,'wood',50,7,12);refreshStock(world);
    command(world,{type:'stockpile',x:17,z:12,enabled:true,filters:{wood:false,food:false,furniture:stores}});
    bill(world,bench,'small-sculpture','wood','stockpile');
    until(world,()=>!!sculpture(world)&&sculpture(world)!.owner.type==='ground',4000);
    const pack=sculpture(world)!;
    expect(pack.building.art?.authorId).toBe(artist.id);
    if(pack.owner.type!=='ground')throw new Error('Sculpture must be deposited');
    if(stores)expect(pack.owner).toMatchObject({x:17,z:12});
    else expect(pack.owner).not.toMatchObject({x:17,z:12});
    expect(world.structures).toContain(bench);expect(validateWorld(world)).toEqual([]);
  }
});

test('cancelling a split unfinished sculpture conserves the rounded refund and is atomic when its only deposit is too small',()=>{
  const {world,artist}=prepared();artist.priorities.art=1;
  const bench=station(world);add(world,'granite-blocks',75,7,12);add(world,'granite-blocks',25,8,12);
  refreshStock(world);bill(world,bench,'large-sculpture','granite-blocks');
  until(world,()=>!!workpiece(world),1000);
  const id=workpiece(world)!.id,cell=workpiece(world)!.owner;
  if(cell.type!=='ground')throw new Error('Expected an unfinished object on ground');
  command(world,{type:'priority',pawnId:artist.id,work:'art',value:0});
  const savedBoundary=serializeWorld(world);
  world.rng=1;const control=deserializeWorld(serializeWorld(world));
  command(world,{type:'cancel-unfinished',itemId:id});
  command(control,{type:'cancel-unfinished',itemId:id});
  expect(serializeWorld(world)).toBe(serializeWorld(control));
  expect(workpiece(world)).toBeUndefined();expect(amount(world,'granite-blocks')).toBe(76);
  expect(validateWorld(world)).toEqual([]);

  const blocked=deserializeWorld(savedBoundary);blocked.rng=1;
  for(const target of nearbyGround(blocked,cell)){
    if(target.x===cell.x&&target.z===cell.z)continue;
    if(groundCapacity(blocked,target,'granite-blocks')>0&&groundCapacity(blocked,target,'survival-meal')>0)
      addGroundMaterial(blocked,'food',1,target,'survival-meal');
  }
  expect(validateWorld(blocked)).toEqual([]);
  const before=serializeWorld(blocked);
  expect(applyCommand(blocked,{type:'cancel-unfinished',itemId:id}).ok).toBe(false);
  expect(serializeWorld(blocked)).toBe(before);
  expect([...blocked.piles.find(p=>p.id===id)!.artWork!.parts].sort((a,b)=>a-b)).toEqual([25,75]);
});

test('until-one counts the carried, loose and installed sculpture; deconstruction returns material without reusing its identity',()=>{
  const {world,artist}=prepared();artist.priorities.art=1;artist.priorities.build=1;artist.priorities.haul=1;
  const bench=station(world);add(world,'wood',50,7,12);refreshStock(world);bill(world,bench,'small-sculpture','wood');
  const entry=bench.bills![0]!;
  command(world,{type:'bill-update',structureId:bench.id,billId:entry.id,settings:{...entry,mode:'until',target:1}});
  until(world,()=>!!sculpture(world),4000);
  const pack=sculpture(world)!,id=pack.building.id;
  expect(pack.owner.type).toBe('pawn');
  expect(countedProducts(world,entry)).toBe(1);expect(billWanted(world,entry)).toBe(false);
  until(world,()=>pack.owner.type==='ground',500);
  expect(countedProducts(world,entry)).toBe(1);expect(billWanted(world,entry)).toBe(false);
  command(world,{type:'install',structureId:id,x:20,z:20,orientation:0});
  until(world,()=>world.structures.some(s=>s.id===id),500);
  expect(countedProducts(world,entry)).toBe(1);expect(billWanted(world,entry)).toBe(false);
  expect(constructionRecipe(world.structures.find(s=>s.id===id)!).ingredients).toEqual([{item:'wood',quantity:50}]);
  command(world,{type:'designate',kind:'deconstruct',targetId:id,x:20,z:20});
  until(world,()=>!world.structures.some(s=>s.id===id),500);
  expect(amount(world,'wood')).toBe(25);
  expect(world.deconstructed.lostWood).toBe(25);
  expect(world.piles.filter(p=>p.item==='wood').every(p=>p.id!==id)).toBe(true);
  expect(countedProducts(world,entry)).toBe(0);expect(billWanted(world,entry)).toBe(true);
  expect(validateWorld(world)).toEqual([]);
});
