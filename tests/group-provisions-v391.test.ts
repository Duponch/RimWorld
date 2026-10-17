import {legacyPlanet} from './helpers/legacy-fixture-guards.ts';
import {expect,test} from 'vitest';
import {applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld} from '../src/sim/index.ts';
import {groupProvisionMinimum,groupProvisionCounts} from '../src/sim/group-provisions.ts';
import {groupMemberReason,previewGroupFormation} from '../src/sim/group-authority.ts';
import {scoutPreparationReason} from '../src/sim/caravan-trip.ts';
import {adoptGroupProvisionClimate} from '../src/sim/group-provision-age.ts';
import {advanceGroupIngestion} from '../src/sim/group-ingestion.ts';
import {captureGroupMass} from '../src/sim/group-capture.ts';
import {rotAge,ROT_DAYS} from '../src/sim/food-preservation.ts';
import {createMedicalRecord,addResolvedInjury,medicalStatus} from '../src/sim/injury-state.ts';
import {BLOOD_UNIT} from '../src/sim/injury-rules.ts';
import {groupProvisionsWorkshopV391} from './scenarios/group-provisions-v391.ts';
import type {AwayGroup} from '../src/sim/group-capture.ts';
import type {Command,MaterialPile,World} from '../src/sim/types.ts';
const accept=(w:World,c:Command)=>expect(applyCommand(w,c),JSON.stringify(c)).toMatchObject({ok:true});
const until=(w:World,done:()=>boolean,max=1800)=>{for(let i=0;i<max&&!done();i++)stepWorld(w);expect(done(),`tick ${w.tick}`).toBe(true);};
const all=(w:World,item:string)=>[...w.piles,...(w.group&&'items' in w.group?w.group.items:[])].filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
function start(){const f=groupProvisionsWorkshopV391(),w=f.world;accept(w,{type:'group-start',memberIds:f.memberIds,destination:f.destination,sources:[{pileId:f.pemmicanId,quantity:60},{pileId:f.rationId,quantity:4}]});return {...f,w};}
function depart(){const f=start();until(f.w,()=>!!f.w.group&&'members' in f.w.group);return {...f,g:f.w.group as AwayGroup};}

test('two-food safety allocation never double counts shared stock, regardless of flexible/exclusive roster order',()=>{
 const f=groupProvisionsWorkshopV391(),w=f.world,[a,b]=w.pawns,ps=w.piles.find(p=>p.id===f.pemmicanId)!,rs=w.piles.find(p=>p.id===f.rationId)!;
 const policies=[{id:1,name:'Both',allowed:['survival-meal','pemmican'] as const},{id:2,name:'Pemmican',allowed:['pemmican'] as const}].map(p=>({...p,allowed:[...p.allowed]}));a!.foodPolicyId=1;b!.foodPolicyId=2;
 const stocks=(p:number,r:number)=>[{...ps,quantity:p},{...rs,quantity:r}];
 for(const members of [[a!,b!],[b!,a!]]){expect(groupProvisionMinimum(members,stocks(18,1),policies,w.tick)).toBe(true);expect(groupProvisionMinimum(members,stocks(17,1),policies,w.tick)).toBe(false);}
 a!.foodPolicyId=2;expect(groupProvisionMinimum([a!,b!],stocks(18,1),policies,w.tick)).toBe(false);expect(groupProvisionMinimum([a!,b!],stocks(36,0),policies,w.tick)).toBe(true);
 expect(groupProvisionMinimum([a!],[{...ps,quantity:18,foodPoison:{fraction:.1,cause:'unknown'}}],policies,w.tick)).toBe(false);
 const expired={...ps,quantity:18,rot:{progress:70*6000,atTick:w.tick}};expect(groupProvisionMinimum([a!],[expired],policies,w.tick)).toBe(false);
 expect(groupProvisionCounts(stocks(18,1),w.tick)).toEqual({rations:1,pemmicanUnits:18,provisionNutrition:180});
});

