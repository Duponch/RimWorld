import {beforeAll,expect,test} from 'vitest';
import {purchaseNovelScenario482} from './scenarios/novel-v482.ts';
import {controlledInjury} from './scenarios/health.ts';
import {pawnBody} from '../src/sim/health-rules.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {applyReadBook295,applyReadingPolicy295,beginReading295,processReading295,readingRefusal295,selectAutomaticReading295} from '../src/sim/reading-runtime-295.ts';
import {newShipCasketHolder277} from '../src/sim/ship-casket-state-277.ts';
import {carrierOf} from '../src/sim/rescue-state.ts';
import {syncShipCasketPassenger277} from '../src/sim/ship-casket-carry-277.ts';
import {readingActive295,readingAllowed295,readingAutoNeeds295,effectiveReadingPolicy295,READING_AUTO_DURATION295,READING_MANUAL_DURATION295,type ReadingTask295} from '../src/sim/reading-state-295.ts';
import {readingPile295,readingBook295,readingPickupCandidates295,chooseReadingPlace295} from '../src/sim/reading-space-295.ts';
import {transferPile,reservedSource} from '../src/sim/materials.ts';
import {interruptWork,retryInterruptedCargo} from '../src/sim/interrupted-cargo.ts';
import {releaseWork} from '../src/sim/work-release.ts';
import {blockedCells,reachableCells} from '../src/sim/pathfinding.ts';
import {personalMoodThoughts} from '../src/sim/mood.ts';
import {learningFactor,XP_SCALE} from '../src/sim/skills.ts';
import {updateRecreation} from '../src/sim/recreation-rules.ts';
import {WEAPON_QUALITIES} from '../src/sim/equipment-rules.ts';
import {NOVEL_JOY_FACTORS_295} from '../src/sim/book-state-295.ts';
import type {NeedContext} from '../src/sim/needs.ts';
import type {Pawn,World} from '../src/sim/types.ts';

let purchased:ReturnType<typeof purchaseNovelScenario482>;
beforeAll(()=>{purchased=purchaseNovelScenario482();});
const fixture=()=>{
 const f=structuredClone(purchased),w=f.world,p=w.pawns.find(p=>p.id===f.ids.readerId)!,q=w.pawns.find(p=>p.id===f.ids.otherReaderId)!,book=w.piles.find(p=>p.id===f.ids.bookId)!;
 return {...f,w,p,q,book};
};
const context=(w:World,p:Pawn,defer=false):NeedContext=>({search:goals=>defer?null:reachableCells(w,p,blockedCells(w),new Set(),goals),move:()=>{},release:()=>releaseWork(w,p),event:()=>{}});
/** Only an isolated active boundary is PREPARED: the common book was actually
 * paid for and landed; this is not a claim that pickup/seating was played. */
function active(manual=false){
 const f=fixture(),{w,p,book}=f;
 expect(transferPile(w,book,{type:'pawn',pawnId:p.id})).toBe(true);
 Object.assign(p,{...f.cells.chair,path:[],motion:null,moveCooldown:0,state:'recreating' as const});p.schedule.fill('recreation');
 p.recreation.level=20;p.recreation.task={activity:'read',bookId:book.id,stage:'read',phase:'active',target:{...f.cells.chair},seatId:f.ids.chairId,buildingId:f.ids.tableId,elapsed:0,...manual?{manual:true as const}:{}};
 return {...f,task:p.recreation.task as ReadingTask295};
}
const thoughts=(p:Pawn,w:World)=>personalMoodThoughts(p,{tick:w.tick,people:new Map(),items:w.piles,difficultyMood:0});

