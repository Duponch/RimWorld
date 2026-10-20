import {expect,test} from 'vitest';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {equippedWeapon,newWeaponState,weaponMaxHitPoints,weaponMeleeQualityFactor,WEAPON_QUALITIES} from '../src/sim/equipment-rules.ts';
import {validWeaponShape} from '../src/sim/equipment-save.ts';
import {validMeleeShape} from '../src/sim/melee-save.ts';
import {meleeTools,meleeRecoveryCore,chooseMeleeTool} from '../src/sim/melee-statistics.ts';
import {isMaceToolId269,MACE_TOOL_IDS_269} from '../src/sim/mace-combat-269.ts';
import {meleeContact} from '../src/sim/melee-space.ts';
import {strikeLivingTarget} from '../src/sim/living-melee.ts';
import {rangedWeaponProfile} from '../src/sim/ranged-statistics.ts';
import {huntingWanted} from '../src/sim/hunting.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {firingCamp} from './scenarios/shooting.ts';
import {equipmentCamp} from './scenarios/equipment.ts';

// Independently transcribed Core material expectations, not read from the
// production/content table under test. Damage is nominal before impact rolls.
const EXPECTED=[
 ['wood-mace',.9,120,65],['steel-mace',1,120,100],['plasteel-mace',.9,96,280],
 ['uranium-mace',1.5,132,250],['silver-mace',1,120,70],['gold-mace',1,120,60],
] as const;
const QUALITY_FACTORS=[.8,.9,1,1.1,1.2,1.45,1.65] as const;

test.each(EXPECTED)('%s has distinct Poke/Blunt tools, material delay, quality and primary HP',(item,damageFactor,cooldownCore,hp)=>{
 const w=firingCamp(),p=w.pawns[0]!,weapon=equippedWeapon(w,p)!;weapon.item=item;weapon.weapon=newWeaponState(item);
 expect(weaponMaxHitPoints(item)).toBe(hp);expect(weapon.weapon.hitPoints).toBe(hp);
 expect(validWeaponShape(weapon as unknown as Record<string,unknown>,269)).toBe(true);
 expect(validWeaponShape(weapon as unknown as Record<string,unknown>,268)).toBe(false);
 for(const [i,quality] of WEAPON_QUALITIES.entries()){
  weapon.weapon.quality=quality;const tools=meleeTools(w,p),handle=tools.find(t=>t.id===`${item}-handle`)!,head=tools.find(t=>t.id===`${item}-head`)!;
  expect(weaponMeleeQualityFactor(quality)).toBe(QUALITY_FACTORS[i]);
  expect(handle.kind).toBe('poke');expect(head.kind).toBe('blunt');
  expect(handle.damage).toBeCloseTo(9*damageFactor*QUALITY_FACTORS[i]!);expect(head.damage).toBeCloseTo(15.7*damageFactor*QUALITY_FACTORS[i]!);
  for(const tool of [handle,head]){expect(tool.penetration).toBeCloseTo(tool.damage*.015);expect(tool.cooldownCore).toBe(cooldownCore);expect(meleeRecoveryCore(tool.id)).toBe(cooldownCore);}
  expect(tools.reduce((n,t)=>n+t.weight,0)).toBeCloseTo(1);expect(head.weight).toBe(.75);
  expect(chooseMeleeTool(tools,()=>.999999)?.id).toBe(head.id);
 }
 weapon.weapon.quality='normal';const tools=meleeTools(w,p);
 expect(tools.find(t=>t.id===`${item}-handle`)?.weight).toBeCloseTo(1/12);
 expect(tools.find(t=>t.id==='left-fist')?.weight).toBeCloseTo(1/12);
 expect(tools.find(t=>t.id==='right-fist')?.weight).toBeCloseTo(1/12);
 expect(tools.filter(t=>['head','teeth'].includes(t.id)).map(t=>t.weight)).toEqual([0,0]);
 expect(validateWorld(w)).toEqual([]);
});

test('all twelve recovery IDs are closed and every material remains melee-only, including explicit shoot/hunt attempts',()=>{
 expect(new Set(MACE_TOOL_IDS_269).size).toBe(12);expect(isMaceToolId269('steel-mace-head-extra')).toBe(false);expect(isMaceToolId269('jade-mace-head')).toBe(false);
 for(const [item] of EXPECTED){
  const w=firingCamp(),p=w.pawns[0]!,weapon=equippedWeapon(w,p)!;weapon.item=item;weapon.weapon=newWeaponState(item);
  expect(rangedWeaponProfile(item,'normal')).toBeUndefined();const before=serializeWorld(w);
  expect(applyCommand(w,{type:'shoot',pawnIds:[p.id],targetId:w.pawns[1]!.id}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  expect(applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:false}).ok).toBe(true);p.priorities.hunt=1;w.hunting={targets:[w.pawns[1]!.id],completed:0};
  expect(huntingWanted(w,p)).toBe(false);
 }
});

