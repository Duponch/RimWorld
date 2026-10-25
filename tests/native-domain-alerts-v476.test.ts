import {expect, test} from 'vitest';
import {createWorld} from '../src/sim/engine';
import {STARTING_ARRIVAL_PROFILE} from '../src/sim/starting-arrival-state';
import {readNativeDomainAlerts} from '../src/ui3d/native-domain-alerts';

test('an old camp gets no fabricated incident, quest or contained colonist', () => {
  const world = createWorld(476, 16, 16), before = structuredClone(world);
  const rows = readNativeDomainAlerts(world, 0);
  expect(rows.map(row => row.key)).toEqual(['domain:visitors']);
  expect(rows[0]).toMatchObject({action: {kind: 'trade'}, targets: []});
  expect(world).toEqual(before);
});

test('the initial arrival names its actual contained people before map actors exist', () => {
  const world = createWorld(476, 16, 16), people = world.pawns.slice(0, 3);
  world.pawns = [];
  world.startingArrival = {profile: STARTING_ARRIVAL_PROFILE, phase: 'incoming', start: 0, landAt: 15, openAt: 27, personalTick: 0,
    pods: people.map((pawn, index) => ({id: world.nextId++, cell: {x: 4 + index * 2, z: 5}, pawn, items: [], drops: []}))};
  const before = structuredClone(world);
  const row = readNativeDomainAlerts(world, 0).find(alert => alert.key === 'domain:starting-arrival');
  expect(row).toMatchObject({text: '3 capsules en approche', action: {kind: 'site', condition: 'starting-arrival'}, targets: []});
  for (const person of people) expect(row?.body).toContain(person.name);
  expect(row?.body).toContain('La partie est en pause.');
  expect(readNativeDomainAlerts(world, 1).find(alert => alert.key === row?.key)?.body).not.toContain('La partie est en pause.');
  expect(world).toEqual(before);
  world.tick = 27;
  world.startingArrival = {profile: STARTING_ARRIVAL_PROFILE, phase: 'opened', start: 0, landAt: 15, openAt: 27, openedAt: 27, cells: before.startingArrival!.phase === 'opened' ? [] : before.startingArrival!.pods.map(pod => pod.cell)};
  expect(readNativeDomainAlerts(world, 0).some(alert => alert.key === 'domain:starting-arrival')).toBe(false);
});

test('solar letters use the confirmed Core boundary and expire without retaining UI history', () => {
  const world = createWorld(476, 16, 16);
  world.tick = 2000;
  world.worldIncidents = {profile: 'cassandra-world-v1', adoptedAt: 0, rng: 202, nextCheck: 90100,
    checks: 0, opportunities: 1, flares: 1, lastStart: 2000, lastEndCore: 29000, active: {start: 2000, endCore: 29000}};
  const activeBefore = structuredClone(world);
  expect(readNativeDomainAlerts(world).find(alert => alert.key === 'domain:solar-flare')).toMatchObject({title: 'Éruption solaire', severity: 'warning', action: {kind: 'site', condition: 'solar-flare'}});
  expect(world).toEqual(activeBefore);
  delete world.worldIncidents.active;
  world.tick = 2900;
  expect(readNativeDomainAlerts(world).some(alert => alert.key === 'domain:solar-flare')).toBe(false);
  world.tick = 2901;
  const endedBefore = structuredClone(world);
  expect(readNativeDomainAlerts(world).find(alert => alert.key === 'domain:solar-flare')).toMatchObject({title: 'Fin de l’éruption solaire', severity: 'info'});
  expect(world).toEqual(endedBefore);
  world.tick = 3501;
  expect(readNativeDomainAlerts(world).some(alert => alert.key === 'domain:solar-flare')).toBe(false);
});
