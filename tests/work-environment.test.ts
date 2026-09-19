import { withoutResearch,withMigratedResearch } from './scenarios/legacy-skills';
import { withoutPawnSkills } from './scenarios/legacy-skills';
import { expect,test } from 'vitest';
import { WorkEnvironmentCache,lightWorkFactor } from '../src/sim/work-environment';
import { createWorld,applyCommand,serializeWorld,deserializeWorld,stepWorld,validateWorld } from '../src/sim/index';
import { addGroundMaterial } from '../src/sim/materials';
import { productionWorkTotal } from '../src/sim/production-recipes';
import { newCookingBill } from '../src/sim/cooking-bills';
import { workplaceCamp,fixtureFire } from './scenarios/work-environment';
import type { World } from '../src/sim/types';

test('lumière : oracle indépendant de distance, coins opaques, portes ouvertes, sources cumulées et mutations',()=>{
  const w=createWorld(71,32,32);w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.structures=[];w.roofing=undefined;w.tick=0;
  const cache=new WorkEnvironmentCache(),fire=fixtureFire(w,16,16);
  // Relaxation on the whole map is deliberately distinct from the local heap.
  for(let sample=0;sample<8;sample++) {
    fire.x=sample===7?31:sample%2?0:16;fire.z=sample===7?31:sample%2?0:16;
    const root=fire.z*32+fire.x;
    w.tiles.forEach((t,i)=>{t.terrain=((i*31+sample*17)%29<4&&i!==root)?'rock':'grass';});
    const costs=new Float64Array(1024).fill(Infinity);costs[root]=100;
    const blocked=(x:number,z:number)=>x<0||z<0||x>=32||z>=32||w.tiles[z*32+x]!.terrain==='rock';
    for(let iteration=0;iteration<20;iteration++){let changed=false;
      for(let z=0;z<32;z++)for(let x=0;x<32;x++)if(!blocked(x,z))for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++) {
        if((!dx&&!dz)||blocked(x+dx,z+dz)||dx&&dz&&blocked(x+dx,z)&&blocked(x,z+dz))continue;
        const a=z*32+x,b=(z+dz)*32+x+dx,value=costs[a]!+(dx&&dz?141:100);
        if(value<=1000&&value<costs[b]!){costs[b]=value;changed=true;}
      }if(!changed)break;
    }
    const env=cache.read(w);
    for(let i=0;i<1024;i++){
      const d=costs[i]!/100,red=Number.isFinite(d)?Math.floor(252*(.6*(1-d/10)+.4/d**2)):0;
      expect(env.lightAt({x:i%32,z:Math.floor(i/32)}),`sample ${sample}, cell ${i}`).toBeCloseTo(Math.min(.5,red*3.6/255),6);
    }
  }
  const room=workplaceCamp(),fire2=fixtureFire(room),view=cache.read(room),rebuilds=cache.localLight.rebuilds;
  expect(view.lightAt({x:3,z:3})).toBe(.5);
  room.tick++;fire2.fuel.ticks--;cache.read(room);expect(cache.localLight.rebuilds).toBe(rebuilds);
  const door=room.structures.find(s=>s.kind==='door')!;door.door!.open=true;door.door!.holdOpen=true;
  const open=cache.read(room);expect(cache.localLight.rebuilds).toBe(rebuilds);
  room.tick=0;expect(cache.read(room).lightAt({x:4,z:0})).toBe(0);
  room.structures=room.structures.filter(s=>s!==door);expect(cache.read(room).lightAt({x:4,z:0})).toBeGreaterThan(0);
  room.structures.push(door);fire2.fuel.ticks=0;expect(cache.read(room).lightAt({x:3,z:3})).toBe(0);expect(view.lightAt({x:3,z:3})).toBe(.5);
  room.roofing!.constructed=[];room.tick=3000;expect(cache.read(room).lightAt({x:3,z:3})).toBe(1);
  fire.x=16;fire.z=16;w.tiles.forEach(t=>t.terrain='grass');w.structures=[fire];const one=cache.read(w).lightAt({x:24,z:16});fixtureFire(w,24,24);
  expect(cache.read(w).lightAt({x:24,z:16})).toBeGreaterThan(one);expect(cache.read(w).lightAt(fire)).toBe(.5);
  expect([0,.15,.3,1].map(lightWorkFactor)).toEqual([.8,.9,1,1]);
  // A distant excavation can change room IDs without changing any possible
  // finite light path. Compare retained output to a fresh independent owner.
  w.structures=[fire];fire.x=2;fire.z=2;w.tiles.forEach(t=>t.terrain='grass');
  const stable=cache.read(w),builds=cache.localLight.rebuilds;
  for(const i of [30*32+30,28*32+27,20*32+20]) {
    w.tiles[i]!.terrain='rock';const next=cache.read(w),fresh=new WorkEnvironmentCache().read(w);
    expect(cache.localLight.rebuilds).toBe(builds);
    for(let cell=0;cell<1024;cell++)expect(next.lightAt({x:cell%32,z:Math.floor(cell/32)})).toBe(fresh.lightAt({x:cell%32,z:Math.floor(cell/32)}));
  }
  w.tiles[2*32+3]!.terrain='rock';const blocked=cache.read(w);expect(cache.localLight.rebuilds).toBe(builds+1);
  expect(blocked.lightAt({x:3,z:2})).toBe(0);expect(stable.lightAt({x:3,z:2})).toBe(.5);
});

