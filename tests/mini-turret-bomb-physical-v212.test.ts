import { expect,test } from 'vitest';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { miniTurretExplosive } from '../src/sim/bomb-creation.ts';
import { applyStructureExternalDamage,advanceBombWave } from '../src/sim/bomb-system.ts';
import { validateBombWaves,validBombWaveShape } from '../src/sim/bomb-state.ts';
import { captureBombDangerSources,bombDanger,validateBombRefuges } from '../src/sim/bomb-danger.ts';
import { damagePile } from '../src/sim/thing-damage.ts';
import { pileMaxHp } from '../src/sim/thing-damage-rules.ts';
import { validateThingDamage } from '../src/sim/fire-save.ts';
import { addMaterial,materialCanFit,refreshStock } from '../src/sim/materials.ts';
import { nearbyGround,dropRetainingIdentity } from '../src/sim/ground-placement.ts';
import { startFire } from '../src/sim/fire.ts';
import { blockedCells } from '../src/sim/pathfinding.ts';
import { LightEnvironmentCache } from '../src/sim/light-environment.ts';
import { startTravel } from '../src/sim/movement.ts';
import { newMiniTurretState } from '../src/sim/mini-turret-state.ts';
import { newPowerState } from '../src/sim/power-rules.ts';
import { newDoorState } from '../src/sim/door-rules.ts';
import { createBulletFlight } from '../src/sim/bullet-flight.ts';
import { registerWorldProjectile } from '../src/sim/projectile-system.ts';
import { enableWildlife } from '../src/sim/wildlife.ts';
import { damageAnimalWithBomb } from '../src/sim/bomb-medical.ts';
import { validateProjectiles } from '../src/sim/projectile-save.ts';
import { controlledInjury } from './scenarios/health.ts';
import { advanceHumanCorpses } from '../src/sim/human-corpses.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import { campTurret,miniTurretCamp } from './scenarios/mini-turret-v212.ts';
import type { Structure,World } from '../src/sim/types.ts';

function prepared(explosive=true):{w:World;s:Structure}{
  const w=miniTurretCamp(),s=campTurret(w);s.turret!.holdFire=true;
  while(miniTurretExplosive(s.id)!==explosive)s.id=w.nextId++;
  return {w,s};
}
const hit=(w:World,s:Structure,raw:number,applied=raw)=>applyStructureExternalDamage(w,s,raw,applied,'bullet',w.rng,w.tick*10);
const checkpoint=(w:World)=>{expect(validateWorld(w)).toEqual([]);return deserializeWorld(serializeWorld(w));};

test('stable explosive identity starts one absolute wick only after a real hit, independent of policy and repairs',()=>{
  const {w,s}=prepared(),rng=w.rng;
  expect(hit(w,s,79)).toBe(true);expect(s.turret!.wick).toBeUndefined();
  expect(hit(w,s,1)).toBe(true);const wick=structuredClone(s.turret!.wick)!;
  expect(wick).toEqual({startedAtCore:w.tick*10,endCore:w.tick*10+240});expect(w.rng).toBe(rng);
  delete s.damage;s.power!.switchOn=false;s.power!.on=false;s.turret!.holdFire=true;s.turret!.ammoQ=0;
  const copy=checkpoint(w);stepWorld(w,23);stepWorld(copy,23);expect(copy).toEqual(w);expect(s.turret!.wick).toEqual(wick);
  stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);expect(w.structures).not.toContain(s);
  expect(w.bombWaves).toHaveLength(1);expect(w.bombWaves![0]!.nextCell).toBe(0);expect(w.bombWaves![0]!.startedAtCore).toBe(wick.endCore);
  expect(w.fires).toBeUndefined();checkpoint(w);
});

test('raw incoming damage precedes building factors; ineligible and factor-only lethal hits create no wave',()=>{
  const immediate=prepared();immediate.s.damage=90;expect(hit(immediate.w,immediate.s,10,1)).toBe(true);
  expect(immediate.w.structures).not.toContain(immediate.s);expect(immediate.w.bombWaves).toHaveLength(1);
  const factor=prepared();expect(hit(factor.w,factor.s,50,100)).toBe(true);expect(factor.w.bombWaves).toBeUndefined();
  const ordinary=prepared(false);expect(hit(ordinary.w,ordinary.s,80)).toBe(true);expect(ordinary.s.turret!.wick).toBeUndefined();
  expect(hit(ordinary.w,ordinary.s,20)).toBe(true);expect(ordinary.w.bombWaves).toBeUndefined();expect(ordinary.w.fires).toBeUndefined();
});

