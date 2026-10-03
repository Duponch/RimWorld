import { validCorpseRot } from './corpse-save.ts';
import { validStunShape } from './melee-save.ts';
import { validateMedicalRecord } from './injury-validation.ts';
import { medicalStatus } from './injury-state.ts';
import { validStagger } from './stagger.ts';
import { travelEnd,validSlowIntervals } from './travel-timing.ts';
import type { World } from './types.ts';
import { MAX_WILDLIFE, type WildAnimal } from './wildlife-state.ts';
import { animalMealTarget } from './wildlife-food.ts';
import { animalNavigation } from './wildlife-navigation.ts';
import { ITEM_DEFINITIONS } from './items.ts';
import { animalSpecies,faunaBiome,isAnimalSpecies } from './animal-species.ts';
import { adultAgeTicks, gestationTicks } from './animal-life.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
const finite=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const keys=(v:object,allowed:string[])=>Object.keys(v).every(k=>allowed.includes(k));
/** Cheap transport/save check; no route search or mutable World reference. */
export function validAnimalExit(w:Pick<World,'width'|'height'|'tick'>,version:number,a:WildAnimal):boolean {
  const exit:unknown=a.exiting;
  if(exit===undefined)return true;
  if(version<174||!object(exit)||!keys(exit,['destination','nextFoodCheck'])
    ||!object(exit.destination)||!keys(exit.destination,['x','z'])
    ||!int(exit.destination.x,0,w.width-1)||!int(exit.destination.z,0,w.height-1)
    ||!(exit.destination.x===0||exit.destination.z===0||exit.destination.x===w.width-1||exit.destination.z===w.height-1)
    ||!int(exit.nextFoodCheck,0,Math.min(Number.MAX_SAFE_INTEGER,w.tick+100))
    ||a.food>0||a.domestic||a.meal||a.predation||a.burning||a.flee||a.threat||a.retaliation||a.strike||a.stun
    ||!['idle','moving','hungry'].includes(a.state)||!Array.isArray(a.path))return false;
  const last=a.path.at(-1);
  return !last||last.x===exit.destination.x&&last.z===exit.destination.z;
}
export function validWildlifeExitState(w:Pick<World,'width'|'height'|'tick'|'wildlife'>,version:number):boolean {
  const s=w.wildlife;
  return s===undefined||object(s)&&Array.isArray(s.animals)
    &&(s.exitedAnimals===undefined||version>=174&&int(s.exitedAnimals,1))
    &&s.animals.every(a=>object(a)&&validAnimalExit(w,version,a));
}
/** Snapshot boundary: identity and sparse intent only, no path flood. */
export function validWildlifePredationState(w:Pick<World,'tick'|'wildlife'|'piles'|'nextId'>,version:number):boolean {
  const s=w.wildlife;if(!s)return true;
  if(!object(s)||!Array.isArray(s.animals)||version<178&&s.profile==='biome-fauna-v2')return false;
  return s.animals.every(a=>{
    if(!object(a)||version<178&&a.species==='red-fox')return false;
    const hunt:unknown=a.predation;if(hunt===undefined)return true;
    return version>=178&&isAnimalSpecies(a.species)&&animalSpecies(a.species).predator===true&&object(hunt)
      &&keys(hunt,['targetId','startedAtCore','firstHit'])&&int(hunt.targetId,1,w.nextId-1)&&hunt.targetId!==a.id
      &&int(hunt.startedAtCore,0,w.tick*10)&&typeof hunt.firstHit==='boolean'
      &&!a.domestic&&!a.meal&&!a.exiting&&!a.flee&&!a.burning&&['idle','moving'].includes(a.state)
      &&(s.animals.some(other=>other.id===hunt.targetId)||w.piles.some(p=>p.corpse?.animalId===hunt.targetId));
  });
}
export function validateWildlife(w:World,version:number,ids:Set<number>):string[] {
  const s=w.wildlife;if(s===undefined)return [];
  const errors:string[]=[];
  if(!validWildlifePredationState(w,version))errors.push('Invalid wildlife predation state.');
  if(!validWildlifeExitState(w,version))errors.push('Invalid wildlife exit state.');
  if(version<76||!object(s)||!['temperate-hares-v1',...(version>=91?['biome-herbivores-v1']:[]),...(version>=178?['biome-fauna-v2']:[])].includes(String(s.profile))
    ||!keys(s,['profile','rng','animals','eatenPlants','eatenNutrition','eatenItems',...(version>=174?['exitedAnimals']:[]),...(['biome-herbivores-v1','biome-fauna-v2'].includes(s.profile)?['population']:[])])
    ||!int(s.rng,1,0xffffffff)||!Array.isArray(s.animals)||s.animals.length>MAX_WILDLIFE||!int(s.eatenPlants)||!int(s.eatenItems)||!finite(s.eatenNutrition,0,Number.MAX_SAFE_INTEGER))return ['Invalid wildlife state.'];
  if(['biome-herbivores-v1','biome-fauna-v2'].includes(s.profile)){
    const p=s.population;if(!object(p)||!keys(p,['biome','fullTargetWeight','targetWeight','nextCheck','checks','arrivals'])||!['temperate-forest','boreal-forest','arid-shrubland','tundra'].includes(String(p.biome)))return ['Invalid wildlife population state.'];
    const biome=faunaBiome(p.biome as Parameters<typeof faunaBiome>[0],s.profile==='biome-fauna-v2'),full=w.width*w.height*biome.animalDensity/10000,implemented=biome.entries.reduce((n,e)=>n+e.commonality,0),target=full*implemented/biome.totalCommonality;
    if(p.fullTargetWeight!==full||p.targetWeight!==target||!int(p.nextCheck,w.tick+1,w.tick+122)||!int(p.checks)||!int(p.arrivals,0,p.checks))return ['Invalid wildlife population state.'];
  } else if(s.population!==undefined)return ['Invalid wildlife population state.'];
  if(s.animals.some(a=>!object(a)))return ['Invalid wild animal.'];
  const matingFemales=new Set<number>();
  let navigation:ReturnType<typeof animalNavigation>|undefined,hareNavigation:ReturnType<typeof animalNavigation>|undefined;
  const cell=(c:unknown):c is {x:number;z:number}=>object(c)&&keys(c,['x','z'])&&int(c.x,0,w.width-1)&&int(c.z,0,w.height-1);
  for(const a of s.animals) {
    if(!object(a)||!keys(a,['id','species','sex','x','z','food','rest','state','path','motion','nextDecision','meal',...(version>=77?['health','flee','stagger','sleepUntilCore']:[]),...(version>=78?['threat','retaliation','strike','stun']:[]),...(version>=79?['corpseRot']:[]),...(version>=87?['burning']:[]),...(version>=106?['domestic','taming']:[]),...(version>=121?['ageTicks','parents','pregnancy','mating']:[]),...(version>=174?['exiting']:[]),...(version>=178?['predation']:[])])||!int(a.id,1,w.nextId-1)||!int(a.x,0,w.width-1)||!int(a.z,0,w.height-1)||!isAnimalSpecies(a.species)||version<178&&a.species==='red-fox'||(version<91||s.profile==='temperate-hares-v1')&&a.species!=='hare'||['biome-herbivores-v1','biome-fauna-v2'].includes(s.profile)&&!faunaBiome(s.population!.biome,s.profile==='biome-fauna-v2').entries.some(e=>e.species===a.species)&&!(version>=119&&!!a.domestic)||!['female','male'].includes(a.sex)||!finite(a.food,0,animalSpecies(a.species).nutrition)||!finite(a.rest,0,1)||!['idle','moving','eating','sleeping','hungry',...(version>=77?['downed','dead']:[])].includes(a.state)||!int(a.nextDecision,0,w.tick+100)||!Array.isArray(a.path)||a.path.length>w.width*w.height||!a.path.every(cell)){errors.push('Invalid wild animal.');continue;}
    if(version>=121){
      if(!int(a.ageTicks))errors.push('Invalid animal age.');
      const parents:unknown=a.parents;
      if(parents!==undefined&&(!object(parents)||!keys(parents,['motherId','fatherId'])
        ||!int(parents.motherId,1,a.id-1)||!int(parents.fatherId,1,a.id-1)||parents.motherId===parents.fatherId))errors.push('Invalid animal parentage.');
      const pregnancy:unknown=a.pregnancy;
      if(pregnancy!==undefined){
        const father=object(pregnancy)&&int(pregnancy.fatherId,1,w.nextId-1)
          ?s.animals.find(other=>other.id===pregnancy.fatherId):undefined;
        if(!object(pregnancy)||!keys(pregnancy,['fatherId','progress'])
          ||!int(pregnancy.fatherId,1,w.nextId-1)||pregnancy.fatherId===a.id
          ||!int(pregnancy.progress,0,gestationTicks(a.species))
          ||a.sex!=='female'||!int(a.ageTicks,adultAgeTicks(a.species))||a.state==='dead'
          ||father&&(father.species!==a.species||father.sex!=='male'||!isAnimalSpecies(father.species)||!int(father.ageTicks,adultAgeTicks(father.species))))errors.push('Invalid animal pregnancy.');
      }
      const mating:unknown=a.mating;
      if(mating!==undefined){
        const female=object(mating)&&int(mating.femaleId,1,w.nextId-1)
          ?s.animals.find(other=>other.id===mating.femaleId):undefined;
        if(!object(mating)||!keys(mating,['femaleId','progress'])
          ||!int(mating.femaleId,1,w.nextId-1)||!int(mating.progress,0,49)
          ||a.sex!=='male'||!a.domestic||a.state==='dead'||!int(a.ageTicks,adultAgeTicks(a.species))
          ||!female||female.species!==a.species||female.sex!=='female'||!female.domestic
          ||female.state==='dead'||female.pregnancy!==undefined||!int(female.ageTicks,adultAgeTicks(a.species))
          ||matingFemales.has(Number(mating.femaleId)))errors.push('Invalid animal mating.');
        else matingFemales.add(Number(mating.femaleId));
      }
    }
    const hunt:unknown=a.predation;
    if(hunt!==undefined&&(!object(hunt)||!keys(hunt,['targetId','startedAtCore','firstHit'])
      ||version<178||!animalSpecies(a.species).predator||a.domestic||a.meal||a.exiting||a.flee||a.burning
      ||!['idle','moving'].includes(a.state)||!int(hunt.targetId,1,w.nextId-1)||hunt.targetId===a.id
      ||!int(hunt.startedAtCore,0,w.tick*10)||typeof hunt.firstHit!=='boolean'
      ||!s.animals.some(other=>other.id===hunt.targetId)&&!w.piles.some(p=>p.corpse?.animalId===hunt.targetId)))errors.push('Invalid animal predation.');
    if(a.corpseRot!==undefined&&(version<79||a.state!=='dead'||!a.health?.death||!validCorpseRot(a.corpseRot,w.tick,a.health.death.tick)))errors.push('Invalid retained animal corpse age.');
    if(ids.has(a.id))errors.push('Duplicate wildlife identity.');ids.add(a.id);
    if(['water','rock'].includes(w.tiles[a.z*w.width+a.x]!.terrain)||w.structures.some(s=>(s.kind==='wall'||s.kind==='cooler')&&s.x===a.x&&s.z===a.z))errors.push('Wildlife inside solid terrain.');
    if(a.health!==undefined){
      if(validateMedicalRecord(a.health,true,true,false,false,true,version>=79,version>=81,version>=84,version>=87,version>=88,version>=89,version)||a.health.body!==a.species){errors.push('Invalid animal medical record.');continue;}
      if(a.health.death?a.health.tick>w.tick:a.health.tick!==w.tick)errors.push('Invalid animal medical clock.');
      const status=medicalStatus(a.health);if(status==='mobile'?a.state==='dead'||a.state==='downed':a.state!==status)errors.push('Invalid animal medical state.');
    } else if(a.state==='dead'||a.state==='downed')errors.push('Animal stopped without health record.');
    if((a.state==='dead'||a.state==='downed')&&(a.path.length||a.meal||a.predation||a.flee||a.threat||a.retaliation||a.strike||a.stun))errors.push('Incapacitated animal retains activity.');
    if(!validStagger(a.stagger,version,w.tick)||a.sleepUntilCore!==undefined&&!int(a.sleepUntilCore,w.tick*10+1,w.tick*10+1000))errors.push('Invalid animal impact delay.');
    if(a.flee!==undefined&&(!object(a.flee)||!keys(a.flee,['danger','until'])||!cell(a.flee.danger)||!int(a.flee.until,w.tick+1,w.tick+600)||a.meal||!['idle','moving'].includes(a.state)))errors.push('Invalid animal flight.');
    if(!validStunShape(a.stun,version,w.tick,version>=178?420:45))errors.push('Invalid animal stun.');
    if(a.threat!==undefined&&(!object(a.threat)||!keys(a.threat,['targetId','harmedAtCore'])||!int(a.threat.harmedAtCore,Math.max(0,w.tick*10-400),w.tick*10)||!w.pawns.some(p=>p.id===a.threat!.targetId)&&!(version>=178&&s.animals.some(other=>other.id===a.threat!.targetId&&other.id!==a.id))||a.meal||a.flee||!['idle','moving'].includes(a.state)))errors.push('Invalid animal melee threat.');
    if(a.retaliation!==undefined&&(!object(a.retaliation)||!keys(a.retaliation,['targetId','untilCore'])||!a.threat||a.retaliation.targetId!==a.threat.targetId||!int(a.retaliation.untilCore,w.tick*10+1,w.tick*10+200)||a.strike))errors.push('Invalid animal retaliation job.');
    if(a.strike!==undefined&&(!object(a.strike)||!keys(a.strike,['targetId','atCore','untilCore','tool','outcome'])||!int(a.strike.targetId,1)||!int(a.strike.atCore,0,w.tick*10)||!int(a.strike.untilCore,w.tick*10+1)||!['hit','miss','dodge'].includes(String(a.strike.outcome))||!animalSpecies(a.species).melee.some(t=>t.id===a.strike!.tool&&a.strike!.untilCore-a.strike!.atCore===t.cooldownCore)||!w.pawns.some(p=>p.id===a.strike!.targetId)&&!w.raids?.departed.some(d=>d.pawnId===a.strike!.targetId)&&!(version>=178&&(s.animals.some(other=>other.id===a.strike!.targetId&&other.id!==a.id)||w.piles.some(p=>p.corpse?.animalId===a.strike!.targetId)))||a.meal||a.path.length||(a.motion?.end??0)>w.tick||a.state!=='idle'))errors.push('Invalid animal melee recovery.');
    const m=a.motion;
    if(m!==undefined) {
      if(!object(m)||!keys(m,['from','to','start','end','speedFactor','terrainDelay',...(version>=77?['stagger']:[]),...(version>=78?['stuns']:[])])||!cell(m.from)||!cell(m.to)||!finite(m.start,0,w.tick)||!finite(m.end,0,w.tick+100)||m.end<=m.start||Math.max(Math.abs(m.from.x-m.to.x),Math.abs(m.from.z-m.to.z))!==1||m.to.x!==a.x||m.to.z!==a.z||!(version>=77?finite(m.speedFactor,version>=87?.096*.8:.096,3):[3,.6].includes(m.speedFactor!))||!finite(m.terrainDelay,0,50)||!validSlowIntervals(m.stagger,version,m.start,w.tick)||!validSlowIntervals(m.stuns,version,m.start,w.tick)||Math.abs(m.end-travelEnd(m))>1e-7)errors.push('Invalid wildlife motion.');
      else if(m.end>w.tick){
        if(!['moving','downed','dead'].includes(a.state))errors.push('Active wildlife edge without movement.');
        const pathNavigation=a.species==='hare'||a.species==='snow-hare'||animalSpecies(a.species).predator
          ?(hareNavigation??=animalNavigation(w,false,true)):(navigation??=animalNavigation(w));
        if(!pathNavigation.step(m.from,m.to))errors.push('Wildlife edge crosses a solid obstacle.');
      }
    }
    let previous={x:a.x,z:a.z};for(const c of a.path){if(Math.max(Math.abs(c.x-previous.x),Math.abs(c.z-previous.z))!==1)errors.push('Disconnected wildlife path.');previous=c;}
    if(a.meal!==undefined) {
      const m=a.meal;
      const species=animalSpecies(a.species);
      if(!object(m)||!keys(m,['kind','id','quantity','progress'])||!['plant','pile'].includes(m.kind)||!int(m.id,1,w.nextId-1)||!int(m.quantity,1,75)||m.kind==='plant'&&m.quantity!==1||!(version>=77?finite(m.progress,0,species.ingestTicks)&&m.progress<species.ingestTicks:int(m.progress,0,species.ingestTicks-1))||!['moving','eating'].includes(a.state)){errors.push('Invalid wildlife meal.');continue;}
      const target=animalMealTarget(w,a);
      if(a.state==='moving'&&m.progress!==0)errors.push('Animal chewed during travel.');
      const pile=m.kind==='pile'?w.piles.find(p=>p.id===m.id):undefined;
      if(pile&&!pile.corpse&&m.quantity>Math.max(1,Math.ceil(species.nutrition/(ITEM_DEFINITIONS[pile.item].nutrition/100))))errors.push('Oversized wildlife meal.');
      if(!target)errors.push('Missing or overreserved wildlife food.');
      else if(a.state==='eating'&&(a.path.length||Math.abs(a.x-target.x)+Math.abs(a.z-target.z)>1))errors.push('Remote animal ingestion.');
    } else if(a.state==='eating')errors.push('Animal eating without food.');
    if(a.state==='sleeping'&&a.path.length)errors.push('Sleeping animal with route.');
  }
  return errors;
}
