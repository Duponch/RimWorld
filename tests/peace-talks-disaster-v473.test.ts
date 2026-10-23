import {expect,test,vi} from 'vitest';
import {peaceTalksCamp473} from './scenarios/peace-talks-v473.ts';
import {peaceDiplomat293,peaceOutcome293} from '../src/sim/peace-talks-rules-293.ts';
import {preparePeaceTalksResolution293} from '../src/sim/peace-talks-runtime-293.ts';
import {prepareActualBattlefieldEntry261,type BattlefieldEntry261} from '../src/sim/caravan-battlefield-entry-261.ts';
import {applyCaravanCommand261} from '../src/sim/caravan-commands-261.ts';
import {prepareEncounterForeignWorld261} from '../src/sim/caravan-foreign-world-261.ts';
import {registeredMap} from '../src/sim/world-map-context.ts';
import {healthRandom} from '../src/sim/health.ts';
import {serializeCampaign,deserializeCampaign} from '../src/sim/serialization.ts';
import * as serialization from '../src/sim/serialization.ts';
import {validPeaceTalksBindings293} from '../src/sim/peace-talks-save-293.ts';
import {validCaravanRaidProvenance261} from '../src/sim/caravan-raid-save-261.ts';
import {writeTestFileSync,testOutputPath} from './test-output.ts';

function pending(){
 const {w,groupId,siteId}=peaceTalksCamp473(),record=w.worldGroups!.groups.find(r=>r.state.id===groupId)!,g=record.state;
 if(!('members'in g))throw Error('Original caravan absent');const site=w.worldSites263!.entries.find(s=>s.id===siteId);if(site?.kind!=='peace-talks')throw Error('Born site absent');
 const diplomat=peaceDiplomat293(g.members);if(!diplomat)throw Error('Original diplomat absent');
 let seed=1,found=false;for(let i=0;i<10000;i++,seed=(seed+0x9e3779b9)>>>0){const r={rng:seed};if(peaceOutcome293(diplomat.ability,healthRandom(r))==='disaster'){w.rng=seed;found=true;break;}}if(!found)throw Error('Initial test seed absent');
 const originals={people:g.members.slice(),animals:g.animalOwners?.members.slice()??[],items:g.items.slice(),packed:g.packed?.slice()??[]},story=JSON.stringify(record.story261);
 const p=preparePeaceTalksResolution293(w,g.id,site.id);if(!p.ok)throw Error(p.reason);expect(p.commit().ok).toBe(true);
 if(record.pending261?.kind!=='peace-talks'||site.closed?.reason!=='resolved'||site.closed.result.attack?.phase!=='pending')throw Error('True forced owner absent');
 return {w,record,g,site,attack:site.closed.result.attack,pending:record.pending261,originals,story};
}
function reload(w:ReturnType<typeof pending>['w']){const raw=serializeCampaign(w);expect(serializeCampaign(deserializeCampaign(raw))).toBe(raw);return raw;}

test('Disaster is a forced original faction roster, never an open decision or a fictitious ambush recurrence',()=>{
 const c=pending(),{w,g,record,pending:p,site,attack}=c;
 expect(p).toMatchObject({kind:'peace-talks',decision:'forced',factionId:site.factionId,peaceTalksSiteId293:site.id,atCore:w.tick*10});expect(p.people.length).toBeGreaterThan(0);expect(p.animals).toEqual([]);
 expect(attack.enemyIds).toEqual(p.people.map(p=>p.id));for(const person of p.people){expect(person.worldAffiliation259?.factionId).toBe(site.factionId);expect(person.raid).toBeUndefined();expect(p.items.some(i=>'pawnId'in i.owner&&i.owner.pawnId===person.id)).toBe(true);}
 expect(JSON.stringify(record.story261)).toBe(c.story);const before=reload(w);
 for(const choice of ['continue','give','fight','attack'] as const){expect(applyCaravanCommand261(w,{type:'caravan-encounter-choice',groupId:g.id,choice}).ok).toBe(false);expect(serializeCampaign(w)).toBe(before);}
 expect(prepareEncounterForeignWorld261(w,record).ok).toBe(false);expect(applyCaravanCommand261(w,{type:'caravan-encounter-choice',groupId:g.id,choice:'retry'}).ok).toBe(true);expect(serializeCampaign(w)).toBe(before);
},120_000);

test('an immutable terminal receipt refuses entry without dropping or rerolling the pending owners',()=>{
 const {w,g,site,record,pending:p}=pending();if(site.closed?.reason!=='resolved')throw Error('Terminal absent');Object.defineProperty(site.closed.result,'attack',{writable:false});
 const before=reload(w),gen=prepareActualBattlefieldEntry261(w,g.id),step=gen.next();expect(step.done).toBe(true);if(!step.done)throw Error('Unexpected generation');expect(step.value.status).toBe('blocked');expect(record.pending261).toBe(p);expect(serializeCampaign(w)).toBe(before);expect(preparePeaceTalksResolution293(w,g.id,site.id).ok).toBe(false);
},120_000);