test('inspection and missing policy/tolerance are neutral, repeatable and do not draw RNG or adopt fields',()=>{
 const {w,p,book}=fixture(),before=JSON.stringify(w);
 for(let i=0;i<4;i++){expect(effectiveReadingPolicy295(p)).toBe(1);expect(readingRefusal295(w,p,book)).toBeNull();expect(readingAllowed295(p)).toBe(true);}
 expect(JSON.stringify(w)).toBe(before);expect(p).not.toHaveProperty('readingPolicy295');expect(p.recreation.tolerance).not.toHaveProperty('reading');expect(p.recreation.bored).not.toHaveProperty('reading');
});

test('manual source admission closes absent, forbidden, foreign, orbital, fogged and incapacitated targets without changing the world',()=>{
 for(const mutation of ['absent','forbidden','foreign','orbital','fogged','dead','drafted','blind','handless'] as const){
  const {w,p,q,book}=fixture();
  if(mutation==='absent')w.piles=w.piles.filter(b=>b!==book);
  if(mutation==='forbidden')book.forbidden=true;
  if(mutation==='foreign')book.owner={type:'inventory',pawnId:q.id};
  if(mutation==='orbital')book.owner={type:'orbital-ship',shipId:w.orbital!.ships[0]!.id};
  if(mutation==='fogged'){w.site={revision:3,tileId:0,mapSeed:w.seed,biome:'temperate-forest',hilliness:'flat',river:'none',stones:['granite','marble'],coastAngle:null,mutatorCode:0};w.exploration={revision:1};if(book.owner.type!=='ground')throw Error('Purchased book must be ground');w.tiles[book.owner.z*w.width+book.owner.x]!.fogged=true;}
  if(mutation==='dead')p.state='dead';
  if(mutation==='drafted')p.draft={lastActiveTick:w.tick,target:null,queue:[]};
  if(mutation==='blind'){controlledInjury(w,p,'left-eye',100000,'cut');controlledInjury(w,p,'right-eye',100000,'cut');expect(pawnBody(p).capacities.sight).toBe(0);}
  if(mutation==='handless'){controlledInjury(w,p,'left-hand',100000,'cut');controlledInjury(w,p,'right-hand',100000,'cut');expect(pawnBody(p).capacities.manipulation).toBe(0);}
  const before=JSON.stringify(w);expect(applyReadBook295(w,p.id,book.id).ok,mutation).toBe(false);expect(JSON.stringify(w),mutation).toBe(before);
 }
});

test('actual paid delivery, walk, pickup and seat grant no intellectual XP before active physical reading',()=>{
 const {w,p,book}=fixture(),state=structuredClone(book.book),damage=book.damage,initialXp=p.skills.intellectual?.xp??0;
 expect(applyCommand(w,{type:'read-book-295',pawnId:p.id,bookId:book.id}).ok).toBe(true);
 let picked=false,read=false;
 for(let i=0;i<300;i++){
  stepWorld(w);
  expect(w.piles.filter(b=>b.id===book.id)).toHaveLength(1);expect(book.book).toEqual(state);expect(book.damage).toBe(damage);
  picked ||=book.owner.type==='pawn'&&book.owner.pawnId===p.id;
  if(readingActive295(p)){read=true;break;}
  expect(p.skills.intellectual?.xp??0).toBe(initialXp);
 }
 expect(picked).toBe(true);expect(read).toBe(true);expect(book.owner).toEqual({type:'pawn',pawnId:p.id});expect(p.skills.intellectual!.xp).toBeGreaterThan(initialXp);
});

test('all seven qualities scale joy only; one raw XP per local read step follows the existing learning factor',()=>{
 for(let i=0;i<WEAPON_QUALITIES.length;i++){
  const {w,p,book}=active();book.book!.quality=WEAPON_QUALITIES[i]!;p.recreation.tolerance.reading=25;p.recreation.bored.reading=false;
  const skill=p.skills.intellectual??={level:0,xp:0,dailyXp:0,passion:0},xp=skill.xp,joy=p.recreation.level,factor=learningFactor(skill,p),rng=w.rng,nextId=w.nextId;
  expect(processReading295(w,p,context(w,p))).toBe(true);
  expect(p.recreation.level-joy).toBeCloseTo(.144*NOVEL_JOY_FACTORS_295[i]!*.75,10);expect(skill.xp-xp).toBe(Math.round(XP_SCALE*factor));
  expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);expect(book.quantity).toBe(1);
 }
});

