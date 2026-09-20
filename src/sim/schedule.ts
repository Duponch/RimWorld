import { calendarTick } from './calendar.ts';
import { sleepBlocked } from './disturbance-state.ts';
import { TICKS_PER_DAY, type CommandResult, type Pawn, type World } from './types.ts';

export const SCHEDULE_ASSIGNMENTS = ['anything', 'work', 'sleep', 'recreation'] as const;
export type ScheduleAssignment = typeof SCHEDULE_ASSIGNMENTS[number];
export type ScheduleCommand =
  | { type: 'schedule-paint'; pawnId: number; hours: number[]; assignment: ScheduleAssignment }
  | { type: 'schedule-replace'; pawnId: number; assignments: ScheduleAssignment[] };

export const hourOfDay = (tick: number): number => Math.floor((tick % TICKS_PER_DAY) * 24 / TICKS_PER_DAY);
export const assignmentAt = (world: World, pawn: Pawn): ScheduleAssignment => pawn.schedule[hourOfDay(calendarTick(world))]!;
export const defaultSchedule = (): ScheduleAssignment[] => Array.from({length: 24}, (_, h) => h >= 6 && h < 22 ? 'anything' : 'sleep');
export const validAssignment = (v: unknown): v is ScheduleAssignment => typeof v === 'string' && SCHEDULE_ASSIGNMENTS.includes(v as ScheduleAssignment);
export const validSchedule = (v: unknown): v is ScheduleAssignment[] => Array.isArray(v) && v.length === 24 && Array.from(v).every(validAssignment);

/** Timetable changes intentions only. Physical tasks are reconsidered by the tick. */
export function applyScheduleCommand(world: World, command: ScheduleCommand): CommandResult {
  const pawn = world.pawns.find(p => p.id === command.pawnId);
  if (!pawn) return {ok: false, code: 'missing-target', reason: 'Colon introuvable.'};
  if (command.type === 'schedule-paint') {
    if (!Array.isArray(command.hours) || !command.hours.length || command.hours.length > 24 || !validAssignment(command.assignment)
      || Array.from(command.hours).some(h => !Number.isInteger(h) || h < 0 || h > 23) || new Set(command.hours).size !== command.hours.length)
      return {ok: false, code: 'invalid-command', reason: 'Plage horaire invalide.'};
    const schedule = [...pawn.schedule];
    for (const hour of command.hours) schedule[hour] = command.assignment;
    pawn.schedule = schedule;
  } else {
    if (!validSchedule(command.assignments)) return {ok: false, code: 'invalid-command', reason: 'Un horaire doit contenir 24 plages valides.'};
    pawn.schedule = [...command.assignments];
  }
  pawn.needCooldown = 0;
  return {ok: true};
}

export function wantsSleep(world: World, pawn: Pawn): boolean {
  if(sleepBlocked(world,pawn))return false;
  if(pawn.mental?.crisis)return pawn.rest<=15&&pawn.hunger>0&&assignmentAt(world,pawn)!=='work';
  const assignment = assignmentAt(world, pawn);
  if (assignment === 'work' || (world.restRules === 'adult' && pawn.hunger <= 0)) return false;
  return assignment === 'sleep' ? pawn.rest < 75 : world.restRules === 'legacy' ? pawn.rest <= 30 : pawn.rest < 30;
}

export function scheduleWakes(world: World, pawn: Pawn): boolean {
  return assignmentAt(world, pawn) === 'work' && pawn.rest >= 20;
}
