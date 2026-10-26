import {expect,test} from 'vitest';
import {applyCommand,canDesignate,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {detectFirefoam290,startFirefoamWick290,advanceFirefoamWaves290} from '../src/sim/firefoam-290.ts';
import {firefoamManualCamp469} from './scenarios/firefoam-v469.ts';
import {damageStructure} from '../src/sim/thing-damage.ts';
import {startFire,attachPawnFire} from '../src/sim/fire.ts';
import {extinguishFire} from '../src/sim/fire.ts';
import {firePosition} from '../src/sim/fire-rules.ts';
import {addGroundMaterial} from '../src/sim/materials.ts';
import {deliveredMaterial} from '../src/sim/construction-materials.ts';
import {addFilth,advanceFilth} from '../src/sim/filth.ts';
import {FireContent} from '../src/sim/fire-content.ts';
import {newDoorState} from '../src/sim/door-rules.ts';
import type {World,Structure} from '../src/sim/types.ts';

const exact=(w:World)=>{expect(validateWorld(w)).toEqual([]);const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);};
function until(w:World,done:()=>boolean,max=2500){for(let n=0;n<max&&!done();n++)stepWorld(w);expect(done(),JSON.stringify({tick:w.tick,jobs:w.jobs,pawn:w.pawns[0]})).toBe(true);}
function researched(w:World){w.research={points:0,project:null,firefoam:{points:600_000_000,completedAt:w.tick}};}
function wood(w:World,x:number,z:number){addGroundMaterial(w,'wood',10,{x,z},'wood');return startFire(w,{x,z},.8);}
function wall(w:World,x:number,z:number,kind:'wall'|'door'='wall'){const s:Structure={id:w.nextId++,kind,x,z,orientation:0,footprint:'standard',material:'steel',...(kind==='door'?{door:newDoorState(w.tick)}:{})};w.structures.push(s);return s;}

