import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { apparelAppearance } from '../src/render/character-apparel';
import { appearanceOf, createPawnAppearance, validatePawnAppearance } from '../src/sim/pawn-appearance';
import { deserializeWorld, serializeWorld, stepWorld, validateWorld } from '../src/sim/index';
import { createScenarioWorld } from '../src/sim/new-game';
import { startingPawn } from '../src/sim/starting-pawns';
import { portraitDataUrl } from '../src/ui/pawn-portrait';

const fixture = () => readFileSync('public/test-saves/v106/lievres.json', 'utf8');

describe('persistance de l’apparence V109', () => {
  it('migre la démonstration V106 sans profil rétroactif ni autre mutation', () => {
    const source = fixture();
    const previous = JSON.parse(source);
    expect(previous.schemaVersion).toBe(106);
    expect(previous.pawns.every((pawn: {appearance?:unknown}) => pawn.appearance === undefined)).toBe(true);
    const world = deserializeWorld(source);
    expect(world).toEqual({ ...previous, schemaVersion: 109 });
    expect(world.pawns.every(pawn => pawn.appearance === undefined)).toBe(true);
    expect(world.rng).toBe(previous.rng);
    expect(validateWorld(world)).toEqual([]);
    expect(fixture()).toBe(source);
  });

  it('refuse un profil V109 injecté dans une sauvegarde V106 avant toute migration', () => {
    const old = JSON.parse(fixture());
    old.pawns[0].appearance = createPawnAppearance(old.seed, old.pawns[0].id, old.pawns[0].name);
    expect(() => deserializeWorld(JSON.stringify(old))).toThrow(/Future pawn appearance in older save/);
  });

  it('sauvegarde et reprend une nouvelle identité tout en gardant le PRNG intact pendant les projections', () => {
    const world = deserializeWorld(fixture());
    const newPawn = startingPawn(world.nextId++, 'Arrivant', 10, 10, 0, 55, world.seed);
    expect(newPawn.appearance).toBeDefined();
    expect(validatePawnAppearance(newPawn.appearance)).toEqual([]);
    world.pawns.push(newPawn);
    const saved = serializeWorld(world);
    const restored = deserializeWorld(saved);
    expect(restored.pawns.at(-1)!.appearance).toEqual(newPawn.appearance);
    expect(validateWorld(restored)).toEqual([]);
    const rng = restored.rng, before = serializeWorld(restored);
    const oldPawn = restored.pawns[0]!;
    for (let i = 0; i < 20; i++) {
      const projection = appearanceOf(oldPawn, restored.seed);
      portraitDataUrl(projection, apparelAppearance());
      portraitDataUrl(appearanceOf(restored.pawns.at(-1)!, restored.seed), apparelAppearance());
    }
    expect(restored.rng).toBe(rng);
    expect(serializeWorld(restored)).toBe(before);
    const resumed = deserializeWorld(before);
    stepWorld(restored, 12); stepWorld(resumed, 12);
    expect(resumed).toEqual(restored);
  });

  it('donne un profil persistant au nouveau Crashlanded dès sa création', () => {
    const world = createScenarioWorld(109, 40, 'crashlanded');
    expect(world.pawns).toHaveLength(3);
    for (const pawn of world.pawns) expect(validatePawnAppearance(pawn.appearance)).toEqual([]);
    expect(deserializeWorld(serializeWorld(world)).pawns.map(pawn => pawn.appearance))
      .toEqual(world.pawns.map(pawn => pawn.appearance));
  });
});
