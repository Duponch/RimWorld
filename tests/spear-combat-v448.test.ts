import {expect,test} from 'vitest';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {equippedWeapon,newWeaponState,WEAPON_QUALITIES} from '../src/sim/equipment-rules.ts';
import {validWeaponShape} from '../src/sim/equipment-save.ts';
import {validMeleeShape} from '../src/sim/melee-save.ts';
import {meleeTools,meleeRecoveryCore,chooseMeleeTool} from '../src/sim/melee-statistics.ts';
import {SPEAR_TOOL_IDS_272,isSpearToolId272} from '../src/sim/spear-combat-272.ts';
import {meleeContact} from '../src/sim/melee-space.ts';
import {strikeLivingTarget} from '../src/sim/living-melee.ts';
import {rangedWeaponProfile} from '../src/sim/ranged-statistics.ts';
import {huntingWanted} from '../src/sim/hunting.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {firingCamp} from './scenarios/shooting.ts';
import {equipmentCamp} from './scenarios/equipment.ts';

// Independent primary Core1.6.4871 oracle: shaft power, point power, rounded
// stance ticks and HP. Explicit point AP is .50 for every Normal material.
const ROWS=[['wood-spear',11.7,9.2,156,65],['steel-spear',13,23,156,100],['plasteel-spear',11.7,25.3,125,280],['uranium-spear',19.5,25.3,172,250],['silver-spear',13,19.55,156,70],['gold-spear',13,17.25,156,60]] as const;
const QUALITY=[.8,.9,1,1.1,1.2,1.45,1.65] as const;

test.each(ROWS)('%s has three distinct weighted verbs, explicit point AP and exact material recovery',(item,shaft,point,cooldown,hp)=>{
 const w=firingCamp(),p=w.pawns[0]!,weapon=equippedWeapon(w,p)!;weapon.item=item;weapon.weapon=newWeaponState(item);
 expect(weapon.weapon.hitPoints).toBe(hp);expect(validWeaponShape(weapon as unknown as Record<string,unknown>,272)).toBe(true);expect(validWeaponShape(weapon as unknown as Record<string,unknown>,271)).toBe(false);
 for(const [i,quality]of WEAPON_QUALITIES.entries()){
  weapon.weapon.quality=quality;const tools=meleeTools(w,p),factor=QUALITY[i]!;
  for(const [suffix,kind,power,ap]of [['shaft-blunt','blunt',shaft,shaft*.015],['shaft-poke','poke',shaft,shaft*.015],['point','stab',point,.5]] as const){
   const tool=tools.find(t=>t.id===`${item}-${suffix}`)!;expect(tool.kind).toBe(kind);expect(tool.damage).toBeCloseTo(power*factor,10);expect(tool.penetration).toBeCloseTo(ap*factor,10);expect(tool.cooldownCore).toBe(cooldown);expect(meleeRecoveryCore(tool.id)).toBe(cooldown);
  }
  const total=tools.reduce((n,t)=>n+t.weight,0);expect(total).toBeGreaterThan(0);
  // The common ranker reserves .75 for the best band. When no middle band
  // exists its raw weights total .75; selection scales its roll by that sum.
  expect(total).toBeCloseTo(item==='wood-spear'&&quality==='poor'?.75:1,12);
  if(item==='wood-spear'&&quality==='poor'){
   expect(tools.filter(t=>t.weight>0).map(t=>t.id)).toEqual(['left-fist','right-fist','wood-spear-shaft-blunt','wood-spear-shaft-poke','wood-spear-point']);
   expect([.1,.3,.5,.7,.9].map(roll=>chooseMeleeTool(tools,()=>roll)?.id)).toEqual(['left-fist','right-fist','wood-spear-shaft-blunt','wood-spear-shaft-poke','wood-spear-point']);
   expect(chooseMeleeTool(tools,()=>.999999)?.id).toBe('wood-spear-point');
  }
 }
 weapon.weapon.quality='normal';const tools=meleeTools(w,p);
 if(item==='wood-spear')for(const suffix of ['shaft-blunt','shaft-poke','point'])expect(tools.find(t=>t.id===`${item}-${suffix}`)?.weight).toBeCloseTo(.25);
 if(item==='steel-spear'){expect(tools.find(t=>t.id===`${item}-point`)?.weight).toBe(.75);expect(chooseMeleeTool(tools,()=>.999999)?.id).toBe('steel-spear-point');}
 expect(validateWorld(w)).toEqual([]);
});

test('spear identities are closed, retain ordinary contact and cannot shoot or satisfy hunting',()=>{
 expect(new Set(SPEAR_TOOL_IDS_272).size).toBe(18);for(const id of ['steel-spear-edge','jade-spear-point','steel-spear-point-extra','steel-spear-shaft'])expect(isSpearToolId272(id)).toBe(false);
 const w=firingCamp(),p=w.pawns[0]!,target=w.pawns[1]!,weapon=equippedWeapon(w,p)!;weapon.item='steel-spear';weapon.weapon=newWeaponState('steel-spear');
 Object.assign(target,{x:p.x+1,z:p.z+1});expect(meleeContact(w,p,target)).toBe(true);target.x=p.x+2;target.z=p.z;expect(meleeContact(w,p,target)).toBe(false);
 expect(rangedWeaponProfile(weapon.item,'normal')).toBeUndefined();const before=serializeWorld(w);expect(applyCommand(w,{type:'shoot',pawnIds:[p.id],targetId:target.id}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
 expect(applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:false}).ok).toBe(true);p.priorities.hunt=1;w.hunting={targets:[target.id],completed:0};expect(huntingWanted(w,p)).toBe(false);
});

