import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {beforeAll,expect,test} from 'vitest';
import {auditCoverage,prepareCurrentAulnes} from '../scripts/update-aulnes-test-save.ts';
import {SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots.ts';
import {stepWorld} from '../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';
import {decodeStoredSave,encodeStoredSave} from '../src/ui/save-storage-codec.ts';
import {parseTestColonies,testColonyUrl} from '../src/ui/test-colonies.ts';

const historicalPath='public/test-saves/v224/les-aulnes-sieges.json';
const historicalStoredHash='97daab540e9527c3a1020aa064737aca4ea7345e868a2e97d761f9b7ac2e0e32';
const historicalRawHash='be2d275cb61a7b89f644267bb47d247dfc1f70e66190596f7083d60b2cdfe33d';
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const coverageKeys=['habitat','logistics','production','research','hydroponics','clinicalSupport','medicineProduction',
  'woodenProstheses','prison','animalCare','animalFeeding','combat','emp','deepDrilling','orbitalTrade',
  'nutrientPaste','biofuel','social','planet','quests','incidents'];
let stored:string,raw:string,source:World,current:World;

beforeAll(async()=>{
  stored=readFileSync(historicalPath,'utf8');raw=await decodeStoredSave(stored);
  source=deserializeWorld(raw);current=prepareCurrentAulnes(source);
},60_000);

test('the current preparation keeps the historical Aulnes payload and its original checkpoint available',()=>{
  expect(hash(stored)).toBe(historicalStoredHash);expect(hash(raw)).toBe(historicalRawHash);
  const historical=JSON.parse(raw);
  expect([historical.schemaVersion,historical.tick,historical.width,historical.height]).toEqual([198,6934,250,250]);
  expect(source.schemaVersion).toBe(SCHEMA_VERSION);
  expect(source.structures.some(s=>s.kind==='biofuel-refinery'||s.kind==='nutrient-paste-dispenser')).toBe(false);
  expect(source.deepResources).toBeUndefined();expect(source.orbital).toBeUndefined();
  expect(source.research?.biofuelRefining).toBeUndefined();
});

test('preparation returns an independent current reference with surviving identities and furniture qualities',()=>{
  const before=serializeWorld(source),copy=prepareCurrentAulnes(source);
  expect(serializeWorld(source)).toBe(before);expect(copy).not.toBe(source);
  expect(copy.pawns).not.toBe(source.pawns);expect(copy.structures).not.toBe(source.structures);
  expect([copy.schemaVersion,copy.width,copy.height]).toEqual([SCHEMA_VERSION,250,250]);
  expect(copy.tiles).toHaveLength(62_500);
  expect(source.pawns.every(p=>copy.pawns.some(q=>q.id===p.id&&q.name===p.name))).toBe(true);
  expect((source.wildlife?.animals??[]).every(a=>(copy.wildlife?.animals??[]).some(b=>b.id===a.id&&b.species===a.species))).toBe(true);
  const identity=(s:World['structures'][number])=>({id:s.id,kind:s.kind,material:s.material,quality:s.quality});
  for(const original of source.structures){
    const survivor=copy.structures.find(s=>s.id===original.id);
    expect(survivor,`structure ${original.id}`).toBeDefined();expect(identity(survivor!)).toEqual(identity(original));
  }
  expect(serializeWorld(copy)).toBe(serializeWorld(current));
});

test('the integrated reference exposes the declared compatible coverage and strict save boundaries',()=>{
  const coverage=auditCoverage(current);
  expect(Object.keys(coverage).sort()).toEqual([...coverageKeys].sort());
  expect(Object.entries(coverage).filter(([,available])=>!available)).toEqual([]);
  expect(validateWorld(current)).toEqual([]);
  const encoded=new SnapshotEncoder().encode(current,0,0),adopted=new SnapshotDecoder().adopt(structuredClone(encoded));
  expect(adopted.status).toBe('applied');
  if(adopted.status==='applied')expect(serializeWorld(adopted.world)).toBe(serializeWorld(current));
});

test('the compressed checkpoint resumes an ordinary tick exactly and leaves its source untouched',async()=>{
  const sourceBefore=serializeWorld(source),checkpoint=serializeWorld(current);
  const storedCurrent=await encodeStoredSave(checkpoint);
  expect(await decodeStoredSave(storedCurrent)).toBe(checkpoint);
  const resumed=deserializeWorld(await decodeStoredSave(storedCurrent)),uninterrupted=structuredClone(current);
  expect(serializeWorld(resumed)).toBe(checkpoint);
  stepWorld(resumed);stepWorld(uninterrupted);
  expect(resumed.tick).toBe(current.tick+1);expect(validateWorld(resumed)).toEqual([]);
  expect(serializeWorld(resumed)).toBe(serializeWorld(uninterrupted));
  expect(serializeWorld(current)).toBe(checkpoint);expect(serializeWorld(source)).toBe(sourceBefore);
},60_000);

test('the public current pointer resolves to a separate current payload while V224 remains accessible',async()=>{
  const manifest=parseTestColonies(JSON.parse(readFileSync('public/test-saves/manifest.json','utf8')));
  const historical=manifest.find(e=>e.id==='aulnes-seating-v224');
  expect(historical).toMatchObject({release:'v224',filename:'les-aulnes-sieges.json',sha256:historicalRawHash,tick:6934});
  const entry=manifest.find(e=>e.id==='aulnes-current');expect(entry).toBeDefined();
  expect(entry?.prepared).toBe(true);expect([entry?.width,entry?.height]).toEqual([250,250]);
  expect(testColonyUrl(entry!)).not.toBe(testColonyUrl(historical!));
  const publicRaw=await decodeStoredSave(readFileSync('public'+testColonyUrl(entry!),'utf8'));
  expect(hash(publicRaw)).toBe(entry!.sha256);
  const published=deserializeWorld(publicRaw);expect(published.schemaVersion).toBe(SCHEMA_VERSION);
  expect(published.tick).toBe(entry!.tick);
  expect(Object.entries(auditCoverage(published)).filter(([,available])=>!available)).toEqual([]);
  expect(serializeWorld(deserializeWorld(serializeWorld(published)))).toBe(serializeWorld(published));
},60_000);