test('creation reserves the wave and every salvage identity before retiring its source',()=>{
  const {w,s}=prepared();w.nextId=Number.MAX_SAFE_INTEGER;
  const before=JSON.stringify(w);expect(hit(w,s,100)).toBe(false);expect(JSON.stringify(w)).toBe(before);
  w.nextId=Number.MAX_SAFE_INTEGER-1;const near=JSON.stringify(w);expect(hit(w,s,100)).toBe(false);expect(JSON.stringify(w)).toBe(near);
});

test('a captured wall shields later cells after its real destruction; first advancement is T+1 with exact replay',()=>{
  const {w,s}=prepared(),wall:Structure=fixtureBuilding(w,'wall',s.x+2,s.z);wall.material='steel';wall.damage=101;
  expect(hit(w,s,100)).toBe(true);const wave=w.bombWaves![0]!,behind=wall.z*w.width+wall.x+1;
  expect(wave.cells).toContain(wall.z*w.width+wall.x);expect(wave.cells).not.toContain(behind);
  expect(advanceBombWave(w,wave,wave.startedAtCore)).toBe(false);expect(wave.nextCell).toBe(0);
  const copy=checkpoint(w);stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);
  expect(w.structures).not.toContain(wall);expect(wave.cells).not.toContain(behind);expect(wave.nextCell).toBe(wave.cells.length);
  expect(wave.damagedThingKeys.filter(k=>k===`structure:${wall.id}`)).toHaveLength(1);checkpoint(w);
  stepWorld(w);expect(w.bombWaves).toBeUndefined();
});

test('a large footprint receives one damage and salvage cannot enter its original cell snapshot',()=>{
  const {w,s}=prepared(),table:Structure=fixtureBuilding(w,'table-long',s.x+2,s.z-2);
  expect(hit(w,s,100)).toBe(true);stepWorld(w);const wave=w.bombWaves![0]!;
  expect(wave.damagedThingKeys.filter(k=>k===`structure:${table.id}`)).toHaveLength(1);expect(w.structures).not.toContain(table);
  expect(w.destroyed?.count).toBe(2);expect(w.piles.some(p=>p.item==='wood')).toBe(true);expect(w.fires).toBeUndefined();checkpoint(w);
});

test('Bomb damages real plant/chunk/pile HP, removes Fire and leaves non-HP metals intact',()=>{
  const {w,s}=prepared();const tree={id:w.nextId++,kind:'tree' as const,x:s.x+1,z:s.z+1,amount:12};w.resources.push(tree);
  addMaterial(w,'chunk',1,{type:'ground',x:s.x+1,z:s.z},'granite-chunk');
  addMaterial(w,'component',3,{type:'ground',x:s.x,z:s.z+1},'component');
  addMaterial(w,'steel',4,{type:'ground',x:s.x-1,z:s.z},'steel');
  const chunk=w.piles.find(p=>p.item==='granite-chunk')!,component=w.piles.find(p=>p.item==='component')!,steel=w.piles.find(p=>p.item==='steel')!;
  component.damage=21;expect(startFire(w,tree,.1)).toBe(true);const ignition=w.fires!.ledger.ignitions,extinguished=w.fires!.ledger.extinguished;
  expect(hit(w,s,100)).toBe(true);stepWorld(w);
  expect(w.resources).not.toContain(tree);expect(w.piles).not.toContain(component);expect(chunk.damage).toBe(50);expect(steel.damage).toBeUndefined();
  expect(w.destroyed?.resources?.tree).toBe(1);expect(w.destroyed?.woodPotentialLost).toBe(12);expect(w.destroyed?.items?.component).toBe(3);
  expect(w.fires!.items).toHaveLength(0);expect(w.fires!.ledger.ignitions).toBe(ignition);expect(w.fires!.ledger.extinguished).toBe(extinguished);checkpoint(w);
});

