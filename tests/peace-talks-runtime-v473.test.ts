import {expect,test,vi} from 'vitest';
import {peaceTalksCamp473} from './scenarios/peace-talks-v473.ts';
import {peaceTalksArrivalReason293,preparePeaceTalksResolution293,expirePeaceTalks293} from '../src/sim/peace-talks-runtime-293.ts';
import {peaceDiplomat293,peaceOutcome293,draftPeaceSocialXp293} from '../src/sim/peace-talks-rules-293.ts';
import {advanceCaravanArrivals261} from '../src/sim/caravan-arrival-261.ts';
import {healthRandom} from '../src/sim/health.ts';
import {serializeCampaign,deserializeCampaign} from '../src/sim/serialization.ts';
import {groupReorganizationBalance} from '../src/sim/group-reorganization-balance.ts';
import {createRaidGroup} from '../src/sim/raid-spawn.ts';
import {raidEntries} from '../src/sim/raid-space.ts';
import {stepWorld} from '../src/sim/engine.ts';
import {GroupCampaignRuntime256} from '../src/sim/group-campaign-runtime-256.ts';
import {GroupCaravanPhysical256} from '../src/sim/group-caravan-physical-256.ts';
import {createGroupCampaignGeometry256} from '../src/sim/group-campaign-geometry-256.ts';
import {preparePlanetNavigation256} from '../src/sim/planet-route-256.ts';
import {xpRequired,XP_SCALE} from '../src/sim/skills.ts';
import {validPeaceTalksSite293} from '../src/sim/peace-talks-save-293.ts';
import * as peaceRules from '../src/sim/peace-talks-rules-293.ts';
import type {PeaceTalksOutcome293} from '../src/sim/peace-talks-state-293.ts';

// Conditioned initial RNG is a declared isolated test stimulus. No played
// campaign is repaired and no completed negotiation is rolled a second time.
function camp(outcome:PeaceTalksOutcome293='flounder'){
 const {w,groupId,siteId}=peaceTalksCamp473(),record=w.worldGroups!.groups.find(r=>r.state.id===groupId)!,g=record.state;
 if(!('members'in g))throw Error('Original caravan absent');
 const site=w.worldSites263!.entries.find(s=>s.id===siteId);if(site?.kind!=='peace-talks')throw Error('Real born site absent');
 const diplomat=peaceDiplomat293(g.members);if(!diplomat)throw Error('Original diplomat absent');
 let seed=1,found=false;
 for(let i=0;i<10000;i++,seed=(seed+0x9e3779b9)>>>0){const r={rng:seed};if(peaceOutcome293(diplomat.ability,healthRandom(r))===outcome){w.rng=seed;found=true;break;}}
 if(!found)throw Error('No conditioned initial outcome seed');
 const f=w.worldFactions!,relation=f.relations.find(r=>r.aId===Math.min(site.factionId,f.playerFactionId)&&r.bId===Math.max(site.factionId,f.playerFactionId))!;
 return {w,record,g,site,relation,diplomat};
}
function exactReload(w:ReturnType<typeof camp>['w']){const raw=serializeCampaign(w);expect(serializeCampaign(deserializeCampaign(raw))).toBe(raw);}

