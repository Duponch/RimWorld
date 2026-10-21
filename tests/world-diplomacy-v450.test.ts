import {expect,test} from 'vitest';
import {worldRelationAfterChange274,validWorldRelationKind274,diplomaticGiftFaction274,worldNaturalGoodwill274,worldGoodwillChange274} from '../src/sim/world-diplomacy-274.ts';
import {worldRelationKind256,type WorldFactionRelationKind256} from '../src/sim/world-faction-catalog.ts';
import {generateForeignWorldFactions256,completeWorldFactionRegistry256} from '../src/sim/world-faction-generation.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {defaultWorldGenerationSettings} from '../src/sim/world-generation-settings.ts';
import {validateWorldFactionRegistry256,type WorldFactionValidationHeader256} from '../src/sim/world-faction-save.ts';
import {applySettlementProximity263} from '../src/sim/world-settlement-proximity-263.ts';
import type {WorldFactionRegistry256,WorldFactionRelation256} from '../src/sim/world-faction-state.ts';
import type {WorldEvent} from '../src/sim/types.ts';

function prepared(){
 const tiles=Array.from({length:128},(_,i)=>({biome:'temperate-forest' as const,hilliness:'flat' as const,neighbours:[(i+127)%128,(i+1)%128]}));
 const first=generateForeignWorldFactions256({version:273,tick:0,tiles,selection:defaultWorldGenerationSettings().factions,population:3,nextFactionId:1,nextSettlementId:1,nextThingId:1000,random:new WorldGenerationRandom(718)});
 if(!first.ok)throw Error(first.reason);
 const completed=completeWorldFactionRegistry256({version:273,draft:first.draft,playerDef:'PlayerColony',name:'Colonie témoin',postWorldRandom:new WorldGenerationRandom(718)});
 if(!completed.ok)throw Error(completed.reason);
 const registry=completed.registry,faction=registry.factions.find(f=>f.def==='OutlanderCivil')!;
 const relation=registry.relations.find(r=>r.aId===Math.min(faction.id,registry.playerFactionId)&&r.bId===Math.max(faction.id,registry.playerFactionId))!;
 const header:WorldFactionValidationHeader256={present:true,tick:0,width:16,height:16,nextId:first.nextThingId,tileCount:128,postIds:new Set(),knownHumanIds:new Set(),occupiedThingIds:new Set()};
 return {registry,faction,relation,header};
}

test('mutation uses the persisted relation kind and the ordered Core thresholds, while initialization stays literal',()=>{
 const rows:[WorldFactionRelationKind256,number,WorldFactionRelationKind256][]=[
  ['neutral',-74,'neutral'],['neutral',-75,'hostile'],['neutral',74,'neutral'],['neutral',75,'ally'],
  ['hostile',-75,'hostile'],['hostile',-1,'hostile'],['hostile',0,'neutral'],['hostile',74,'neutral'],['hostile',75,'ally'],
  ['ally',75,'ally'],['ally',1,'ally'],['ally',0,'neutral'],['ally',-74,'neutral'],['ally',-75,'hostile']];
 for(const [previous,goodwill,result] of rows)expect(worldRelationAfterChange274(previous,goodwill),`${previous}/${goodwill}`).toBe(result);
 expect(worldRelationKind256(-10)).toBe('hostile');expect(worldRelationKind256(74)).toBe('neutral');
});

test('schema274 admits the overlapping historical states of hysteresis without opening zero, extreme or future boundaries',()=>{
 const kinds=['hostile','neutral','ally'] as const;
 for(let goodwill=-100;goodwill<=100;goodwill++)for(const kind of kinds){
  expect(validWorldRelationKind274(goodwill,kind,273)).toBe(kind===worldRelationKind256(goodwill));
  expect(validWorldRelationKind274(goodwill,kind,274)).toBe(kind==='hostile'?goodwill<0:kind==='ally'?goodwill>0:goodwill> -75&&goodwill<75);
  expect(validWorldRelationKind274(goodwill,kind,275)).toBe(false);
 }
 for(const goodwill of [-101,101,.5,NaN,Infinity])for(const kind of kinds)expect(validWorldRelationKind274(goodwill,kind,274)).toBe(false);
 expect(validWorldRelationKind274(0,'unknown',274)).toBe(false);expect(validWorldRelationKind274(0,'neutral',255)).toBe(false);
});

