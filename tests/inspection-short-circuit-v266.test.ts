import { expect, test } from 'vitest';
import { shortCircuitInspection } from '../src/ui/short-circuit';

type InspectionWorld = Parameters<typeof shortCircuitInspection>[0];
type Contact = NonNullable<NonNullable<NonNullable<InspectionWorld['miscIncidents']>['shortCircuits']>['last']>;
function world(last: Contact, tick = 1000): InspectionWorld {
  return { tick, miscIncidents: {
    profile: 'cassandra-misc-v1', adoptedAt: 0, rng: 1, nextCheck: 1100, introDone: true,
    checks: 1, opportunities: 1, heatwaves: 0,
    shortCircuits: { adoptedAt: 0, count: 1, lastStart: last.at, last },
  } };
}
const contact: Contact = { at: 1000, conduitId: 4, center: { x: 8, z: 9 }, energyWd: 6000, flameRadius: 3.87, bombRadius: 1.16, outcome: 'discharge' };

test('a discharge describes the captured network loss and both explosions without claiming a global outage', () => {
  const inspection = shortCircuitInspection(world(contact))!;
  expect(inspection.summary).toContain('Décharge du réseau'); expect(inspection.summary).toContain('à l’instant');
  expect(inspection.body).toContain('(8, 9)'); expect(inspection.body).toContain('W·j ont été retirés');
  expect(inspection.body).toContain('autre réseau n’ont pas été vidées');
  expect(inspection.body).toContain('explosion incendiaire de rayon 3,87');
  expect(inspection.body).toContain('explosion de souffle de rayon 1,16');
  expect(inspection.body).toContain('pas de durée fixe de coupure');
});

test('a confirmed local fire neither drains batteries nor invents an explosion', () => {
  const inspection = shortCircuitInspection(world({ ...contact, energyWd: 0, flameRadius: 0, bombRadius: undefined, outcome: 'fire', ignited: true }))!;
  expect(inspection.summary).toContain('Départ de feu');
  expect(inspection.body).toContain('Aucune décharge des batteries');
  expect(inspection.body).toContain('Un petit feu s’est allumé');
  expect(inspection.body).not.toContain('explosion incendiaire'); expect(inspection.body).not.toContain('explosion de souffle');
});

test('an unsuccessful ignition is explicitly distinct from a confirmed fire', () => {
  const inspection = shortCircuitInspection(world({ ...contact, energyWd: 0, flameRadius: 0, bombRadius: undefined, outcome: 'fire', ignited: false }))!;
  expect(inspection.summary).toContain('Sans départ de feu');
  expect(inspection.body).toContain('L’allumage local n’a pas créé de feu');
  expect(inspection.body).not.toContain('Un petit feu s’est allumé');
});

test('a discharge without a recorded blast never invents one', () => {
  const inspection = shortCircuitInspection(world({ ...contact, energyWd: 100, flameRadius: 1.5, bombRadius: undefined }))!;
  expect(inspection.body).toContain('explosion incendiaire de rayon 1,5');
  expect(inspection.body).not.toContain('explosion de souffle');
});

test('elapsed time is informational and never clears damage or promises a blackout duration', () => {
  const w = world(contact, 7000), before = JSON.stringify(w), inspection = shortCircuitInspection(w)!;
  expect(inspection.summary).toContain('il y a 24 h');
  expect(inspection.body).toContain('restent à traiter après le passage des ondes');
  expect(inspection.body).toContain('interrupteur réellement ouvert par un colon');
  expect(inspection.body).toContain('une demande d’arrêt seule ne coupe pas');
  expect(JSON.stringify(w)).toBe(before);
});

test('no history, no last contact and future records produce no incident letter', () => {
  expect(shortCircuitInspection({ tick: 1000 })).toBeUndefined();
  const w = world(contact); delete w.miscIncidents!.shortCircuits!.last;
  expect(shortCircuitInspection(w)).toBeUndefined();
  expect(shortCircuitInspection(world({ ...contact, at: 1001 }))).toBeUndefined();
});
