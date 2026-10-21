import {expect,test} from 'vitest';
import {surgeryCamp} from './helpers/surgery-v192.ts';
import {addMaterial,refreshStock,reservedSource} from '../src/sim/materials.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {installWoodenPart,installArtificialPart} from '../src/sim/artificial-parts.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {validSurgeryTaskShape,validSurgeryRequestShape} from '../src/sim/surgery-save.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {lyingPatient} from '../src/sim/care-access.ts';
import {surgeryReason} from '../src/sim/surgery.ts';
import {pawnBody} from '../src/sim/health-rules.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';
import type {Command,World} from '../src/sim/types.ts';
import type {ProstheticItem273} from '../src/sim/prosthetic-content-273.ts';

const units=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
const command=(w:World,c:Command)=>{const r=applyCommand(w,c);expect(r.ok,r.reason).toBe(true);};
function until(w:World,done:()=>boolean,limit=2000){for(let i=0;i<limit&&!done();i++)stepWorld(w);expect(done(),`tick ${w.tick}`).toBe(true);expect(validateWorld(w)).toEqual([]);}
function reload(w:World){const text=serializeWorld(w),copy=deserializeWorld(text);expect(serializeWorld(copy)).toBe(text);return copy;}
function prepared(item:ProstheticItem273='prosthetic-leg',wood=false){
 const f=surgeryCamp(),w=f.world,d=w.pawns.find(p=>p.id===f.doctorId)!,p=w.pawns.find(p=>p.id===f.patientId)!;
 p.health=createMedicalRecord(w.tick);d.skills.medicine.level=20;
 const part=item==='prosthetic-arm'?'left-shoulder' as const:'left-leg' as const;
 if(wood){p.health.missing=[{part:'left-leg',bornAt:w.tick,tended:true}];expect(installWoodenPart(p.health,'left-leg','peg-leg')).toBe(true);}
 addMaterial(w,'prosthesis',1,{type:'ground',x:13,z:5},item);refreshStock(w);
 const piece=w.piles.find(q=>q.item===item)!;return {...f,w,d,p,item,part,piece};
}
function start(f:ReturnType<typeof prepared>){command(f.w,{type:'surgery-install',pawnId:f.p.id,part:f.part,implant:f.item});until(f.w,()=>lyingPatient(f.p));command(f.w,{type:'priority',pawnId:f.d.id,work:'doctor',value:1});}

test.each(['prosthetic-arm','prosthetic-leg'] as const)('%s has real admission and exclusive haul, retains piece plus second dose through work, then commits once',item=>{
 const f=prepared(item),{w,d,p,piece}=f;start(f);
 until(w,()=>d.surgery?.ingredients?.some(i=>i.stage==='held')===true);reload(w);
 expect(piece.owner).toEqual({type:'pawn',pawnId:d.id});expect(reservedSource(w,piece.id)).toBe(0);expect(units(w,item)).toBe(1);expect(units(w,'medicine')).toBe(3);
 until(w,()=>d.surgery?.phase==='work');expect(units(w,'medicine')).toBe(2);expect(units(w,item)).toBe(1);
 expect(reservedSource(w,piece.id)).toBe(1);
 expect(d.surgery!.ingredients?.map(i=>[i.item,i.quantity,i.stage])).toEqual([[item,1,'placed'],['medicine',1,'placed']]);
 expect(validSurgeryTaskShape(d.surgery,273,w)).toBe(true);expect(validSurgeryTaskShape(d.surgery,272,w)).toBe(false);
 const retained=structuredClone(d.surgery!),missing=structuredClone(retained);delete missing.ingredients;expect(validSurgeryTaskShape(missing,273,w)).toBe(false);
 const copy=reload(w),startTick=w.tick,encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
 expect(decoder.adopt(structuredClone(encoder.encode(w,0,0))).status).toBe('applied');
 until(w,()=>d.surgery===undefined);stepWorld(copy,w.tick-startTick);expect(serializeWorld(copy)).toBe(serializeWorld(w));
 expect(p.health!.artificialParts).toEqual([{part:f.part,kind:item,installedAt:p.health!.tick}]);expect(units(w,item)).toBe(0);expect(units(w,'medicine')).toBe(1);
 expect(w.piles.some(q=>q.id===piece.id)).toBe(false);expect(p.surgeryRequest).toBeUndefined();expect(d.skills.medicine.xp).toBeGreaterThan(0);
 expect(decoder.adopt(structuredClone(encoder.encode(w,0,0))).status).toBe('applied');reload(w);
});

