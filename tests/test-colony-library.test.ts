import {afterEach,expect,test,vi} from 'vitest';
import {parseTestColonies,readTestColony,readSaveFile,type TestColony} from '../src/ui/test-colonies';
import {encodeStoredSave} from '../src/ui/save-storage-codec';

const save:TestColony={id:'colony',filename:'colony.json',label:'Colonie',description:'Test',pawns:100,colonists:100,width:250,height:250,tick:0,focus:['Énergie'],steps:['Construire'],prepared:true,provenance:'Préparée',sha256:'0'.repeat(64)};
afterEach(()=>vi.unstubAllGlobals());
test('test catalogue rejects invalid paths, duplicate identities and inconsistent counts',()=>{
  const manifest={version:1,release:'v98',saves:[save]};
  expect(parseTestColonies(manifest)).toEqual([save]);
  for(const patch of [{filename:'../../save.json'},{filename:'https://other/save.json'},{sha256:'bad'},{colonists:101},{width:0},{steps:[]}])expect(()=>parseTestColonies({...manifest,saves:[{...save,...patch}]})).toThrow('invalide');
  expect(()=>parseTestColonies({...manifest,saves:[save,save]})).toThrow('invalide');
  expect(()=>parseTestColonies({...manifest,saves:[]})).toThrow('invalide');
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
