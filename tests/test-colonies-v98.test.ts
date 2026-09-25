import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeStoredSave, storedSaveMetadata } from '../src/ui/save-storage-codec.ts';
import { deserializeWorld, serializeWorld, stepWorld, validateWorld } from '../src/sim/index.ts';
import { publicSaveDirectory, testColonySources, writeTestColonies, type TestSaveManifest } from '../scripts/test-colonies-v98.ts';

if(process.env.WRITE_TEST_SAVES==='1'){
  describe('V98 maintainer asset generation',()=>{
    it('writes six checked, compressed test saves and their manifest',async()=>{
      const {manifest}=await writeTestColonies();
      expect(manifest.saves.map(s=>s.id)).toEqual(testColonySources.map(s=>s.id));
      expect(manifest.saves).toHaveLength(6);
    },120_000);
  });
}else{
  const manifest=JSON.parse(readFileSync(resolve(publicSaveDirectory,'manifest.json'),'utf8')) as TestSaveManifest;
  describe('V98 downloadable test colonies',()=>{
    it('has a stable, complete manifest',()=>{
      expect(manifest).toMatchObject({version:1,release:'v98'});
      expect(manifest.saves.map(s=>s.id)).toEqual(testColonySources.map(s=>s.id));
      expect(new Set(manifest.saves.map(s=>s.filename)).size).toBe(manifest.saves.length);
      expect(manifest.saves.filter(s=>s.colonists===100)).toHaveLength(2);
      expect(manifest.saves.find(s=>s.id==='colony-v90')?.prepared).toBe(false);
    });
    for(const entry of manifest.saves){
      it(`${entry.id} decodes, strictly resumes and advances with the ordinary engine`,async()=>{
        const stored=readFileSync(resolve(publicSaveDirectory,entry.filename),'utf8');
        expect(JSON.parse(stored)).toMatchObject({codec:'gzip-base64'});
        expect(storedSaveMetadata(stored)).toMatchObject({tick:entry.tick,width:entry.width,height:entry.height});
        const raw=await decodeStoredSave(stored);
        expect(createHash('sha256').update(raw).digest('hex')).toBe(entry.sha256);
        const w=deserializeWorld(raw),copy=deserializeWorld(raw);
        expect(w).toEqual({...JSON.parse(raw),schemaVersion:101});
        expect(deserializeWorld(serializeWorld(w))).toEqual(w);
        expect(w.pawns.length).toBe(entry.pawns);
        expect(w.pawns.filter(p=>(p.faction??'colony')==='colony'&&p.state!=='dead').length).toBe(entry.colonists);
        expect(validateWorld(w)).toEqual([]);
        const ticks=entry.colonists===100?3:12;
        stepWorld(w,ticks);stepWorld(copy,ticks);
        expect(w.tick).toBe(entry.tick+ticks);
        expect(validateWorld(w)).toEqual([]);
        expect(serializeWorld(w)).toBe(serializeWorld(copy));
        expect(w.pawns.some(p=>p.state==='moving'||p.state==='working'||p.state==='eating'||p.state==='resting'||p.motion!=null)).toBe(true);
      },60_000);
    }
    it('exposes distinct work and actors in the prepared situations',async()=>{
      const world=async(id:string)=>deserializeWorld(await decodeStoredSave(readFileSync(resolve(publicSaveDirectory,`${id}.json`),'utf8')));
      const energy=await world('energy-food-12');
      expect(energy.structures.filter(s=>s.kind==='solar-generator')).toHaveLength(2);
      expect(energy.jobs.some(j=>j.flick)).toBe(true);
      expect(energy.growingZones.length).toBeGreaterThan(0);
      const prison=await world('prison-12');
      expect(prison.pawns.filter(p=>p.prisoner)).toHaveLength(2);
      expect(prison.structures.filter(s=>s.prisoner)).toHaveLength(2);
      const weather=await world('weather-fire-12');
      expect(weather.fires?.items.length).toBeGreaterThan(0);
      expect(weather.structures.some(s=>s.kind==='wind-turbine')).toBe(true);
      const trade=await world('trade-100');
      expect(trade.pawns.filter(p=>p.visitor)).toHaveLength(2);
      expect(trade.trade?.count).toBe(1);
      const mixed=await world('mixed-100');
      expect(mixed.structures.some(s=>s.kind==='tailor-bench')).toBe(true);
      expect(mixed.filth?.items.length).toBeGreaterThan(0);
      expect(mixed.pawns.some(p=>p.burial)).toBe(true);
    },60_000);
  });
}
