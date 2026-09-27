import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {afterEach,expect,test,vi} from 'vitest';
import {prepareSocialConflictDemo} from '../scripts/generate-social-conflict-demo-v125.ts';
import {deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {moodThoughts} from '../src/sim/mood.ts';
import {insultMoodMemories,opinionOf} from '../src/sim/social-state.ts';
import {parseTestColonies,readTestColony,testColonyUrl} from '../src/ui/test-colonies.ts';

afterEach(()=>vi.unstubAllGlobals());

test('V125 prepared insult and physical fight load through Charger with exact replay',async()=>{
  const raw=readFileSync('public/test-saves/v125/insulte-bagarre.json','utf8');
  const entries=parseTestColonies(JSON.parse(readFileSync('public/test-saves/manifest.json','utf8')));
  const entry=entries.find(save=>save.id==='insulte-bagarre-v125');
  expect(entry).toMatchObject({release:'v125',filename:'insulte-bagarre.json',prepared:true,pawns:2,colonists:2});
  expect(testColonyUrl(entry!)).toBe('/test-saves/v125/insulte-bagarre.json');
  expect(entry!.sha256).toBe(createHash('sha256').update(raw).digest('hex'));
  expect(JSON.parse(raw).schemaVersion).toBe(125);
  expect(raw).toBe(serializeWorld(prepareSocialConflictDemo()));

  vi.stubGlobal('fetch',vi.fn(async()=>new Response(raw)));
  const world=deserializeWorld(await readTestColony(entry!));
  expect(validateWorld(world)).toEqual([]);
  const [ada,basile]=world.pawns;
  expect(ada?.social?.fight?.opponentId).toBe(basile?.id);
  expect(basile?.social?.fight?.opponentId).toBe(ada?.id);
  expect(ada?.melee?.order?.auto).toBe('social');
  expect(basile?.melee?.order?.auto).toBe('social');
  expect(opinionOf(basile!,ada!.id,world.tick)).toBeLessThan(0);
  expect(insultMoodMemories(basile!,world.tick)).toMatchObject([{otherId:ada!.id,offset:-5}]);
  expect(moodThoughts(world,basile!).find(t=>t.id===`insult-${ada!.id}`)).toMatchObject({offset:-5,kind:'memory'});

  const resumed=deserializeWorld(serializeWorld(world));
  for(let i=0;i<70;i++){stepWorld(world);stepWorld(resumed);}
  expect(world.pawns.some(p=>(p.health?.injuries.length??0)>0)).toBe(true);
  expect(validateWorld(world)).toEqual([]);
  expect(serializeWorld(resumed)).toBe(serializeWorld(world));
});
