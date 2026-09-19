import { WEAPON_QUALITIES,equippedWeapon } from './equipment-rules.ts';
import { equipmentReason } from './equipment.ts';
import { pawnBody } from './health-rules.ts';
import { reservedSource } from './materials.ts';
import type { World } from './types.ts';

const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const id=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>0;
export function validEquipmentShape(p:Record<string,unknown>,version:number):boolean {
  if(version<52)return p.equipmentTask===undefined&&p.equipmentDropPending===undefined&&p.droppedWeaponId===undefined;
  if(p.equipmentDropPending!==undefined&&p.equipmentDropPending!==true||p.droppedWeaponId!==undefined&&!id(p.droppedWeaponId))return false;
  const t=p.equipmentTask;if(t===undefined)return true;
  if(record(t)&&(t.action==='wear'||t.action==='remove'))return version>=63&&Object.keys(t).every(k=>['itemId','action','progress','duration'].includes(k))&&id(t.itemId)&&id(t.duration)&&Number(t.duration)<=60&&typeof t.progress==='number'&&Number.isInteger(t.progress)&&t.progress>=0&&t.progress<Number(t.duration);
  return record(t)&&Object.keys(t).every(k=>['itemId','action','progress','automatic'].includes(k))&&id(t.itemId)
    &&(t.action==='equip'?t.progress===0:t.action==='drop'&&typeof t.progress==='number'&&Number.isInteger(t.progress)&&t.progress>=0&&t.progress<3)
    &&(t.automatic===undefined||t.action==='equip'&&t.automatic===true);
}
export function validWeaponShape(p:Record<string,unknown>,version:number):boolean {
  if(p.kind!=='weapon')return p.weapon===undefined;
  const w=p.weapon;
  return version>=52&&record(p.owner)&&p.owner.type!=='job'&&record(w)&&Object.keys(w).every(k=>['quality','hitPoints','forbidden'].includes(k))
    &&typeof w.quality==='string'&&(WEAPON_QUALITIES as readonly string[]).includes(w.quality)
    &&typeof w.hitPoints==='number'&&Number.isInteger(w.hitPoints)&&w.hitPoints>0&&w.hitPoints<=100
    &&(w.forbidden===undefined||w.forbidden===true)&&p.quantity===1;
}
export function validateEquipment(world:World):string[] {
  const errors:string[]=[],owners=new Set<number>();
  for(const pile of world.piles)if(pile.owner.type==='equipment'){
    const owner=pile.owner.pawnId;
    if(pile.kind!=='weapon'||!world.pawns.some(p=>p.id===owner)||owners.has(owner)||pile.weapon?.forbidden)errors.push('Invalid primary equipment owner.');
    owners.add(owner);
  }
  for(const p of world.pawns){
    const weapon=equippedWeapon(world,p),t=p.equipmentTask;
    if(p.equipmentDropPending&&!weapon)errors.push('Pending equipment drop without weapon.');
    if(weapon&&!p.equipmentDropPending&&(p.state==='dead'||p.state==='downed'&&!(p.need?.kind==='sleep'&&p.need.phase==='sleep'&&p.need.bedId!==null)||pawnBody(p).capacities.manipulation===0))errors.push('Incapacitated pawn retains active weapon.');
    if(p.droppedWeaponId!==undefined&&(weapon||!world.piles.some(i=>i.id===p.droppedWeaponId&&i.kind==='weapon'&&i.owner.type==='ground')))errors.push('Invalid remembered weapon.');
    if(!t)continue;
    const pile=world.piles.find(i=>i.id===t.itemId);
    if(equipmentReason(world,p,pile,t.action,true)||(t.action==='equip'||t.action==='wear')&&reservedSource(world,t.itemId)>1)errors.push('Invalid equipment target or reservation.');
    if(p.need||p.haul||p.cooking||p.rescue||p.tend||p.feed||p.recreation.task||p.jobId!==null)errors.push('Equipment conflicts with another activity.');
    if(t.automatic?p.orders.active!==null:p.orders.active!=='equipment')errors.push('Equipment order intent mismatch.');
    if(t.action==='equip'?p.state!=='moving':t.progress>0?(p.state!=='working'||p.moveCooldown>0||p.path.length):p.state!=='moving')errors.push('Invalid equipment phase.');
  }
  return errors;
}
