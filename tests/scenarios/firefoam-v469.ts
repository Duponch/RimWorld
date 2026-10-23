import {foodWorkstationCamp} from './food-workstations.ts';
import type {Structure} from '../../src/sim/types.ts';

export const FIREFOAM_MANUAL_PREPARATION_469='Prepared 32 square control at tick2000 from the existing one-human kitchen fixture. Original healthy adult, grass terrain, full initial needs, deterioration baseline at this prepared tick and one finished firefoam popper are declared; no research/build acquisition is claimed by this manual-order fixture. No wick, foam, protection, progress or RNG outcome is supplied after an order starts. Physical paid construction and automatic/extinction runs belong to their separate ROOT controls.';
/** Isolated manual-admission fixture. No command, step or runtime is executed
 * while this module loads; all subsequent travel/use belongs to each test. */
export function firefoamManualCamp469(){
 const w=foodWorkstationCamp(),pawn=w.pawns[0]!;
 w.deterioration!.lastTick=w.tick;
 const popper:Structure={id:w.nextId++,kind:'firefoam-popper',x:12,z:10,orientation:0,footprint:'standard',material:'steel',firefoam290:{autoRebuild:false}};
 w.structures.push(popper);return {w,pawn,popper,preparation:FIREFOAM_MANUAL_PREPARATION_469};
}