test('the actual Core natural target adjusts only changes toward it, rounds ties to even, then clamps before applying hysteresis',()=>{
 expect(worldNaturalGoodwill274({def:'OutlanderCivil'})).toBe(0);expect(worldNaturalGoodwill274({def:'TribeCivil'})).toBe(0);
 expect(worldNaturalGoodwill274({def:'OutlanderRough'})).toBe(-130);expect(worldNaturalGoodwill274({def:'TribeRough'})).toBe(-130);
 const rows:[number,WorldFactionRelationKind256,number,number,number,number,WorldFactionRelationKind256][]=[
  [-10,'neutral',0,2,2,-8,'neutral'],[-10,'neutral',0,6,8,-2,'neutral'],[-10,'neutral',0,10,12,2,'neutral'],
  [-20,'neutral',0,14,18,-2,'neutral'],[-2,'neutral',0,10,10,8,'neutral'],[-6,'neutral',0,10,12,6,'neutral'],
  [-20,'neutral',0,100,105,85,'ally'],[-20,'neutral',-130,100,100,80,'ally'],
  [80,'ally',0,-10,-12,68,'ally'],[10,'ally',0,-10,-12,-2,'neutral'],
  [-60,'neutral',-130,-20,-25,-85,'hostile'],[-90,'hostile',-130,-200,-210,-100,'hostile'],
  [95,'ally',0,200,200,100,'ally'],[100,'ally',0,1,1,100,'ally'],[-70,'neutral',0,0,0,-70,'neutral']];
 for(const [before,kind,natural,requested,adjusted,after,result] of rows)expect(worldGoodwillChange274(before,kind,natural,requested),`${before}/${kind}/${natural}/${requested}`)
  .toEqual({adjustedGain:adjusted,appliedGain:after-before,goodwillAfter:after,kindAfter:result});
 expect(worldGoodwillChange274(0,'ally',0,1)).toBeUndefined();expect(worldGoodwillChange274(0,'neutral',1,1)).toBeUndefined();
 for(const requested of [.5,NaN,Infinity,Number.MAX_SAFE_INTEGER])expect(worldGoodwillChange274(0,'neutral',0,requested)).toBeUndefined();
});

test('the actual faction validator preserves a historical kind on274 and rejects the same new states on273',()=>{
 const {registry,relation,header}=prepared();expect(validateWorldFactionRegistry256(registry,273,header)).toEqual([]);
 for(const [goodwill,kind] of [[74,'ally'],[-50,'neutral']] as const){
  Object.assign(relation,{goodwill,kind});const before=JSON.stringify(registry);
  expect(validateWorldFactionRegistry256(registry,274,header)).toEqual([]);
  expect(validateWorldFactionRegistry256(registry,273,header)).toContain('Invalid bilateral faction relation.');
  expect(validateWorldFactionRegistry256(registry,275,header)).not.toEqual([]);
  expect(JSON.stringify(registry)).toBe(before);
 }
 for(const [goodwill,kind] of [[0,'ally'],[0,'hostile'],[-75,'neutral'],[75,'neutral']] as const){Object.assign(relation,{goodwill,kind});expect(validateWorldFactionRegistry256(registry,274,header)).toContain('Invalid bilateral faction relation.');}
 Object.assign(relation,{goodwill:0,kind:'neutral'});Object.assign(relation,{gift274:false});expect(validateWorldFactionRegistry256(registry,274,header)).toContain('Invalid bilateral faction relation.');
});

