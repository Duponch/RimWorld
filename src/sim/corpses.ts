import { animalBodyModel } from './body-model.ts';
import { isWithinPart } from './injury-rules.ts';
import { groundCapacity } from './ground-placement.ts';
import { rotAge,rotRateAtTemperature,type RotState } from './food-preservation.ts';
import { cancelMelee } from './melee-state.ts';
import { cancelShooting } from './shooting-state.ts';
import { TemperatureView } from './temperature.ts';
import { TICKS_PER_DAY,type MaterialPile,type MaterialOwner,type Pawn,type World } from './types.ts';
import type { MedicalRecord } from './injury-types.ts';
import type { ThermalLayout } from './thermal-topology.ts';
import type { WildAnimal } from './wildlife-state.ts';
import { adjacent } from './pathfinding.ts';
import { reservedSource } from './materials.ts';
import { animalSpecies,type AnimalSpeciesId,type AnimalMeatItem,type AnimalLeatherItem } from './animal-species.ts';

/** One corpse owns the original animal identity and frozen medical record. It is
 * not food, not a stack of abstract meat, and never also a live wildlife actor. */
export interface CorpseState {animalId:number;species:AnimalSpeciesId;sex:'female'|'male';health:MedicalRecord;facing?:number}
export const CORPSE_ROT_TICKS=2.5*TICKS_PER_DAY;
export const CORPSE_DESSICATION_TICKS=5*TICKS_PER_DAY;
export const corpseStage=(p:MaterialPile,tick:number):'fresh'|'rotting'|'desiccated'=>rotAge(p,tick)>=CORPSE_DESSICATION_TICKS?'desiccated':rotAge(p,tick)>=CORPSE_ROT_TICKS?'rotting':'fresh';
export const corpseFresh=(p:MaterialPile,tick:number):boolean=>p.kind==='corpse'&&!!p.corpse&&corpseStage(p,tick)==='fresh';

/** Before worker/spot efficiency and stochastic integer rounding. Missing whole
 * subtrees lose their coverage once; ordinary wounds have one global penalty. */
export function corpseYield(p:MaterialPile):{meat:number;leather:number} {
  const c=p.corpse;if(!c)return {meat:0,leather:0};
  const model=animalBodyModel(c.species),definition=animalSpecies(c.species);
  const h=c.health,coverage=model.parts.reduce((sum,part,i)=>sum+(h.missing.some(m=>isWithinPart(part.id,m.part,model))?0:model.coverage[i]!),0);
  const injury=h.injuries.some(i=>i.kind!=='execution-cut'&&(!i.scar||i.scar.threshold!==i.severity))?.66:1;
  const curve=(raw:number)=>raw<=5?raw*14/5:raw<=40?14+(raw-5)*26/35:raw;
  return {meat:curve(definition.rawMeat*coverage*injury),leather:curve(definition.rawLeather*coverage*injury)};
}
export function corpseProducts(p:MaterialPile):{meat:{item:AnimalMeatItem;quantity:number};leather:{item:AnimalLeatherItem;quantity:number}}|undefined {
  if(!p.corpse)return;
  const definition=animalSpecies(p.corpse.species),yielded=corpseYield(p);
  return {meat:{item:definition.meatItem,quantity:yielded.meat},leather:{item:definition.leatherItem,quantity:yielded.leather}};
}
export const animalCorpseItem=(species:AnimalSpeciesId)=>animalSpecies(species).corpseItem;

function thermalAnchor(rot:RotState,tick:number,rate:number):RotState {
  return rate===(rot.rate??1)?rot:{progress:rot.progress+(tick-rot.atTick)*(rot.rate??1),atTick:tick,...rate!==1?{rate}:{}};
}
function corpsePile(a:WildAnimal,owner:MaterialOwner,rot:RotState):MaterialPile {
  return {id:a.id,kind:'corpse',item:animalCorpseItem(a.species),quantity:1,owner,rot,
    corpse:{animalId:a.id,species:a.species,sex:a.sex,health:a.health!,...a.motion?{facing:Math.atan2(a.motion.to.x-a.motion.from.x,a.motion.to.z-a.motion.from.z)}:{}}};
}
function releaseBodyTargets(w:World,id:number):void {
  for(const p of w.pawns){
    if(p.melee?.order?.targetId===id){cancelMelee(p);p.path=[];}
    if(p.shooting?.order?.targetId===id){cancelShooting(p);p.path=[];}
  }
}
/** A retained body can be lifted by its hunter without first making a second
 * pile on an occupied floor. The caller prevalidates the delivery destination. */
export function pickUpRetainedCorpse(w:World,p:Pawn,id:number):MaterialPile|null {
  const a=w.wildlife?.animals.find(a=>a.id===id);
  if(w.schemaVersion<79||!a||a.state!=='dead'||!a.health?.death||p.hunting?.animalId!==id||p.hunting.phase!=='collect'
    ||(a.motion?.end??0)>w.tick||(p.motion?.end??0)>w.tick||p.shooting?.stance
    ||!(a.x===p.x&&a.z===p.z||adjacent(p,a))||w.piles.length>=32768
    ||w.piles.some(i=>i.id===id||i.owner.type==='pawn'&&i.owner.pawnId===p.id)
    ||w.packed.some(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id)||reservedSource(w,id,p.id)>0)return null;
  const view=new TemperatureView(w),sourceRot=thermalAnchor(a.corpseRot??{progress:0,atTick:w.tick},w.tick,rotRateAtTemperature(view.at(w,a)));
  const pile=corpsePile(a,{type:'pawn',pawnId:p.id},thermalAnchor(sourceRot,w.tick,rotRateAtTemperature(view.at(w,p))));
  w.piles.push(pile);w.wildlife!.animals.splice(w.wildlife!.animals.indexOf(a),1);releaseBodyTargets(w,id);
  return pile;
}

/** Finish the captured fall before replacing its actor with an indivisible pile.
 * A blocked cell retains its corpse, age and identity until space exists; it is
 * never teleported to a distant free tile or discarded to satisfy pile limits. */
export function advanceCorpses(w:World,layout?:ThermalLayout):void {
  if(w.schemaVersion<79||!w.wildlife?.animals.some(a=>a.state==='dead'))return;
  const view=new TemperatureView(w,layout),removed=new Set<number>();
  for(const a of w.wildlife.animals) {
    if(a.state!=='dead'||!a.health?.death)continue;
    // Old saves have no thermal history: start at the first V79 observation.
    a.corpseRot=thermalAnchor(a.corpseRot??{progress:0,atTick:w.tick},w.tick,rotRateAtTemperature(view.at(w,a)));
    if((a.motion?.end??0)>w.tick||w.piles.length>=32768||groundCapacity(w,a,animalCorpseItem(a.species))<1)continue;
    w.piles.push(corpsePile(a,{type:'ground',x:a.x,z:a.z},a.corpseRot));
    removed.add(a.id);
    releaseBodyTargets(w,a.id);
  }
  if(removed.size)w.wildlife.animals=w.wildlife.animals.filter(a=>!removed.has(a.id));
}
