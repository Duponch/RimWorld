import {expect,test} from 'vitest';
import {preparedTreeExpiryCarrier} from './scenarios/tree-expiry-v353';
import {preparedTreeWrapper} from './scenarios/tree-transfer-v349';
import {newBreakdownCalendar} from '../src/sim/breakdowns';
import {createApparelWearCalendar} from '../src/sim/apparel-renewal';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {damagePile} from '../src/sim/thing-damage';
import {destroyMinifiedTree,replantTreeReason,treeHeldPosition} from '../src/sim/tree-transfer';
import {physicalTravelUnitMass} from '../src/sim/tree-transfer-mass';
import {treePackLive} from '../src/sim/tree-transfer-rules';
import {applyBulletStagger} from '../src/sim/stagger';
import {refreshStock,materialIdentityCount} from '../src/sim/materials';
import {planGroundPlacement} from '../src/sim/ground-placement';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization';
import type {World} from '../src/sim/types';
const exact=(w:World)=>{expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);};
const wood=(w:World)=>w.piles.filter(i=>i.item==='wood').reduce((n,i)=>n+i.quantity,0);
function nextDraw(seed:number){let x=BigInt(seed>>>0),mask=0xffffffffn;x=(x^((x<<13n)&mask))&mask;x=(x^(x>>17n))&mask;x=(x^((x<<5n)&mask))&mask;return Number(x);}
function reach(w:World,done:()=>boolean,max=65){for(let i=0;i<max&&!done();i++)stepWorld(w);expect(done(),`tick=${w.tick}`).toBe(true);exact(w);}
function free(w:World,count:number){
 const p=w.pawns[0]!,ground=w.piles.filter(i=>i.item==='wood'&&i.owner.type==='ground').sort((a,b)=>{
  const aa=a.owner as {x:number;z:number},bb=b.owner as {x:number;z:number};return Math.abs(aa.x-p.x)+Math.abs(aa.z-p.z)-Math.abs(bb.x-p.x)-Math.abs(bb.z-p.z);
 });for(const pile of ground.slice(0,count))expect(damagePile(w,pile,1000,'bullet')).toBe(true);exact(w);
}

test('V353 actual carried expiry keeps the original, edge and foreign queue, captures one draw, then retries without XP or new products',()=>{
 const {w,pile,source}=preparedTreeExpiryCarrier(),p=w.pawns[0]!;
 // A legitimate separate CUT is reserved through the real queued command.
 const foreignSource={id:w.nextId++,kind:'tree' as const,x:2,z:2,amount:46};w.resources=[...w.resources,foreignSource];
 expect(applyCommand(w,{type:'designate',kind:'cut',x:2,z:2}).ok).toBe(true);const foreign=w.jobs.find(j=>j.kind==='cut')!;
 expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:foreign.id,queue:true}).ok).toBe(true);
 applyBulletStagger(w,p,w.tick*10,1);exact(w);const original=structuredClone(source),ids=w.nextId,rng=w.rng,stock=wood(w);
 while(w.tick<pile.plantPack.expiresAt-1)stepWorld(w);const edge=structuredClone(p.motion),skill=structuredClone(p.skills.plants);
 stepWorld(w);expect(pile.plantPack.pendingExpiry).toEqual({quantity:23,retryAt:w.tick+20});expect(w.rng).toBe(nextDraw(rng));
 expect(p.motion).toEqual(edge);expect(pile.owner).toEqual({type:'pawn',pawnId:p.id});expect(p.interruptedCargo).toBe(true);expect(p.jobId).toBeNull();expect(p.orders.queue).toEqual([foreign.id]);
 expect(w.jobs.some(j=>j.tree?.resourceId===source.id)).toBe(false);expect(source).toEqual(original);expect(p.skills.plants).toEqual(skill);expect(w.nextId).toBe(ids);expect(wood(w)).toBe(stock);exact(w);
 const copy=deserializeWorld(serializeWorld(w)),fixed=w.rng;
 for(let i=0;i<60;i++){stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);expect(w.rng).toBe(fixed);expect(w.nextId).toBe(ids);expect(wood(w)).toBe(stock);expect(source).toEqual(original);expect(p.skills.plants).toEqual(skill);expect(p.orders.queue).toEqual([foreign.id]);}
 expect(treePackLive(pile,w.tick)).toBe(false);expect(replantTreeReason(w,pile,{x:20,z:20})).toContain('mort');expect(physicalTravelUnitMass(pile,w.schemaVersion)).toBe(150000);
 const before=structuredClone(w);expect(destroyMinifiedTree(w,pile)).toBe(false);expect(w).toEqual(before);
 free(w,1);const fork=deserializeWorld(serializeWorld(w));reach(w,()=>!w.piles.some(i=>i.id===pile.id));reach(fork,()=>!fork.piles.some(i=>i.id===pile.id));expect(fork).toEqual(w);
 expect(wood(w)).toBe(stock-75+23);expect(w.rng).toBe(fixed);expect(p.skills.plants).toEqual(skill);expect(w.resources.some(r=>r.id===source.id)).toBe(false);expect(p.interruptedCargo).toBeUndefined();expect(p.orders.queue).toEqual([foreign.id]);exact(w);
});