test('ateliers : toit distinct de pièce, rôle et lumière au colon ; progression physique, migration et reprise',()=>{
  const w=workplaceCamp(),p=w.pawns[0]!,s=w.structures[0]!,cache=new WorkEnvironmentCache();
  let env=cache.read(w);expect(env.production(s,p)).toMatchObject({light:0,lighting:.8,outdoors:1,roomRole:1,total:.8});
  w.roofing!.constructed=w.roofing!.constructed.filter(i=>i!==p.z*w.width+p.x);
  expect(cache.read(w).production(s,p).total).toBe(1); // Covered bench, sunlit worker.
  w.roofing!.constructed.push(p.z*w.width+p.x);w.roofing!.constructed.sort((a,b)=>a-b);
  const bed={id:w.nextId++,kind:'bed' as const,x:5,z:5,orientation:0 as const,footprint:'standard' as const};w.structures.push(bed);
  env=cache.read(w);expect(env.room(s)?.role).toBe('bedroom');expect(env.production(s,p).total).toBeCloseTo(.64);
  w.structures=w.structures.filter(b=>b!==bed);const fire=fixtureFire(w);
  expect(cache.read(w).production(s,p).total).toBe(1);
  addGroundMaterial(w,'chunk',1,{x:3,z:4},'granite-chunk');s.bills=[newCookingBill(w.nextId++,'stone-blocks')];
  for(let i=0;i<100&&!p.cooking?.progress;i++)stepWorld(w);
  expect(p.cooking?.phase).toBe('work');expect(p.cooking!.progress).toBe(10000);expect(validateWorld(w)).toEqual([]);
  const raw=JSON.parse(serializeWorld(w));((raw.schemaVersion=35,withoutResearch(raw)),withoutPawnSkills(raw));delete raw.thermal;raw.pawns[0].cooking.progress=100;
  const migrated=deserializeWorld(JSON.stringify(raw));expect(migrated.pawns[0]!.cooking!.progress).toBe(productionWorkTotal('stone-blocks')/2);
  raw.pawns[0].cooking.progress=200.5;expect(()=>deserializeWorld(JSON.stringify(raw))).toThrow(/version 35/);
  const bad=JSON.parse(serializeWorld(w));bad.pawns[0].cooking.progress=1.1;expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  stepWorld(w,9);expect(p.cooking!.progress).toBe(100000);
  fire.fuel.ticks=1;const before=p.cooking!.progress;stepWorld(w);expect(p.cooking!.progress-before).toBe(8000);
  const restored=deserializeWorld(serializeWorld(w));stepWorld(w,100);stepWorld(restored,100);expect(restored).toEqual(w);
  expect(w.piles.filter(p=>p.kind==='blocks')).toHaveLength(0);
  for(let i=0;i<100&&s.bills![0]!.target;i++)stepWorld(w);
  expect(s.bills![0]!.target).toBe(0);expect(w.piles.filter(p=>p.kind==='blocks').reduce((n,p)=>n+p.quantity,0)).toBe(20);expect(validateWorld(w)).toEqual([]);
  const outside=workplaceCamp();outside.structures=outside.structures.filter(s=>!(s.kind==='wall'&&s.x===1));
  expect(cache.read(outside).production(outside.structures[0]!,outside.pawns[0]!).outdoors).toBe(.8);
  // Exactly 300 open cells differs from an unroofed enclosed courtyard of 299.
  const courtyard=createWorld(1,32,32);courtyard.structures=[];courtyard.tiles=courtyard.tiles.map(()=>({terrain:'rock'}));
  for(let z=1;z<=15;z++)for(let x=1;x<=20;x++)courtyard.tiles[z*32+x]={terrain:'grass'};
  courtyard.roofing={constructed:[33],build:[],remove:[],cursor:0};
  expect(cache.read(courtyard).room({x:2,z:2})?.psychologicallyOutdoors).toBe(false);
  courtyard.roofing.constructed=[];expect(cache.read(courtyard).room({x:2,z:2})?.psychologicallyOutdoors).toBe(true);
  courtyard.tiles[32]={terrain:'grass'};
  courtyard.roofing.constructed=[];for(let z=1;z<=15;z++)for(let x=1;x<=20;x++)if(courtyard.roofing.constructed.length<151)courtyard.roofing.constructed.push(z*32+x);
  expect(cache.read(courtyard).room({x:2,z:2})?.psychologicallyOutdoors).toBe(false);
  courtyard.roofing.constructed.pop();expect(cache.read(courtyard).room({x:2,z:2})?.psychologicallyOutdoors).toBe(true);
  // Cancelling a real bill after partial work keeps its actual ingredient.
  const cancel=deserializeWorld(serializeWorld(migrated));const station=cancel.structures[0]!;
  expect(applyCommand(cancel,{type:'bill-remove',structureId:station.id,billId:station.bills![0]!.id}).ok).toBe(true);
  expect(cancel.piles.filter(p=>p.kind==='chunk').reduce((n,p)=>n+p.quantity,0)).toBe(1);expect(validateWorld(cancel)).toEqual([]);
});