test('cancelled private generation preserves exact pending/RNG/IDs; retry enters the same original actors and cargo',()=>{
 const c=pending(),{w,g,site,record,pending:p,originals}=c,foreign=p.people.slice(),foreignItems=p.items.slice(),before=reload(w),nextMapId=w.worldMaps!.nextMapId;
 writeTestFileSync(testOutputPath('artifacts/peace-talks-v473/disaster-before-entry.json'),before);
 const cancelled=prepareActualBattlefieldEntry261(w,g.id),first=cancelled.next();expect(first.done).toBe(false);cancelled.return({status:'blocked',phase:'test-cancelled',reason:'Declared cancellation of unpublished draft'});
 expect(serializeCampaign(w)).toBe(before);expect(record.pending261).toBe(p);expect(preparePeaceTalksResolution293(w,g.id,site.id).ok).toBe(false);
 const privateValidation=vi.spyOn(serialization,'validateGeneratedLocalMap256');let entry:BattlefieldEntry261;
 try{
  const retry=prepareActualBattlefieldEntry261(w,g.id);let next=retry.next();while(!next.done)next=retry.next();entry=next.value;
  // Observe the very same generated draft used by this entry, without a
  // second generation. Its local guard is not authority to publish a campaign.
  const call=privateValidation.mock.calls.at(-1),validation=privateValidation.mock.results.at(-1);if(!call)throw Error('Actual private local validation absent');
  expect(validation?.type).toBe('return');expect(validation?.value).toEqual([]);
  expect(validPeaceTalksBindings293(call[0])).toBe(false);expect(serialization.validateWorld(call[0]).length).toBeGreaterThan(0);
 }finally{privateValidation.mockRestore();}
 writeTestFileSync(testOutputPath('artifacts/peace-talks-v473/disaster-entry-receipt.json'),JSON.stringify(entry));
 expect(entry.status).toBe('ready');if(entry.status!=='ready')throw Error(entry.phase+': '+entry.reason);expect(entry.commit().ok).toBe(true);
 const map=registeredMap(w,nextMapId)!;expect(map).toBeDefined();expect(w.worldGroups!.groups).not.toContain(record);
 for(const person of [...originals.people,...foreign])expect(map.pawns).toContain(person);for(const animal of originals.animals)expect(map.wildlife!.animals).toContain(animal);
 for(const item of [...originals.items,...foreignItems])expect(map.piles).toContain(item);for(const pack of originals.packed)expect(map.packed).toContain(pack);
 expect(map.raids!.active?.members).toEqual(foreign.map(p=>p.id));for(const person of foreign)expect(person.raid?.group).toBe(map.raids!.active!.id);
 const raid=map.raids!.active!,provenance=raid.caravan261!;
 expect(validCaravanRaidProvenance261(provenance,map,raid.startedAt,raid.members)).toBe(true);
 const otherFaction=w.worldFactions!.factions.find(f=>f.id!==p.factionId&&f.id!==w.worldFactions!.playerFactionId)!.id;
 for(const bad of [{...provenance,sourceGroupId:g.id===1?2:1},{...provenance,factionId:otherFaction},{...provenance,bornAtCore:provenance.bornAtCore+10}])expect(validCaravanRaidProvenance261(bad,map,raid.startedAt,raid.members)).toBe(false);
 expect(validCaravanRaidProvenance261(provenance,map,raid.startedAt,[originals.people[0]!.id,...raid.members.slice(1)])).toBe(false);
 const battlefield=w.worldMaps!.sites.find(s=>s.id===nextMapId)!.battlefield261!;expect(battlefield).toMatchObject({kind:'peace-talks',factionId:p.factionId,peaceTalksSiteId293:site.id});expect(JSON.stringify(w.worldMaps!.sites.find(s=>s.id===nextMapId)!.story261)).toBe(c.story);
 if(site.closed?.reason!=='resolved')throw Error('Terminal absent');expect(site.closed.result.attack).toEqual({phase:'entered',mapId:nextMapId,atCore:w.tick*10,points:c.attack.points,enemyIds:foreign.map(p=>p.id)});
 const after=reload(w);writeTestFileSync(testOutputPath('artifacts/peace-talks-v473/disaster-entered.json'),after);expect(entry.commit().ok).toBe(false);expect(preparePeaceTalksResolution293(w,g.id,site.id).ok).toBe(false);expect(serializeCampaign(w)).toBe(after);
},240_000);