test('auto800/manual500 count actual reading; a manual full-joy session continues and still learns',()=>{
 expect(READING_AUTO_DURATION295).toBe(800);expect(READING_MANUAL_DURATION295).toBe(500);
 for(const manual of [false,true]){
  const {w,p,task}=active(manual);task.elapsed=(manual?500:800)-2;if(manual)p.recreation.level=100;
  processReading295(w,p,context(w,p,true));expect(task.stage).toBe('read');expect(task.elapsed).toBe((manual?500:800)-1);
  const xp=p.skills.intellectual!.xp;processReading295(w,p,context(w,p,true));expect(task.stage).toBe('return');expect(task.phase).toBe('active');expect(task.elapsed).toBe(manual?500:800);expect(p.skills.intellectual!.xp).toBeGreaterThan(xp);
  const after=p.skills.intellectual!.xp;processReading295(w,p,context(w,p,true));expect(p.skills.intellectual!.xp).toBe(after);expect(readingActive295(p)).toBe(false);
 }
});

test('passion4/6 is a current reading situation and disappears in travel/return without creating a memory',()=>{
 const {w,p,task}=active();p.skills.intellectual??={level:0,xp:0,dailyXp:0,passion:0};const memories=structuredClone(p.memories);
 for(const passion of [0,1,2] as const){p.skills.intellectual.passion=passion;expect(thoughts(p,w).filter(t=>t.id.startsWith('reading-')).map(t=>t.offset)).toEqual(passion?[passion===1?4:6]:[]);}
 task.stage='seat';task.phase='travel';p.state='moving';expect(thoughts(p,w).some(t=>t.id.startsWith('reading-'))).toBe(false);
 task.stage='return';task.phase='active';p.state='idle';expect(thoughts(p,w).some(t=>t.id.startsWith('reading-'))).toBe(false);expect(p.memories).toEqual(memories);
});

test('automatic need margins and policy are prospective; disabling auto reading does not cancel manual reading',()=>{
 const {w,p,task,book}=active(true);expect(applyReadingPolicy295(w,p.id,2).ok).toBe(true);expect(p.recreation.task).toBe(task);expect(readingAllowed295(p)).toBe(false);expect(readingAllowed295(p,true)).toBe(true);
 for(const [hunger,rest,allowed] of [[29,33,true],[28.999,33,false],[29,32.999,false]] as const)expect(readingAutoNeeds295({...p,hunger,rest})).toBe(allowed);
 delete task.manual;expect(applyReadingPolicy295(w,p.id,2).ok).toBe(true);expect(p.recreation.task).toBeNull();expect(book.owner.type).toBe('ground');
});

test('reservation is exclusive at pickup and owned/inventory/cargo books never become automatic free candidates',()=>{
 const {w,p,q,book}=fixture();expect(applyReadBook295(w,p.id,book.id).ok).toBe(true);expect(reservedSource(w,book.id,q.id)).toBe(1);expect(readingPickupCandidates295(w,q).some(t=>t.bookId===book.id)).toBe(false);
 releaseWork(w,p);for(const owner of [{type:'inventory' as const,pawnId:p.id},{type:'pawn' as const,pawnId:p.id},{type:'orbital-ship' as const,shipId:w.orbital!.ships[0]!.id}]){
  book.owner=owner;expect(readingPickupCandidates295(w,q).some(t=>t.bookId===book.id)).toBe(false);
 }
});