test('collective-only admission, actual pickup receipts and quantities retain ages and their separate counters',()=>{
 const f=start(),w=f.w;expect(scoutPreparationReason(w,w.pawns[0]!,true)).toMatch(/survie/);expect(groupMemberReason(w,w.pawns[0]!,true)).toBeUndefined();
 expect(w.group!.provisions).toEqual({revision:1,pemmicanLoadedUnits:0,pemmicanConsumedUnits:0,pemmicanSpoiledUnits:0});expect(all(w,'pemmican')).toBe(60);
 until(w,()=>!!w.group&&'manifest' in w.group&&w.group.cursor>0);
 const g=w.group!;if(!('manifest' in g))throw Error('Expected real contact receipt');const row=g.manifest[0]!,p=w.piles.find(v=>v.id===row.carriedPileId)!;
 expect(p.owner).toEqual({type:'inventory',pawnId:row.carrierId});expect(p.quantity).toBe(row.quantity);expect(rotAge(p,w.tick)).toBeGreaterThanOrEqual(600);expect(g.provisions!.pemmicanLoadedUnits).toBe(row.item==='pemmican'?row.quantity:0);expect(g.ledger.foodLoaded).toBe(row.item==='survival-meal'?row.quantity:0);
 const copy=deserializeWorld(serializeWorld(w)),at=w.tick;until(w,()=>!!w.group&&'members' in w.group);stepWorld(copy,w.tick-at);expect(serializeWorld(copy)).toBe(serializeWorld(w));
 const departed=w.group as AwayGroup;expect(departed.baseline).toMatchObject({food:4,pemmican:60});expect(departed.ledger.foodLoaded).toBe(4);expect(departed.provisions!.pemmicanLoadedUnits).toBe(60);expect(validateWorld(w)).toEqual([]);
});

test('mixed off-map meals, exact save and real return/unloading close independent item conservation',()=>{
 const f=depart(),w=f.w;until(w,()=>!!w.group&&'members' in w.group&&w.group.ledger.foodConsumed>=1&&w.group.provisions!.pemmicanConsumedUnits>1);
 const g=w.group as AwayGroup;expect(g.members.find(p=>p.id===f.memberIds[0])!.hunger).toBeGreaterThan(80);expect(g.ledger.foodConsumed).toBe(1);expect(g.provisions!.pemmicanConsumedUnits).toBeGreaterThan(1);
 const saved=deserializeWorld(serializeWorld(w));expect(saved).toEqual(w);accept(w,{type:'group-route',destination:legacyPlanet(w).homeTile});accept(saved,{type:'group-route',destination:legacyPlanet(saved).homeTile});const at=w.tick;
 until(w,()=>w.group?.phase==='unloading');stepWorld(saved,w.tick-at);expect(serializeWorld(saved)).toBe(serializeWorld(w));
 const ledger=structuredClone(w.group!.ledger),provisions=structuredClone(w.group!.provisions!);expect(all(w,'pemmican')).toBe(60-provisions.pemmicanConsumedUnits-provisions.pemmicanSpoiledUnits);expect(all(w,'survival-meal')).toBe(4-ledger.foodConsumed);
 until(w,()=>!w.group);expect(w.pawns.filter(p=>f.memberIds.includes(p.id))).toHaveLength(2);expect(w.piles.filter(p=>p.item==='pemmican').every(p=>p.owner.type==='ground')).toBe(true);expect(w.piles.filter(p=>p.item==='survival-meal').every(p=>p.owner.type==='ground')).toBe(true);expect(validateWorld(w)).toEqual([]);
});

test('expiry after a cold-owner boundary occurs before eating, removes real mass and resumes exactly without rejuvenation',()=>{
 const f=depart(),w=f.w;until(w,()=>w.group?.phase==='at-site');const g=w.group as AwayGroup;for(const p of g.members)p.hunger=100;
 // Declared warm planetary tile + near-expiry carried checkpoint; no voyage age is credited to this preparation.
 legacyPlanet(w).tiles[g.tile]!.meanTemperature=100;const p=g.items.find(p=>p.item==='pemmican')!,units=p.quantity;
 p.rot={progress:ROT_DAYS.pemmican*6000-1,atTick:w.tick,rate:0};const age=rotAge(p,w.tick);adoptGroupProvisionClimate(w,g);expect(rotAge(p,w.tick)).toBe(age);expect(p.rot.rate).toBeUndefined();
 g.members.find(v=>p.owner.type==='inventory'&&v.id===p.owner.pawnId)!.hunger=23;const before=structuredClone(g.provisions!),mass=captureGroupMass(g.members,g.items)!.grams;
 const saved=deserializeWorld(serializeWorld(w));stepWorld(w);stepWorld(saved);expect(serializeWorld(saved)).toBe(serializeWorld(w));
 expect(g.items.some(v=>v.id===p.id)).toBe(false);expect(g.provisions!.pemmicanConsumedUnits).toBe(before.pemmicanConsumedUnits);expect(g.provisions!.pemmicanSpoiledUnits).toBe(before.pemmicanSpoiledUnits+units);expect(w.spoiled.pemmican).toBe(units);expect(captureGroupMass(g.members,g.items)!.grams).toBe(mass-units*18);expect(validateWorld(w)).toEqual([]);
});

