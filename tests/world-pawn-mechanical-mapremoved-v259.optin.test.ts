import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeCampaign,serializeCampaign} from '../src/sim/serialization';
import {registeredMap,registeredMapId} from '../src/sim/world-map-context';
import {applyCommand} from '../src/sim/engine';
import {actual259,transport259,require259} from './helpers/fresh-caravan-owners-v259';
/** No mechanical header is grafted onto a historical map. This FUTURE exact
 * producer259 checkpoint is not acquired by this private delivery. Reuse the
 * single fresh259/camp260 run; do not generate another globe for this test. */
const enabled=process.env.ELSEWHERE_RUN_MECHANICAL259==='1';
describe.skipIf(!enabled)('actual producer259 mechanical MapRemoved continuation',()=>{
 it('refuses missing/forged authority atomically, then transfers the same originals and preserves timers/health through RAW/full/delta/replay',()=>{
  const path=process.env.ELSEWHERE_MECHANICAL259_CHECKPOINT;if(!path)throw Error('Future exact mechanical259 producer checkpoint is required; none is acquired here');
  const raw=readFileSync(path,'utf8'),sha=process.env.ELSEWHERE_MECHANICAL259_CHECKPOINT_SHA256;if(!sha||!/^[a-f0-9]{64}$/.test(sha)||createHash('sha256').update(raw).digest('hex')!==sha)throw Error('Exact future producer checkpoint SHA256 is required');
  const root=deserializeCampaign(raw);require259(root);if(Number(root.schemaVersion)!==259||root.planet?.revision!==3||!root.worldMaps||!root.worldPawns||!root.worldFactions)throw Error('Exact geographic259 campaign required');
  const mapId=Number(process.env.ELSEWHERE_MECHANICAL259_MAP_ID);if(!Number.isSafeInteger(mapId))throw Error('Exact actual mechanical source map id required');
  const map=registeredMap(root,mapId);if(!map||registeredMapId(map)!==mapId||!map.mechanoids?.length||map.mechanoids.some(m=>!m.worldFaction259||!root.worldFactions!.factions.some(f=>f.def==='Mechanoid'&&f.id===m.worldFaction259!.factionId)))throw Error('True prospective mechanical birth/header checkpoint required');
  const ids=map.mechanoids.map(m=>m.id),originals=[...map.mechanoids],health=originals.map(m=>JSON.stringify(m.health)),timers=originals.map(m=>JSON.stringify([m.emp,m.stun,m.stagger]));
  // Deliberately corrupt only private refusal branches, after exact admission.
  for(const forged of [false,true]){const copy=deserializeCampaign(serializeCampaign(root));require259(copy);const bad=actual259(copy),source=registeredMap(bad.root,mapId)!,m=source.mechanoids![0]!;if(forged)m.worldFaction259={revision:1,factionId:bad.root.worldFactions!.playerFactionId};else delete m.worldFaction259;const before=JSON.stringify(bad.root);const result=applyCommand(bad.root,{type:'map-abandon',mapId,confirm:true},bad.runtime);expect(result.ok).toBe(false);expect(JSON.stringify(bad.root)).toBe(before);}
  const run=actual259(root);run.command({type:'map-abandon',mapId,confirm:true});expect(root.worldMaps.retired.some(m=>m.id===mapId)).toBe(true);
  const rows=ids.map(id=>root.worldPawns!.owners.filter(r=>r.actor.id===id));for(let i=0;i<rows.length;i++){expect(rows[i]).toHaveLength(1);const row=rows[i]![0]!;expect(row.kind).toBe('mechanical');if(row.kind!=='mechanical')throw Error('Mechanical kind lost');expect(row.actor).toBe(originals[i]);expect(JSON.stringify(row.actor.health)).toBe(health[i]);expect(JSON.stringify([row.actor.emp,row.actor.stun,row.actor.stagger])).toBe(timers[i]);expect(row.mechanicalTimersAtCore259).toBe(root.tick*10);expect(row.items).toEqual([]);expect(row.packed).toEqual([]);}
  expect(root.worldGroups!.abandonedContents.find(c=>c.mapId===mapId)!.humans.some(h=>ids.includes(h.id))).toBe(false);
  const enteredAtCore=root.tick*10,modes=rows.map(r=>r[0]!.mode);
  transport259(run,'actual-mechanical-MapRemoved');
  for(let i=0;i<rows.length;i++){const row=root.worldPawns!.owners.find(r=>r.actor.id===ids[i])!;expect(JSON.stringify(row.actor.health)).toBe(health[i]);if(row.kind!=='mechanical')throw Error('Mechanical owner lost');expect(JSON.stringify([row.actor.emp,row.actor.stun,row.actor.stagger])).toBe(timers[i]);expect(row.mode).toBe(modes[i]);expect(row.mechanicalTimersAtCore259).toBe(enteredAtCore);expect(row.clockCore).toBe(modes[i]==='dead'?enteredAtCore:root.worldPawns!.atCore);expect(root.worldPawns!.discardedMechanical259?.some(r=>r.id===row.actor.id)??false).toBe(false);}
 });
});