test('real walls make book contacts unreachable; a budget deferral is preserved without RNG/XP',()=>{
 const {w,p,book}=fixture();if(book.owner.type!=='ground')throw Error('Purchased book must be ground');
 const c=book.owner;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)if(Math.abs(dx)+Math.abs(dz)===1)w.structures.push({id:w.nextId++,kind:'wall',x:c.x+dx,z:c.z+dz,orientation:0,footprint:'standard',material:'wood'});
 p.schedule.fill('recreation');const rng=w.rng,xp=p.skills.intellectual?.xp??0;
 expect(selectAutomaticReading295(w,p,context(w,p,true))).toBe(true);expect(p.recreation.task).toBeNull();expect(w.rng).toBe(rng);
 expect(selectAutomaticReading295(w,p,context(w,p))).toBe('unavailable');expect(p.skills.intellectual?.xp??0).toBe(xp);
});

test('seating uses real reachable furniture within32 and falls back without a fictional table bonus',()=>{
 const {w,p}=active();p.recreation.task=null;p.state='idle';
 const chosen=chooseReadingPlace295(w,p,context(w,p));expect(chosen?.seatId).toBe(purchased.ids.chairId);
 w.structures=w.structures.filter(s=>s.id!==purchased.ids.chairId&&s.id!==purchased.ids.tableId);
 const standing=chooseReadingPlace295(w,p,context(w,p));expect(standing?.seatId).toBeUndefined();expect(standing?.buildingId).toBeNull();expect(standing?.target).toEqual({x:p.x,z:p.z});
});

test('successful completion transports the same reusable book back to allowed storage',()=>{
 const {w,p,book,task,cells}=active(true);task.elapsed=499;
 processReading295(w,p,context(w,p));expect(task.stage).toBe('return');expect(task.target).toEqual(cells.storage);
 // Prepared arrival isolates the placement boundary; the separate native/full
 // walk case above owns movement and the engine owns every captured edge.
 Object.assign(p,{x:cells.storage.x,z:cells.storage.z,motion:null,path:[]});const text=structuredClone(book.book),id=book.id;
 processReading295(w,p,context(w,p));expect(p.recreation.task).toBeNull();expect(book.owner).toEqual({type:'ground',...cells.storage});expect(book.book).toEqual(text);expect(book.id).toBe(id);expect(book.quantity).toBe(1);
});

test('interruption over a captured edge retains the original book, releases all claims, then drops after real arrival',()=>{
 const {w,p,book,task}=active(true),from={x:p.x,z:p.z};task.stage='seat';task.phase='travel';p.x++;p.motion={from,to:{x:p.x,z:p.z},start:w.tick,end:w.tick+2};p.moveCooldown=2;p.state='moving';
 const joy=p.recreation.level,xp=p.skills.intellectual?.xp??0;interruptWork(w,p);
 expect(p.recreation.task).toBeNull();expect(p.interruptedCargo).toBe(true);expect(book.owner).toEqual({type:'pawn',pawnId:p.id});expect(reservedSource(w,book.id)).toBe(0);
 retryInterruptedCargo(w,p);expect(book.owner.type).toBe('pawn');expect(p.recreation.level).toBe(joy);expect(p.skills.intellectual?.xp??0).toBe(xp);
 w.tick+=2;p.moveCooldown=0;p.planCooldown=0;retryInterruptedCargo(w,p);expect(book.owner.type).toBe('ground');expect(p.interruptedCargo).toBeUndefined();expect(w.piles.filter(b=>b.id===book.id)).toHaveLength(1);
});

test('cache proves actual array membership after replacement/splice of unchanged length; removed books cannot grant joy',()=>{
 const {w,p,book,task}=active();expect(readingPile295(w,book.id)).toBe(book);
 const at=w.piles.indexOf(book),replacement={...book,id:w.nextId++,book:{...book.book!}};w.piles.splice(at,1,replacement);
 expect(readingPile295(w,book.id)).toBeUndefined();expect(readingBook295(w,p,task)).toBeUndefined();const joy=p.recreation.level;
 processReading295(w,p,context(w,p));expect(p.recreation.level).toBe(joy);expect(p.recreation.task).toBeNull();
});

