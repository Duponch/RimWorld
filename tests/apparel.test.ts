import { withoutResearch,withMigratedResearch } from './scenarios/legacy-skills';
import { expect,test } from 'vitest';
import { equipmentCamp } from './scenarios/equipment';
import { controlledInjury } from './scenarios/health';
import { applyCommand,stepWorld,createWorld } from '../src/sim/engine';
import { addMaterial,reservedSource } from '../src/sim/materials';
import { apparelMoveFactor,wornApparel,armorPiece } from '../src/sim/apparel-rules';
import { apparelProtection } from '../src/sim/apparel-protection';
import { damageUnarmoredPawnWithBullet } from '../src/sim/bullet-damage';
import { resolveUnarmoredMelee } from '../src/sim/melee-impact';
import { damageFromRoofCollapse } from '../src/sim/roof-damage';
import { healthRandom } from '../src/sim/health';
import { createMedicalRecord } from '../src/sim/injury-state';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots';
import { apparelProjection,apparelAppearance } from '../src/render/character-apparel';
import { SCHEMA_VERSION } from '../src/sim/types';
import type { World,MaterialPile } from '../src/sim/types';

import { apparelCamp } from './scenarios/apparel';
const valid=(w:World)=>expect(validateWorld(w),JSON.stringify({tick:w.tick,pawns:w.pawns,piles:w.piles})).toEqual([]);
function until(w:World,predicate:()=>boolean,n=600){for(let i=0;i<n&&!predicate();i++){stepWorld(w);valid(w);}expect(predicate()).toBe(true);}
const order=(w:World,pile:MaterialPile,action:'wear'|'remove'='wear',pawn=w.pawns[0]!)=>applyCommand(w,{type:'order-equipment',pawnId:pawn.id,itemId:pile.id,action,queue:false});
function replay(w:World,n=1){const c=deserializeWorld(serializeWorld(w));stepWorld(w,n);stepWorld(c,n);expect(c).toEqual(w);valid(w);}
function wear(w:World,pile:MaterialPile){expect(order(w,pile).ok).toBe(true);until(w,()=>pile.owner.type==='apparel');}

test('physical wardrobe: reserved approach, timed dressing, independent layers, GPU/portrait projection and strict saved continuation',()=>{
  const w=apparelCamp(),p=w.pawns[0]!,vest=w.piles[0]!,shirt=w.piles[1]!,rng=w.rng,next=w.nextId;
  vest.apparel!.quality='excellent';vest.apparel!.hitPoints=71;
  expect(order(w,vest).ok).toBe(true);expect(reservedSource(w,vest.id)).toBe(1);expect(order(w,vest,'wear',w.pawns[1]!).ok).toBe(false);replay(w,4);
  until(w,()=>p.equipmentTask?.progress===1);expect(vest.owner.type).toBe('ground');expect(p.equipmentTask!.duration).toBe(30);replay(w,15);expect(vest.owner.type).toBe('ground');
  until(w,()=>vest.owner.type==='apparel');expect(vest.apparel).toEqual({quality:'excellent',hitPoints:71,forced:true});expect(w.rng).toBe(rng);expect(w.nextId).toBe(next);
  expect(apparelMoveFactor(w,p)).toBeCloseTo(4.48/4.6);wear(w,shirt);expect(wornApparel(w,p)).toHaveLength(2);
  const look=apparelAppearance(apparelProjection(w).get(p.id));expect(look).toMatchObject({shirt:true,vest:true,signature:'cloth-shirt flak-vest'});
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();expect(decoder.adopt(encoder.encode(w,0,1))).toMatchObject({status:'applied',world:w});replay(w,3);
  expect(order(w,vest,'remove').ok).toBe(true);replay(w,29);expect(vest.owner.type).toBe('apparel');stepWorld(w);expect(vest.owner.type).toBe('ground');expect(vest.apparel!.forbidden).toBe(true);expect(apparelMoveFactor(w,p)).toBe(1);valid(w);
});

