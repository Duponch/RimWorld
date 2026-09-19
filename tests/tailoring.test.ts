import { withoutResearch,withMigratedResearch } from './scenarios/legacy-skills';
import { expect,test } from 'vitest';
import { applyCommand,createWorld,stepWorld,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index';
import { addGroundMaterial,refreshStock } from '../src/sim/materials';
import { craftingQuality,tailoringTemperatureFactor } from '../src/sim/crafting-quality';
import { countedProducts } from '../src/sim/cooking-bills';
import { healthRandom } from '../src/sim/health';
import { WEAPON_QUALITIES } from '../src/sim/equipment-rules';
import { APPAREL,armorPiece,newApparelState,conflictsWith } from '../src/sim/apparel-rules';
import type { Command,World } from '../src/sim/types';

function camp(count=1):World {
  const w=createWorld(42,16,16);w.resources=[];w.piles=[];w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.pawns=w.pawns.slice(0,count);w.tick=2000;
  for(const [i,p] of w.pawns.entries()){
    Object.assign(p,{x:4+i,z:4,hunger:100,rest:100});p.schedule.fill('work');
    p.priorities={hunt:0,research:0,patient:0,bedrest:0,doctor:0,gather:0,build:0,mine:0,grow:0,haul:0,cook:0,craft:i?0:1};
    p.skills.crafting={level:8,xp:0,dailyXp:0,passion:1};
  }
  refreshStock(w);return w;
}
const command=(w:World,c:Command)=>expect(applyCommand(w,c)).toMatchObject({ok:true});
function until(w:World,done:()=>boolean,limit=4000):void {
  for(let i=0;i<limit&&!done();i++){stepWorld(w);if(i%50===0)expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}
  expect(done(),JSON.stringify(w.pawns.map(p=>({state:p.state,task:p.cooking,haul:p.haul})))+' tick '+w.tick).toBe(true);expect(validateWorld(w)).toEqual([]);
}
function setup(w:World,cloth=60){
  addGroundMaterial(w,'textile',cloth,{x:2,z:4},'cloth');
  command(w,{type:'designate',kind:'crafting-spot',x:8,z:8});const s=w.structures[0]!;
  expect(w.jobs).toEqual([]);command(w,{type:'bill-add',structureId:s.id});return {s,b:s.bills![0]!};
}
const unfinished=(w:World)=>w.piles.find(p=>p.unfinished);
const balance=(w:World)=>w.piles.reduce((n,p)=>n+(p.item==='cloth'?p.quantity:p.unfinished?60:0),0)+(w.tailoring?.completed??0)*60+(w.tailoring?.lostCloth??0);

test('physical sixty-cloth gather, interruptions, author-bound work, exact save continuation, product quality and wearing',()=>{
  const w=camp(2),{s,b}=setup(w,120),author=w.pawns[0]!,other=w.pawns[1]!;
  command(w,{type:'stockpile',enabled:true,x:12,z:8,filters:{wood:false,food:false,apparel:true,unfinished:true}});
  const snapshots=new Map<string,string>();
  until(w,()=>{if(author.cooking)snapshots.set(author.cooking.phase,snapshots.get(author.cooking.phase)??serializeWorld(w));return (unfinished(w)?.unfinished!.progress??0)>100000;});
  expect(balance(w)).toBe(120);expect(author.skills.crafting!.xp).toBeGreaterThan(0);
  const item=unfinished(w)!,id=item.id,progress=item.unfinished!.progress;
  command(w,{type:'priority',pawnId:author.id,work:'craft',value:0});command(w,{type:'priority',pawnId:other.id,work:'craft',value:1});
  stepWorld(w,100);expect(unfinished(w)!.id).toBe(id);expect(unfinished(w)!.unfinished!.progress).toBe(progress);expect(other.cooking).toBeNull();
  // Bound resume ignores changed ingredient filters and radius, as in the reference.
  command(w,{type:'bill-update',structureId:s.id,billId:b.id,settings:{...b,filters:{cloth:false},radius:0}});
  command(w,{type:'priority',pawnId:author.id,work:'craft',value:1});
  until(w,()=>{if(author.cooking)snapshots.set(author.cooking.phase,snapshots.get(author.cooking.phase)??serializeWorld(w));return w.piles.some(p=>p.item==='cloth-tribalwear'&&p.owner.type==='ground');});
  expect([...snapshots.keys()].sort()).toEqual(['gather','output','work']);expect(balance(w)).toBe(120);expect(unfinished(w)).toBeUndefined();expect(b.target).toBe(0);
  const product=w.piles.find(p=>p.item==='cloth-tribalwear')!;expect(product.apparel!.hitPoints).toBe(100);expect(product.apparel!.quality).not.toBe('legendary');
  command(w,{type:'order-equipment',pawnId:author.id,itemId:product.id,action:'wear',queue:false});until(w,()=>product.owner.type==='apparel');
  expect(countedProducts(w,{...b,mode:'until'})).toBe(0);expect(balance(w)).toBe(120);
  for(const saved of snapshots.values()){const a=deserializeWorld(saved),b=deserializeWorld(saved);stepWorld(a,750);stepWorld(b,750);expect(serializeWorld(a)).toBe(serializeWorld(b));expect(balance(a)).toBe(120);expect(validateWorld(a)).toEqual([]);}
});

test('unfinished identity survives removal of the spot, hauling, new bill adoption and cancellation with physical refunds',()=>{
  const w=camp(),{s}=setup(w);until(w,()=>!!unfinished(w));const u=unfinished(w)!,author=w.pawns[0]!,id=u.id;
  command(w,{type:'designate',kind:'deconstruct',x:s.x,z:s.z});expect(w.structures).toEqual([]);expect(u.unfinished!.billId).toBeUndefined();expect(author.cooking).toBeNull();
  command(w,{type:'stockpile',enabled:true,x:12,z:8,filters:{wood:false,food:false,unfinished:true}});command(w,{type:'priority',pawnId:author.id,work:'haul',value:1});
  until(w,()=>u.owner.type==='ground'&&u.owner.x===12);expect(u.id).toBe(id);expect(balance(w)).toBe(60);
  command(w,{type:'designate',kind:'crafting-spot',x:8,z:8});const replacement=w.structures[0]!;command(w,{type:'bill-add',structureId:replacement.id});
  until(w,()=>author.cooking?.phase==='work');expect(unfinished(w)!.id).toBe(id);
  const beforeRng=w.rng;command(w,{type:'cancel-unfinished',itemId:id});expect(unfinished(w)).toBeUndefined();expect(author.cooking).toBeNull();expect(w.rng).toBe(beforeRng);
  expect(w.piles.reduce((n,p)=>n+(p.item==='cloth'?p.quantity:0),0)).toBe(45);expect(w.tailoring).toEqual({completed:0,cancelled:1,lostCloth:15});expect(balance(w)).toBe(60);expect(validateWorld(w)).toEqual([]);
});

test('strict V71 migration and V72 continuation reject future fields, corrupt work and mismatched authors',()=>{
  const w=camp();delete w.pawns[0]!.skills.crafting;const old=JSON.parse(serializeWorld(w));(old.schemaVersion=71,withoutResearch(old));expect(deserializeWorld(JSON.stringify(old))).toEqual(withMigratedResearch(w));
  for(const mutate of [(s:World)=>{s.tailoring={completed:0,cancelled:0,lostCloth:0};},(s:World)=>{s.pawns[0]!.skills.crafting={level:1,xp:0,dailyXp:0,passion:0};},(s:World)=>{s.structures.push({id:s.nextId++,kind:'crafting-spot',x:8,z:8,orientation:0,footprint:'standard',bills:[]});}]){
    const bad=structuredClone(old);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  }
  setup(w);until(w,()=>!!unfinished(w));const saved=serializeWorld(w);
  for(const mutate of [(s:World)=>{unfinished(s)!.unfinished!.authorId=99999;},(s:World)=>{unfinished(s)!.unfinished!.parts=[59];},(s:World)=>{unfinished(s)!.unfinished!.progress++;},(s:World)=>{unfinished(s)!.quantity=2;},(s:World)=>{unfinished(s)!.unfinished!.billId=99999;}]){
    const bad=JSON.parse(saved);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  }
});

test('quality uses a deterministic asymmetric draw, skill distribution and bounded masterwork; temperature boundaries are explicit',()=>{
  expect([8.99,9,35,35.01].map(tailoringTemperatureFactor)).toEqual([.7,1,1,.7]);
  expect(craftingQuality(0,()=>.5)).toBe('awful');expect(craftingQuality(8,()=>.5)).toBe('normal');
  const means:number[]=[];
  for(const level of [0,8,20]){const rng={rng:42};let sum=0;for(let i=0;i<10000;i++){const q=craftingQuality(level,()=>healthRandom(rng));expect(q).not.toBe('legendary');sum+=WEAPON_QUALITIES.indexOf(q);}means.push(sum/10000);}
  expect(means[0]).toBeLessThan(.6);expect(means[1]).toBeGreaterThan(2);expect(means[1]).toBeLessThan(2.7);expect(means[2]).toBeGreaterThan(3.5);expect(means[2]).toBeLessThan(4.2);
  const garment={id:1,item:'cloth-tribalwear' as const,kind:'apparel' as const,quantity:1,owner:{type:'ground' as const,x:0,z:0},apparel:newApparelState('cloth-tribalwear')};
  expect(APPAREL['cloth-tribalwear'].coverage.parts).toContain('left-leg');expect(APPAREL['cloth-tribalwear'].coverage.parts).not.toContain('left-arm');
  expect(conflictsWith(garment,{...garment,item:'cloth-shirt'})).toBe(true);expect(conflictsWith(garment,{...garment,item:'flak-vest'})).toBe(false);
  expect(armorPiece(garment).ratings.sharp).toBe(.072);garment.apparel.quality='excellent';expect(armorPiece(garment).ratings.sharp).toBeCloseTo(.072*1.3);
});

test('forced queue reserves all sixty cloth; bound queued resumes retain author; missing supply and cancellation overflow are atomic',()=>{
  const w=camp(),{s}=setup(w,59),p=w.pawns[0]!;stepWorld(w,40);expect(p.cooking).toBeNull();expect(unfinished(w)).toBeUndefined();
  addGroundMaterial(w,'textile',1,{x:2,z:4},'cloth');
  command(w,{type:'order-cook',pawnId:p.id,structureId:s.id,queue:true});expect(validateWorld(w)).toEqual([]);
  const saved=serializeWorld(w);expect(deserializeWorld(saved)).toEqual(w);
  const bad=JSON.parse(saved) as World;bad.piles.find(i=>i.item==='cloth')!.quantity=10;expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  until(w,()=>!!unfinished(w));const item=unfinished(w)!;
  command(w,{type:'clear-orders',pawnId:p.id});
  command(w,{type:'order-cook',pawnId:p.id,structureId:s.id,queue:true});expect(validateWorld(w)).toEqual([]);
  const queued=serializeWorld(w);expect(deserializeWorld(queued)).toEqual(w);
  // A refused refund must leave reservations, material, progress and RNG intact.
  w.nextId=Number.MAX_SAFE_INTEGER;const before=serializeWorld(w);expect(applyCommand(w,{type:'cancel-unfinished',itemId:item.id}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  const split=camp();setup(split,0);addGroundMaterial(split,'textile',1,{x:8,z:8},'cloth');addGroundMaterial(split,'textile',59,{x:7,z:7},'cloth');
  until(split,()=>!!unfinished(split));expect(unfinished(split)!.unfinished!.parts.sort((a,b)=>a-b)).toEqual([1,59]);
  const copy=deserializeWorld(serializeWorld(split)),rng=split.rng;
  for(const state of [split,copy])command(state,{type:'cancel-unfinished',itemId:unfinished(state)!.id});
  expect(serializeWorld(split)).toBe(serializeWorld(copy));expect(split.rng).not.toBe(rng);expect(balance(split)).toBe(60);expect(split.tailoring!.lostCloth).toBeGreaterThanOrEqual(14);expect(split.tailoring!.lostCloth).toBeLessThanOrEqual(16);
  const blocked=camp();setup(blocked);until(blocked,()=>!!unfinished(blocked));const worker=blocked.pawns[0]!,u=unfinished(blocked)!,nextId=blocked.nextId;
  // Exact completion boundary with exhausted identity space, no extra XP/draw.
  worker.cooking!.progress=u.unfinished!.progress=1800000;blocked.nextId=Number.MAX_SAFE_INTEGER;const xp=worker.skills.crafting!.xp,beforeRng=blocked.rng;
  stepWorld(blocked,2);expect(unfinished(blocked)!.id).toBe(u.id);expect(blocked.tailoring).toBeUndefined();expect(blocked.rng).toBe(beforeRng);expect(worker.skills.crafting!.xp).toBe(xp);
  blocked.nextId=nextId;until(blocked,()=>!!blocked.tailoring?.completed);expect(balance(blocked)).toBe(60);expect(blocked.tailoring!.completed).toBe(1);
});