test('automatic sensor consults only global250Core boundaries and strictly excludes distance3',()=>{
 const {w,popper}=firefoamManualCamp469();wood(w,15,10);detectFirefoam290(w,20000);expect(popper.firefoam290!.wick).toBeUndefined();
 wood(w,14,10);detectFirefoam290(w,20001);expect(popper.firefoam290!.wick).toBeUndefined();detectFirefoam290(w,20000);
 expect(popper.firefoam290!.wick?.startedAtCore).toBe(20000);expect(popper.firefoam290!.wick!.endCore-20000).toBeGreaterThanOrEqual(140);exact(w);
});
test('closed doors separate detection while a genuine open route may detour beyond the small sensor disk',()=>{
 const {w,popper}=firefoamManualCamp469();for(let z=0;z<w.height;z++)wall(w,13,z,z===10?'door':'wall');wood(w,14,10);
 detectFirefoam290(w,20000);expect(popper.firefoam290!.wick).toBeUndefined();const door=w.structures.find(s=>s.kind==='door')!;door.door!.open=true;
 detectFirefoam290(w,20000);expect(popper.firefoam290!.wick).toBeDefined();
 const other=firefoamManualCamp469();for(let z=7;z<=13;z++)wall(other.w,13,z);wood(other.w,14,10);detectFirefoam290(other.w,20000);expect(other.popper.firefoam290!.wick).toBeDefined();
});
test('a real attached human fire is detected at its current physical position',()=>{
 const {w,pawn,popper}=firefoamManualCamp469();pawn.x=14;pawn.z=10;expect(attachPawnFire(w,pawn.id,.7)).toBe(true);
 const f=w.fires!.items.find(f=>f.attachedPawnId===pawn.id)!;expect(firePosition(w,f)).toMatchObject({x:14,z:10});detectFirefoam290(w,20000);expect(popper.firefoam290!.wick).toBeDefined();
});
test('arming is idempotent and extinguishing the initiating fire cannot reset the paid fuse',()=>{
 const {w,popper}=firefoamManualCamp469();wood(w,14,10);detectFirefoam290(w,20000);const wick=structuredClone(popper.firefoam290!.wick),rng=w.firefoam290!.rng;
 for(let n=0;n<20;n++)expect(startFirefoamWick290(w,popper,20000)).toBe(true);expect(w.firefoam290!.rng).toBe(rng);expect(popper.firefoam290!.wick).toEqual(wick);
 for(const fire of [...w.fires!.items])extinguishFire(w,fire.id,99999);const copy=deserializeWorld(serializeWorld(w));until(w,()=>!w.structures.includes(popper),20);stepWorld(copy,w.tick-copy.tick);expect(copy).toEqual(w);exact(w);
});
test('expiry consumes the original, propagates only due cells, extinguishes real fire and grants a fresh900Core after the clinical interval',()=>{
 const {w,pawn,popper}=firefoamManualCamp469();pawn.x=12;pawn.z=11;expect(attachPawnFire(w,pawn.id,.5)).toBe(true);wood(w,14,10);
 expect(startFirefoamWick290(w,popper)).toBe(true);until(w,()=>!w.structures.includes(popper),20);
 expect(w.bombWaves??[]).toEqual([]);expect(pawn.bombRefuge).toBeUndefined();expect(w.destroyed?.lost).toMatchObject({steel:75,component:1});
 const wave=w.firefoam290!.waves[0]!;expect(wave.sourceId).toBe(popper.id);expect(wave.nextCell).toBeLessThan(wave.cells.length);
 until(w,()=>!!pawn.health?.coveredInFirefoam290,5);expect(pawn.health!.coveredInFirefoam290!.remainingCore).toBe(900);expect(pawn.burning).toBeUndefined();expect(attachPawnFire(w,pawn.id,.5)).toBe(false);exact(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);stepWorld(w,4);stepWorld(copy,4);expect(copy).toEqual(w);expect(pawn.health!.coveredInFirefoam290!.remainingCore).toBe(860);exact(w);
 expect(w.filth?.items.some(f=>f.kind==='firefoam')).toBe(true);
});
test('lethal violence emits helpful foam and no salvage while a nonlethal flame arms just once',()=>{
 const first=firefoamManualCamp469();expect(damageStructure(first.w,first.popper,1,'fire')).toBe(true);expect(first.popper.firefoam290!.wick).toBeDefined();const wick=structuredClone(first.popper.firefoam290!.wick),rng=first.w.firefoam290!.rng;
 expect(damageStructure(first.w,first.popper,1,'fire')).toBe(true);expect(first.popper.firefoam290!.wick).toEqual(wick);expect(first.w.firefoam290!.rng).toBe(rng);
 const {w,popper}=firefoamManualCamp469();expect(damageStructure(w,popper,50,'melee')).toBe(true);expect(w.piles).toHaveLength(0);expect(w.structures).not.toContain(popper);expect(w.firefoam290!.waves).toHaveLength(1);
 advanceFirefoamWaves290(w);expect(w.bombWaves).toBeUndefined();exact(w);
});
test('radius9.9 captures a helpful halo without residue and persists the captured geometry through a later obstacle change',()=>{
 const {w,popper}=firefoamManualCamp469();expect(damageStructure(w,popper,50,'melee')).toBe(true);const wave=w.firefoam290!.waves[0]!,capture=structuredClone(wave.cells),halo=structuredClone(wave.damageOnlyCells);
 expect(halo.length).toBeGreaterThan(0);expect(halo).not.toContain(10*w.width+12);advanceFirefoamWaves290(w);wall(w,13,10);
 for(let n=0;n<3;n++){w.tick++;advanceFirefoamWaves290(w);}expect(wave.cells).toEqual(capture);
 for(const i of halo)expect(w.filth?.items.some(f=>f.kind==='firefoam'&&f.z*w.width+f.x===i)).toBe(false);
});
test('new foam on the ground refuses new ignition but retains actual fuel and preexisting flame damage',()=>{
 const {w}=firefoamManualCamp469();const cell={x:20,z:20};wood(w,cell.x,cell.z);const fire=w.fires!.items[0]!,fuel=new FireContent(w).fuel(cell);
 expect(addFilth(w,cell,'firefoam')).toBe(true);expect(new FireContent(w).chance(cell)).toBe(0);expect(new FireContent(w).fuel(cell)).toBe(fuel);expect(w.fires!.items).toContain(fire);
 extinguishFire(w,fire.id,99999);const before=serializeWorld(w);expect(startFire(w,cell,.7)).toBe(false);expect(serializeWorld(w)).toBe(before);
});
test('new foam uses real rain and ageing and the old version refuses it before allocating a trace or RNG',()=>{
 const {w}=firefoamManualCamp469();expect(addFilth(w,{x:20,z:20},'firefoam')).toBe(true);const f=w.filth!.items[0]!;expect(f.expiresAfterCore).toBeGreaterThanOrEqual(300000);expect(f.expiresAfterCore).toBeLessThan(600000);
 w.tick=Math.ceil(f.nextCheckCore/10);advanceFilth(w,1);expect(w.filth!.items).not.toContain(f);
 const old=firefoamManualCamp469().w;Object.assign(old,{schemaVersion:289});const before=JSON.stringify(old);expect(addFilth(old,{x:20,z:20},'firefoam')).toBe(false);expect(JSON.stringify(old)).toBe(before);
});
test('an ordinary cleaner walks to the real foam in Home and earns its100 units of removal work',()=>{
 const {w,pawn}=firefoamManualCamp469();w.structures=[];pawn.priorities.clean=1;const cell={x:10,z:8};expect(applyCommand(w,{type:'area',action:'home',from:cell,to:cell}).ok).toBe(true);expect(addFilth(w,cell,'firefoam')).toBe(true);
 const trace=w.filth!.items[0]!;until(w,()=>!!pawn.cleaning);expect(w.filth!.items).toContain(trace);until(w,()=>!w.filth!.items.includes(trace));expect(w.filth!.cleaned).toBe(1);exact(w);
});
test('paid construction waits for the75th steel and real Construction5, then unfinished work and the whole world continue exactly',()=>{
 const {w,pawn}=firefoamManualCamp469();w.structures=[];researched(w);pawn.priorities.build=1;pawn.priorities.haul=2;pawn.skills.construction.level=4;
 const cell={x:10,z:8};expect(applyCommand(w,{type:'area',action:'home',from:cell,to:cell}).ok).toBe(true);
 addGroundMaterial(w,'steel',74,{x:5,z:6},'steel');addGroundMaterial(w,'component',1,{x:6,z:6},'component');
 expect(applyCommand(w,{type:'designate',kind:'firefoam-popper',material:'steel',orientation:0,...cell}).ok).toBe(true);const job=w.jobs.at(-1)!;
 until(w,()=>deliveredMaterial(w,job,'steel')===74);stepWorld(w,12);expect(job.progress).toBe(0);expect(w.structures).toHaveLength(0);
 addGroundMaterial(w,'steel',1,{x:5,z:7},'steel');until(w,()=>deliveredMaterial(w,job,'steel')===75&&deliveredMaterial(w,job,'component')===1);stepWorld(w,12);expect(job.progress).toBe(0);
 pawn.skills.construction.level=5;pawn.planCooldown=0;until(w,()=>job.progress>0);exact(w);const copy=deserializeWorld(serializeWorld(w));until(w,()=>w.structures.some(s=>s.kind==='firefoam-popper'));stepWorld(copy,w.tick-copy.tick);expect(copy).toEqual(w);
 const result=w.structures.find(s=>s.kind==='firefoam-popper')!;expect(result.firefoam290).toEqual({autoRebuild:true});expect(w.piles.filter(p=>p.item==='steel'||p.item==='component')).toHaveLength(0);exact(w);
});
test('automatic rebuild creates a distinct empty unpaid blueprint, with an explicit enabled option outside Home retained',()=>{
 const {w,popper}=firefoamManualCamp469();researched(w);expect(applyCommand(w,{type:'firefoam-auto-rebuild',structureId:popper.id,on:true}).ok).toBe(true);
 expect(damageStructure(w,popper,50,'melee')).toBe(true);const job=w.jobs.find(j=>j.kind==='firefoam-popper')!;
 expect(job).toMatchObject({material:'steel',construction:'blueprint',progress:0,reservedBy:null,escrow:{wood:0,food:0}});expect(job.id).not.toBe(popper.id);expect(deliveredMaterial(w,job,'steel')).toBe(0);expect(deliveredMaterial(w,job,'component')).toBe(0);
 advanceFirefoamWaves290(w);exact(w);stepWorld(w,12);expect(job.progress).toBe(0);expect(w.structures).toHaveLength(0);
});
test('ordinary uninstall stops the wick and reinstallation preserves the same physical original without another payment',()=>{
 const {w,pawn,popper}=firefoamManualCamp469();pawn.priorities.build=1;pawn.priorities.haul=2;
 expect(applyCommand(w,{type:'designate',kind:'uninstall',x:popper.x,z:popper.z}).ok).toBe(true);until(w,()=>w.jobs.some(j=>j.kind==='uninstall'&&j.progress>0));expect(startFirefoamWick290(w,popper)).toBe(true);until(w,()=>w.packed.some(p=>p.building===popper),20);expect(popper.firefoam290!.wick).toBeUndefined();exact(w);
 expect(applyCommand(w,{type:'install',structureId:popper.id,x:18,z:16,orientation:0}).ok).toBe(true);until(w,()=>w.structures.includes(popper));expect(popper).toMatchObject({x:18,z:16,firefoam290:{autoRebuild:false}});expect(w.destroyed?.count??0).toBe(0);exact(w);
});
test('a packed original lost to violence produces no remote helpful wave or rebuild',()=>{
 const {w,popper}=firefoamManualCamp469();w.structures=[];w.packed.push({building:popper,owner:{type:'ground',x:popper.x,z:popper.z}});popper.firefoam290!.autoRebuild=true;researched(w);
 expect(damageStructure(w,popper,50,'melee')).toBe(true);expect(w.packed).toHaveLength(0);expect(w.firefoam290).toBeUndefined();expect(w.jobs).toHaveLength(0);exact(w);
});
test('research admission and invalid material/rotation never grant a plan or alter a current world',()=>{
 const {w}=firefoamManualCamp469();w.structures=[];const command={type:'designate' as const,kind:'firefoam-popper' as const,material:'steel' as const,x:14,z:14,orientation:0 as const};
 let before=serializeWorld(w);expect(canDesignate(w,command).ok).toBe(false);expect(applyCommand(w,command).ok).toBe(false);expect(serializeWorld(w)).toBe(before);researched(w);
 for(const c of [{...command,material:'wood'},{...command,orientation:1}]){before=serializeWorld(w);expect(applyCommand(w,c as never).ok).toBe(false);expect(serializeWorld(w)).toBe(before);}
});