test('formation refuses unavailable food atomically; already loaded expiry cancels without recreating other possessions',()=>{
 const f=groupProvisionsWorkshopV391(),w=f.world,p=w.piles.find(v=>v.id===f.pemmicanId)!;p.foodPoison={fraction:.2,cause:'unknown'};
 const before=serializeWorld(w);expect(previewGroupFormation(w,f.memberIds,[{pileId:p.id,quantity:60},{pileId:f.rationId,quantity:4}],f.destination).ok).toBe(false);expect(serializeWorld(w)).toBe(before);delete p.foodPoison;
 accept(w,{type:'group-start',memberIds:f.memberIds,destination:f.destination,sources:[{pileId:p.id,quantity:60},{pileId:f.rationId,quantity:4}]});until(w,()=>!!w.group&&'manifest' in w.group&&w.group.manifest.slice(0,w.group.cursor).some(l=>l.item==='pemmican'));
 const g=w.group!;if(!('manifest' in g))throw Error('Expected loading');const loaded=w.piles.find(v=>v.id===g.manifest.find(l=>l.item==='pemmican')!.carriedPileId)!;const count=loaded.quantity;loaded.rot={progress:70*6000-1,atTick:w.tick};
 stepWorld(w);expect(w.group).toBeUndefined();expect(w.piles.some(v=>v.id===loaded.id)).toBe(false);expect(w.spoiled.pemmican).toBe(count);expect(all(w,'survival-meal')).toBe(4);expect(validateWorld(w)).toEqual([]);
});

test('one poison draw per multi-unit meal and policy filtering reuse the existing off-map physiology kernel',()=>{
 const f=depart(),w=f.w,g=f.g;for(const p of g.members)p.hunger=100;const person=g.members[0]!,p=g.items.find(v=>v.item==='pemmican')!;person.hunger=23;
 p.foodPoison={fraction:.5,cause:'filthy-kitchen'};let draws=0;const before=p.quantity,old=g.provisions!.pemmicanConsumedUnits;
 advanceGroupIngestion(g,{tick:w.tick,schemaVersion:w.schemaVersion,foodPolicies:w.foodPolicies,foodPoisonFactor:1,random:()=>{draws++;return .1;},notice:()=>{}});
 expect(draws).toBe(1);expect(person.health!.foodPoisoning).toMatchObject({item:'pemmican',cause:'filthy-kitchen'});const units=g.provisions!.pemmicanConsumedUnits-old;expect(units).toBeGreaterThan(1);expect(p.quantity).toBe(before-units);expect(g.ledger.foodConsumed).toBe(0);
});

test('clinical death captures remaining provisions only after expiry and terminal inventories remain frozen',()=>{
 for(const expiring of [false,true]){
  const f=depart(),w=f.w,g=f.g;for(const p of g.members){p.hunger=100;p.medicalCare='none';}
  const food=g.items.find(p=>p.item==='pemmican')!,p=g.members.find(p=>food.owner.type==='inventory'&&p.id===food.owner.pawnId)!;
  if(expiring)food.rot={progress:70*6000-1,atTick:w.tick};
  p.health=createMedicalRecord(w.tick);addResolvedInjury(p.health,'right-hand','cut',6000,()=>.999999);p.health.bloodLoss=BLOOD_UNIT-1;const status=medicalStatus(p.health);p.state=status==='mobile'?'idle':status;
  const copy=deserializeWorld(serializeWorld(w)),at=w.tick;until(w,()=>!!w.groupLosses?.some(l=>l.pawn.id===p.id),6);stepWorld(copy,w.tick-at);expect(serializeWorld(copy)).toBe(serializeWorld(w));
  const loss=w.groupLosses!.find(l=>l.pawn.id===p.id)!;expect(loss.items.some(v=>v.item==='pemmican')).toBe(!expiring);const frozen=JSON.stringify(loss);stepWorld(w,25);expect(JSON.stringify(loss)).toBe(frozen);expect(validateWorld(w)).toEqual([]);
 }
});
