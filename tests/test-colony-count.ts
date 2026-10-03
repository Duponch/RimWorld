import { readFileSync } from 'node:fs';

/** V194 publishes 44 entries. Read the catalogue so subsequent lots are also
 * covered by every menu assertion, without a stale hard-coded count. */
export const TEST_COLONY_COUNT=JSON.parse(readFileSync('public/test-saves/manifest.json','utf8')).saves.length as number;
