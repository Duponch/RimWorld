import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {GROUP_SCENARIO_ID,GROUP_SCENARIO_PATH,groupScenarioEntry,prepareGroupScenario} from '../src/sim/group-scenario.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SCHEMA_VERSION} from '../src/sim/types.ts';

/** Append only. Old text/entries/payloads are never reserialized or rewritten;
 * an already published entry must be exactly equal before any write. */
export function appendGroupScenarioEntry(before:string,entry:ReturnType<typeof groupScenarioEntry>):string {
  const manifest=JSON.parse(before);assert.equal(manifest.version,2);assert.ok(Array.isArray(manifest.saves));
  const existing=manifest.saves.find((save:{id:string})=>save.id===GROUP_SCENARIO_ID);
  if(existing){assert.deepEqual(existing,entry,'V216 entry differs; review before rewriting.');return before;}
  assert.ok(manifest.saves.length<64,'The catalogue is full.');
  assert.ok(!manifest.saves.some((save:{release:string;filename:string})=>save.release===entry.release&&save.filename===entry.filename),'Duplicate scene path.');
  const close=before.lastIndexOf('  ]');assert.ok(close>=0);
  const formatted=JSON.stringify(entry,null,2).split('\n').map(line=>'    '+line).join('\n');
  return before.slice(0,close).trimEnd()+',\n'+formatted+'\n'+before.slice(close);
}

if(process.argv[1]?.replaceAll('\\','/').endsWith('/create-group-v216-test-save.ts')){
  assert.equal(SCHEMA_VERSION,196,'Do not rewrite V216 under a later schema.');
  const world=prepareGroupScenario();assert.deepEqual(validateWorld(world),[]);
  const raw=serializeWorld(world),entry=groupScenarioEntry(world,createHash('sha256').update(raw).digest('hex'));
  assert.deepEqual(deserializeWorld(raw),world);
  const output=process.argv.slice(2).find(arg=>!arg.startsWith('--'))??GROUP_SCENARIO_PATH;
  const catalogue='public/test-saves/manifest.json',before=process.argv.includes('--publish')?readFileSync(catalogue,'utf8'):undefined;
  const after=before===undefined?undefined:appendGroupScenarioEntry(before,entry);
  // Check immutable files before writing either half of the publication.
  try {assert.equal(readFileSync(output,'utf8'),raw,'V216 payload differs; review before rewriting.');}
  catch(cause){if((cause as NodeJS.ErrnoException).code!=='ENOENT')throw cause;}
  mkdirSync(dirname(output),{recursive:true});writeFileSync(output,raw);
  if(after!==undefined&&after!==before)writeFileSync(catalogue,after);
  console.log(JSON.stringify({path:output,entry}));
}