test('an obstructed physical drop retains one original book through existing interrupted cargo and retries without allocation',()=>{
 const {w,p,book}=active(true);w.tiles=w.tiles.map(()=>({terrain:'rock' as const}));const nextId=w.nextId,original=structuredClone(book.book);
 interruptWork(w,p);expect(p.recreation.task).toBeNull();expect(p.interruptedCargo).toBe(true);expect(book.owner).toEqual({type:'pawn',pawnId:p.id});
 w.tiles[p.z*w.width+p.x]={terrain:'soil'};w.tiles[p.z*w.width+p.x+1]={terrain:'soil'};p.planCooldown=0;retryInterruptedCargo(w,p);
 expect(p.interruptedCargo).toBeUndefined();expect(book.owner.type).toBe('ground');expect(book.book).toEqual(original);expect(w.piles.filter(b=>b.id===book.id)).toHaveLength(1);expect(w.nextId).toBe(nextId);
});

test('optional reading tolerance decays only when owned and is never fabricated by old need updates',()=>{
 const {p}=fixture();const before=Object.keys(p.recreation.tolerance);updateRecreation(p);expect(Object.keys(p.recreation.tolerance)).toEqual(before);
 p.recreation.tolerance.reading=30;p.recreation.bored.reading=true;p.state='idle';updateRecreation(p);expect(p.recreation.tolerance.reading).toBeLessThan(30);expect(p.recreation.bored.reading).toBe(false);
});

test('a clinically capable recovered original still carried by a real casket owner cannot reserve, start or continue reading',()=>{
 const {w,p,q,book}=fixture();expect(transferPile(w,book,{type:'inventory',pawnId:p.id})).toBe(true);
 // PREPARED physical-owner boundary, not a claimed medication/recovery journey.
 // All original health, needs, skills and book data remain as actually acquired.
 const casket={id:w.nextId++,kind:'ship-cryptosleep-casket' as const,x:22,z:22,orientation:0 as const,footprint:'standard' as const,material:'steel' as const,power:{on:false,parentId:null},shipCryptosleep277:newShipCasketHolder277(w.tick)};w.structures.push(casket);
 q.shipCasketTask277={casketId:casket.id,action:'carry',phase:'carry',patient:{kind:'human',id:p.id},progressCore:0,lastWorkedAt:w.tick};q.path=[];q.motion=null;q.moveCooldown=0;q.state='moving';syncShipCasketPassenger277(w,q);p.state='idle';
 expect(carrierOf(w,p.id)).toBe(q);expect(readingAllowed295(p,true)).toBe(true);const whole=JSON.stringify(w),rng=w.rng,nextId=w.nextId;
 expect(readingRefusal295(w,p,book,true)).toMatch(/porté/);expect(applyReadBook295(w,p.id,book.id).ok).toBe(false);expect(beginReading295(w,p,book.id,true)).not.toBeNull();expect(selectAutomaticReading295(w,p,context(w,p))).toBe('unavailable');expect(JSON.stringify(w)).toBe(whole);
 expect(transferPile(w,book,{type:'pawn',pawnId:p.id})).toBe(true);p.recreation.task={activity:'read',bookId:book.id,stage:'read',phase:'active',target:{x:p.x,z:p.z},buildingId:null,elapsed:1,manual:true};p.state='recreating';const xp=p.skills.intellectual?.xp??0,joy=p.recreation.level;
 processReading295(w,p,context(w,p));expect(p.recreation.task).toBeNull();expect(p.skills.intellectual?.xp??0).toBe(xp);expect(p.recreation.level).toBe(joy);expect(carrierOf(w,p.id)).toBe(q);expect(book.owner.type).toBe('ground');expect(w.piles.filter(b=>b.id===book.id)).toHaveLength(1);expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);
});
