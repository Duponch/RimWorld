import { describe, expect, test } from 'vitest';
import { pawnJournalRows } from '../src/ui/journal-inspection';
import type { Pawn, World } from '../src/sim/types';

describe('bounded pawn journal', () => {
  test('uses recorded social entries without fabricating dialogue from an opinion', () => {
    const pawn = { id: 1, name: 'Ada', social: { rng: 1, memories: [{ otherId: 2, kind: 'chitchat', at: 8, offset: 2 }] } } as Pawn;
    const world = { events: [
      { tick: 8, type: 'need', message: 'Bavardage entre Ada et Noé.' },
      { tick: 9, type: 'job', message: 'Ada a fini un meuble.' },
      { tick: 10, type: 'need', message: 'Noé a insulté Ada.' },
      { tick: 11, type: 'need', message: 'Canada a insulté Noé.' },
    ] } as World;
    expect(pawnJournalRows(world, pawn)).toEqual([
      { tick: 10, kind: 'social', text: 'Noé a insulté Ada.' },
      { tick: 8, kind: 'social', text: 'Bavardage entre Ada et Noé.' },
    ]);
    expect(pawnJournalRows({ ...world, events: [] }, pawn)).toEqual([]);
  });

  test('only retains the selected pawn and a combat event when actually logged', () => {
    const pawn = { id: 1, name: 'Ada' } as Pawn;
    const world = { events: [
      { tick: 1, type: 'need', message: 'Bavardage entre Mina et Noé.' },
      { tick: 2, type: 'need', message: 'Ada a été blessée au combat.' },
    ] } as World;
    expect(pawnJournalRows(world, pawn)).toEqual([
      { tick: 2, kind: 'combat', text: 'Ada a été blessée au combat.' },
    ]);
  });
});
