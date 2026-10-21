import {expect,test} from 'vitest';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {equippedWeapon,newWeaponState,weaponMaxHitPoints,weaponMeleeQualityFactor,WEAPON_QUALITIES} from '../src/sim/equipment-rules.ts';
import {validWeaponShape} from '../src/sim/equipment-save.ts';
import {validMeleeShape} from '../src/sim/melee-save.ts';
import {meleeTools,meleeRecoveryCore,chooseMeleeTool} from '../src/sim/melee-statistics.ts';
import {isLongswordToolId270,LONGSWORD_TOOL_IDS_270} from '../src/sim/longsword-combat-270.ts';
import {meleeContact} from '../src/sim/melee-space.ts';
import {strikeLivingTarget} from '../src/sim/living-melee.ts';
import {rangedWeaponProfile} from '../src/sim/ranged-statistics.ts';
import {huntingWanted} from '../src/sim/hunting.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {firingCamp} from './scenarios/shooting.ts';
import {equipmentCamp} from './scenarios/equipment.ts';

// Independent Core1.6.4871rev590 oracle: blunt/sharp factors, stance ticks, HP.
const EXPECTED=[
 ['wood-longsword',.9,.4,120,156,65],['steel-longsword',1,1,120,156,100],
 ['plasteel-longsword',.9,1.1,96,125,280],['uranium-longsword',1.5,1.1,132,172,250],
 ['silver-longsword',1,.85,120,156,70],['gold-longsword',1,.75,120,156,60],
] as const;
const QUALITY_FACTORS=[.8,.9,1,1.1,1.2,1.45,1.65] as const;

test.each(EXPECTED)('%s retains three distinct tools with material damage, rounded recovery, quality and HP',(item,blunt,sharp,handleTicks,bladeTicks,hp)=>{
 const w=firingCamp(),p=w.pawns[0]!,weapon=equippedWeapon(w,p)!;weapon.item=item;weapon.weapon=newWeaponState(item);
 expect(weaponMaxHitPoints(item)).toBe(hp);expect(weapon.weapon.hitPoints).toBe(hp);
 expect(validWeaponShape(weapon as unknown as Record<string,unknown>,270)).toBe(true);
 expect(validWeaponShape(weapon as unknown as Record<string,unknown>,269)).toBe(false);
 for(const [i,quality] of WEAPON_QUALITIES.entries()){
  weapon.weapon.quality=quality;const tools=meleeTools(w,p);
  expect(weaponMeleeQualityFactor(quality)).toBe(QUALITY_FACTORS[i]);
  for(const [part,kind,damage,cooldown] of [['handle','blunt',9*blunt,handleTicks],['tip','stab',23*sharp,bladeTicks],['edge','cut',23*sharp,bladeTicks]] as const){
   const tool=tools.find(t=>t.id===`${item}-${part}`)!;
   expect(tool.kind).toBe(kind);expect(tool.damage).toBeCloseTo(damage*QUALITY_FACTORS[i]!);
   expect(tool.penetration).toBeCloseTo(tool.damage*.015);expect(tool.cooldownCore).toBe(cooldown);expect(meleeRecoveryCore(tool.id)).toBe(cooldown);
  }
  expect(tools.reduce((n,t)=>n+t.weight,0)).toBeCloseTo(1);
  expect(chooseMeleeTool(tools,()=>.999999)?.id).toBe(`${item}-edge`);
 }
 expect(validateWorld(w)).toEqual([]);
});

test('all eighteen IDs are closed and swords cannot shoot or satisfy a hunting weapon requirement',()=>{
 expect(new Set(LONGSWORD_TOOL_IDS_270).size).toBe(18);
 for(const id of ['steel-longsword-edge-extra','jade-longsword-tip','steel-longsword-head'])expect(isLongswordToolId270(id)).toBe(false);
 for(const [item] of EXPECTED){
  const w=firingCamp(),p=w.pawns[0]!,weapon=equippedWeapon(w,p)!;weapon.item=item;weapon.weapon=newWeaponState(item);
  expect(rangedWeaponProfile(item,'normal')).toBeUndefined();const before=serializeWorld(w);
  expect(applyCommand(w,{type:'shoot',pawnIds:[p.id],targetId:w.pawns[1]!.id}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  expect(applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:false}).ok).toBe(true);p.priorities.hunt=1;w.hunting={targets:[w.pawns[1]!.id],completed:0};
  expect(huntingWanted(w,p)).toBe(false);
 }
});

