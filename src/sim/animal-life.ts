import { animalSpecies, type AnimalSpeciesId } from './animal-species.ts';
import { animalNavigation } from './wildlife-navigation.ts';
import { grazingPen } from './wildlife-food.ts';
import { MAX_WILDLIFE, wildlifeRandom } from './wildlife-state.ts';
import type { WildAnimal } from './wildlife-state.ts';
import { TICKS_PER_DAY, type Cell, type World } from './types.ts';

/** Core 1.6.4871 life-stage ages are years of 60 days. */
const YEAR=TICKS_PER_DAY*60;
export const juvenileAgeTicks=(species:AnimalSpeciesId):number=>Math.round((species==='muffalo'||species==='dromedary'?.25:.1)*YEAR);
export const adultAgeTicks=(species:AnimalSpeciesId):number=>Math.round((species==='deer'||species==='muffalo'||species==='dromedary'?.3333:.2222)*YEAR);
export const gestationTicks=(species:AnimalSpeciesId):number=>Math.round((species==='muffalo'||species==='dromedary'?6.66:5.661)*TICKS_PER_DAY);
export const animalLifeStage=(a:WildAnimal):'baby'|'juvenile'|'adult'=>a.ageTicks>=adultAgeTicks(a.species)?'adult':a.ageTicks>=juvenileAgeTicks(a.species)?'juvenile':'baby';
export const bodySizeAtAge=(species:AnimalSpeciesId,ageTicks:number):number=>animalSpecies(species).bodySize*
  (ageTicks>=adultAgeTicks(species)?1:ageTicks>=juvenileAgeTicks(species)?.5:.2);
export const animalBodySize=(a:WildAnimal):number=>bodySizeAtAge(a.species,a.ageTicks);
export const animalNutritionMax=(a:WildAnimal):number=>animalSpecies(a.species).nutrition*({baby:.6,juvenile:.75,adult:1} as const)[animalLifeStage(a)];
export const animalFoodPerDay=(a:WildAnimal):number=>animalSpecies(a.species).foodPerDay*({baby:.4,juvenile:.75,adult:1} as const)[animalLifeStage(a)];

/** The same four hunger bands used by Core body-resource and gestation growth. */
export function animalGrowthFactor(a:WildAnimal):number {
  const reserve=a.food/animalNutritionMax(a);
  return reserve<=0?0:reserve<.18?.25:reserve<.36?.5:1;
}

const touching=(a:Cell,b:Cell)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z)<=1;
const navigation=(world:World,a:WildAnimal)=>animalNavigation(world,false,a.species==='hare'||a.species==='snow-hare');
const fertile=(a:WildAnimal):boolean=>!!a.domestic&&animalLifeStage(a)==='adult'&&a.state!=='dead'&&a.state!=='downed'
  &&a.state!=='sleeping'&&!a.stun&&!a.burning&&!a.flee&&!a.threat&&!a.retaliation&&!a.strike;
const femaleAvailable=(a:WildAnimal):boolean=>a.sex==='female'&&fertile(a)&&!a.pregnancy;
const hash=(a:number,b:number,c:number):number=>{
  let n=(a^Math.imul(b,0x9e3779b1)^Math.imul(c,0x85ebca6b))>>>0;
  n^=n>>>16;n=Math.imul(n,0x7feb352d);n^=n>>>15;n=Math.imul(n,0x846ca68b);n^=n>>>16;
  return (n>>>0)/0x100000000;
};
const event=(world:World,message:string)=>{world.events.push({tick:world.tick,type:'need',message});if(world.events.length>80)world.events.splice(0,world.events.length-80);};