test('replacement drops the old garment during dressing, interruption conserves instances, hauling and permission share reservations',()=>{
  const w=apparelCamp(),p=w.pawns[0]!,old=w.piles[0]!;wear(w,old);
  addMaterial(w,'apparel',1,{type:'ground',x:p.x,z:p.z},'flak-vest');const fresh=w.piles.at(-1)!;fresh.apparel!.quality='masterwork';
  expect(order(w,fresh).ok).toBe(true);expect(p.equipmentTask!.duration).toBe(60);replay(w,29);expect(old.owner.type).toBe('apparel');stepWorld(w);expect(old.owner.type).toBe('ground');expect(fresh.owner.type).toBe('ground');replay(w,4);
  expect(applyCommand(w,{type:'clear-orders',pawnId:p.id}).ok).toBe(true);expect(wornApparel(w,p)).toHaveLength(0);expect(w.piles.filter(i=>i.kind==='apparel')).toHaveLength(3);
  wear(w,fresh);expect(applyCommand(w,{type:'stockpile',x:24,z:6,enabled:true,filters:{wood:false,food:false,apparel:true}}).ok).toBe(true);p.priorities.haul=1;
  expect(applyCommand(w,{type:'order-haul',pawnId:p.id,target:{type:'pile',pileId:old.id},queue:false}).ok).toBe(true);expect(order(w,old,'wear',w.pawns[1]!).ok).toBe(false);
  until(w,()=>old.owner.type==='pawn');replay(w,3);until(w,()=>old.owner.type==='ground');expect(old.owner).toEqual({type:'ground',x:24,z:6});
  expect(order(w,old).ok).toBe(true);expect(applyCommand(w,{type:'apparel-permission',itemId:old.id,allowed:false}).ok).toBe(true);expect(p.equipmentTask).toBeUndefined();expect(old.apparel!.forbidden).toBe(true);valid(w);
});

test('full ground rejects removal without deletion, injury interruption retains clothing and death retains body ownership',()=>{
  const w=apparelCamp(1),p=w.pawns[0]!,vest=w.piles[0]!;wear(w,vest);w.piles=w.piles.filter(i=>i===vest);
  for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)addMaterial(w,'wood',75,{type:'ground',x,z},'wood');
  expect(order(w,vest,'remove').ok).toBe(true);stepWorld(w,30);expect(vest.owner.type).toBe('apparel');expect(p.equipmentTask).toBeUndefined();valid(w);
  expect(order(w,vest,'remove').ok).toBe(true);stepWorld(w,3);controlledInjury(w,p,'left-leg',30000);controlledInjury(w,p,'right-leg',30000);expect(p.equipmentTask).toBeUndefined();expect(vest.owner.type).toBe('apparel');valid(w);replay(w);
  controlledInjury(w,p,'heart',15000);expect(p.state).toBe('dead');expect(vest.owner.type).toBe('apparel');valid(w);replay(w);
});

test('strict V62 migration invents no clothing; V63 rejects impossible owners, metadata, conflicts, phases and future fields',()=>{
  const old=equipmentCamp(1);((old as any).schemaVersion=62,withoutResearch(old));const migrated=deserializeWorld(JSON.stringify(old));expect(migrated).toEqual(withMigratedResearch({...old,schemaVersion:SCHEMA_VERSION}));
  const w=apparelCamp(1),vest=w.piles[0]!;wear(w,vest);
  const invalid=(mutate:(v:World)=>void)=>{const v=structuredClone(w);mutate(v);expect(()=>deserializeWorld(JSON.stringify(v))).toThrow();};
  invalid(v=>{(v as any).schemaVersion=62;});invalid(v=>{v.piles[0]!.quantity=2;});invalid(v=>{v.piles[0]!.apparel!.hitPoints=201;});invalid(v=>{v.piles[0]!.apparel!.quality='unknown' as any;});
  invalid(v=>{v.piles[0]!.owner={type:'equipment',pawnId:v.pawns[0]!.id};});invalid(v=>{v.piles[0]!.owner={type:'apparel',pawnId:999999};});invalid(v=>{v.piles[0]!.apparel!.forbidden=true;});
  invalid(v=>{v.piles.push({...structuredClone(v.piles[0]!),id:v.nextId++});});invalid(v=>{order(v,v.piles[0]!,'remove');v.pawns[0]!.equipmentTask!.duration=60;});
  const distant=apparelCamp(1);expect(order(distant,distant.piles[0]!).ok).toBe(true);distant.pawns[0]!.equipmentTask!.progress=1;distant.pawns[0]!.state='working';distant.pawns[0]!.path=[];expect(()=>deserializeWorld(JSON.stringify(distant))).toThrow(/contact/);
  const seed=createWorld(42);expect(seed.piles.filter(i=>i.kind==='apparel').map(i=>i.item).sort()).toEqual(['cloth-shirt','cloth-shirt','cloth-shirt','flak-vest']);valid(seed);
});