for(const outcome of ['disaster','backfire','flounder','success','triumph'] as const)test('real '+outcome+' publishes one terminal, direct XP and diplomatic result together',()=>{
 const {w,g,site,relation,diplomat}=camp(outcome),before=serializeCampaign(w),members=g.members.slice(),items=g.items.slice(),xp=draftPeaceSocialXp293(diplomat.pawn),daily=diplomat.pawn.skills.social?.dailyXp;
 const plan=preparePeaceTalksResolution293(w,g.id,site.id);expect(plan.ok).toBe(true);if(!plan.ok)throw Error(plan.reason);
 expect(plan.outcome).toBe(outcome);expect(plan.current()).toBe(true);expect(serializeCampaign(w)).toBe(before);
 expect(plan.commit().ok).toBe(true);expect(plan.current()).toBe(false);expect(site.closed?.reason).toBe('resolved');
 if(site.closed?.reason!=='resolved')throw Error('Terminal absent');const result=site.closed.result;
 expect(result).toMatchObject({outcome,groupId:g.id,negotiatorId:diplomat.pawn.id,socialXp:{direct:true,requested:6000,credited:xp.credited}});
 expect(diplomat.pawn.skills.social).toEqual(xp.skill);expect(diplomat.pawn.skills.social?.dailyXp).toBe(daily??0);
 expect(relation).toMatchObject({goodwill:result.goodwill.after,kind:result.goodwill.kindAfter});expect(g.members).toEqual(members);
 for(const item of items)expect(g.items).toContain(item);
 expect(!!result.attack).toBe(outcome==='disaster');expect(!!result.reward).toBe(outcome==='triumph');
 const terminal=serializeCampaign(w);expect(plan.commit().ok).toBe(false);expect(preparePeaceTalksResolution293(w,g.id,site.id).ok).toBe(false);expect(serializeCampaign(w)).toBe(terminal);exactReload(w);
},120_000);

test('Triumph retains real inventories and credits only the received physical package',()=>{
 const {w,g,site}=camp('triumph'),old=g.items.slice(),history=structuredClone(g.reorganization!);
 const p=preparePeaceTalksResolution293(w,g.id,site.id);if(!p.ok)throw Error(p.reason);expect(p.commit().ok).toBe(true);
 if(site.closed?.reason!=='resolved'||!site.closed.result.reward)throw Error('Real gift absent');const gift=site.closed.result.reward;
 expect(gift.marketValue).toBeGreaterThanOrEqual(500);expect(gift.marketValue).toBeLessThanOrEqual(1200);expect(gift.massGrams).toBeLessThanOrEqual(20000);
 expect(gift.delivered.length).toBeGreaterThanOrEqual(2);expect(gift.delivered.length).toBeLessThanOrEqual(16);
 for(const row of gift.delivered){const pile=g.items.find(i=>i.id===row.id)!;expect(pile).toMatchObject({item:row.item,quantity:row.quantity,owner:{type:'inventory',pawnId:row.carrierId}});expect(old).not.toContain(pile);expect(g.reorganization!.received[row.item]).toBe((history.received[row.item]??0)+gift.delivered.filter(d=>d.item===row.item).reduce((n,d)=>n+d.quantity,0));}
 expect(groupReorganizationBalance(g,g.reorganization!,w.worldGroups!.losses)).toBe(true);exactReload(w);
},120_000);

test('arrival allows the relationship to have become allied and Disaster forces it hostile again',()=>{
 const {w,g,site,relation}=camp('disaster');relation.kind='ally';relation.goodwill=100;
 expect(peaceTalksArrivalReason293(w,g.id,site.id,site.tile)).toBeUndefined();const p=preparePeaceTalksResolution293(w,g.id,site.id);if(!p.ok)throw Error(p.reason);expect(p.commit().ok).toBe(true);
 expect(relation.kind).toBe('hostile');expect(relation.goodwill).toBeLessThanOrEqual(-75);if(site.closed?.reason!=='resolved')throw Error('Terminal absent');expect(site.closed.result.goodwill.requested).toBe(-175);exactReload(w);
},120_000);

test('without an eligible diplomat the arrival action is consumed but site, RNG, IDs and XP remain untouched',()=>{
 const {w,record,g,site}=camp();for(const p of g.members)p.background={childhood:'sheltered-child',adulthood:'hermit'};
 const rng=w.rng,nextId=w.nextId,people=JSON.stringify(g.members),siteBefore=JSON.stringify(site);record.arrival261={tile:site.tile,action:{kind:'peace-talks',siteId:site.id}};
 expect(preparePeaceTalksResolution293(w,g.id,site.id).ok).toBe(false);expect(advanceCaravanArrivals261(w)).toEqual([g.id]);expect(record.arrival261).toBeUndefined();
 expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);expect(JSON.stringify(site)).toBe(siteBefore);expect(JSON.stringify(g.members)).toBe(people);expect(record.pending261).toBeUndefined();
});

