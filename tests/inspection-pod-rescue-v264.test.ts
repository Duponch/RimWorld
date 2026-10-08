import { expect, test } from 'vitest';
import type { World } from '../src/sim/types';
import { podRescueInspectionStatus } from '../src/ui/pawn-inspection';

type InspectedPawn = Parameters<typeof podRescueInspectionStatus>[1];
type Incident = NonNullable<World['podRescues']>['incidents'][number];
const patient = (admittedAt?: number): InspectedPawn => ({
  id: 7, faction: 'outlanders', state: 'downed', podRescue: { incidentId: 1, ...(admittedAt === undefined ? {} : { admittedAt }) },
});
const world = (incident: Partial<Incident> = {}): Pick<World, 'podRescues'> => ({ podRescues: {
  profile: 'civilian-pod-rescue-v1', serial: 1, departed: [],
  incidents: [{ id: 1, start: 0, openedAt: 10, pawnId: 7, origin: 'independent', ...incident }],
} });

test('an independent patient has no promised membership before rescue or recovery', () => {
  const w = world(), p = patient(), before = JSON.stringify([w, p]);
  expect(podRescueInspectionStatus(w, p)).toBe('Naufragé indépendant · Pas encore secouru.');
  expect(JSON.stringify([w, p])).toBe(before);
  expect(podRescueInspectionStatus(w, patient(12))).toContain('N’a pas encore décidé de rester');
});

test('an affiliated patient will depart while an independent patient needs a confirmed decision', () => {
  expect(podRescueInspectionStatus(world({ origin: 'outlander' }), patient(12)))
    .toBe('Naufragé affilié à une faction extérieure · Accueilli et en soins · Repartira après sa récupération.');
  expect(podRescueInspectionStatus(world({ decision: { at: 15, outcome: 'left', admittedAt: 12 } }), patient(12)))
    .toBe('Naufragé indépendant · Repartira après sa récupération.');
});

test('membership history comes from the incident after the patient marker is removed', () => {
  const p: InspectedPawn = { id: 7, faction: 'colony', state: 'idle' };
  const w = world({ result: 'joined', resolvedAt: 15, decision: { at: 15, outcome: 'joined', admittedAt: 12 } });
  expect(podRescueInspectionStatus(w, p)).toBe('Ancien naufragé indépendant · A rejoint la colonie après son secours.');
  expect(podRescueInspectionStatus(w, { ...p, state: 'dead' })).toBe('Ancien naufragé indépendant · A rejoint la colonie après son secours.');
  expect(podRescueInspectionStatus(w, { ...p, faction: 'outlanders' })).toBe('Ancien naufragé indépendant · A rejoint la colonie après son secours.');
  expect(podRescueInspectionStatus(w, { ...p, id: 8 })).toBeUndefined();
});

test('legacy capsules and unrelated colonists retain their existing inspection', () => {
  const w = world(); delete w.podRescues!.incidents[0]!.origin;
  expect(podRescueInspectionStatus(w, patient(12))).toBeUndefined();
  expect(podRescueInspectionStatus(world(), { id: 7, faction: 'colony', state: 'idle' })).toBeUndefined();
});

test('terminal rescue outcomes do not keep announcing recovery or membership', () => {
  expect(podRescueInspectionStatus(world({ result: 'dead', resolvedAt: 14 }), { ...patient(12), state: 'dead' }))
    .toBe('Naufragé indépendant · Décédé.');
  expect(podRescueInspectionStatus(world({ result: 'captured', resolvedAt: 14 }), patient(12)))
    .toBe('Naufragé indépendant · Capturé.');
});
