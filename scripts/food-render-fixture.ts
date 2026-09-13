import { writeFileSync } from 'node:fs';
import { diningFixture } from './fixtures/dining.ts';
import { refreshStock, serializeWorld } from '../src/sim/index.ts';

// The same spatial stress layout as the prior dining audit, with 50 actual raw
// meals and 50 rations. No claim of identical outcomes to the legacy food model.
const world = diningFixture(250, 100, true);
world.piles.forEach((pile, index) => {
  pile.item = index % 2 ? 'survival-meal' : 'berries';
  pile.quantity = index % 2 ? 1 : 16;
});
refreshStock(world);
writeFileSync('tmp/dining-render-fixture.json', serializeWorld(world));
