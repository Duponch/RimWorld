import { readFileSync,writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { expect,test } from 'vitest';
import { isColonist } from '../src/sim/affiliation.ts';
import { canDesignate } from '../src/sim/engine.ts';
import { groundCapacity } from '../src/sim/ground-placement.ts';
import { addGroundMaterial } from '../src/sim/materials.ts';
import { COMPLEX_FURNITURE_RESEARCH_COST,complexFurnitureUnlocked } from '../src/sim/research.ts';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index.ts';
import type { Cell,Command,DesignateCommand,StructureKind,World } from '../src/sim/types.ts';

const fixtureBytes=gunzipSync(readFileSync(new URL('./fixtures/colony-v89.json.gz',import.meta.url)));
const load=()=>deserializeWorld(fixtureBytes.toString('utf8'));
const accept=(world:World,command:Command)=>expect(applyCommand(world,command),JSON.stringify(command)).toMatchObject({ok:true});
const living=(world:World)=>world.pawns.filter(p=>isColonist(p)&&p.state!=='dead');

function site(world:World,kind:StructureKind,material:'wood'|'steel',anchor:Cell):Cell {
  for(let radius=2;radius<=24;radius++)for(let dz=-radius;dz<=radius;dz++)for(let dx=-radius;dx<=radius;dx++){
    if(Math.max(Math.abs(dx),Math.abs(dz))!==radius)continue;
    const command:DesignateCommand={type:'designate',kind,material,x:anchor.x+dx,z:anchor.z+dz,orientation:0};
    if(canDesignate(world,command).ok)return {x:command.x,z:command.z};
  }
  throw Error(`No physical site for ${kind}.`);
}

test('V90 common colony: researched habitat, physical tailoring, apparel policy and V89 hygiene coexist for two days',()=>{
  const raw=JSON.parse(fixtureBytes.toString('utf8')) as World;
  expect(raw.schemaVersion).toBe(89);
  let world=load();const start=world.tick,initialLiving=living(world).map(p=>p.id),initialCleaned=world.filth!.cleaned;
  expect(world.schemaVersion).toBe(90);expect(world.scenario).toMatchObject({id:'crashlanded',revision:2});expect(complexFurnitureUnlocked(world)).toBe(false);
  expect(validateWorld(world)).toEqual([]);
  const horizon=start+2*6000,afterCampaign=Math.ceil((horizon+1)/100)*100;
  // This campaign amortizes habitat, tailoring, policy, hygiene and persistence.
  // Keep the already-covered dangerous incident on its own controlled frontier.
  world.raids!.nextCheck=afterCampaign;world.raids!.cassandra!.pending=[afterCampaign];

  const researcher=world.pawns.find(p=>p.name==='Ada')!,builder=world.pawns.find(p=>p.name==='Noé')!,tailor=world.pawns.find(p=>p.name==='Assaillant 9.2')!,wearer=world.pawns.find(p=>p.name==='Mina')!;
  accept(world,{type:'priority',pawnId:researcher.id,work:'research',value:1});
  for(const work of ['hunt','mine','gather','build','haul','grow','cook','craft','basic','warden','clean'] as const)accept(world,{type:'priority',pawnId:researcher.id,work,value:0});
  accept(world,{type:'priority',pawnId:builder.id,work:'build',value:1});
  accept(world,{type:'priority',pawnId:tailor.id,work:'craft',value:1});accept(world,{type:'priority',pawnId:tailor.id,work:'clean',value:2});
  for(const work of ['warden','basic','hunt','research','mine','gather','build','haul','grow','cook'] as const)accept(world,{type:'priority',pawnId:tailor.id,work,value:0});
  accept(world,{type:'research-project',project:'complex-furniture'});
  world.research!.complexFurniture!.points=COMPLEX_FURNITURE_RESEARCH_COST-2_000_000;

  const storage=world.stockpiles.find(s=>groundCapacity(world,s,'cloth')>=60)!;expect(storage).toBeDefined();
  accept(world,{type:'stockpile',enabled:true,x:storage.x,z:storage.z,filters:{...storage.filters,textile:true,unfinished:true,apparel:true},priority:4,capacity:75});
  addGroundMaterial(world,'textile',60,storage,'cloth');
  const maintainedIndex=world.apparelPolicies!.findIndex(p=>p.id===2),maintained={...world.apparelPolicies![maintainedIndex]!,minHitPointsPercent:.9};world.apparelPolicies![maintainedIndex]=maintained;
  const oldShirtId=world.piles.find(p=>p.owner.type==='apparel'&&p.owner.pawnId===wearer.id&&p.item==='cloth-shirt')!.id;
  accept(world,{type:'apparel-policy-assign',pawnId:wearer.id,policyId:maintained.id,automatic:true});

  const anchor={x:119,z:110},benchCell=site(world,'electric-tailor-bench','wood',anchor);
  accept(world,{type:'designate',kind:'electric-tailor-bench',material:'wood',...benchCell,orientation:0});
  let chairCell:Cell|undefined,benchId:number|undefined,billAdded=false,productionStopped=false,checkpoint=false,cleaningEnabled=false,minimumLiving=initialLiving.length;
  while(world.tick<horizon){
    if(complexFurnitureUnlocked(world)&&!chairCell){chairCell=site(world,'dining-chair','wood',anchor);accept(world,{type:'designate',kind:'dining-chair',material:'wood',...chairCell,orientation:0});}
    const bench=world.structures.find(s=>s.kind==='electric-tailor-bench');
    if(bench&&!billAdded){benchId=bench.id;accept(world,{type:'bill-add',structureId:bench.id,recipe:'shirt'});const bill=bench.bills![0]!;accept(world,{type:'bill-update',structureId:bench.id,billId:bill.id,settings:{...bill,filters:{cloth:true,'light-leather':false},destination:'stockpile'}});billAdded=true;}
    if(bench&&billAdded&&!productionStopped&&(world.tailoring?.completed??0)>=1){const bill=bench.bills![0]!;accept(world,{type:'bill-update',structureId:bench.id,billId:bill.id,settings:{...bill,suspended:true}});accept(world,{type:'priority',pawnId:tailor.id,work:'craft',value:0});accept(world,{type:'priority',pawnId:tailor.id,work:'clean',value:1});productionStopped=true;}
    if(!cleaningEnabled&&chairCell&&world.structures.some(s=>s.kind==='dining-chair'&&s.x===chairCell!.x&&s.z===chairCell!.z)&&world.structures.some(s=>s.kind==='electric-tailor-bench')){accept(world,{type:'priority',pawnId:builder.id,work:'build',value:0});accept(world,{type:'priority',pawnId:builder.id,work:'clean',value:1});cleaningEnabled=true;}
    stepWorld(world,50);minimumLiving=Math.min(minimumLiving,living(world).length);
    if(!checkpoint&&world.piles.some(p=>p.unfinished?.recipe==='shirt'&&p.unfinished.progress>0)){
      const saved=serializeWorld(world),copy=deserializeWorld(saved);stepWorld(world,30);stepWorld(copy,30);
      expect(serializeWorld(copy)).toBe(serializeWorld(world));world=deserializeWorld(saved);checkpoint=true;
    }
    if((world.tick-start)%600===0)expect(validateWorld(world),`tick ${world.tick}`).toEqual([]);
  }

  const chair=world.structures.find(s=>s.kind==='dining-chair'&&chairCell&&s.x===chairCell.x&&s.z===chairCell.z);
  const replacement=world.piles.find(p=>p.id!==oldShirtId&&p.item==='cloth-shirt'&&p.owner.type==='apparel'&&p.owner.pawnId===wearer.id),oldShirt=world.piles.find(p=>p.id===oldShirtId)!;
  expect(complexFurnitureUnlocked(world)).toBe(true);expect(world.research!.complexFurniture!.completedAt).toBeGreaterThan(start);expect(chair?.quality).toBeDefined();
  expect(benchId,JSON.stringify({tick:world.tick,jobs:world.jobs.filter(j=>j.kind==='electric-tailor-bench'),structures:world.structures.filter(s=>s.kind==='electric-tailor-bench'),pawns:living(world).map(p=>({name:p.name,state:p.state,jobId:p.jobId,haul:p.haul}))})).toBeDefined();expect(world.tailoring?.completed).toBeGreaterThanOrEqual(1);expect(replacement?.apparel?.forced).toBeUndefined();expect(oldShirt.owner.type).toBe('ground');
  expect(checkpoint).toBe(true);expect(productionStopped).toBe(true);expect(world.tick).toBe(horizon);expect(minimumLiving).toBe(initialLiving.length);expect(living(world).map(p=>p.id).sort((a,b)=>a-b)).toEqual([...initialLiving].sort((a,b)=>a-b));
  expect(cleaningEnabled).toBe(true);expect(world.filth!.cleaned).toBeGreaterThan(initialCleaned);
  expect(living(world).every(p=>p.state!=='downed'&&p.hunger>0&&p.rest>0)).toBe(true);
  expect(validateWorld(world)).toEqual([]);expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  writeFileSync('artifacts/habitat-apparel-colony-v90.json',JSON.stringify({schemaVersion:90,controlled:true,source:'tests/fixtures/colony-v89.json.gz',interventions:['60 cloth supplied','complex-furniture research prefilled except last 2 points','raids deferred beyond observation','maintained apparel threshold 90%'],startTick:start,endTick:world.tick,days:2,minimumLiving,chair,benchId,tailored:world.tailoring?.completed,replacementId:replacement?.id,oldShirtId,cleaned:world.filth!.cleaned-initialCleaned,unfinishedContinuationExact:checkpoint,valid:true},null,2));
},180_000);
