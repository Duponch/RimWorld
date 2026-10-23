import {expect,test} from 'vitest';
import {animalAreaHumanPhaseMutable287,animalAreaHomePhaseMutable287} from '../src/sim/animal-area-human-admission-287.ts';
import {commitAllowedAreaChange} from '../src/sim/allowed-area-reconcile.ts';
import {startJobOrder} from '../src/sim/player-orders.ts';
import {applyCommand} from '../src/sim/index.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {brandCampaignContext} from '../src/sim/world-map-context.ts';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction.ts';

// Existing real colony fixture/original humans. Assignment/reservation/cargo
// below are declared initial conditions; no played animal or medical gain.
function camp(){const w=deconstructionCamp(2),p=w.pawns[0]!,other=w.pawns[1]!;return {w,p,other};}
function working(){const f=camp();expect(applyCommand(f.w,{type:'designate',kind:'wall',x:13,z:14}).ok).toBe(true);
 const job=f.w.jobs.at(-1)!;startJobOrder(f.p,job,[]);return {...f,job};}
const own=(v:object,key:string)=>Object.getOwnPropertyDescriptor(v,key);

test('ordinary original job passes admission and its real area-release provider, without random or clinical work',()=>{
 const {w,p,job}=working(),ids=new Set([p.id]);p.health=createMedicalRecord(w.tick);Object.freeze(p.health);
 const before=JSON.stringify(w),rng=w.rng,health=p.health;
 expect(animalAreaHumanPhaseMutable287(w,[p],ids)).toBe(true);expect(JSON.stringify(w)).toBe(before);
 commitAllowedAreaChange(w,[p],{ids,drops:new Map()});
 expect(job.reservedBy).toBeNull();expect(job.status).toBe('pending');expect(p.jobId).toBeNull();expect(p.orders.active).toBeNull();
 expect(p.recreation.task).toBeNull();expect(p.path).toEqual([]);expect(p.planCooldown).toBe(0);expect(p.needCooldown).toBe(0);
 expect(w.rng).toBe(rng);expect(p.health).toBe(health);
});

test('same-value frozen orders.active null refuses before any area owner could change',()=>{
 const {w,p}=camp();p.orders.active=null;Object.defineProperty(p.orders,'active',{writable:false});
 const before=JSON.stringify(w),descriptor=own(p.orders,'active');
 expect(animalAreaHumanPhaseMutable287(w,[p],new Set([p.id]))).toBe(false);
 expect(JSON.stringify(w)).toBe(before);expect(own(p.orders,'active')).toEqual(descriptor);
});

test('replacement of a frozen path array is allowed; a nonwritable path slot is refused',()=>{
 const {w,p}=camp();Object.freeze(p.path);
 expect(animalAreaHumanPhaseMutable287(w,[p],new Set())).toBe(true);
 Object.defineProperty(p,'path',{writable:false});const before=JSON.stringify(w);
 expect(animalAreaHumanPhaseMutable287(w,[p],new Set())).toBe(false);expect(JSON.stringify(w)).toBe(before);
});

test('absent optional deletions do not reject an ordinary nonextensible original',()=>{
 const {w,p}=camp();delete p.priorityWork;delete p.allowedAreaReturn;Object.preventExtensions(p);
 expect(animalAreaHumanPhaseMutable287(w,[p],new Set([p.id]))).toBe(true);
});

test('accessor and inherited actor records are rejected without invoking their getter',()=>{
 const {w,p}=camp();let reads=0;
 Object.defineProperty(p,'path',{enumerable:true,configurable:true,get(){reads++;return [];}});
 expect(animalAreaHumanPhaseMutable287(w,[p],new Set([p.id]))).toBe(false);expect(reads).toBe(0);
 Object.defineProperty(p,'path',{value:[],writable:true,configurable:true});
 Object.setPrototypeOf(p.orders,{queue:[]});
 expect(animalAreaHumanPhaseMutable287(w,[p],new Set([p.id]))).toBe(false);expect(reads).toBe(0);
});

