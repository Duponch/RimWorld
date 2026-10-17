/** Core scalar component rules, shared by creation and the closed save guard.
 * These functions do not manufacture a scheduler, actor or a second PRNG. */
import type {WorldGenerationRandom} from './world-generation-random.ts';
const f=Math.fround;
export function hiveNextReproductionCore256(core:number,nearbyCount:number,enemyFactor:number,random:Pick<WorldGenerationRandom,'float'>):number {
 if(!Number.isSafeInteger(core)||core<0||!Number.isSafeInteger(nearbyCount)||nearbyCount<0||!Number.isFinite(enemyFactor)||enemyFactor<0)throw Error('Invalid actual Hive scheduling inputs');
 const rate=nearbyCount>=7?f(.35):f(1+f(f(-.65)*f(nearbyCount/7))),days=random.float(2,3),delay=enemyFactor>0?Math.trunc(f(f(days*60000)/f(rate*f(enemyFactor)))):Math.trunc(days)*60000;
 if(!Number.isSafeInteger(core+delay))throw Error('Hive scheduling overflow');return core+delay;
}
export function hiveNextPawnCore256(core:number,count:number,enemyFactor:number,random:Pick<WorldGenerationRandom,'float'>):number {
 if(!Number.isSafeInteger(core)||core<0||!Number.isSafeInteger(count)||count<0||!Number.isFinite(enemyFactor)||enemyFactor<0)throw Error('Invalid actual insect scheduling inputs');
 const rate=count>=5?f(.5):f(1-f(.1*count)),delay=f(random.float(.85,1.15)*60000),next=core+Math.trunc(enemyFactor>0?f(delay/f(rate*f(enemyFactor))):delay);
 if(!Number.isSafeInteger(next))throw Error('Insect scheduling overflow');return next;
}
/** TickList Rare places things by abs(ThingID)%250, not HashOffset. An actor
 * created during a tick first participates strictly after its spawn tick. */
export function glowPodAgeAtCore256(id:number,madeAtCore:number,core:number):number {
 if(!Number.isSafeInteger(id)||id<1||!Number.isSafeInteger(madeAtCore)||madeAtCore<0||!Number.isSafeInteger(core)||core<madeAtCore)throw Error('Invalid actual GlowPod clock');
 const phase=id%250,first=madeAtCore+((phase-madeAtCore%250+250)%250||250),count=core<first?0:1+Math.floor((core-first)/250);return -1+count*250;
}
