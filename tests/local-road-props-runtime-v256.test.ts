import {test,expect} from 'vitest';
import {SnapshotEncoder} from '../src/bridge/snapshots.ts';
import {createWorld,canDesignate} from '../src/sim/engine.ts';
import {structureMaxHp,structureFlammability,isRepairableStructure} from '../src/sim/thing-damage-rules.ts';
import {damageStructure} from '../src/sim/thing-damage.ts';
import {constructionRecipe,validConstructionMaterial} from '../src/sim/construction-materials.ts';
import {finishDeconstruction} from '../src/sim/deconstruction.ts';
import {deconstructionDuration,designateDeconstruction} from '../src/sim/deconstruction-rules.ts';
import {claimRoadProp256,roadPropCanRepair256} from '../src/sim/local-road-prop-ownership-256.ts';
import {advanceRepair} from '../src/sim/repairs.ts';
import {STRUCTURE_SHOT_FILL} from '../src/sim/combat-content.ts';
import {FURNITURE_TRAVEL,canStandAt} from '../src/sim/furniture-travel.ts';
import {BUILDING_SUPPORT} from '../src/sim/bridge-rules.ts';
import {structureBeauty} from '../src/sim/room-beauty.ts';
import {structureRoomMarketValue} from '../src/sim/room-market-value.ts';
import {JOB_DURATION,footprintCells} from '../src/sim/definitions.ts';
import {minifiable} from '../src/sim/furniture-rules.ts';
import {lightSources} from '../src/sim/light-sources.ts';
import {mapObjectActions} from '../src/ui/map-object-actions.ts';
import {WIND_BLOCKERS} from '../src/sim/wind-rules.ts';
import {validLocalRoadPropStructure256,validLocalRoadPropsState256,validLocalRoadPropPackedBuilding256} from '../src/sim/local-road-props-save-256.ts';
import {localRoadPropParts256} from '../src/render/local-road-prop-parts-256.ts';
import {localRoadPropDescription256} from '../src/ui/local-road-prop-inspection-256.ts';
import type {Structure,World} from '../src/sim/types.ts';
const kinds=['ancient-road-barrier','ancient-road-lamp'] as const;
function prop(kind:typeof kinds[number],id=1):Structure{return {id,kind,x:8,z:8,orientation:0,footprint:'standard',factionId:null};}
/** Declared local owner fixture. No generated road, built/claimed object,
 * approach, salvage, combat or gameplay chronology is claimed by preparation. */