test('V353 legacy100 remains survive complete saturation and later split75+25 without a second draw or quantity cap',()=>{
 const {w,pile,source}=preparedTreeExpiryCarrier();source.amount=200;exact(w);const rng=w.rng,total=wood(w),nextId=w.nextId;
 reach(w,()=>!!pile.plantPack.pendingExpiry);expect(pile.plantPack.pendingExpiry!.quantity).toBe(100);expect(w.rng).toBe(nextDraw(rng));expect(w.nextId).toBe(nextId);
 const fixed=w.rng;free(w,2);reach(w,()=>!w.piles.some(i=>i.id===pile.id));
 expect(wood(w)).toBe(total-150+100);expect(w.rng).toBe(fixed);expect(w.nextId).toBe(nextId+2);expect(w.piles.filter(i=>i.owner.type==='pawn')).toEqual([]);exact(w);
});

test('V353 zero-yield death needs no output slot or new ID, and still commits the existing productive rounding draw',()=>{
 const {w,pile,source}=preparedTreeExpiryCarrier();source.amount=1;exact(w);const rng=w.rng,nextId=w.nextId,total=wood(w);
 reach(w,()=>!w.piles.some(i=>i.id===pile.id));expect(w.rng).toBe(nextDraw(rng));expect(w.nextId).toBe(nextId);expect(wood(w)).toBe(total);expect(w.jobs.some(j=>j.tree?.resourceId===source.id)).toBe(false);exact(w);
});

test('V353 pending death survives exhausted numeric IDs without removing a positive output or allocating another owner',()=>{
 const {w,pile}=preparedTreeExpiryCarrier();Object.assign(w,{nextId:Number.MAX_SAFE_INTEGER});exact(w);free(w,1);const total=wood(w),nextId=w.nextId;
 reach(w,()=>!!pile.plantPack.pendingExpiry);expect(pile.plantPack.pendingExpiry!.quantity).toBe(23);expect(wood(w)).toBe(total);expect(w.nextId).toBe(nextId);expect(w.piles.filter(i=>i.owner.type==='pawn')).toHaveLength(1);exact(w);
});

