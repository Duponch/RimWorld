import {expect,test} from 'vitest';
import {encodeStoredSave,decodeStoredSave,storedSaveMetadata,SAVE_COMPRESSION_THRESHOLD,MAX_COMPRESSED_SAVE_BYTES,MAX_DECOMPRESSED_SAVE_BYTES} from '../src/ui/save-storage-codec';
/** Envelope attestation fixture only. The worker's complete saved-campaign
 * validation is separately mandatory; this does not simulate abandonment. */
const campaign=()=>({schemaVersion:255,tick:42,rng:1,nextId:1,
 worldMaps:{revision:1,rootMapId:null,selectedMapId:null,nextMapId:1,campaignSeed:42,mapSize:{width:250,height:250},sites:[],retired:[]},
 worldGroups:{revision:1,selectedGroupId:null,groups:[],losses:[],legacyTravellers:[],events:[],abandonedPawns:[],abandonedContents:[]},
});
test('mapless listing requires real campaign shape, not missing dimensions or a flag',()=>{
 const value=campaign();expect(storedSaveMetadata(JSON.stringify(value))).toEqual({tick:42,schemaVersion:255,campaignOnly:true});
 for(const broken of [{tick:42,schemaVersion:255},{...value,campaignOnly:true},{...value,width:250},{...value,tiles:[]},{...value,schemaVersion:254},{...value,worldMaps:{...value.worldMaps,rootMapId:0}},{...value,worldMaps:{...value.worldMaps,selectedMapId:0}},{...value,worldMaps:{...value.worldMaps,sites:[{id:0}]}},{...value,worldGroups:{revision:1}}])expect(storedSaveMetadata(JSON.stringify(broken))).toBeNull();
});
test('mapless compressed envelope keeps dimensions absent and compares its attestation to decoded JSON',async()=>{
 // A large allowed shared field exercises only the envelope path; domain
 // content remains the worker's responsibility, as in the older codec tests.
 const raw=JSON.stringify({...campaign(),research:{codecFixture:'x'.repeat(SAVE_COMPRESSION_THRESHOLD+1)}}),stored=await encodeStoredSave(raw),envelope=JSON.parse(stored);
 expect(envelope.version).toBe(1);expect(envelope.metadata).toEqual({tick:42,schemaVersion:255,campaignOnly:true});expect(await decodeStoredSave(stored)).toBe(raw);
 await expect(decodeStoredSave(JSON.stringify({...envelope,metadata:{tick:42,schemaVersion:255,width:250,height:250}}))).rejects.toThrow('incohérentes');
 await expect(decodeStoredSave(JSON.stringify({...envelope,metadata:{...envelope.metadata,width:250}}))).rejects.toThrow('invalide');
});
test('a dimensioned world cannot be relabelled mapless and future size limits remain bounded',async()=>{
 const raw=JSON.stringify({schemaVersion:255,tick:42,width:250,height:250,codecFixture:'x'.repeat(SAVE_COMPRESSION_THRESHOLD+1)}),envelope=JSON.parse(await encodeStoredSave(raw));
 await expect(decodeStoredSave(JSON.stringify({...envelope,metadata:{tick:42,schemaVersion:255,campaignOnly:true}}))).rejects.toThrow('incohérentes');
 expect(MAX_DECOMPRESSED_SAVE_BYTES).toBe(256*1024*1024);expect(MAX_COMPRESSED_SAVE_BYTES).toBe(128*1024*1024);
 await expect(decodeStoredSave(JSON.stringify({...envelope,compressedBytes:MAX_COMPRESSED_SAVE_BYTES+1}))).rejects.toThrow('invalide');
 await expect(decodeStoredSave(JSON.stringify({...envelope,uncompressedBytes:MAX_DECOMPRESSED_SAVE_BYTES+1}))).rejects.toThrow('invalide');
});