test('an unfinished travel edge or unconfirmed personal clock cannot resolve an arrival',()=>{
 const {w,g,site}=camp(),before=JSON.stringify(site),rng=w.rng;g.lastPersonalTick=w.tick-1;
 expect(preparePeaceTalksResolution293(w,g.id,site.id).ok).toBe(false);g.lastPersonalTick=w.tick;g.phase='travelling';
 expect(preparePeaceTalksResolution293(w,g.id,site.id).ok).toBe(false);expect(JSON.stringify(site)).toBe(before);expect(w.rng).toBe(rng);
});

test('expiry wins at the exact boundary and preserves the historical quest tag',()=>{
 const {w,g,site:born}=camp(),site=structuredClone(born),before=JSON.stringify(w);
 // Declared scalar clock projection only: preserve the real born deadline.
 // Other campaign owners have not played these days, so no whole-campaign
 // reload is claimed for this projection; the acquired source stays untouched.
 const projection={...w,tick:site.expiresAtCore/10,worldSites263:{...w.worldSites263!,entries:w.worldSites263!.entries.map(s=>s===born?site:s)}};
 expect(validPeaceTalksSite293(site,projection)).toBe(true);
 expect(peaceTalksArrivalReason293(projection,g.id,site.id,site.tile)).toBeDefined();expect(preparePeaceTalksResolution293(projection,g.id,site.id).ok).toBe(false);expirePeaceTalks293(projection);
 expect(site.closed).toEqual({atCore:site.expiresAtCore,reason:'expired'});expect(site.questTag).toBe(born.questTag);expect(validPeaceTalksSite293(site,projection)).toBe(true);
 const closed=JSON.stringify(site);expirePeaceTalks293(projection);expect(JSON.stringify(site)).toBe(closed);expect(JSON.stringify(w)).toBe(before);
},120_000);

for(const field of ['goodwill','social','items','closed'] as const)test('preflight refuses an immutable '+field+' before consuming any source',()=>{
 const {w,g,site,relation,diplomat}=camp('triumph'),object=field==='goodwill'?relation:field==='social'?diplomat.pawn.skills:field==='items'?g:site;
 if(field==='closed')Object.preventExtensions(site);else Object.defineProperty(object,field,{writable:false});
 const before=JSON.stringify(w);expect(preparePeaceTalksResolution293(w,g.id,site.id).ok).toBe(false);expect(JSON.stringify(w)).toBe(before);
});

test('same-value original replacement and later mutation invalidate a sealed plan without partial publication',()=>{
 const {w,g,site}=camp('triumph'),p=preparePeaceTalksResolution293(w,g.id,site.id);if(!p.ok)throw Error(p.reason);
 const original=g.items[0]!;g.items[0]=structuredClone(original);const before=serializeCampaign(w);expect(p.current()).toBe(false);expect(p.commit().ok).toBe(false);expect(serializeCampaign(w)).toBe(before);expect(site.closed).toBeUndefined();
});

test('one original cannot resolve two simultaneously prepared plans',()=>{
 const {w,g,site}=camp(),a=preparePeaceTalksResolution293(w,g.id,site.id),b=preparePeaceTalksResolution293(w,g.id,site.id);if(!a.ok||!b.ok)throw Error('Plans refused');expect(a.commit().ok).toBe(true);const raw=serializeCampaign(w);expect(b.commit().ok).toBe(false);expect(serializeCampaign(w)).toBe(raw);
});