test('the actual researcher earns all600 points at the desk and reload preserves unfinished research before construction admission',()=>{
 const {w,pawn}=firefoamManualCamp469();w.structures=[];pawn.priorities.research=1;pawn.skills.intellectual={level:20,xp:0,dailyXp:0,passion:0};pawn.schedule.fill('anything');
 w.structures.push({id:w.nextId++,kind:'research-bench',material:'wood',x:7,z:5,orientation:0,footprint:'standard'});
 addGroundMaterial(w,'food',20,{x:5,z:5},'simple-meal');
 expect(applyCommand(w,{type:'research-project',project:'firefoam'} as never).ok).toBe(true);expect(w.research!.firefoam!.points).toBe(0);
 until(w,()=>!!w.research?.firefoam&&w.research.firefoam.points>0,600);expect(w.research!.firefoam!.completedAt).toBeUndefined();exact(w);
 const copy=deserializeWorld(serializeWorld(w));until(w,()=>w.research?.firefoam?.completedAt!==undefined,20000);stepWorld(copy,w.tick-copy.tick);expect(copy).toEqual(w);
 expect(w.research!.firefoam!.points).toBe(600_000_000);expect(w.research!.project).toBeNull();expect(canDesignate(w,{type:'designate',kind:'firefoam-popper',material:'steel',x:14,z:14,orientation:0}).ok).toBe(true);exact(w);
},120_000);