test('frozen recreation null and reserved job fields are checked on the actual recipients',()=>{
 const {w,p,job}=working();Object.defineProperty(p.recreation,'task',{writable:false});
 expect(animalAreaHumanPhaseMutable287(w,[p],new Set([p.id]))).toBe(false);
 Object.defineProperty(p.recreation,'task',{writable:true});Object.defineProperty(job,'reservedBy',{writable:false});
 expect(animalAreaHumanPhaseMutable287(w,[p],new Set([p.id]))).toBe(false);
 expect(job.reservedBy).toBe(p.id);expect(p.jobId).toBe(job.id);
});

test('reconciliation also admits the other human queue and its actual reservation before the first write',()=>{
 const {w,p,other,job}=working();job.reservedBy=other.id;other.orders.queue=[job.id];
 Object.defineProperty(other.orders,'queue',{writable:false});const before=JSON.stringify(w);
 expect(animalAreaHumanPhaseMutable287(w,[p],new Set())).toBe(false);expect(JSON.stringify(w)).toBe(before);
 Object.defineProperty(other.orders,'queue',{writable:true});Object.defineProperty(job,'status',{writable:false});
 expect(animalAreaHumanPhaseMutable287(w,[p],new Set())).toBe(false);expect(job.reservedBy).toBe(other.id);
});

test('a carried material original needs its owner slot mutable, without crediting any stock',()=>{
 const {w,p}=camp();addMaterial(w,'wood',3,{type:'pawn',pawnId:p.id},'wood');const pile=w.piles.at(-1)!;
 const stock=structuredClone(w.stock),before=JSON.stringify(w);Object.defineProperty(pile,'owner',{writable:false});
 expect(animalAreaHumanPhaseMutable287(w,[p],new Set([p.id]))).toBe(false);
 expect(JSON.stringify(w)).toBe(before);expect(w.stock).toEqual(stock);
 Object.defineProperty(pile,'owner',{writable:true});expect(animalAreaHumanPhaseMutable287(w,[p],new Set([p.id]))).toBe(true);
});

test('overdue medical release refuses without calling the clinical kernel; a current frozen record is harmless',()=>{
 const {w,p}=camp();w.tick=10;p.health=createMedicalRecord(9);
 p.need={kind:'sleep',phase:'sleep',medical:'patient',bedId:null,target:{x:p.x,z:p.z}};
 const before=JSON.stringify(w),rng=w.rng;
 expect(animalAreaHumanPhaseMutable287(w,[p],new Set([p.id]))).toBe(false);
 expect(JSON.stringify(w)).toBe(before);expect(w.rng).toBe(rng);
 p.health=createMedicalRecord(w.tick);Object.freeze(p.health);
 expect(animalAreaHumanPhaseMutable287(w,[p],new Set([p.id]))).toBe(true);
});

test('a real second human carry is conservatively refused, with both originals intact',()=>{
 const {w,p,other}=camp();p.rescue={patientId:other.id,bedId:0,phase:'carry'};
 const before=JSON.stringify(w),people=[...w.pawns];
 expect(animalAreaHumanPhaseMutable287(w,[p],new Set([p.id]))).toBe(false);
 expect(JSON.stringify(w)).toBe(before);expect(w.pawns[0]).toBe(people[0]);expect(w.pawns[1]).toBe(people[1]);
});

test('a genuinely branded local context reads the real root clock without evaluating forwarding getters',()=>{
 const {w,p}=camp(),local={...w};brandCampaignContext(local,w,0);let reads=0;
 Object.defineProperty(local,'schemaVersion',{configurable:true,get(){reads++;throw Error('Must use actual root data');}});
 Object.defineProperty(local,'tick',{configurable:true,get(){reads++;throw Error('Must use actual root clock');}});
 expect(animalAreaHumanPhaseMutable287(local,[p],new Set([p.id]))).toBe(true);expect(reads).toBe(0);
});

