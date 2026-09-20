import { HUMAN_BODY } from './body-definition.ts';
import { equippedWeapon,isWeaponItem,WEAPON_QUALITIES } from './equipment-rules.ts';
import { pawnBody } from './health-rules.ts';
import { partMissing } from './injury-state.ts';
import type { Pawn,World } from './types.ts';

export type MeleeDamage='blunt'|'poke'|'bite'|'cut'|'stab';
export type MeleeToolId='left-fist'|'right-fist'|'head'|'teeth'|'grip'|'barrel'|'barrel-poke'|'knife-handle'|'knife-blade'|'knife-point';
export interface MeleeTool { id:MeleeToolId; damage:number; penetration:number; kind:MeleeDamage; cooldownCore:number; weight:number }
export const meleeRecoveryCore=(id:MeleeToolId):number=>id==='knife-blade'?72:id==='knife-point'||id==='knife-handle'?96:120;
export function curve(x:number,points:readonly (readonly [number,number])[]):number {
  if(x<=points[0]![0])return points[0]![1];
  for(let i=1;i<points.length;i++){const a=points[i-1]!,b=points[i]!;if(x<=b[0])return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);}
  return points.at(-1)![1];
}
export function meleeHitChance(level:number,sight=1,manipulation=1):number {
  return curve(level+12*(Math.min(sight,1.5)-1)+12*(Math.min(manipulation,1.5)-1),[[-20,.05],[-10,.1],[0,.5],[10,.8],[20,.9],[40,.96],[60,.98]]);
}
export function meleeDodgeChance(level:number,moving=1,sight=1):number {
  return curve(level+18*(moving-1)+8*(Math.min(sight,1.4)-1),[[5,0],[20,.3],[60,.5]]);
}
/** Natural adult and the delivered held weapons. Qualities affect melee damage;
 * capacities affect hit/dodge, not a fictitious fist damage multiplier. */
export function meleeTools(world:World,pawn:Pawn,body=()=>pawnBody(pawn)):MeleeTool[] {
  const tools:MeleeTool[]=[];
  const add=(id:MeleeToolId,damage:number,kind:MeleeDamage,factor=1)=>{const cooldownCore=meleeRecoveryCore(id);tools.push({id,damage,kind,penetration:damage*.015,cooldownCore,weight:damage*(1+damage*.015)/(cooldownCore/60)*factor});};
  const exists=(id:typeof HUMAN_BODY[number]['id'])=>!pawn.health||!partMissing(pawn.health,id);
  // LeftHand/RightHand groups are the fingers; missing every finger removes the tool.
  for(const side of ['left','right'] as const)if(HUMAN_BODY.some(p=>p.groups.includes(`${side}-hand`)&&exists(p.id)))add(`${side}-fist`,8.2,'blunt');
  if(exists('jaw'))add('teeth',8.2,'bite',.07);
  if(exists('head'))add('head',5,'blunt',.2);
  const weapon=equippedWeapon(world,pawn);
  if(weapon?.weapon&&isWeaponItem(weapon.item)&&!pawn.equipmentDropPending&&body().capacities.manipulation>0) {
    const factor=[.8,.9,1,1.1,1.2,1.45,1.65][WEAPON_QUALITIES.indexOf(weapon.weapon.quality)]!;
    if(weapon.item==='plasteel-knife'){
      add('knife-handle',9*.9*factor,'blunt');add('knife-blade',12*1.1*factor,'cut');add('knife-point',13*1.1*factor,'stab');
    } else {const damage=9*factor;add('grip',damage,'blunt');add('barrel',damage,'blunt');add('barrel-poke',damage,'poke');}
  }
  return rankMeleeTools(tools);
}
export function rankMeleeTools(tools:readonly MeleeTool[]):MeleeTool[] {
  const highest=Math.max(...tools.map(t=>t.weight));
  const category=(t:MeleeTool)=>t.weight>=highest*.95?'best':t.weight<highest*.25?'worst':'mid';
  const counts={best:0,mid:0,worst:0};for(const t of tools)counts[category(t)]++;
  return tools.map(t=>({...t,weight:category(t)==='worst'?0:(category(t)==='best'?.75:.25)/counts[category(t)]}));
}
export function chooseMeleeTool(tools:readonly MeleeTool[],random:()=>number):MeleeTool|null {
  const total=tools.reduce((n,t)=>n+t.weight,0);if(!total)return null;
  let roll=random()*total;for(const t of tools){roll-=t.weight;if(roll<0)return t;}
  return tools.filter(t=>t.weight>0).at(-1)!;
}
