import { readFileSync } from 'node:fs';

/** The public menu must display every published entry, including later lots. */
export const TEST_COLONY_COUNT=JSON.parse(readFileSync('public/test-saves/manifest.json','utf8')).saves.length as number;
