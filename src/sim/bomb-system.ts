import { BOMB_AMOUNT,BOMB_RADIUS,bombCellCore,type MiniTurretBombWave } from './bomb-state.ts';
import { SHOT_LAYER,structureShotLayer } from './combat-content.ts';
import { STRUCTURE_DEFINITIONS } from './definitions.ts';
import { isRoomDoor } from './door-rules.ts';
import { damageStructure,damageResource,damagePile,type StructureDamageCause } from './thing-damage.ts';
import { structureMaxHp,resourceMaxHp,pileMaxHp } from './thing-damage-rules.ts';
import { damagePawnWithBomb,damageAnimalWithBomb } from './bomb-medical.ts';
import { destroyFireFromBomb } from './fire.ts';
import { firePosition } from './fire-rules.ts';
import { captureWorldProjectileTargets } from './projectile-world.ts';
import type { ProjectileScene } from './projectile-rules.ts';
import type { BombInstigatorKey } from './mini-turret-state.ts';
import type { Structure,World } from './types.ts';

export function applyStructureExternalDamage(w:World,s:Structure,rawAmount:number,appliedAmount:number,cause:StructureDamageCause,rng=w.rng,core=w.tick*10,instigatorKey?:BombInstigatorKey):boolean {
  if(!Number.isFinite(rawAmount)||rawAmount<0||!Number.isSafeInteger(core)||core<Math.max(0,(w.tick-1)*10)||core>w.tick*10)return false;
  return damageStructure(w,s,appliedAmount,cause,rng,{core,rawAmount,...instigatorKey?{instigatorKey}:{}});
}
/** Called in the source's global-ID owner slot. No recursive wave draining. */
export function advanceBombWick(w:World,s:Structure,core:number):boolean {
  const wick=s.turret?.wick;if(!wick||!w.structures.includes(s)||wick.endCore>core)return false;
  if(!damageStructure(w,s,structureMaxHp(s)-(s.damage??0),'bomb',w.rng,{core,rawAmount:0,detonate:true,...wick.instigatorKey?{instigatorKey:wick.instigatorKey}:{}}))throw new RangeError('Cannot commit Bomb detonation');
  return true;
}
export function advanceBombWicks(w:World,core:number):boolean {
  let changed=false;for(const s of [...w.structures].sort((a,b)=>a.id-b.id))if(advanceBombWick(w,s,core))changed=true;return changed;
}
const idOf=(key:string)=>Number(key.slice(key.indexOf(':')+1));
function layer(w:World,key:string):number {
  if(key.startsWith('pawn:')||key.startsWith('animal:'))return SHOT_LAYER.pawn;
  if(key.startsWith('pile:')||key.startsWith('packed:'))return SHOT_LAYER.item;
  if(key.startsWith('structure:')){const s=w.structures.find(s=>s.id===idOf(key));return s?structureShotLayer(s.kind):SHOT_LAYER.building;}
  if(key.startsWith('resource:'))return w.resources.find(r=>r.id===idOf(key))?.kind==='tree'?SHOT_LAYER.building:SHOT_LAYER.lowPlant;
  return SHOT_LAYER.building;
}
/** Definition passability stays impassable even while an ordinary door is open. */
export const bombBuildingFactor=(s:Structure)=>isRoomDoor(s.kind)||STRUCTURE_DEFINITIONS[s.kind].blocksMovement?4:2;
/** A wave borrows the common scene until the next mutation. Every cell captures
 * its Things before damage; new salvage is not a second target in that cell. */
export function advanceBombWave(w:World,wave:MiniTurretBombWave,core:number,readScene?:()=>ProjectileScene,afterImpact?:()=>void):boolean {
  if(wave.nextCell===wave.cells.length||wave.advancedAtCore>=core)return false;
  if(wave.advancedAtCore!==core-1)throw new Error('Stale Bomb wave clock');
  let local:ProjectileScene|undefined;const scene=()=>readScene?.()??(local??=captureWorldProjectileTargets(w).scene(new Set(),1));
  const affected=new Set(wave.damagedThingKeys);let changed=false;
  const invalidate=()=>{changed=true;local=undefined;afterImpact?.();};
  while(wave.nextCell<wave.cells.length&&bombCellCore(w,wave,wave.cells[wave.nextCell]!)<=core){
    const index=wave.cells[wave.nextCell]!,cell={x:index%w.width,z:Math.floor(index/w.width)},snapshot=[...scene().at(cell)];
    const full=snapshot.reduce((max,t)=>t.fill>.99?Math.max(max,layer(w,t.key)):max,-Infinity);
    const fireIds=(w.fires?.items??[]).filter(f=>{const p=firePosition(w,f);return p?.x===cell.x&&p.z===cell.z;}).map(f=>f.id);
    for(const t of snapshot){
      const key=t.key.startsWith('packed:')?`structure:${idOf(t.key)}`:t.key;
      if(affected.has(key)||layer(w,t.key)<full)continue;
      const id=idOf(t.key);let attempted=false;
      if(t.key.startsWith('pawn:')){const p=w.pawns.find(p=>p.id===id);if(p&&p.state!=='dead'){damagePawnWithBomb(w,p,core);attempted=true;}}
      else if(t.key.startsWith('animal:')){const a=w.wildlife?.animals.find(a=>a.id===id);if(a&&a.state!=='dead'){damageAnimalWithBomb(w,a,core,wave.center);attempted=true;}}
      else if(t.key.startsWith('structure:')||t.key.startsWith('packed:')){
        const packed=t.key.startsWith('packed:')?w.packed.find(p=>p.building.id===id&&p.owner.type==='ground'):undefined;
        const s=packed?.building??(t.key.startsWith('structure:')?w.structures.find(s=>s.id===id):undefined);
        if(s&&structureMaxHp(s)>0){if(!applyStructureExternalDamage(w,s,BOMB_AMOUNT,BOMB_AMOUNT*(packed?1:bombBuildingFactor(s)),'bomb',w.rng,core,wave.instigatorKey))throw new RangeError('Cannot commit Bomb structure impact');attempted=true;}
      }else if(t.key.startsWith('resource:')){
        const r=w.resources.find(r=>r.id===id);if(r&&r.kind!=='rock'&&resourceMaxHp(r)>0){if(!damageResource(w,r,BOMB_AMOUNT*4,'bomb'))throw new RangeError('Cannot commit Bomb plant impact');attempted=true;}
      }else if(t.key.startsWith('pile:')){
        const p=w.piles.find(p=>p.id===id&&p.owner.type==='ground');if(p&&pileMaxHp(p,w.schemaVersion)>0){if(!damagePile(w,p,BOMB_AMOUNT*(p.kind==='corpse'?.5:1),'bomb'))throw new RangeError('Cannot commit Bomb pile impact');attempted=true;}
      }
      if(attempted){affected.add(key);invalidate();}
    }
    for(const id of fireIds)if(!affected.has(`fire:${id}`)&&destroyFireFromBomb(w,id)){affected.add(`fire:${id}`);invalidate();}
    wave.nextCell++;
  }
  wave.advancedAtCore=core;wave.damagedThingKeys=[...affected].sort();return changed;
}
export { BOMB_RADIUS };