test('gift faction admission returns original references and rechecks real player, flags and bilateral authority without mutation',()=>{
 const {registry,faction,relation}=prepared(),before=JSON.stringify(registry),result=diplomaticGiftFaction274(registry,faction.id,274);
 expect(result.ok).toBe(true);if(!result.ok)throw Error(result.reason);expect(result.faction).toBe(faction);expect(result.relation).toBe(relation);
 expect(JSON.stringify(registry)).toBe(before);
 const rejected:( (r:WorldFactionRegistry256,f:typeof faction,pair:WorldFactionRelation256)=>void)[]=[
  r=>{r.playerFactionId=999;},(r,f)=>{r.playerFactionId=f.id;},(_r,f)=>{f.hidden=true;},(_r,f)=>{f.def='Pirate';},
  (_r,f)=>{f.lifecycle259={revision:1,temporary:true,defeated:false};},(_r,f)=>{f.lifecycle259={revision:1,temporary:false,defeated:true};},
  r=>{r.factions.find(f=>f.id===r.playerFactionId)!.lifecycle259={revision:1,temporary:true,defeated:false};},
  (r,f)=>{r.settlements.find(s=>s.factionId===f.id)!.attack263={revision:1,mapId:123,generatedAtCore:0,inhabitantIds:[]};},
  (r,_f,pair)=>{r.relations=r.relations.filter(row=>row!==pair);},(r,_f,pair)=>{r.relations.push({...pair});},
  (_r,_f,pair)=>{Object.assign(pair,{goodwill:-1,kind:'hostile'});},(_r,_f,pair)=>{Object.assign(pair,{goodwill:0,kind:'ally'});}];
 for(const mutate of rejected){const copy=structuredClone(registry),f=copy.factions.find(f=>f.id===faction.id)!,pair=copy.relations.find(r=>r.aId===relation.aId&&r.bId===relation.bId)!;mutate(copy,f,pair);const state=JSON.stringify(copy);expect(diplomaticGiftFaction274(copy,f.id,274).ok).toBe(false);expect(JSON.stringify(copy)).toBe(state);}
 expect(diplomaticGiftFaction274(registry,registry.playerFactionId,274).ok).toBe(false);
 expect(diplomaticGiftFaction274(registry,999,274).ok).toBe(false);
 for(const version of [273,275])expect(diplomaticGiftFaction274(registry,faction.id,version).ok).toBe(false);
 const past=structuredClone(registry);past.settlements.find(s=>s.factionId===faction.id)!.attack263={revision:1,mapId:null,generatedAtCore:0,inhabitantIds:[],cooldownUntilCore:60000};
 expect(diplomaticGiftFaction274(past,faction.id,274).ok).toBe(true);
});

test('proximity preserves an existing alliance below75 only on274, and keeps the historical mutator and event exact',()=>{
 const {registry,faction,relation}=prepared();Object.assign(relation,{goodwill:80,kind:'ally'});
 const old=structuredClone(registry),events:WorldEvent[]=[],oldEvents:WorldEvent[]=[],offsets=[{settlementId:1,factionId:faction.id,name:'Comptoir témoin',distance:4,goodwill:-10}];
 applySettlementProximity263(registry,offsets,events,90000,274);applySettlementProximity263(old,offsets,oldEvents,90000,273);
 expect(relation).toMatchObject({goodwill:70,kind:'ally'});
 expect(old.relations.find(r=>r.aId===relation.aId&&r.bId===relation.bId)).toMatchObject({goodwill:70,kind:'neutral'});
 expect(events).toEqual(oldEvents);expect(events).toHaveLength(1);
 Object.assign(relation,{goodwill:0,kind:'neutral'});applySettlementProximity263(registry,offsets,events,180000,274);expect(relation).toMatchObject({goodwill:-10,kind:'neutral'});
});
