import {afterEach,expect,test,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {deserializeWorld,validateWorld} from '../src/sim';
import {fetchTestColonies,parseTestColonies,readTestColony,readSaveFile,testColonyUrl,type TestColony} from '../src/ui/test-colonies';
import {encodeStoredSave} from '../src/ui/save-storage-codec';

const save:TestColony={id:'colony',release:'v98',filename:'colony.json',label:'Colonie',description:'Test',pawns:100,colonists:100,width:250,height:250,tick:0,focus:['Énergie'],steps:['Construire'],prepared:true,provenance:'Préparée',sha256:'0'.repeat(64)};
afterEach(()=>vi.unstubAllGlobals());
test('test catalogue rejects invalid paths, duplicate identities and inconsistent counts',()=>{
  const manifest={version:2,saves:[save]};
  expect(parseTestColonies(manifest)).toEqual([save]);
  expect(testColonyUrl(save)).toBe('/test-saves/v98/colony.json');
  for(const patch of [{release:'../v103'},{release:'https:'},{release:'v0'},{filename:'../../save.json'},{filename:'https://other/save.json'},{sha256:'bad'},{colonists:101},{width:0},{steps:[]}])expect(()=>parseTestColonies({...manifest,saves:[{...save,...patch}]})).toThrow('invalide');
  expect(()=>parseTestColonies({...manifest,saves:[save,save]})).toThrow('invalide');
  expect(()=>parseTestColonies({...manifest,saves:[save,{...save,id:'other'}]})).toThrow('invalide');
  expect(()=>parseTestColonies({...manifest,saves:[]})).toThrow('invalide');
  expect(()=>testColonyUrl({...save,release:'../v103'})).toThrow('inconnu');
  expect(()=>testColonyUrl({...save,filename:'../salles.json'})).toThrow('inconnu');
  const legacy={version:1,release:'v98',saves:[Object.fromEntries(Object.entries(save).filter(([key])=>key!=='release'))]};
  expect(parseTestColonies(legacy)).toEqual([save]);
  expect(()=>parseTestColonies({...legacy,release:'v103'})).toThrow('invalide');
});
test('published catalogue keeps six V98 entries and lists the V101/V103/V104/V105/V106 demonstrations with exact bytes and valid migration',async()=>{
  const manifest=JSON.parse(readFileSync('public/test-saves/manifest.json','utf8'));
  const legacy=JSON.parse(readFileSync('public/test-saves/v98/manifest.json','utf8'));
  const entries=parseTestColonies(manifest);
  expect(entries).toHaveLength(11);
  expect(entries.slice(0,6).map(({release,...entry})=>{expect(release).toBe('v98');return entry;})).toEqual(legacy.saves);
  for(const [id,release,filename,schemaVersion] of [['atelier-v101','v101','atelier.json',101],['salles-v103','v103','salles.json',103],['art-v104','v104','sculpture.json',104],['economie-v105','v105','economie.json',105],['lievres-v106','v106','lievres.json',106]] as const){
    const entry=entries.find(e=>e.id===id)!;
    expect(entry).toMatchObject({release,filename,pawns:id==='economie-v105'?2:1,colonists:1,width:32,height:32,prepared:true});
    const raw=readFileSync(`public/test-saves/${release}/${filename}`,'utf8');
    expect(createHash('sha256').update(raw).digest('hex')).toBe(entry.sha256);
    const original=JSON.parse(raw);
    expect(original).toMatchObject({schemaVersion,tick:entry.tick,width:entry.width,height:entry.height});
    expect(original.pawns).toHaveLength(entry.pawns);
    const world=deserializeWorld(raw);
    expect(world).toEqual({...original,schemaVersion:106,pawns:original.pawns.map((p:Record<string,unknown>)=>({...p,priorities:{...(p.priorities as object),...(schemaVersion<104?{art:0}:{}),...(schemaVersion<106?{handle:0}:{})}}))});
    expect(validateWorld(world)).toEqual([]);
  }
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>new Response(readFileSync(`public${url}`,'utf8'))));
  expect(await fetchTestColonies()).toEqual(entries);
  expect(await readTestColony(entries[7]!)).toBe(readFileSync('public/test-saves/v103/salles.json','utf8'));
  expect(await readTestColony(entries[8]!)).toBe(readFileSync('public/test-saves/v104/sculpture.json','utf8'));
});
test('only exact published contents are passed to the ordinary world loader',async()=>{
  const raw=JSON.stringify({schemaVersion:91,tick:0,width:250,height:250,fixture:'x'.repeat(1024*1024)});
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));
  const sha256=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
  const stored=await encodeStoredSave(raw);
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(stored)));
  expect(await readTestColony({...save,sha256})).toBe(raw);
  await expect(readTestColony(save)).rejects.toThrow('catalogue');
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('missing',{status:404})));
  await expect(readTestColony(save)).rejects.toThrow('404');
});
test('downloaded envelopes and original JSON files both import without rewriting their content',async()=>{
  const raw=JSON.stringify({schemaVersion:91,tick:0,width:250,height:250,fixture:'x'.repeat(1024*1024)});
  const stored=await encodeStoredSave(raw);
  expect(await readSaveFile(new File([stored],'test.json'))).toBe(raw);
  expect(await readSaveFile(new File([raw],'test.json'))).toBe(raw);
  await expect(readSaveFile(new File([],'empty.json'))).rejects.toThrow('non vide');
});