test('V353 cap32768 counts only the wrapper actually retired and keeps all100 units pending if two identities cannot fit',()=>{
 const scene=preparedTreeExpiryCarrier();scene.source.amount=200;let w=scene.w;
 while(w.tick<scene.pile.plantPack.expiresAt-1)stepWorld(w);
 const physical=treeHeldPosition(w.pawns[0]!,w.tick+1),holes=new Set([`${physical.x+1}:${physical.z}`,`${physical.x+2}:${physical.z}`]);
 // Declared standard250 map and incompatible ground stacks at the actual death boundary.
 w.width=250;w.height=250;w.tiles=Array.from({length:250*250},()=>({terrain:'grass' as const}));w.piles=[scene.pile];
 for(let z=0;z<w.height&&w.piles.length<32768;z++)for(let x=0;x<w.width&&w.piles.length<32768;x++)if(!holes.has(`${x}:${z}`))w.piles.push({id:w.nextId++,kind:'steel',item:'steel',quantity:75,owner:{type:'ground',x,z}});
 refreshStock(w);w=deserializeWorld(JSON.stringify(w));const pile=w.piles.find(i=>i.id===scene.pile.id)!;
 const view={...w,piles:w.piles.filter(i=>i.id!==pile.id)},plan=planGroundPlacement(view,100,physical,'wood');expect(plan).not.toBeNull();
 expect(plan!.reduce((n,part)=>n+part.quantity,0)).toBe(100);
 const needed=plan!.reduce((n,part)=>n+materialIdentityCount(view,part.quantity,{type:'ground',...part.cell},'wood'),0);expect(needed).toBe(2);expect(w.piles.length-1+needed).toBe(32769);
 const nextId=w.nextId;stepWorld(w);
 expect(pile.plantPack!.pendingExpiry!.quantity).toBe(100);expect(w.piles).toHaveLength(32768);expect(w.nextId).toBe(nextId);
 const errors=validateWorld(w);expect({count:errors.length,first:errors.slice(0,5)}).toEqual({count:0,first:[]});
 const reloaded=deserializeWorld(serializeWorld(w));expect(reloaded.piles).toHaveLength(32768);expect(reloaded.piles.find(i=>i.id===pile.id)).toEqual(pile);expect(reloaded.nextId).toBe(nextId);
});
test('V353 prepare-phase deadline suspends this paid replant before work/XP and preserves a real foreign queue at stepWorld',()=>{
 const {w,pile,source}=preparedTreeWrapper(null,1),p=w.pawns[0]!;w.tick=44950;source.amount=46;delete source.damage;
 w.breakdown=newBreakdownCalendar(w.seed,w.tick);w.apparelWear=createApparelWearCalendar(w.tick,(w.seed^w.tick^0x0a77e1)>>>0);p.skills.plants={level:8,xp:0,dailyXp:0,passion:0};refreshStock(w);exact(w);
 expect(applyCommand(w,{type:'replant-tree',pileId:pile.id,x:14,z:10}).ok).toBe(true);reach(w,()=>pile.owner.type==='pawn',20);
 for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)w.piles.push({id:w.nextId++,kind:'wood',item:'wood',quantity:75,owner:{type:'ground',x,z}});refreshStock(w);exact(w);
 const foreignSource={id:w.nextId++,kind:'tree' as const,x:2,z:2,amount:46};w.resources=[...w.resources,foreignSource];
 expect(applyCommand(w,{type:'designate',kind:'cut',x:2,z:2}).ok).toBe(true);const foreign=w.jobs.find(j=>j.kind==='cut')!;expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:foreign.id,queue:true}).ok).toBe(true);
 while(w.tick<pile.plantPack.expiresAt-1)stepWorld(w);const job=w.jobs.find(j=>j.tree?.resourceId===source.id)!;
 expect(job.tree?.kind).toBe('replant');if(job.tree?.kind!=='replant')throw Error('Paid replant expected');expect(job.tree.phase).toBe('prepare');expect(job.tree.workCore).toBeGreaterThan(0);
 const skill=structuredClone(p.skills.plants),rng=w.rng,nextId=w.nextId;stepWorld(w);
 expect(pile.plantPack.pendingExpiry?.quantity).toBe(23);expect(p.skills.plants).toEqual(skill);expect(w.rng).toBe(nextDraw(rng));expect(w.nextId).toBe(nextId);expect(w.jobs.some(j=>j.id===job.id)).toBe(false);expect(p.orders.queue).toEqual([foreign.id]);expect(p.interruptedCargo).toBe(true);exact(w);
});