test('pickup and drop retain the same physical sword after completed travel and contact',()=>{
 const w=equipmentCamp(1),p=w.pawns[0]!;w.piles=[];addMaterial(w,'weapon',1,{type:'ground',x:12,z:5},'uranium-longsword');
 const sword=w.piles[0]!,id=sword.id,quality=sword.weapon!.quality;
 expect(applyCommand(w,{type:'order-equipment',pawnId:p.id,itemId:id,action:'equip',queue:false}).ok).toBe(true);
 expect(sword.owner).toEqual({type:'ground',x:12,z:5});
 let picked=false;for(let i=0;i<150&&!picked;i++){
  stepWorld(w);picked=sword.owner.type==='equipment';
  if(picked){expect(Math.abs(p.x-12)+Math.abs(p.z-5)).toBeLessThanOrEqual(1);expect(p.moveCooldown).toBe(0);expect(p.motion?.end??0).toBeLessThanOrEqual(w.tick);}
 }
 expect(picked).toBe(true);expect(sword.owner).toEqual({type:'equipment',pawnId:p.id});expect(validateWorld(w)).toEqual([]);
 const text=serializeWorld(w),copy=deserializeWorld(text);expect(serializeWorld(copy)).toBe(text);
 for(const v of [w,copy])expect(applyCommand(v,{type:'order-equipment',pawnId:p.id,itemId:id,action:'drop',queue:false}).ok).toBe(true);
 for(let i=0;i<8&&sword.owner.type!=='ground';i++){stepWorld(w);stepWorld(copy);expect(serializeWorld(copy)).toBe(serializeWorld(w));}
 expect(w.piles.filter(q=>q.id===id)).toHaveLength(1);expect(sword).toMatchObject({id,item:'uranium-longsword',quantity:1,owner:{type:'ground'}});
 expect(sword.weapon).toEqual({quality,hitPoints:250,forbidden:true});
});

const RECOVERIES=EXPECTED.flatMap(([item,,,handle,blade])=>(['handle','tip','edge'] as const).map(part=>({item,part,recovery:part==='handle'?handle:blade})));
test.each(RECOVERIES)('$item-$part impact keeps its captured deadline after stop, removal and a different equipped weapon',({item,part,recovery})=>{
 const w=firingCamp(),p=w.pawns[0]!,target=w.pawns[1]!;w.piles=[];Object.assign(target,{x:p.x+1,z:p.z});
 addMaterial(w,'weapon',1,{type:'equipment',pawnId:p.id},item);const weapon=equippedWeapon(w,p)!;
 expect(meleeContact(w,p,target)).toBe(true);const tool=meleeTools(w,p).find(t=>t.id===`${item}-${part}`)!;
 // Prepared adjacent friendly-fire encounter, selected tool; ordinary impact
 // still owns accuracy, dodge, anatomy, wounds, XP and the shared PRNG stream.
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
 const project=()=>{const result=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(result.status).toBe('applied');if(result.status!=='applied')throw Error('Sword projection refused');expect(result.world.pawns.find(q=>q.id===p.id)?.melee).toEqual(p.melee);expect(result.world.piles).toEqual(w.piles);return result.world;};
 const beforeImpact=project(),beforeValue=structuredClone(beforeImpact);
 p.melee={order:null,strike:null};const start=w.tick*10;strikeLivingTarget(w,p,target,tool,start,{rng:w.rng});
 expect(p.melee.strike).toMatchObject({tool:`${item}-${part}`,atCore:start,untilCore:start+recovery});expect(p.skills.melee.dailyXp).toBeGreaterThan(0);
 const impact=project();expect(impact.tick).toBe(beforeValue.tick);expect(beforeImpact).toEqual(beforeValue);
 expect(applyCommand(w,{type:'draft-stop',pawnIds:[p.id]}).ok).toBe(true);
 // Declared custody fixture, not a played remote equipment exchange.
 weapon.owner={type:'ground',x:p.x,z:p.z};addMaterial(w,'weapon',1,{type:'equipment',pawnId:p.id},'plasteel-knife');
 expect(validMeleeShape(p.melee,270,w.tick)).toBe(true);expect(validMeleeShape(p.melee,269,w.tick)).toBe(false);
 const invalid=structuredClone(p.melee);invalid.strike!.untilCore+=.8;expect(validMeleeShape(invalid,270,w.tick)).toBe(false);
 expect(validateWorld(w)).toEqual([]);const text=serializeWorld(w),copy=deserializeWorld(text);expect(serializeWorld(copy)).toBe(text);
 project();
 for(let i=0;i<Math.floor((recovery-1)/10);i++){
  stepWorld(w);stepWorld(copy);expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(p.melee?.strike?.untilCore).toBe(start+recovery);
  project();
 }
 stepWorld(w);stepWorld(copy);expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(p.melee).toBeUndefined();expect(validateWorld(w)).toEqual([]);
});

test('historical weapons and every mace retain their exact tools and PRNG at the269→270 boundary',()=>{
 const w=firingCamp(),p=w.pawns[0]!,weapon=equippedWeapon(w,p)!;
 for(const item of ['revolver','bolt-action-rifle','emp-launcher','plasteel-knife','wood-mace','steel-mace','plasteel-mace','uranium-mace','silver-mace','gold-mace'] as const){
  weapon.item=item;weapon.weapon=newWeaponState(item);Object.assign(w,{schemaVersion:269});const before=meleeTools(w,p),rng=w.rng;
  Object.assign(w,{schemaVersion:270});expect(meleeTools(w,p)).toEqual(before);expect(w.rng).toBe(rng);
  expect(validWeaponShape(weapon as unknown as Record<string,unknown>,269)).toBe(true);expect(validWeaponShape(weapon as unknown as Record<string,unknown>,270)).toBe(true);
 }
});
