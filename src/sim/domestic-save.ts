import { handlingFeedUnits, handlingStepDuration, canTameSpecies } from './animal-handling.ts';
import { leadRopees,leadingClaimIds,livestock,MAX_ROPEES } from './animal-leading.ts';
import { penRegion } from './animal-pens.ts';
import { ANIMAL_PRODUCTS, productKind } from './animal-products.ts';
import { isColonist } from './affiliation.ts';
import { isMedicine, MEDICAL_CARE } from './medicine-rules.ts';
import { reservedSource } from './materials.ts';
import type { World } from './types.ts';
import type { WildAnimal } from './wildlife-state.ts';

const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
const finite=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const keys=(v:Record<string,unknown>,required:string[],optional:string[]=[])=>required.every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>required.includes(k)||optional.includes(k));
const productForVersion=(a:WildAnimal,version:number)=>version>=121?productKind(a):a.species==='muffalo'?'shear':a.species==='dromedary'&&a.sex==='female'?'milk':undefined;
const productReadyForVersion=(a:WildAnimal,version:number)=>!!a.domestic&&!!productForVersion(a,version)&&(a.domestic.productFullness??0)>=1;

/** Shape and ownership remain separate from transient availability: an animal
 * can be harmed between accepting an order and its next simulation step. */
export function validateDomesticAnimals(w:World,version:number):string[] {
  const errors:string[]=[],claimed=new Set<number>();
  for(const a of w.wildlife?.animals??[]){
    const d:unknown=a.domestic,t:unknown=a.taming;
    if(d!==undefined&&!(version>=106&&(a.species==='hare'||version>=119&&livestock(a))&&obj(d)&&keys(d,['since','care','tameness','nextDecay'],version>=120?['lastTraining','penMarkerId','productFullness']:version>=119?['lastTraining','penMarkerId']:['lastTraining'])
      &&int(d.since,0,w.tick)&&typeof d.care==='string'&&Object.hasOwn(MEDICAL_CARE,d.care)&&int(d.tameness,1,5)
      &&int(d.nextDecay,0,w.tick+45000)&&(d.lastTraining===undefined||int(d.lastTraining,d.since,w.tick))
      &&(version>=120?(productForVersion(a,version)?finite(d.productFullness,0,1):d.productFullness===undefined):d.productFullness===undefined)
      &&(d.penMarkerId===undefined||version>=119&&livestock(a)&&int(d.penMarkerId,1,w.nextId-1)&&!!w.structures.find(s=>s.id===d.penMarkerId&&s.kind==='pen-marker'&&s.pen?.accepted.includes(a.species)))))errors.push('Invalid domestic animal.');
    if(t!==undefined&&!(version>=106&&(a.species==='hare'||version>=119&&canTameSpecies(a.species))&&obj(t)&&keys(t,['designated'],['lastAttempt'])&&typeof t.designated==='boolean'
      &&(t.lastAttempt===undefined||int(t.lastAttempt,0,w.tick))&&(!a.domestic||!t.designated)))errors.push('Invalid taming designation.');
    if(a.domestic&&w.hunting?.targets.includes(a.id))errors.push('Domestic animal is designated for hunting.');
  }
  for(const p of w.pawns){
    const h:unknown=p.animalHandling,c:unknown=p.animalCare;
    if(version>=106?!int(p.priorities.handle,0,4):p.priorities.handle!==undefined)errors.push('Invalid animal handling priority.');
    if(h===undefined&&c===undefined)continue;
    if(version<106){errors.push('Legacy pawn contains animal work.');continue;}
    const base=(t:Record<string,unknown>)=>int(t.animalId,1,w.nextId-1)&&w.wildlife?.animals.some(a=>a.id===t.animalId&&(a.species==='hare'||version>=119&&canTameSpecies(a.species)));
    const lead=obj(h)&&h.kind==='lead';
    const product=obj(h)&&(h.kind==='milk'||h.kind==='shear');
    if(h!==undefined&&!(lead
      ?version>=119&&keys(h,['animalId','kind','markerId','phase','sourcePileId','carryPileId','quantity','step','progress'],version>=135?['ropees','gatherId']:[])&&base(h)&&int(h.markerId,1,w.nextId-1)&&['approach','lead',...(version>=135?['gather']:[])].includes(String(h.phase))
        &&h.sourcePileId===0&&h.carryPileId===null&&h.quantity===0&&h.step===0&&h.progress===0
        &&(h.ropees===undefined||version>=135&&Array.isArray(h.ropees)&&h.ropees.length>=1&&h.ropees.length<=MAX_ROPEES
          &&h.ropees.every(id=>int(id,1,w.nextId-1))&&new Set(h.ropees).size===h.ropees.length&&h.ropees.includes(Number(h.animalId))
          &&h.phase!=='approach')
        &&(h.gatherId===undefined?h.phase!=='gather':version>=135&&h.phase==='gather'&&Array.isArray(h.ropees)
          &&h.ropees.length<MAX_ROPEES&&int(h.gatherId,1,w.nextId-1)&&!h.ropees.includes(Number(h.gatherId)))
      :product
      ?version>=120&&keys(h,['animalId','kind','sourcePileId','carryPileId','quantity','phase','step','progress'])&&base(h)
        &&['approach','interact'].includes(String(h.phase))&&h.sourcePileId===0&&h.carryPileId===null&&h.quantity===0&&h.step===0
        &&finite(h.progress,0,ANIMAL_PRODUCTS[h.kind as 'milk'|'shear'].work)&&Number(h.progress)<ANIMAL_PRODUCTS[h.kind as 'milk'|'shear'].work
      :obj(h)&&keys(h,['animalId','kind','sourcePileId','carryPileId','quantity','phase','step','progress'])&&base(h)
      &&['tame','maintain'].includes(String(h.kind))&&['pickup','approach','interact'].includes(String(h.phase))
      &&int(h.sourcePileId,1,w.nextId-1)&&(h.carryPileId===null||int(h.carryPileId,1,w.nextId-1))&&int(h.quantity,0,12)
      &&int(h.step,0,5)&&int(h.progress,0,handlingStepDuration(h as unknown as import('./domestic-state.ts').AnimalHandlingTask,w.wildlife!.animals.find(a=>a.id===h.animalId)!.species)-1)
      &&(h.phase==='interact'||h.progress===0&&(h.phase==='approach'||h.step===0)))) {errors.push('Invalid animal handling task.');continue;}
    if(c!==undefined&&!(obj(c)&&keys(c,['animalId','spot','phase','progress'],['medicine','duration'])&&base(c)&&w.wildlife?.animals.some(a=>a.id===c.animalId&&a.species==='hare')
      &&obj(c.spot)&&keys(c.spot,['x','z'])&&int(c.spot.x,0,w.width-1)&&int(c.spot.z,0,w.height-1)
      &&['pickup','approach','treat'].includes(String(c.phase))&&finite(c.progress,0)
      &&(c.phase==='treat'?finite(c.duration,1,6000):c.duration===undefined)
      &&(c.phase==='treat'?Number(c.progress)<Number(c.duration):c.progress===0))) {errors.push('Invalid animal care task.');continue;}
    const task=p.animalHandling??p.animalCare!;
    for(const id of p.animalHandling?new Set(leadingClaimIds(p.animalHandling)):[task.animalId]){
      if(claimed.has(id))errors.push('Animal is reserved twice.');claimed.add(id);
    }
    if(!isColonist(p)||p.prisoner||p.visitor||p.draft||p.mental?.crisis||p.interruptedCargo||p.need||p.haul||p.cooking||p.hunting||p.research||p.ward||p.feed||p.tend||p.rescue||p.equipmentTask||p.burial||p.cleaning||p.firefighting||p.jobId!==null||p.melee||p.flee||p.recreation.task||p.orders.active!==null||!['moving','working','idle'].includes(p.state)
      ||h&&c||h&&p.priorities.handle===0||c&&p.priorities.doctor===0)errors.push('Animal work conflicts with another activity.');
    const a=w.wildlife!.animals.find(a=>a.id===task.animalId)!;
    if(p.animalHandling){
      const t=p.animalHandling;
      if(t.kind==='lead'){
        const region=t.markerId===undefined?undefined:penRegion(w,t.markerId);
        if(!a.domestic||!livestock(a)||!region||!region.closed||!region.accessible||a.domestic.penMarkerId!==t.markerId
          ||!w.structures.some(s=>s.id===t.markerId&&s.kind==='pen-marker'&&s.pen?.accepted.includes(a.species)))errors.push('Invalid animal leading task.');
        for(const id of [...leadRopees(t),...(t.gatherId===undefined?[]:[t.gatherId])]){
          const member=w.wildlife?.animals.find(item=>item.id===id);
          if(!member?.domestic||!livestock(member)||member.state==='dead'||member.state==='downed'
            ||!w.structures.some(s=>s.id===t.markerId&&s.kind==='pen-marker'&&s.pen?.accepted.includes(member.species))
            ||id!==t.gatherId&&member.domestic.penMarkerId!==t.markerId)errors.push('Invalid animal leading member.');
        }
        continue;
      }
      if(t.kind==='milk'||t.kind==='shear'){
        if(!a.domestic||productForVersion(a,version)!==t.kind||!productReadyForVersion(a,version)||a.state==='dead'||a.state==='downed')errors.push('Invalid animal product task.');
        continue;
      }
      if(t.kind==='tame'?!a.taming?.designated||!!a.domestic:!a.domestic)errors.push('Animal handling has no matching designation.');
      if(t.kind==='maintain'&&a.species!=='hare')errors.push('Roaming livestock has no tameness maintenance.');
      const pile=w.piles.find(i=>i.id===(t.phase==='pickup'?t.sourcePileId:t.carryPileId));
      const units=handlingFeedUnits(a.species);
      if(t.quantity!==(t.step<3?units*2:t.step<5?units:0))errors.push('Animal food does not match interaction stage.');
      if(t.quantity===0?(t.step!==5||t.carryPileId!==null):!pile||!['berries','rice','potato','corn','agave-fruit'].includes(pile.item)
        ||(t.phase==='pickup'?t.carryPileId!==null||t.quantity!==units*2||pile.owner.type!=='ground'||reservedSource(w,pile.id)>pile.quantity:pile.owner.type!=='pawn'||pile.owner.pawnId!==p.id||pile.quantity!==t.quantity))errors.push('Animal food ownership mismatch.');
    }
    if(p.animalCare){
      if(!a.domestic)errors.push('Veterinary patient is not owned.');
      const t=p.animalCare,m:unknown=t.medicine;
      if(m!==undefined){
        if(!obj(m)||!keys(m,['item','sourcePileId','carryPileId','quantity'])||!isMedicine(m.item as never)||!int(m.sourcePileId,1,w.nextId-1)
          ||!(m.carryPileId===null||int(m.carryPileId,1,w.nextId-1))||!int(m.quantity,1,25)){errors.push('Invalid veterinary medicine.');continue;}
        const pile=w.piles.find(i=>i.id===(t.phase==='pickup'?m.sourcePileId:m.carryPileId));
        if(!pile||pile.item!==m.item||(t.phase==='pickup'?m.carryPileId!==null||pile.owner.type!=='ground'||reservedSource(w,pile.id)>pile.quantity:pile.owner.type!=='pawn'||pile.owner.pawnId!==p.id||pile.quantity!==m.quantity))errors.push('Veterinary medicine ownership mismatch.');
      }else if(t.phase==='pickup')errors.push('Veterinary pickup has no medicine.');
    }
  }
  return errors;
}
