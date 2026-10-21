import {expect,test} from 'vitest';
import {medicalCamp} from './scenarios/health';
import {newCryptosleepHolder271,type PlayerCasket271} from '../src/sim/cryptosleep-state-271';
import {cryptosleepParts271} from '../src/render/cryptosleep-parts-271';
import {ConfirmedStructurePresentationSignature} from '../src/render/ConfirmedStructurePresentationSignature';
import {StructurePresentationSignature} from '../src/render/presentation-signatures';
import {pawnWorkPose,WORK_POSE} from '../src/render/work-presentation';
import {MotionTimeline} from '../src/render/MotionTimeline';
import {PawnLayer} from '../src/render/PawnLayer';

test.each([0,1,2,3] as const)('occupied and empty casket share eight finite resident parts at rotation%i and ownership changes invalidate both signatures',orientation=>{
 const w=medicalCamp(2),held=w.pawns.pop()!;
 const c:PlayerCasket271={id:w.nextId++,kind:'cryptosleep-casket',x:10,z:10,orientation,footprint:'standard',material:'steel',cryptosleep:newCryptosleepHolder271(w.tick)};w.structures=[c];
 const raw=new StructurePresentationSignature(),confirmed=new ConfirmedStructurePresentationSignature(),before=structuredClone(w),opened=cryptosleepParts271(w);
 expect(opened).toHaveLength(8);expect(opened.every(p=>p.targetId===c.id&&p.key===c.id)).toBe(true);
 for(const part of opened)for(const key of ['x','y','z','sx','sy','sz','ry'] as const)expect(Number.isFinite(part[key]??0)).toBe(true);
 const a=raw.read(w.structures,'',''),b=confirmed.readConfirmed(w.structures,'','');expect(a).toBe(b);expect(w).toEqual(before);
 c.cryptosleep.human=held;const closed=cryptosleepParts271(w);
 expect(closed).toHaveLength(opened.length);expect(closed).not.toEqual(opened);
 expect(raw.read(w.structures,'','')).not.toBe(a);expect(confirmed.readConfirmed(w.structures,'','',[0])).not.toBe(b);
 expect(raw.read(w.structures,'','')).toBe(confirmed.readConfirmed(w.structures,'','',[]));
});

test('carried patient follows the same resident rig and casket contact uses the existing crafting pose without mutating the world',()=>{
 const w=medicalCamp(2),p=w.pawns[0]!,patient=w.pawns[1]!;
 Object.assign(p,{x:11,z:10,state:'moving',path:[],moveCooldown:0});Object.assign(patient,{x:11,z:10,state:'downed',path:[],moveCooldown:0});
 p.cryptosleepTask={action:'carry',patientId:patient.id,casketId:w.nextId++,phase:'carry',progressCore:0,lastWorkedAt:w.tick};
 const before=structuredClone(w),layer=new PawnLayer();
 try{layer.update(w,1,true);const timeline=new MotionTimeline();timeline.tick=w.tick;layer.updateTravel(w,timeline);const g=layer.feedbackSource!;
  expect(g.getAttribute('aCargo').getX(0)).toBe(-1);expect(g.getAttribute('aMotion').getZ(1)).toBe(6);expect(w).toEqual(before);
  p.state='working';p.cryptosleepTask.phase='closing';expect(pawnWorkPose(p,undefined,'cryptosleep-casket')).toBe(WORK_POSE.craft);
  p.cryptosleepTask.action='open';p.cryptosleepTask.phase='opening';expect(pawnWorkPose(p,undefined,'cryptosleep-casket')).toBe(WORK_POSE.craft);
 }finally{layer.dispose();}
});
