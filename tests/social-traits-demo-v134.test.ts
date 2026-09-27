import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {prepareSocialTraitsDemo} from '../scripts/generate-social-traits-demo-v134.ts';
import {stepWorld} from '../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {opinionOf} from '../src/sim/social-state.ts';
import {parseTestColonies} from '../src/ui/test-colonies.ts';

test('V134 catalog scene retains the authored personalities and a real directed exchange through replay',()=>{
  const raw=readFileSync('public/test-saves/v134/mots-gentils.json','utf8');
  const entries=parseTestColonies(JSON.parse(readFileSync('public/test-saves/manifest.json','utf8')));
  const entry=entries.find(save=>save.id==='mots-gentils-v134');
  expect(entry).toMatchObject({release:'v134',filename:'mots-gentils.json',prepared:true,pawns:2,colonists:2});
  expect(entry!.sha256).toBe(createHash('sha256').update(raw).digest('hex'));
  const world=deserializeWorld(raw),[ada,basile]=world.pawns;
  expect(world).toEqual(prepareSocialTraitsDemo());
  expect(ada!.traits).toEqual(['kind']);expect(basile!.traits).toEqual(['abrasive','bloodlust']);
  expect(opinionOf(basile!,ada!.id,world.tick)).toBeGreaterThan(0);
  expect(validateWorld(world)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(world));
  for(let i=0;i<80;i++){stepWorld(world);stepWorld(resumed);}
  expect(serializeWorld(resumed)).toBe(serializeWorld(world));
});