test('new pile HP is prospective and sparse wear cannot be imported into strict192',()=>{
  const {w}=prepared();addMaterial(w,'chunk',1,{type:'ground',x:20,z:20},'granite-chunk');const chunk=w.piles.find(p=>p.kind==='chunk')!;
  expect(pileMaxHp(chunk,192)).toBe(0);expect(pileMaxHp(chunk,193)).toBe(300);expect(damagePile(w,chunk,1,'bullet')).toBe(true);
  expect(validateThingDamage(w,193)).toEqual([]);expect(validateThingDamage(w,192)).toContain('Invalid item damage.');
});

test('danger preserves an engaged edge before consulting refuge, then retains draft and a physically reachable exit',()=>{
  const {w,s}=prepared(),p=w.pawns[0]!;Object.assign(p,{x:s.x+1,z:s.z});
  expect(applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:true})).toMatchObject({ok:true});
  expect(hit(w,s,80)).toBe(true);const sources=captureBombDangerSources(w),light=new LightEnvironmentCache(),readLight=()=>light.read(w);
  expect(startTravel(w,p,{x:p.x,z:p.z+1},readLight)).toBe(true);const edge=structuredClone(p.motion),budget={remaining:2,pairs:100};
  expect(bombDanger(w,p,()=>blockedCells(w),budget,readLight,sources)).toBe(false);expect(p.motion).toEqual(edge);expect(budget.remaining).toBe(2);
  const copy=checkpoint(w);let refuge=false;
  for(let n=0;n<20&&!refuge;n++){stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);refuge=!!p.bombRefuge;}
  expect(refuge).toBe(true);expect(p.draft).toBeDefined();expect((p.bombRefuge!.target.x-s.x)**2+(p.bombRefuge!.target.z-s.z)**2).toBeGreaterThan(3.9**2);checkpoint(w);
});

test('a failed cargo drop keeps the original owner while emergency movement cancels the assignment',()=>{
  const {w,s}=prepared(),p=w.pawns[0]!;Object.assign(p,{x:s.x+1,z:s.z});
  w.stockpiles.push({id:w.nextId++,x:40,z:40,filters:{wood:false,food:false,steel:true},priority:2,capacity:75});
  addMaterial(w,'steel',10,{type:'pawn',pawnId:p.id},'steel');const held=w.piles.find(i=>i.owner.type==='pawn')!;
  p.haul={sourcePileId:held.id,quantity:10,phase:'deliver',carryPileId:held.id,destination:{type:'stockpile',stockpileId:w.stockpiles[0]!.id},pickupCell:{x:p.x,z:p.z}};p.orders.active='haul';p.state='moving';
  for(const cell of nearbyGround(w,p)){
    const owner={type:'ground' as const,...cell};
    if(materialCanFit(w,'wood',75,owner,'wood'))addMaterial(w,'wood',75,owner,'wood');
  }
  expect(dropRetainingIdentity(w,held,p)).toBe(false);
  refreshStock(w);expect(hit(w,s,80)).toBe(true);
  const light=new LightEnvironmentCache();expect(bombDanger(w,p,()=>blockedCells(w),{remaining:2,pairs:100},()=>light.read(w))).toBe(true);
  expect(p.bombRefuge).toBeDefined();expect(p.haul).toBeNull();expect(p.interruptedCargo).toBe(true);expect(held.owner).toEqual({type:'pawn',pawnId:p.id});
  expect(w.piles.filter(i=>i.id===held.id)).toHaveLength(1);checkpoint(w);
});

test('wave and refuge guards reject future schema, forged ownership and out-of-bounds captured geometry',()=>{
  const {w,s}=prepared();expect(hit(w,s,100)).toBe(true);const wave=w.bombWaves![0]!;
  expect(validBombWaveShape(wave,192)).toBe(false);expect(validBombWaveShape(wave,193)).toBe(true);
  expect(validBombWaveShape({...wave,instigatorKey:`pawn:${w.nextId}`},193)).toBe(false);
  const broken=structuredClone(w);broken.bombWaves![0]!.cells.push(w.width*w.height+1);const errors:string[]=[];validateBombWaves(broken,errors);expect(errors.length).toBeGreaterThan(0);
  const p=w.pawns[0]!;p.bombRefuge={sourceId:s.id,target:{x:0,z:0},endCore:w.tick*10+240};expect(validateBombRefuges(w).length).toBeGreaterThan(0);
  delete w.bombWaves;p.bombRefuge.endCore=w.tick*10;expect(validateBombRefuges(w).length).toBeGreaterThan(0);
});

