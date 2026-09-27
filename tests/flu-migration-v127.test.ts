import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {stepWorld} from '../src/sim/engine.ts';
import {acquireFlu} from '../src/sim/flu-state.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {deserializeWorld,hashWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SCHEMA_VERSION} from '../src/sim/types.ts';

const historical=()=>JSON.parse(readFileSync('public/test-saves/v125/insulte-bagarre.json','utf8'));

test('V125 est validé avant migration et ne reçoit aucune grippe rétroactive',()=>{
  const raw=historical();
  expect(raw.schemaVersion).toBe(125);
  const world=deserializeWorld(JSON.stringify(raw));
  expect(world.schemaVersion).toBe(SCHEMA_VERSION);
  expect(world.rng).toBe(raw.rng);
  expect(world.pawns.every(p=>!p.health?.flu)).toBe(true);
  expect(world.fluIncidents).toBeUndefined(); // Scène pédagogique hors profil Cassandra.
  expect(validateWorld(world)).toEqual([]);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
});

test('un nouveau départ Cassandra porte un calendrier prospectif propre',()=>{
  const world=deserializeWorld(readFileSync('public/test-saves/v127/grippe.json','utf8'));
  expect(world.gameProfile).toBeDefined();
  expect(world.fluIncidents?.nextCheck).toBeGreaterThan(world.tick);
  expect(validateWorld(world)).toEqual([]);
});

test('une ancienne sauvegarde ne peut ni introduire une grippe ni préchoisir son calendrier',()=>{
  const raw=historical();
  raw.fluIncidents={profile:'cassandra-flu-v1',rng:1,nextCheck:54000,checks:0,fluDraws:0,episodes:0,cases:0};
  expect(()=>deserializeWorld(JSON.stringify(raw))).toThrow(/version 125/);
  delete raw.fluIncidents;
  raw.pawns[0].health??=createMedicalRecord(raw.tick);
  raw.pawns[0].health.flu={bornAt:raw.tick,severity:1_000_000,immunity:0,luck:1_000_000};
  expect(()=>deserializeWorld(JSON.stringify(raw))).toThrow(/version 125/);
});

test('une grippe acquise après migration reprend avec le même calendrier et les mêmes décisions',()=>{
  const uninterrupted=deserializeWorld(JSON.stringify(historical()));
  const patient=uninterrupted.pawns[0]!;
  patient.health??=createMedicalRecord(uninterrupted.tick);
  expect(acquireFlu(patient.health,1_000_000)).toBe(true);
  expect(validateWorld(uninterrupted)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(uninterrupted));
  for(let i=0;i<120;i++){stepWorld(uninterrupted,1);stepWorld(resumed,1);}
  expect(hashWorld(resumed)).toBe(hashWorld(uninterrupted));
  expect(resumed.rng).toBe(uninterrupted.rng);
  expect(resumed.fluIncidents).toEqual(uninterrupted.fluIncidents);
});
