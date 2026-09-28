// Files with multi-day or otherwise deliberately long simulation pilots.
// npm test still runs every test, including this list.
export const campaignFiles = [
  'tests/survivor-colony.test.ts',
  'tests/crashlanded-colony.test.ts',
  'tests/energy-colony.test.ts',
  'tests/simulation.test.ts',
  'tests/raid-colony.test.ts',
  'tests/prison-colony.test.ts',
  'tests/habitat-apparel-natural.test.ts',
  'tests/habitat-apparel-colony.test.ts',
  'tests/environment-journey.test.ts',
  'tests/colony-player.test.ts',
  'tests/infection-colony.test.ts',
  'tests/textile.test.ts',
  'tests/cooler.test.ts',
];

export const diagnosticFiles = campaignFiles.slice(0, 5);