test('a closed door is a captured adjacent edifice even though local standing at doors is allowed',()=>{
  const {w,s}=prepared(),door:Structure=fixtureBuilding(w,'door',s.x+2,s.z);door.material='steel';door.door=newDoorState(w.tick);door.damage=1;
  expect(hit(w,s,100)).toBe(true);const wave=w.bombWaves![0]!;
  expect(wave.cells).toContain(door.z*w.width+door.x);const copy=checkpoint(w);stepWorld(w);stepWorld(copy);
  expect(copy).toEqual(w);expect(w.structures).not.toContain(door);expect(wave.damagedThingKeys).toContain(`structure:${door.id}`);checkpoint(w);
});

test('a real chain detonation is born later in the ordered event pass and first advances at its following Core',()=>{
  const {w,s}=prepared(),other:Structure=fixtureBuilding(w,'mini-turret',s.x+3,s.z);other.material='steel';other.power=newPowerState('mini-turret');
  other.turret=newMiniTurretState();other.turret.holdFire=true;
  while(!miniTurretExplosive(other.id))other.id=w.nextId++;
  expect(hit(w,other,80)).toBe(true);expect(hit(w,s,100)).toBe(true);const original=w.bombWaves![0]!;
  const copy=checkpoint(w);stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);
  const chain=w.bombWaves!.find(wave=>wave.sourceId===other.id)!;
  expect(chain).toBeDefined();expect(chain.startedAtCore).toBe(original.startedAtCore+4);expect(chain.id).toBeGreaterThan(original.id);
  expect(w.structures).not.toContain(other);expect(w.destroyed?.count).toBe(2);expect(w.fires).toBeUndefined();checkpoint(w);
});

test('registered Bullet arrivals damage structures, plants, ground packages and piles through neutral owners',()=>{
  const {w,s}=prepared(),actor=w.pawns[0]!;Object.assign(actor,{x:s.x-2,z:s.z-2});
  const stool:Structure=fixtureBuilding(w,'stool',s.x,s.z-2);stool.damage=40;
  const tree={id:w.nextId++,kind:'tree' as const,x:s.x,z:s.z-1,amount:9,damage:189};w.resources.push(tree);
  addMaterial(w,'component',2,{type:'ground',x:s.x,z:s.z+1},'component');const component=w.piles.find(p=>p.item==='component')!;component.damage=59;
  const table:Structure=fixtureBuilding(w,'table',s.x+1,s.z+2);table.damage=37;w.structures=w.structures.filter(v=>v!==table);w.packed.push({building:table,owner:{type:'ground',x:s.x,z:s.z+2}});
  const target=(key:string,x:number,z:number)=>{
    const flight=createBulletFlight({launcherKey:`pawn:${actor.id}`,intendedKey:key,usedKey:key,equipmentKey:null,flags:1,preventFriendlyFire:false,
      origin:{x:actor.x+.5,z:actor.z+.5},destination:{x:x+.5,z:z+.5},speedPerCoreTick:.55});
    registerWorldProjectile(w,flight,'normal',{friendlyPawnIds:[],friendlyFireFactor:1});
  };
  target(`structure:${stool.id}`,stool.x,stool.z);target(`resource:${tree.id}`,tree.x,tree.z);target(`pile:${component.id}`,component.owner.type==='ground'?component.owner.x:0,s.z+1);target(`packed:${table.id}`,s.x,s.z+2);
  const copy=checkpoint(w);stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);
  expect(w.structures).not.toContain(stool);expect(w.resources).not.toContain(tree);expect(w.piles).not.toContain(component);expect(w.packed.some(p=>p.building===table)).toBe(false);
  expect(w.projectiles!.map(p=>p.arrival?.effect).sort()).toEqual(['packed','pile','resource','structure']);expect(w.fires).toBeUndefined();checkpoint(w);
});