function fixture(kind:typeof kinds[number]){
 const w=createWorld(42,32,32);w.structures=[];w.jobs=[];w.piles=[];w.packed=[];w.resources=[];
 for(const t of w.tiles){t.terrain='grass';delete t.floor;delete t.bridge;delete t.collapsedRock;}
 const s=prop(kind,w.nextId++);w.structures.push(s);
 const p=w.pawns[0]!;p.x=7;p.z=8;p.jobId=null;p.path=[];p.moveCooldown=0;delete p.motion;
 return {w,s,p};
}
test('fixed actual HP, Light support, partial cover, passage and room value; no Stuff multiplier',()=>{
 for(const [i,kind] of kinds.entries()){
  const s=prop(kind);expect(structureMaxHp(s)).toBe(i===0?500:300);
  expect(structureFlammability(s)).toBe(0);expect(isRepairableStructure(s)).toBe(true);
  expect(BUILDING_SUPPORT[kind]).toBe('Light');expect(STRUCTURE_SHOT_FILL[kind]).toBe(i===0?.5:.25);
  expect(FURNITURE_TRAVEL[kind]).toEqual({delay:4.2,stand:false,repeat:i===0});
  expect(structureBeauty(s)).toBe(i===0?-10:0);
  expect(structureRoomMarketValue(s)).toBeCloseTo(15*1.9+(i===0?600:400)*.0036);
  expect(footprintCells(s)).toEqual([{x:8,z:8}]);expect(minifiable(kind)).toBe(false);
  expect(Object.hasOwn(JOB_DURATION,kind)).toBe(false);
  expect(WIND_BLOCKERS.has(kind)).toBe(i===1);
 }
});
test('strict 256 data only, old255 refused, own undefined/foreign roles and accessor rejected without read',()=>{
 const h={width:32,height:32,nextId:100};
 for(const kind of kinds){
  const s=prop(kind);expect(validLocalRoadPropStructure256(s,256,h)).toBe(true);
  const absent={...s};delete absent.factionId;expect(validLocalRoadPropStructure256(absent,256,h)).toBe(false);
  expect(validLocalRoadPropStructure256({...s,factionId:undefined},256,h)).toBe(false);
  expect(validLocalRoadPropStructure256(s,255,h)).toBe(false);
  for(const extra of [{material:undefined},{quality:'normal'},{power:{}},{medical:true},{damage:undefined}]){
   expect(validLocalRoadPropStructure256({...s,...extra},256,h)).toBe(false);
  }
  let reads=0;const d=Object.getOwnPropertyDescriptors(s);d.x={get(){reads++;return 8;},enumerable:true};
  expect(validLocalRoadPropStructure256(Object.create(Object.prototype,d),256,h)).toBe(false);expect(reads).toBe(0);
 }
 expect(validLocalRoadPropStructure256({...prop(kinds[1]),orientation:1},256,h)).toBe(false);
 expect(validLocalRoadPropStructure256({...prop(kinds[0]),damage:500},256,h)).toBe(false);
});
test('fixed recovery recipes and no construct/install/minify permission',()=>{
 for(const kind of kinds){
  const {w,s}=fixture(kind);expect(constructionRecipe(s)).toEqual({ingredients:[{item:'steel',quantity:15}],work:kind===kinds[0]?60:40,coreWork:kind===kinds[0]?600:400});
  expect(validConstructionMaterial(kind,undefined,255)).toBe(false);
  expect(validConstructionMaterial(kind,undefined,256)).toBe(true);
  expect(validConstructionMaterial(kind,'steel',256)).toBe(false);
  const before=JSON.stringify(w);
  expect(canDesignate(w,{type:'designate',kind,x:8,z:8} as unknown as Parameters<typeof canDesignate>[1]).ok).toBe(false);
  expect(JSON.stringify(w)).toBe(before);expect(canStandAt(w,s)).toBe(false);
  const state={...w,packed:[{building:s,owner:{type:'ground' as const,x:9,z:8}}]};
  expect(validLocalRoadPropsState256(state,256)).toBe(false);
  expect(validLocalRoadPropsState256({...w,jobs:[{...w.jobs[0],kind}]} as unknown as World,256)).toBe(false);
 }
});
test('actual deconstruction commits real steel plus the complementary loss, leaving no packed building',()=>{
 for(const kind of kinds){
  const {w,s,p}=fixture(kind);designateDeconstruction(w,s);const j=w.jobs[0]!;
  j.reservedBy=p.id;p.jobId=j.id;j.status='active';
  expect(deconstructionDuration(j)).toBe(Math.ceil((kind===kinds[0]?600:400)/17));
  expect(validLocalRoadPropsState256(w,256)).toBe(true);
  expect(finishDeconstruction(w,p,j)).toBe(true);
  const steel=w.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0);
  expect([7,8]).toContain(steel);expect((w.deconstructed.lostSteel??0)+steel).toBe(15);
  expect(w.structures.some(b=>b.id===s.id)).toBe(false);expect(w.packed).toHaveLength(0);
 }
});
test('repair HP advances through the existing work helper; fatal refusal leaves all owners/IDs/RNG/filth intact',()=>{
 const {w,s,p}=fixture(kinds[0]);
 expect(roadPropCanRepair256(w,s)).toBe(false);const unowned=JSON.stringify(w);
 expect(claimRoadProp256(w,{type:'claim-road-prop',structureId:s.id}).ok).toBe(false);expect(JSON.stringify(w)).toBe(unowned);
 // Declared actual registry instance, no retroactive faction or generated identity.
 w.worldFactions={revision:1,contentModel:'original-faction-content-v1',generatedAt:0,playerFactionId:17,nextFactionId:18,nextSettlementId:1,
 factions:[{id:17,def:'PlayerColony',hidden:false,name:'Préparation',randomKey:1,colorFromSpectrum:.5,leaderOwnerId:null}],relations:[],settlements:[],leaders:[]};
 expect(mapObjectActions(w,{kind:'structure',id:s.id}).some(a=>a.id==='claim'&&a.label==='Revendiquer')).toBe(true);
 expect(claimRoadProp256(w,{type:'claim-road-prop',structureId:s.id}).ok).toBe(true);expect(s.factionId).toBe(17);
 expect(roadPropCanRepair256(w,s)).toBe(true);expect(validLocalRoadPropsState256(w,256)).toBe(true);
 expect(validLocalRoadPropsState256({...w,worldFactions:{...w.worldFactions,playerFactionId:18}},256)).toBe(false);
 s.damage=2;designateDeconstruction(w,s);
 const j={...w.jobs[0]!,kind:'repair' as const,repair:{structureId:s.id},deconstruction:undefined};
 w.jobs=[j];p.jobId=j.id;j.reservedBy=p.id;
 for(let i=0;i<100&&s.damage;i++)advanceRepair(w,p,j,1,undefined);
 expect(s.damage).toBeUndefined();w.jobs=[];p.jobId=null;
 w.nextId=Number.MAX_SAFE_INTEGER;const before=JSON.stringify(w);
 expect(damageStructure(w,s,500,'bullet')).toBe(false);expect(JSON.stringify(w)).toBe(before);
});
test('successful fatal damage commits rubble before actual salvage; rendering is resident placements and read-only',()=>{
 for(const kind of kinds){
  const {w,s}=fixture(kind),before=JSON.stringify(w),parts=localRoadPropParts256(w);
  expect(parts).toHaveLength(5);expect(parts.every(p=>p.targetId===s.id&&p.key===s.id)).toBe(true);
  expect(JSON.stringify(w)).toBe(before);expect(localRoadPropDescription256(s)).toContain('Non déplaçable');
  if(kind===kinds[1]){expect(localRoadPropDescription256(s)).toContain('hors service');expect(lightSources(w,false)).toEqual([]);}
  expect(damageStructure(w,s,structureMaxHp(s),'bullet')).toBe(true);
  const steel=w.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0);
  expect([3,4]).toContain(steel);expect((w.destroyed?.lost.steel??0)+steel).toBe(15);
  expect(w.filth?.items.some(f=>f.kind==='building-rubble')).toBe(true);
  expect(w.structures.some(b=>b.id===s.id)).toBe(false);
 }
});

