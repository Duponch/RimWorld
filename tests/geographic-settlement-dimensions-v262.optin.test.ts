import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {expect,test} from 'vitest';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../src/sim/serialization.ts';
import {groupEntryActions} from '../src/sim/world-map-authority.ts';
import {prepareActualSettlementEntry257} from '../src/sim/group-camp-entry-256.ts';
import {registeredMap} from '../src/sim/world-map-context.ts';
const run=process.env.ELSEWHERE_RUN_GEOGRAPHIC_REINSTALL262==='1';
const drain=<Y,T>(iterator:Generator<Y,T,void>)=>{let s=iterator.next();while(!s.done)s=iterator.next();return s.value;};
// Only genuine acquired262 checkpoints in the respective configured world.
// No fake schema, dimension rewrite, hidden trip or prepared resource grant.
for(const size of [200,225] as const)test.skipIf(!run)(`actual configured${size} resettlement keeps dimensions, owners and exact continuation`,()=>{
 const file=process.env[`GEOGRAPHIC_REINSTALL262_${size}`],hash=process.env[`GEOGRAPHIC_REINSTALL262_${size}_SHA256`];expect(file).toBeTruthy();expect(hash).toMatch(/^[a-f0-9]{64}$/);
 const bytes=readFileSync(file!,'utf8');expect(createHash('sha256').update(bytes).digest('hex')).toBe(hash);const raw=JSON.parse(bytes);expect(raw.schemaVersion).toBe(262);
 const w=deserializeCampaign(bytes),maps=w.worldMaps!;expect(maps.mapSize).toEqual({width:size,height:size});expect(validateWorld(w)).toEqual([]);
 const record=w.worldGroups!.groups.find(r=>r.localMapId===null&&'members'in r.state&&groupEntryActions(w,r.state.id).settle.ok);expect(record).toBeTruthy();if(!record||!('members'in record.state))throw Error('Actual away owner at a valid resettlement tile required');
 const group=record.state,targetTile=group.tile,originals=group.members.slice(),before=serializeCampaign(w),entry=drain(prepareActualSettlementEntry257(w,group.id));expect(entry.status).toBe('ready');if(entry.status!=='ready')throw Error(entry.reason);expect(serializeCampaign(w)).toBe(before);
 // Explicit private stale-authority negative. Restore the exact original
 // authority after the refusal; the rejected attempt allocates nothing.
 const configured=maps.mapSize;maps.mapSize={width:size===200?225:200,height:size===200?225:200};const wrong=serializeCampaign(w);expect(entry.commit(false).ok).toBe(false);expect(serializeCampaign(w)).toBe(wrong);maps.mapSize=configured;expect(serializeCampaign(w)).toBe(before);
 const committed=entry.commit(false);expect(committed.ok,committed.reason).toBe(true);const site=maps.sites.find(s=>s.tile===targetTile&&s.kind==='settlement');expect(site).toBeTruthy();const local=registeredMap(w,site!.id)!;
 expect({width:local.width,height:local.height}).toEqual(maps.mapSize);expect(maps.mapSize).toEqual({width:size,height:size});for(const p of originals)expect(local.pawns).toContain(p);
 expect(local).not.toHaveProperty('scenario');expect(local).not.toHaveProperty('startingArrival');expect(local).not.toHaveProperty('expeditionSite');expect(local.climate?.revision===4&&local.climate.irregular262).toBe(true);expect(local.wildlife?.geographicRenewal262).toEqual({revision:1,adoptedAt:w.tick,lastTick:w.tick});
 const final=serializeCampaign(w);expect(serializeCampaign(deserializeCampaign(final))).toBe(final);expect(readFileSync(file!,'utf8')).toBe(bytes);
},120000);