test('zero credited XP preserves the original capped Social record and needs no writable Social slot',()=>{
 const {w,g,site,diplomat}=camp();diplomat.pawn.skills.social={level:20,xp:xpRequired(20)-XP_SCALE,dailyXp:456,passion:0};const original=diplomat.pawn.skills.social;
 Object.defineProperty(diplomat.pawn.skills,'social',{writable:false});const p=preparePeaceTalksResolution293(w,g.id,site.id);if(!p.ok)throw Error(p.reason);expect(p.commit().ok).toBe(true);
 expect(diplomat.pawn.skills.social).toBe(original);if(site.closed?.reason!=='resolved')throw Error('Terminal absent');expect(site.closed.result.socialXp.credited).toBe(0);
});

test('a batch stops at the very tick whose real arrival creates Disaster pending, with no second XP',()=>{
 const {w,record,g,site}=camp('disaster'),tick=w.tick;
 if(w.planet?.revision!==3)throw Error('Actual planet absent');preparePlanetNavigation256(w.planet);const runtime=new GroupCampaignRuntime256(createGroupCampaignGeometry256(w),new GroupCaravanPhysical256());runtime.bootstrap(w);
 record.arrival261={tile:site.tile,action:{kind:'peace-talks',siteId:site.id}};
 // Only the named outcome is conditioned; actual draw, arrival, personal
 // physiology, roster producer and pending/clock publication run normally.
 const outcome=vi.spyOn(peaceRules,'peaceOutcome293').mockReturnValue('disaster');
 try{stepWorld(w,61,undefined,runtime);}finally{outcome.mockRestore();}
 expect(w.tick).toBe(tick+1);expect(record.pending261?.kind).toBe('peace-talks');expect(record.pending261?.atCore).toBe(w.tick*10);expect(record.arrival261).toBeUndefined();
 if(site.closed?.reason!=='resolved')throw Error('Terminal absent');expect(site.closed.result.outcome).toBe('disaster');const raw=serializeCampaign(w);stepWorld(w,61,undefined,runtime);expect(serializeCampaign(w)).toBe(raw);exactReload(w);
},120_000);

test('a nonraid affiliated original follows the diplomatic category in the same commit',()=>{
 const {w,g,site}=camp('triumph'),leader=w.worldFactions!.leaders.find(l=>l.factionId===site.factionId)!.pawn;
 expect(leader.raid).toBeUndefined();leader.faction='outlaws';const p=preparePeaceTalksResolution293(w,g.id,site.id);if(!p.ok)throw Error(p.reason);expect(leader.faction).toBe('outlaws');expect(p.commit().ok).toBe(true);expect(leader.faction).toBe('outlanders');exactReload(w);
},120_000);

test('a prepared real raid retains its mandate and originals when the world relationship changes',()=>{
 const {w,g,site,relation}=camp('triumph');
 // Initial isolated test preparation: a real existing raid producer supplies
 // finite people/equipment, affiliated to the negotiation faction before play.
 const sites=raidEntries(w,17,1);if(!sites)throw Error('No actual raid entry');
 const raid=createRaidGroup(w,{count:1,sites,random:{rng:1928}});if(!raid)throw Error('Real raid producer refused');
 const raider=w.pawns.find(p=>p.id===raid.members[0])!;raider.worldAffiliation259={revision:1,factionId:site.factionId,hostFactionId:null,guestStatus:'Guest'};
 const mandate=raider.raid,gear=w.piles.filter(p=>'pawnId'in p.owner&&p.owner.pawnId===raider.id);exactReload(w);
 const p=preparePeaceTalksResolution293(w,g.id,site.id);if(!p.ok)throw Error(p.reason);expect(p.commit().ok).toBe(true);expect(relation.kind).not.toBe('hostile');
 expect(w.raids!.active).toBe(raid);expect(w.pawns).toContain(raider);expect(raider.raid).toBe(mandate);expect(raider.faction).toBe('outlaws');for(const item of gear)expect(w.piles).toContain(item);exactReload(w);
},120_000);