test('animal Bomb uses its real species anatomy and frozen corpse record without inventing a human or hunt XP',()=>{
  const {w}=prepared();delete w.wildlife;
  w.resources.push({id:w.nextId++,kind:'berries',x:25,z:25,amount:10,growth:1,growthTick:w.tick});
  enableWildlife(w,1);expect(w.wildlife!.animals).toHaveLength(1);const animal=w.wildlife!.animals[0]!;
  Object.assign(animal,{x:25,z:25,nextDecision:w.tick+100});const xp=w.pawns.map(p=>p.skills.animals?.xp),originalId=animal.id;
  const impact=damageAnimalWithBomb(w,animal,w.tick*10,{x:24,z:25});expect(impact?.record.body).toBe('hare');
  expect(w.pawns.map(p=>p.skills.animals?.xp)).toEqual(xp);expect(animal.id).toBe(originalId);
  expect(impact?.layers.some(l=>l.kind==='shredded'||l.kind==='crack')).toBe(true);checkpoint(w);
});

test('intrinsic launcher context refuses living wrong owners and future IDs but allows its actually retired source',()=>{
  const {w,s}=prepared(),victim=w.pawns[1]!;
  const flight=createBulletFlight({launcherKey:`structure:${s.id}`,intendedKey:`pawn:${victim.id}`,usedKey:`pawn:${victim.id}`,equipmentKey:null,flags:1,preventFriendlyFire:false,
    origin:{x:s.x+.5,z:s.z+.5},destination:{x:victim.x+.5,z:victim.z+.5},speedPerCoreTick:.7});
  registerWorldProjectile(w,flight,'normal',{friendlyPawnIds:[],friendlyFireFactor:1},w.rng,w.tick*10,'mini-turret-gun');
  for(const sourceId of [w.pawns[0]!.id,w.structures.find(b=>b.kind==='wood-generator')!.id,w.nextId]){
    const forged=structuredClone(w);forged.projectiles![0]!.flight.launcherKey=`structure:${sourceId}`;
    expect(validateProjectiles(forged,193,new Set()).length).toBeGreaterThan(0);
  }
  expect(validateProjectiles(w,193,new Set())).toEqual([]);expect(hit(w,s,100)).toBe(true);
  expect(validateProjectiles(w,193,new Set())).toEqual([]);checkpoint(w);
});

test('danger cancels a voluntary aiming preparation while preserving physical recovery and the intrinsic draft flag',()=>{
  const {w,s}=prepared(),p=w.pawns[0]!;Object.assign(p,{x:s.x+1,z:s.z});
  expect(applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:true})).toMatchObject({ok:true});
  addMaterial(w,'weapon',1,{type:'equipment',pawnId:p.id},'revolver');const gun=w.piles.find(i=>i.item==='revolver')!;
  p.shooting={order:{targetId:w.pawns[1]!.id,weaponId:gun.id,startedDowned:false},stance:{phase:'aim',startedAtCore:w.tick*10,endsAtCore:w.tick*10+18,targetStartedDowned:false}};
  expect(hit(w,s,80)).toBe(true);const light=new LightEnvironmentCache();
  expect(bombDanger(w,p,()=>blockedCells(w),{remaining:2,pairs:100},()=>light.read(w))).toBe(true);
  expect(p.shooting).toBeUndefined();expect(p.draft).toBeDefined();expect(p.bombRefuge).toBeDefined();checkpoint(w);
});

test('a corpse and still attached apparel use their real owners and neutral loss once, without an ignition ledger',()=>{
  const {w,s}=prepared(),person=w.pawns[0]!;Object.assign(person,{x:s.x+1,z:s.z});
  addMaterial(w,'apparel',1,{type:'apparel',pawnId:person.id},'cloth-shirt');
  controlledInjury(w,person,'brain',20000,'cut');expect(person.state).toBe('dead');advanceHumanCorpses(w);
  const body=w.piles.find(p=>p.humanCorpse?.pawnId===person.id)!;body.damage=76;
  expect(hit(w,s,100)).toBe(true);const copy=checkpoint(w);stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);
  expect(person.body?.lostAt).toBe(w.tick);expect(w.piles).not.toContain(body);expect(w.piles.some(p=>p.item==='cloth-shirt')).toBe(false);
  expect(w.destroyed?.items?.['human-corpse']).toBe(1);expect(w.destroyed?.items?.['cloth-shirt']).toBe(1);expect(w.fires).toBeUndefined();checkpoint(w);
});