test('same-tick faction changes are sparse value edits and old packed own-future fields are refused',()=>{
 const {w,s}=fixture(kinds[0]),encoder=new SnapshotEncoder({structureDelta:true});
 const first=structuredClone(encoder.encode(w,0,0,true));
 // Encoder value witness only: registry admission is tested separately above.
 s.factionId=17;const next=encoder.encode(w,0,0);
 expect(first.kind).toBe('checkpoint');expect(next.kind).toBe('delta');
 if(next.kind!=='delta'||!('structures'in next))throw Error('Expected real sparse structure edit');
 const edits=next.structures;if(!edits)throw Error('Sparse structure edits absent');
 expect(edits.upserted.some(b=>b.id===s.id&&b.factionId===17)).toBe(true);
 const old={id:99,kind:'stool',x:1,z:1,orientation:0,footprint:'standard'};
 expect(validLocalRoadPropPackedBuilding256(old,256)).toBe(true);
 expect(validLocalRoadPropPackedBuilding256({...old,factionId:undefined},256)).toBe(false);
 expect(validLocalRoadPropPackedBuilding256(s,256)).toBe(false);
});

test('thick-roof Kill retains the rubble count draw when no raw-material salvage is emitted',()=>{
 const {w,s}=fixture(kinds[0]);let n=w.rng;n^=n<<13;n^=n>>>17;n^=n<<5;n>>>=0;
 expect(damageStructure(w,s,500,'roof-thick')).toBe(true);
 expect(w.rng).toBe(n);expect(w.piles.filter(p=>p.item==='steel')).toHaveLength(0);
 expect(w.filth?.items.some(f=>f.kind==='building-rubble')).toBe(true);
 expect(w.destroyed?.lost.steel).toBe(15);
});