test('industrial cancellation after anesthesia retains the exact staged piece and second dose without refunding the first',()=>{
 const f=prepared(),{w,d,p,piece}=f;start(f);until(w,()=>d.surgery?.phase==='work');
 const ingredients=structuredClone(d.surgery!.ingredients!),anesthetic=structuredClone(p.health!.anesthetic),copy=reload(w);
 for(const state of [w,copy])command(state,{type:'surgery-cancel',pawnId:p.id});expect(serializeWorld(copy)).toBe(serializeWorld(w));
 expect(p.health!.anesthetic).toEqual(anesthetic);expect(p.health!.artificialParts).toBeUndefined();expect(units(w,f.item)).toBe(1);expect(units(w,'medicine')).toBe(2);
 expect(w.piles.find(q=>q.id===piece.id)?.owner.type).toBe('ground');
 for(const i of ingredients)expect(w.piles.find(q=>q.id===i.pileId)).toMatchObject({item:i.item,quantity:i.quantity,owner:{type:'ground',...i.cell}});
 expect(reservedSource(w,piece.id)).toBe(0);expect(d.surgery).toBeUndefined();expect(p.surgeryRequest).toBeUndefined();reload(w);
});

test('a real wooden leg is returned once on successful industrial replacement, while native anatomy produces no limb item',()=>{
 const f=prepared('prosthetic-leg',true),{w,d,p}=f;start(f);until(w,()=>d.surgery?.phase==='work');
 const next=w.nextId;until(w,()=>d.surgery===undefined);
 expect(p.health!.artificialParts?.[0]?.kind).toBe('prosthetic-leg');expect(units(w,'wood')).toBe(1);
 const returned=w.piles.find(q=>q.item==='wood')!;expect(returned.id).toBeGreaterThanOrEqual(next);expect(returned.owner.type).toBe('ground');reload(w);
});

test.each(['prosthetic-arm','prosthetic-leg'] as const)('%s explicit removal on a legacy medical body captures the actual kind, uses one dose and returns a fresh full-health physical piece',item=>{
 const f=prepared(item),{w,d,p,piece}=f;w.piles=w.piles.filter(q=>q!==piece);expect(p.health!.humanHealthScale).toBeUndefined();expect(installArtificialPart(p.health!,f.part,item)).toBe(true);refreshStock(w);
 d.skills.medicine.level=2; // Removal has no minimum medical skill; keep one real surgeon.
 command(w,{type:'surgery-remove-prosthetic',pawnId:p.id,part:f.part});expect(p.surgeryRequest?.removeArtificial273).toBe(item);
 expect(validSurgeryRequestShape(p.surgeryRequest,272,w.tick)).toBe(false);until(w,()=>lyingPatient(p));
 command(w,{type:'priority',pawnId:d.id,work:'doctor',value:1});expect(surgeryReason(w,d,p)).toBeUndefined();
 // Prepared high skill precedes all clinical draws and real work; the guard
 // above separately admits this removal with the actual low-skill surgeon.
 d.skills.medicine.level=20;until(w,()=>d.surgery?.phase==='work');
 expect(units(w,'medicine')).toBe(2);const next=w.nextId,copy=reload(w),at=w.tick;
 until(w,()=>d.surgery===undefined);stepWorld(copy,w.tick-at);expect(serializeWorld(copy)).toBe(serializeWorld(w));
 expect(p.health!.artificialParts).toBeUndefined();expect(p.health!.missing).toContainEqual({part:f.part,bornAt:p.health!.tick,nonFresh:true});
 expect(units(w,item)).toBe(1);expect(units(w,'medicine')).toBe(2);
 expect(w.piles.find(q=>q.item===item)).toMatchObject({id:next,kind:'prosthesis',quantity:1,owner:{type:'ground'}});
 expect(w.piles.find(q=>q.item===item)!.damage).toBeUndefined();reload(w);
});

test('failed industrial replacement consumes the final physical inputs before the result and returns no displaced prosthesis',()=>{
 const f=prepared('prosthetic-leg',true),{w,d,p}=f;w.rng=1;d.skills.medicine.level=4; // Prepared before all played clinical draws.
 start(f);until(w,()=>d.surgery?.phase==='work');expect(units(w,f.item)).toBe(1);expect(units(w,'medicine')).toBe(2);
 const copy=reload(w),at=w.tick;until(w,()=>d.surgery===undefined);stepWorld(copy,w.tick-at);expect(serializeWorld(copy)).toBe(serializeWorld(w));
 expect(w.events.some(e=>e.message.includes('prothèse')&&e.message.includes('échoué'))).toBe(true);
 expect(p.health!.artificialParts?.some(a=>a.kind==='prosthetic-leg')??false).toBe(false);
 expect(units(w,f.item)).toBe(0);expect(units(w,'medicine')).toBe(1);expect(units(w,'wood')).toBe(0);
 expect(p.health!.injuries.length+p.health!.missing.length).toBeGreaterThan(0);expect(p.surgeryRequest).toBeUndefined();expect(d.skills.medicine.xp).toBeGreaterThan(0);reload(w);
});

