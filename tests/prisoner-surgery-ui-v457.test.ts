import {expect,test,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {prisonerSurgeryCamp457} from './scenarios/prisoner-surgery-v457.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {healthSurgeryActionsAvailable280,healthSurgeryView,requestInspectedAmputation,requestInspectedInstallation,requestInspectedProstheticRemoval273,cancelInspectedAmputation} from '../src/ui/health-inspection.ts';
import {patientWork,patientProposal} from '../src/sim/patient-rest.ts';
import {lyingPatient} from '../src/sim/care-access.ts';
import {medicalRestNeeded,treatmentTarget} from '../src/sim/care-rules.ts';
import {prisonBedValid} from '../src/sim/prison-space.ts';
import {blockedCells,reachableCells} from '../src/sim/pathfinding.ts';
import {startPrisonBreak} from '../src/sim/prison-break.ts';
import {reservedSource} from '../src/sim/materials.ts';
import {writeTestFileSync,testOutputPath} from './test-output.ts';
import type {Command,World} from '../src/sim/types.ts';

const units=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((sum,p)=>sum+p.quantity,0);
const command=(w:World,c:Command)=>{const result=applyCommand(w,c);expect(result.ok,result.reason).toBe(true);};
function until(w:World,done:()=>boolean,limit=1000){for(let n=0;n<limit&&!done();n++)stepWorld(w);expect(done(),`Actual state at tick ${w.tick}`).toBe(true);expect(validateWorld(w)).toEqual([]);}
function reload(w:World){const raw=serializeWorld(w),copy=deserializeWorld(raw);expect(serializeWorld(copy)).toBe(raw);return copy;}
function actors(mode:'missing-leg'|'infected-leg'='missing-leg'){
 const f=prisonerSurgeryCamp457(mode),w=f.world,p=w.pawns.find(p=>p.id===f.patientId)!,d=w.pawns.find(p=>p.id===f.doctorId)!,bed=w.structures.find(b=>b.id===f.bedId)!;
 return {...f,w,p,d,bed};
}

/** These are the real snapshot projection and click dispatch used by the DOM.
 * Pointer/layout and muted WebGPU remain the separate native qualification. */
test('therapeutic captive operations have independent UI access and no work or self-treatment privilege; historical/future authority stays closed',()=>{
 const {w,p}=actors('infected-leg'),before=JSON.stringify(w),actions={version:()=>w.schemaVersion,request:vi.fn(),install:vi.fn(),remove:vi.fn(),cancel:vi.fn()};
 expect(validateWorld(w)).toEqual([]);expect(healthSurgeryActionsAvailable280(p,280)).toBe(true);
 expect(healthSurgeryActionsAvailable280(p,279)).toBe(false);expect(healthSurgeryActionsAvailable280(p,281)).toBe(false);
 const view=healthSurgeryView(p,w);expect(view.choices.find(c=>c.part==='left-leg')?.reason).toBeUndefined();
 expect(view.choices.filter(c=>c.part!=='left-leg').every(c=>c.reason!==undefined)).toBe(true);
 expect(view.installations.every(c=>c.reason!==undefined)).toBe(true);expect(view.removals).toEqual([]);
 expect(requestInspectedAmputation(p,'left-leg',actions)).toBeUndefined();expect(actions.request.mock.calls).toEqual([[p.id,'left-leg']]);
 expect(requestInspectedProstheticRemoval273(p,'left-leg','prosthetic-leg',actions)).toBeTruthy();expect(actions.remove).not.toHaveBeenCalled();
 for(const version of [279,281]){const old={...w,schemaVersion:version} as unknown as World;expect(healthSurgeryView(p,old).choices.every(c=>c.reason!==undefined)).toBe(true);}
 expect(p.priorities.patient).toBe(0);expect(p.priorities.bedrest).toBe(0);expect(p.selfTend).toBeUndefined();expect(JSON.stringify(w)).toBe(before);
 expect(applyCommand(w,{type:'priority',pawnId:p.id,work:'doctor',value:1}).ok).toBe(false);
 expect(applyCommand(w,{type:'surgery-remove-prosthetic',pawnId:p.id,part:'left-leg'}).ok).toBe(false);
 expect(JSON.stringify(w)).toBe(before);
});

test('installation dispatch rereads the selected captive, exact missing root and effective version, without changing the displayed anatomy',()=>{
 const {w,p}=actors(),before=JSON.stringify(w);let version=280;
 const actions={version:()=>version,request:vi.fn(),install:vi.fn(),cancel:vi.fn()};
 const view=healthSurgeryView(p,w);expect(view.installations.find(c=>c.part==='left-leg'&&c.implant==='prosthetic-leg')?.reason).toBeUndefined();
 expect(view.installations.find(c=>c.part==='right-leg'&&c.implant==='prosthetic-leg')?.reason).toBeTruthy();
 version=279;expect(requestInspectedInstallation(p,'left-leg','prosthetic-leg',actions)).toBeTruthy();expect(actions.install).not.toHaveBeenCalled();
 version=280;expect(requestInspectedInstallation(p,'left-leg','prosthetic-leg',actions)).toBeUndefined();expect(actions.install.mock.calls).toEqual([[p.id,'left-leg','prosthetic-leg']]);
 expect(requestInspectedInstallation(p,'right-leg','prosthetic-leg',actions)).toBeTruthy();expect(actions.install).toHaveBeenCalledTimes(1);
 expect(JSON.stringify(w)).toBe(before);
 command(w,{type:'surgery-install',pawnId:p.id,part:'left-leg',implant:'prosthetic-leg'});
 expect(requestInspectedInstallation(p,'left-leg','prosthetic-leg',actions)).toContain('déjà');expect(actions.install).toHaveBeenCalledTimes(1);
 expect(cancelInspectedAmputation(p,actions)).toBe(true);expect(actions.cancel.mock.calls).toEqual([[p.id]]);expect(p.surgeryRequest).toBeDefined();
});

test('a mobile healed captive with Patient and Bed rest disabled actually walks to and retains the real prison bed; release intention alone remains admissible',()=>{
 const {w,p,bed}=actors(),prisoner=p.prisoner!,origin={x:p.x,z:p.z};
 expect(validateWorld(w)).toEqual([]);expect(prisonBedValid(w,bed)).toBe(true);expect(treatmentTarget(p)).toBeUndefined();expect(medicalRestNeeded(p)).toBe(false);expect(p.health!.anesthetic).toBeUndefined();
 expect(p.state).toBe('idle');expect(patientWork(p,w.schemaVersion)).toBeUndefined();
 command(w,{type:'surgery-install',pawnId:p.id,part:'left-leg',implant:'prosthetic-leg'});
 expect(patientWork(p,279)).toBeUndefined();expect(patientWork(p)).toBeUndefined();expect(patientWork(p,280)).toBe('patient');
 until(w,()=>lyingPatient(p));expect(w.tick).toBeGreaterThan(3000);expect({x:p.x,z:p.z}).not.toEqual(origin);expect({x:p.x,z:p.z}).toEqual({x:bed.x,z:bed.z});
 expect(p.need).toMatchObject({kind:'sleep',phase:'sleep',bedId:bed.id,medical:'patient'});expect(p.state).toBe('resting');expect(p.prisoner).toBe(prisoner);
 expect(p.priorities.patient).toBe(0);expect(p.priorities.bedrest).toBe(0);expect(p.health!.anesthetic).toBeUndefined();expect(units(w,'medicine')).toBe(6);expect(units(w,'prosthetic-leg')).toBe(1);reload(w);
 command(w,{type:'prisoner-mode',patientId:p.id,mode:'release'});stepWorld(w,20);
 expect(p.prisoner?.releasedAt).toBeUndefined();expect(p.surgeryRequest?.implant).toBe('prosthetic-leg');expect(lyingPatient(p)).toBe(true);expect(patientWork(p,280)).toBe('patient');
 command(w,{type:'surgery-cancel',pawnId:p.id});expect(p.surgeryRequest).toBeUndefined();expect(p.need?.kind==='sleep'&&p.need.medical).toBeFalsy();expect(units(w,'medicine')).toBe(6);reload(w);
});

test('a civilian role or an invalid prison room provides no operative bed or fictitious rest',()=>{
 const f=actors(),{w,p,bed}=f;command(w,{type:'prison-bed',bedId:bed.id,enabled:false});
 command(w,{type:'surgery-install',pawnId:p.id,part:'left-leg',implant:'prosthetic-leg'});
 expect(patientProposal(w,p,reachableCells(w,p,blockedCells(w),new Set()))).toBeUndefined();expect(p.health!.anesthetic).toBeUndefined();
 expect(units(w,'medicine')).toBe(6);expect(units(w,'prosthetic-leg')).toBe(1);expect(lyingPatient(p)).toBe(false);reload(w);
});

test('real industrial collection and anesthesia keep captive identity and exact staged inputs through whole reload and cancellation',()=>{
 const f=actors(),{w,p,d,bed}=f,prisoner=p.prisoner!,piece=w.piles.find(q=>q.id===f.pieceId)!;
 expect(validateWorld(w)).toEqual([]);command(w,{type:'priority',pawnId:d.id,work:'doctor',value:1});
 const beforeRaw=serializeWorld(w);
 command(w,{type:'surgery-install',pawnId:p.id,part:'left-leg',implant:'prosthetic-leg'});until(w,()=>d.surgery?.phase==='work');
 expect(p.prisoner).toBe(prisoner);expect(p.faction).toBe('outlaws');expect(lyingPatient(p)).toBe(true);expect(d.surgery?.bedId).toBe(bed.id);
 expect(p.health!.artificialParts).toBeUndefined();expect(p.health!.anesthetic).toBeDefined();expect(units(w,'medicine')).toBe(5);expect(units(w,'prosthetic-leg')).toBe(1);
 expect(reservedSource(w,piece.id)).toBe(1);expect(d.surgery!.ingredients?.map(i=>[i.item,i.quantity,i.stage])).toEqual([['prosthetic-leg',1,'placed'],['medicine',1,'placed']]);
 const workRaw=serializeWorld(w),copy=reload(w),anesthetic=structuredClone(p.health!.anesthetic),inputs=structuredClone(d.surgery!.ingredients!),xp=d.skills.medicine.xp;
 for(const state of [w,copy])command(state,{type:'surgery-cancel',pawnId:p.id});expect(serializeWorld(copy)).toBe(serializeWorld(w));
 expect(p.health!.anesthetic).toEqual(anesthetic);expect(p.prisoner).toBe(prisoner);expect(p.surgeryRequest).toBeUndefined();expect(d.surgery).toBeUndefined();expect(d.skills.medicine.xp).toBe(xp);
 expect(units(w,'medicine')).toBe(5);expect(units(w,'prosthetic-leg')).toBe(1);expect(reservedSource(w,piece.id)).toBe(0);
 for(const i of inputs)expect(w.piles.find(q=>q.id===i.pileId)).toMatchObject({item:i.item,quantity:i.quantity,owner:{type:'ground',...i.cell}});
 reload(w);
 const folder='artifacts/prisoner-surgery-v457';writeTestFileSync(`${folder}/before.json`,beforeRaw);writeTestFileSync(`${folder}/work.json`,workRaw);writeTestFileSync(`${folder}/cancelled.json`,serializeWorld(w));
 writeTestFileSync(`${folder}/manifest.json`,JSON.stringify({version:457,schemaVersion:280,beforePath:testOutputPath(`${folder}/before.json`),beforeSha256:createHash('sha256').update(beforeRaw).digest('hex'),workPath:testOutputPath(`${folder}/work.json`),cancelledPath:testOutputPath(`${folder}/cancelled.json`),patientId:p.id,doctorId:d.id,helperId:f.helperId,bedId:bed.id,pieceId:piece.id,medicineId:f.medicineId,fromTick:JSON.parse(beforeRaw).tick,workTick:JSON.parse(workRaw).tick,toTick:w.tick,preparation:f.preparation,authority:'Doctor1 was applied through the real command before before.json. No operation is requested at that checkpoint. The native route must import before.json and play request, movement, collection and result itself.'},null,2)+'\n');
});

test('changing the actual prison-bed role interrupts a real anesthetized surgery and retains every unconsumed original',()=>{
 const {w,p,d,bed,pieceId}=actors();command(w,{type:'priority',pawnId:d.id,work:'doctor',value:1});command(w,{type:'surgery-install',pawnId:p.id,part:'left-leg',implant:'prosthetic-leg'});until(w,()=>d.surgery?.phase==='work');
 const anesthetic=structuredClone(p.health!.anesthetic),prisoner=p.prisoner!,piece=w.piles.find(q=>q.id===pieceId)!;
 command(w,{type:'prison-bed',bedId:bed.id,enabled:false});
 expect(d.surgery).toBeUndefined();expect(p.surgeryRequest).toBeUndefined();expect(p.health!.anesthetic).toEqual(anesthetic);expect(p.prisoner).toBe(prisoner);
 expect(w.piles.find(q=>q.id===pieceId)).toBe(piece);expect(piece.owner.type).toBe('ground');expect(units(w,'medicine')).toBe(5);expect(units(w,'prosthetic-leg')).toBe(1);reload(w);
});

test('an actual breakout invalidates a pending therapeutic request instead of leaving an archived operative intent',()=>{
 const {w,p}=actors();command(w,{type:'surgery-install',pawnId:p.id,part:'left-leg',implant:'prosthetic-leg'});
 expect(startPrisonBreak(w,p)).toBe(true);stepWorld(w);
 expect(p.surgeryRequest).toBeUndefined();expect(p.prisoner?.breakout?.active).toBeDefined();expect(patientWork(p,280)).toBeUndefined();
 expect(w.pawns.every(a=>a.surgery?.patientId!==p.id)).toBe(true);expect(units(w,'medicine')).toBe(6);expect(units(w,'prosthetic-leg')).toBe(1);reload(w);
});

test('the existing release service physically releases a still-mobile requesting captive before any clinical dose, then clears the incompatible intent',()=>{
 const {w,p,d}=actors(),prisoner=p.prisoner!;
 command(w,{type:'surgery-install',pawnId:p.id,part:'left-leg',implant:'prosthetic-leg'});command(w,{type:'prisoner-mode',patientId:p.id,mode:'release'});
 expect(p.surgeryRequest).toBeDefined();expect(p.prisoner?.releasedAt).toBeUndefined();
 command(w,{type:'priority',pawnId:d.id,work:'basic',value:1});until(w,()=>p.prisoner?.releasedAt!==undefined);
 expect(p.prisoner).toBe(prisoner);expect(p.prisoner?.releasedAt).toBe(w.tick);expect(p.surgeryRequest).toBeUndefined();expect(p.health!.anesthetic).toBeUndefined();
 expect(w.pawns.every(a=>a.surgery?.patientId!==p.id)).toBe(true);expect(units(w,'medicine')).toBe(6);expect(units(w,'prosthetic-leg')).toBe(1);reload(w);
});