test('armor integration distinguishes exact shoulder/torso, deflection, conversion, last-hit destruction, penetration and replay',()=>{
  let deflect=0,convert=0,full=0;
  for(let seed=1;seed<=90;seed++){
    const w=apparelCamp(1),p=w.pawns[0]!,vest=w.piles[0]!;vest.owner={type:'apparel',pawnId:p.id};vest.apparel!.hitPoints=1;w.rng=seed*7919;
    const clone=deserializeWorld(serializeWorld(w));const hit={damage:12,part:'torso' as const};
    const impact=damageUnarmoredPawnWithBullet(w,p,hit,.18)!;damageUnarmoredPawnWithBullet(clone,clone.pawns[0]!,hit,.18);expect(clone).toEqual(w);expect(w.piles.some(i=>i.id===vest.id)).toBe(false);
    if(!impact.layers.length)deflect++;else if(impact.layers[0]!.kind==='bruise'){convert++;expect(impact.layers[0]!.severity).toBe(6000);}else{full++;expect(impact.layers[0]!.severity).toBe(12000);}valid(w);
  }
  expect(Math.min(deflect,convert,full)).toBeGreaterThan(3);
  const w=apparelCamp(1),p=w.pawns[0]!,vest=w.piles[0]!;vest.owner={type:'apparel',pawnId:p.id};
  expect(armorPiece(vest).coverage.parts).not.toContain('left-shoulder');damageUnarmoredPawnWithBullet(w,p,{damage:5,part:'left-shoulder'},0);expect(vest.apparel!.hitPoints).toBe(200);
  const hit=damageUnarmoredPawnWithBullet(w,p,{damage:12,part:'torso'},2)!;expect(hit.layers[0]!.kind).toBe('gunshot');expect(vest.apparel!.hitPoints).toBe(197);valid(w);
  expect(order(w,vest,'remove').ok).toBe(true);stepWorld(w,2);vest.apparel!.hitPoints=1;damageUnarmoredPawnWithBullet(w,p,{damage:4,part:'torso'},2);expect(p.equipmentTask).toBeUndefined();expect(w.piles.some(i=>i.id===vest.id)).toBe(false);valid(w);
  const saved=serializeWorld(w);expect(()=>damageUnarmoredPawnWithBullet(w,p,{damage:NaN})).toThrow();expect(serializeWorld(w)).toBe(saved);
});

test('melee protection follows internal selection and original worker; roof protection preserves deterministic impact batches',()=>{
  const record=createMedicalRecord(0),parts:string[]=[];
  const protectedHit=resolveUnarmoredMelee(record,{kind:'poke',damage:10,part:'torso'},()=>.1,(part)=>{parts.push(part);return {amount:0,converted:false};});
  expect(parts).toHaveLength(1);expect(parts[0]).not.toBe('torso');expect(protectedHit.layers).toEqual([]);expect(protectedHit.record).toEqual(record);
  const w=apparelCamp(1),p=w.pawns[0]!,vest=w.piles[0]!;vest.owner={type:'apparel',pawnId:p.id};
  const state={rng:123456},protection=apparelProtection(w,p,'blunt',.1,()=>healthRandom(state));resolveUnarmoredMelee(record,{kind:'blunt',damage:12,part:'torso'},()=>healthRandom(state),protection.protect);expect(vest.apparel!.hitPoints).toBe(200);protection.commit();expect(vest.apparel!.hitPoints).toBe(197);
  for(let seed=1;seed<20;seed++){const a=apparelCamp(1),b=structuredClone(a);for(const v of [a,b]){v.piles[0]!.owner={type:'apparel',pawnId:v.pawns[0]!.id};v.rng=seed*443;}const cells=new Set([a.pawns[0]!.z*a.width+a.pawns[0]!.x]);damageFromRoofCollapse(a,cells);damageFromRoofCollapse(b,cells);expect(a).toEqual(b);valid(a);}
});