test('a declared prior clinical/civil gap keeps the real surgery birth clinical across work reload and public continuation',()=>{
 const f=prepared(),{w,d,p}=f;
 // Prepared pre-existing suspension offset only; this test claims neither a
 // casket construction nor played entry. Every surgical step remains real.
 p.health=createMedicalRecord(w.tick-100);p.health.civilTick271=w.tick;
 start(f);until(w,()=>d.surgery?.phase==='work');const copy=reload(w),at=w.tick;
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();expect(decoder.adopt(structuredClone(encoder.encode(w,0,0))).status).toBe('applied');
 until(w,()=>d.surgery===undefined);stepWorld(copy,w.tick-at);expect(serializeWorld(copy)).toBe(serializeWorld(w));
 expect(p.health!.civilTick271).toBe(w.tick);expect(p.health!.tick).toBe(w.tick-100);
 expect(p.health!.artificialParts).toEqual([{part:f.part,kind:f.item,installedAt:w.tick-100}]);
 expect(decoder.adopt(structuredClone(encoder.encode(w,0,0))).status).toBe('applied');reload(w);
});

test('a real wooden-leg replacement naturally wakes and walks the same patient, with exact awake and arrived reloads',()=>{
 const f=prepared('prosthetic-leg',true),{w,d,p,piece}=f;
 // Declared starting property, prepared before the first played tick: the
 // existing medical bed, three ordinary beds and thirty finite survival meals.
 // No health, state or random value is changed after this preparation.
 for(const [i,pawn] of w.pawns.entries()){
  pawn.bedId=fixtureBuilding(w,'bed',2+i*3,10).id;pawn.schedule.fill('anything');
  addMaterial(w,'food',10,{type:'ground',x:3+i,z:2},'survival-meal');
 }
 refreshStock(w);expect(validateWorld(w)).toEqual([]);
 expect(units(w,'survival-meal')).toBe(30);expect(pawnBody(p).capacities.moving).toBe(.8);
 start(f);until(w,()=>d.surgery?.phase==='work');until(w,()=>d.surgery===undefined);
 const operatedAt=w.tick,installed=structuredClone(p.health!.artificialParts);
 expect(installed).toEqual([{part:'left-leg',kind:'prosthetic-leg',installedAt:p.health!.tick}]);
 expect(p.health!.anesthetic).toBeDefined();expect(pawnBody(p).capacities.moving).toBe(0);
 expect(units(w,'wood')).toBe(1);expect(units(w,'prosthetic-leg')).toBe(0);expect(units(w,'medicine')).toBe(1);
 expect(w.piles.some(q=>q.id===piece.id)).toBe(false);
 // Ordinary work permission supplies real bedside feeding if it becomes
 // necessary; neither surgeon nor helper receives food, rest or a cure here.
 command(w,{type:'priority',pawnId:f.helperId,work:'doctor',value:1});
 until(w,()=>!p.health!.anesthetic&&p.state!=='downed'&&p.state!=='sleeping'&&p.state!=='resting'&&p.need?.kind!=='sleep',12001);
 expect(w.tick).toBeGreaterThan(operatedAt);expect(w.pawns.find(q=>q.id===f.patientId)).toBe(p);
 expect(p.health!.death).toBeUndefined();expect(p.health!.malnutrition).toBeUndefined();expect(p.hunger).toBeGreaterThan(0);
 expect(p.health!.artificialParts).toEqual(installed);expect(pawnBody(p).capacities.moving).toBe(.92);
 expect(units(w,'survival-meal')).toBeGreaterThan(0);expect(units(w,'survival-meal')).toBeLessThan(30);
 const origin={x:p.x,z:p.z},target=[{x:14,z:10},{x:14,z:6},{x:14,z:3},{x:14,z:13}]
  .find(c=>!w.pawns.some(q=>q.x===c.x&&q.z===c.z))!;
 expect(target).toBeDefined();expect(target).not.toEqual(origin);
 const awake=reload(w),awakeAt=w.tick;
 for(const state of [w,awake]){
  command(state,{type:'draft',pawnIds:[p.id],enabled:true});
  command(state,{type:'draft-move',pawnIds:[p.id],target,queue:false});
 }
 let travelled=false;
 until(w,()=>{
  if(p.motion&&(p.motion.from.x!==p.motion.to.x||p.motion.from.z!==p.motion.to.z))travelled=true;
  // The finished edge remains authoritative presentation history.
  return p.x===target.x&&p.z===target.z&&(p.motion?.end??0)<=w.tick&&p.path.length===0&&p.moveCooldown===0;
 },500);
 expect(travelled).toBe(true);expect(w.tick).toBeGreaterThan(awakeAt);expect({x:p.x,z:p.z}).toEqual(target);
 stepWorld(awake,w.tick-awakeAt);expect(serializeWorld(awake)).toBe(serializeWorld(w));reload(w);
 expect(p.health!.artificialParts).toEqual(installed);expect(p.health!.anesthetic).toBeUndefined();
 expect(units(w,'wood')).toBe(1);expect(units(w,'prosthetic-leg')).toBe(0);expect(units(w,'medicine')).toBe(1);
 expect(w.piles.some(q=>q.id===piece.id)).toBe(false);
},30000);