test('286 remains literal and288 is closed before actor inspection; nonoriginal recipients are refused in287',()=>{
 const {w,p}=camp();let reads=0;Object.assign(w,{schemaVersion:286});
 Object.defineProperty(p,'orders',{configurable:true,get(){reads++;throw Error('Historical actors must not be read');}});
 expect(animalAreaHumanPhaseMutable287(w,[p],new Set([p.id]))).toBe(true);expect(reads).toBe(0);
 Object.assign(w,{schemaVersion:288});expect(animalAreaHumanPhaseMutable287(w,[p],new Set([p.id]))).toBe(false);expect(reads).toBe(0);
 const fresh=camp();expect(animalAreaHumanPhaseMutable287(fresh.w,[structuredClone(fresh.p)],new Set([fresh.p.id]))).toBe(false);
});

test('Home ordinary maintenance/event/stock admission is read-only and accepts the existing normal recipients',()=>{
 const {w}=working();Object.assign(fixtureBuilding(w,'wall',20,20),{damage:1});
 const before=JSON.stringify(w),rng=w.rng;expect(animalAreaHomePhaseMutable287(w)).toBe(true);
 expect(JSON.stringify(w)).toBe(before);expect(w.rng).toBe(rng);
});

test('Home checks idle planners and its event array even when no human task is being released',()=>{
 const {w,p}=camp();Object.defineProperty(p,'planCooldown',{writable:false});
 expect(animalAreaHumanPhaseMutable287(w,[],new Set())).toBe(true);expect(animalAreaHomePhaseMutable287(w)).toBe(false);
 Object.defineProperty(p,'planCooldown',{writable:true});Object.freeze(w.events);
 const before=JSON.stringify(w);expect(animalAreaHomePhaseMutable287(w)).toBe(false);expect(JSON.stringify(w)).toBe(before);
});

test('Home prospective repair creation needs the actual job-array capacity and campaign counter',()=>{
 const {w}=camp();Object.assign(fixtureBuilding(w,'wall',20,20),{damage:1});
 Object.defineProperty(w,'nextId',{writable:false});const before=JSON.stringify(w);
 expect(animalAreaHomePhaseMutable287(w)).toBe(false);expect(JSON.stringify(w)).toBe(before);
 Object.defineProperty(w,'nextId',{writable:true});Object.preventExtensions(w.jobs);
 expect(animalAreaHomePhaseMutable287(w)).toBe(false);expect(w.jobs).toHaveLength(0);
});

test('Home uses the real shared counter owner of a branded map, never its forwarding getter',()=>{
 const {w,p}=camp();Object.assign(fixtureBuilding(w,'wall',20,20),{damage:1});const local={...w};brandCampaignContext(local,w,0);let reads=0;
 Object.defineProperty(local,'nextId',{configurable:true,get(){reads++;throw Error('Read actual root descriptor');}});
 Object.defineProperty(w,'nextId',{writable:false});
 expect(animalAreaHomePhaseMutable287(local)).toBe(false);expect(reads).toBe(0);
 Object.defineProperty(w,'nextId',{writable:true});expect(animalAreaHomePhaseMutable287(local)).toBe(true);expect(reads).toBe(0);expect(local.pawns[0]).toBe(p);
});

test('Home refreshStock admits every existing escrow destination and keeps historical286 literal',()=>{
 const {w,job}=working();Object.defineProperty(job,'escrow',{writable:false});
 const before=JSON.stringify(w);expect(animalAreaHomePhaseMutable287(w)).toBe(false);expect(JSON.stringify(w)).toBe(before);
 Object.assign(w,{schemaVersion:286});expect(animalAreaHomePhaseMutable287(w)).toBe(true);
 Object.assign(w,{schemaVersion:288});expect(animalAreaHomePhaseMutable287(w)).toBe(false);
});