test('real pickup and drop retain one physical mace and require completed travel/contact',()=>{
 const w=equipmentCamp(1),p=w.pawns[0]!;w.piles=[];addMaterial(w,'weapon',1,{type:'ground',x:12,z:5},'uranium-mace');
 const mace=w.piles[0]!,id=mace.id,quality=mace.weapon!.quality;
 expect(applyCommand(w,{type:'order-equipment',pawnId:p.id,itemId:id,action:'equip',queue:false}).ok).toBe(true);
 expect(mace.owner).toEqual({type:'ground',x:12,z:5});
 let picked=false;for(let i=0;i<150&&!picked;i++){
  stepWorld(w);picked=mace.owner.type==='equipment';
  if(picked){expect(Math.abs(p.x-12)+Math.abs(p.z-5)).toBeLessThanOrEqual(1);expect(p.moveCooldown).toBe(0);expect(p.motion?.end??0).toBeLessThanOrEqual(w.tick);}
 }
 expect(picked).toBe(true);expect(mace.owner).toEqual({type:'equipment',pawnId:p.id});expect(validateWorld(w)).toEqual([]);
 const text=serializeWorld(w),copy=deserializeWorld(text);expect(serializeWorld(copy)).toBe(text);
 for(const v of [w,copy])expect(applyCommand(v,{type:'order-equipment',pawnId:p.id,itemId:id,action:'drop',queue:false}).ok).toBe(true);
 for(let i=0;i<8&&mace.owner.type!=='ground';i++){stepWorld(w);stepWorld(copy);expect(serializeWorld(copy)).toBe(serializeWorld(w));}
 expect(w.piles.filter(q=>q.id===id)).toHaveLength(1);expect(mace).toMatchObject({id,item:'uranium-mace',quantity:1,owner:{type:'ground'}});
 // The normal explicit equipment drop forbids the retained weapon.
 expect(mace.weapon).toEqual({quality,hitPoints:250,forbidden:true});
});

test.each([['steel-mace',120],['plasteel-mace',96],['uranium-mace',132]] as const)('%s recovery survives real impact, stop and a declared removal boundary until its exact Core deadline',(item,recovery)=>{
 const w=firingCamp(),p=w.pawns[0]!,target=w.pawns[1]!;w.piles=[];Object.assign(target,{x:p.x+1,z:p.z});
 addMaterial(w,'weapon',1,{type:'equipment',pawnId:p.id},item);const weapon=equippedWeapon(w,p)!;
 expect(meleeContact(w,p,target)).toBe(true);const tool=chooseMeleeTool(meleeTools(w,p),()=>.999999)!;expect(tool.id).toBe(`${item}-head`);
 // Explicit tool selection isolates recovery; the ordinary impact still owns
 // accuracy, dodge, anatomy, armor, wounds, XP and the existing random stream.
 p.melee={order:null,strike:null};const start=w.tick*10;strikeLivingTarget(w,p,target,tool,start,{rng:w.rng});
 expect(p.melee.strike).toMatchObject({tool:`${item}-head`,atCore:start,untilCore:start+recovery});expect(p.skills.melee.dailyXp).toBeGreaterThan(0);
 expect(applyCommand(w,{type:'draft-stop',pawnIds:[p.id]}).ok).toBe(true);
 // Prepared custody edge, not a remote pickup or played drop. A captured
 // strike must not recalculate its delay from a later equipped item.
 weapon.owner={type:'ground',x:p.x,z:p.z};expect(validMeleeShape(p.melee,269,w.tick)).toBe(true);expect(validMeleeShape(p.melee,268,w.tick)).toBe(false);
 expect(validateWorld(w)).toEqual([]);const text=serializeWorld(w),copy=deserializeWorld(text),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
 expect(serializeWorld(copy)).toBe(text);expect(decoder.adopt(structuredClone(encoder.encode(w,0,1))).status).toBe('applied');
 for(let i=0;i<Math.floor((recovery-1)/10);i++){
  stepWorld(w);stepWorld(copy);expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(p.melee?.strike?.untilCore).toBe(start+recovery);
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,1))).status).toBe('applied');
 }
 stepWorld(w);stepWorld(copy);expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(p.melee).toBeUndefined();expect(validateWorld(w)).toEqual([]);
});

test('the four historical weapons retain their original melee tools and exact delays across the supported version boundary',()=>{
 const w=firingCamp(),p=w.pawns[0]!,weapon=equippedWeapon(w,p)!;
 for(const item of ['revolver','bolt-action-rifle','emp-launcher','plasteel-knife'] as const){
  weapon.item=item;weapon.weapon=newWeaponState(item);Object.assign(w,{schemaVersion:268});const before=meleeTools(w,p),rng=w.rng;
  Object.assign(w,{schemaVersion:269});expect(meleeTools(w,p)).toEqual(before);expect(w.rng).toBe(rng);
  const held=before.filter(t=>!['left-fist','right-fist','teeth','head'].includes(t.id));
  expect(held.map(t=>[t.id,t.cooldownCore])).toEqual(item==='plasteel-knife'?[['knife-handle',96],['knife-blade',72],['knife-point',96]]:[['grip',120],['barrel',120],['barrel-poke',120]]);
 }
 expect(validWeaponShape({item:'plasteel-knife',kind:'weapon',quantity:1,owner:{type:'ground',x:1,z:1},weapon:newWeaponState('plasteel-knife')},268)).toBe(true);
});