/** New arrivals remain adults; newborns alone begin at age zero. */
export function advanceAnimalLife(world:World):void {
  const s=world.wildlife;if(!s)return;
  const residents=s.animals.slice();
  const byId=new Map(residents.map(a=>[a.id,a]));
  const claimed=new Set<number>();
  const handled=new Set<number>();
  for(const pawn of world.pawns){
    if(pawn.animalHandling)handled.add(pawn.animalHandling.animalId);
    if(pawn.animalCare)handled.add(pawn.animalCare.animalId);
  }
  for(const male of residents)if(male.mating)claimed.add(male.mating.femaleId);
  let routeBudget=1;
  for(const a of residents){
    if(a.state==='dead')continue;
    if(a.ageTicks<Number.MAX_SAFE_INTEGER)a.ageTicks++;
    if(a.ageTicks===adultAgeTicks(a.species)&&a.domestic&&(a.species==='muffalo'||a.species==='dromedary'&&a.sex==='female'))
      a.domestic.productFullness??=0;
    if(a.pregnancy){
      const factor=animalGrowthFactor(a);
      const accrue=factor===1||factor===.5&&(world.tick+a.id)%2===0||factor===.25&&(world.tick+a.id)%4===0;
      if(accrue)a.pregnancy.progress=Math.min(gestationTicks(a.species),a.pregnancy.progress+1);
      if(a.pregnancy.progress>=gestationTicks(a.species))birth(world,a);
    }
  }
  for(const male of residents){
    if(!male.mating)continue;
    const female=byId.get(male.mating.femaleId);
    if(!fertile(male)||male.sex!=='male'||handled.has(male.id)||!female||handled.has(female.id)
      ||!femaleAvailable(female)||male.species!==female.species){
      delete male.mating;male.path=[];continue;
    }
    if((male.motion?.end??0)>world.tick||(female.motion?.end??0)>world.tick)continue;
    if(touching(male,female)){
      male.path=[];female.path=[];
      if(++male.mating.progress>=50){
        delete male.mating;
        if(wildlifeRandom(s)<.5)female.pregnancy={fatherId:male.id,progress:0};
      }
      continue;
    }
    male.mating.progress=0;
    if(male.path.length||!routeBudget)continue;
    routeBudget--;
    const nav=navigation(world,male);
    const pen=grazingPen(world,male);
    const goals=[{x:female.x-1,z:female.z},{x:female.x+1,z:female.z},{x:female.x,z:female.z-1},{x:female.x,z:female.z+1}]
      .filter(c=>!pen||pen.has(c.z*world.width+c.x));
    const path=nav.route(male,goals);
    if(path?.length){male.path=path;male.state='moving';male.nextDecision=world.tick;}
    else {delete male.mating;male.path=[];male.nextDecision=world.tick+10;}
  }
  for(const male of residents){
    if(male.sex!=='male'||!fertile(male)||handled.has(male.id)||male.mating||male.meal||male.path.length||(male.motion?.end??0)>world.tick)continue;
    if(world.tick%250!==male.id%250)continue;
    const mtb=male.species==='hare'||male.species==='snow-hare'?8:12;
    if(hash(world.seed,male.id,Math.floor(world.tick/250))>=1-Math.exp(-1/mtb))continue;
    let female:WildAnimal|undefined,nearest=Infinity;
    for(const candidate of residents){
      if(!femaleAvailable(candidate)||handled.has(candidate.id)||candidate.species!==male.species||claimed.has(candidate.id))continue;
      const distance=(male.x-candidate.x)**2+(male.z-candidate.z)**2;
      if(distance<=900&&(distance<nearest||distance===nearest&&candidate.id<(female?.id??Infinity))){female=candidate;nearest=distance;}
    }
    if(!female)continue;
    male.mating={femaleId:female.id,progress:0};claimed.add(female.id);
  }
}

function birth(world:World,mother:WildAnimal):void {
  const s=world.wildlife!,pregnancy=mother.pregnancy!;
  const available=Math.min(MAX_WILDLIFE-s.animals.length,world.nextId<=Number.MAX_SAFE_INTEGER-2?2:0);
  if(available<=0)return;
  const pen=grazingPen(world,mother),nav=navigation(world,mother);
  const occupied=new Set(s.animals.map(a=>a.z*world.width+a.x));
  for(const pawn of world.pawns)occupied.add(pawn.z*world.width+pawn.x);
  const places:Cell[]=[];
  for(let radius=1;radius<=1&&places.length<available;radius++)
    for(let z=mother.z-radius;z<=mother.z+radius&&places.length<available;z++)for(let x=mother.x-radius;x<=mother.x+radius&&places.length<available;x++){
      if(Math.max(Math.abs(x-mother.x),Math.abs(z-mother.z))!==radius)continue;
      const c={x,z},key=z*world.width+x;
      if((!pen||pen.has(key))&&nav.free(c)&&!occupied.has(key)){places.push(c);occupied.add(key);}
    }
  if(!places.length)return;
  const litter=mother.species==='hare'||mother.species==='snow-hare'?1+(wildlifeRandom(s)<.5?1:0):1;
  const births=places.slice(0,litter);
  for(const place of births){
    const child:WildAnimal={id:world.nextId++,species:mother.species,sex:wildlifeRandom(s)<.5?'female':'male',ageTicks:0,
      parents:{motherId:mother.id,fatherId:pregnancy.fatherId},x:place.x,z:place.z,
      food:animalSpecies(mother.species).nutrition*.6*.45,rest:1,state:'idle',path:[],nextDecision:world.tick+1};
    if(mother.domestic)child.domestic={since:world.tick,care:mother.domestic.care,tameness:mother.domestic.tameness,
      nextDecay:mother.domestic.nextDecay,...mother.domestic.penMarkerId!==undefined?{penMarkerId:mother.domestic.penMarkerId}:{}};
    s.animals.push(child);
  }
  delete mother.pregnancy;
  event(world,`${animalSpecies(mother.species).label} ${mother.id} a mis bas ${births.length} petit${births.length>1?'s':''}.`);
}