test('real pickup and drop retain the same finite spear, quality and HP through contact and reload',()=>{
 const w=equipmentCamp(1),p=w.pawns[0]!;w.piles=[];addMaterial(w,'weapon',1,{type:'ground',x:12,z:5},'uranium-spear');const spear=w.piles[0]!,id=spear.id;
 expect(applyCommand(w,{type:'order-equipment',pawnId:p.id,itemId:id,action:'equip',queue:false}).ok).toBe(true);expect(spear.owner.type).toBe('ground');
 for(let i=0;i<150&&spear.owner.type!=='equipment';i++)stepWorld(w);
 expect(spear.owner).toEqual({type:'equipment',pawnId:p.id});expect(Math.abs(p.x-12)+Math.abs(p.z-5)).toBeLessThanOrEqual(1);expect(p.moveCooldown).toBe(0);expect(p.motion?.end??0).toBeLessThanOrEqual(w.tick);expect(validateWorld(w)).toEqual([]);
 const text=serializeWorld(w),copy=deserializeWorld(text);expect(serializeWorld(copy)).toBe(text);
 for(const v of [w,copy])expect(applyCommand(v,{type:'order-equipment',pawnId:p.id,itemId:id,action:'drop',queue:false}).ok).toBe(true);
 for(let i=0;i<8&&spear.owner.type!=='ground';i++){stepWorld(w);stepWorld(copy);expect(serializeWorld(copy)).toBe(serializeWorld(w));}
 expect(w.piles.find(q=>q.id===id)).toBe(spear);expect(spear).toMatchObject({item:'uranium-spear',quantity:1,owner:{type:'ground'},weapon:{quality:'normal',hitPoints:250,forbidden:true}});
});

test.each(['shaft-blunt','shaft-poke','point'] as const)('actual %s impact retains its captured recovery after stop, drop and exchange',suffix=>{
 const w=firingCamp(),p=w.pawns[0]!,target=w.pawns[1]!;w.piles=[];Object.assign(target,{x:p.x+1,z:p.z});addMaterial(w,'weapon',1,{type:'equipment',pawnId:p.id},'plasteel-spear');
 const weapon=equippedWeapon(w,p)!,tool=meleeTools(w,p).find(t=>t.id===`plasteel-spear-${suffix}`)!;p.melee={order:null,strike:null};const start=w.tick*10;
 // Declared adjacent friendly-fire encounter; accuracy, anatomy, wounds,
 // armor, XP and random draws are still the real shared impact transaction.
 strikeLivingTarget(w,p,target,tool,start,{rng:w.rng});expect(p.melee.strike).toMatchObject({tool:tool.id,atCore:start,untilCore:start+125});expect(p.skills.melee.dailyXp).toBeGreaterThan(0);
 expect(applyCommand(w,{type:'draft-stop',pawnIds:[p.id]}).ok).toBe(true);weapon.owner={type:'ground',x:p.x,z:p.z};addMaterial(w,'weapon',1,{type:'equipment',pawnId:p.id},'plasteel-knife');
 expect(validMeleeShape(p.melee,272,w.tick)).toBe(true);expect(validMeleeShape(p.melee,271,w.tick)).toBe(false);expect(validateWorld(w)).toEqual([]);
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),projection=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(projection.status).toBe('applied');if(projection.status==='applied')expect(projection.world.pawns[0]!.melee).toEqual(p.melee);
 const text=serializeWorld(w),copy=deserializeWorld(text);expect(serializeWorld(copy)).toBe(text);
 for(let i=0;i<12;i++){stepWorld(w);stepWorld(copy);expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(p.melee?.strike?.untilCore).toBe(start+125);}
 stepWorld(w);stepWorld(copy);expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(p.melee).toBeUndefined();expect(validateWorld(w)).toEqual([]);
});

test('the 271→272 boundary preserves every previous human weapon tool without a draw',()=>{
 const w=firingCamp(),p=w.pawns[0]!,weapon=equippedWeapon(w,p)!;
 for(const item of ['revolver','bolt-action-rifle','emp-launcher','plasteel-knife','wood-mace','uranium-mace','steel-longsword','plasteel-longsword'] as const){
  weapon.item=item;weapon.weapon=newWeaponState(item);const historical=Object.assign({},w,{schemaVersion:271}),before=meleeTools(historical,p),rng=w.rng;expect(meleeTools(w,p)).toEqual(before);expect(w.rng).toBe(rng);expect(w.schemaVersion).toBe(272);
 }
});
