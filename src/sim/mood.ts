import { COLONY_EXPECTATIONS,type ColonyExpectation } from './expectations.ts';
import { colonyExpectation } from './colony-economy.ts';
import { malnutritionStage } from './malnutrition.ts';
import { expireRoomMemoriesAt,roomMoodThoughtsAt } from './room-experience.ts';
import { TRAITS } from './traits.ts';
import { colonistMoodOffset } from './game-profile.ts';
import { APPAREL } from './apparel-rules.ts';
import { pawnBody } from './health-rules.ts';
import { medicalPain } from './injury-state.ts';
import { insultMoodMemories,kindWordsMoodMemories } from './social-state.ts';
import { bereavementThoughtsAt,expireBereavement } from './bereavement.ts';
import { deathThoughtsAt,expireDeathThoughts } from './death-thoughts.ts';
import { colonistUnburiedThought } from './death-thoughts-perception.ts';
import { expireFamilyBereavement,familyBereavementThoughtsAt } from './family-bereavement.ts';
import { expireRomanceMemories,romanceMoodThoughtsAt } from './romance-memories.ts';
import { relationshipHousingThought,type RelationshipTopology } from './relationship-housing.ts';
import { captureRelationshipPeople } from './relationship-namespace.ts';
import type { BodyAssessment } from './body-capacities.ts';
import { TICKS_PER_DAY,type Pawn,type World,type MaterialPile } from './types.ts';

export const MOOD_BASE=32;
export const MOOD_RISE_PER_HOUR=12,MOOD_FALL_PER_HOUR=8;
export interface MoodThought {
  readonly id:string;readonly label:string;readonly offset:number;
  readonly kind:'situation'|'memory';readonly description:string;readonly expiresAt?:number;
}
const situation=(id:string,label:string,offset:number,description:string):MoodThought=>Object.freeze({id,label,offset,description,kind:'situation'});
const hunger=[situation('hungry','Faim',-6,'Nutrition sous 24 %.'),situation('ravenous','Très faim',-12,'Nutrition sous 12 %.'),situation('starving','Affamé',-20,'Nutrition épuisée.')];
const starvation=['Malnutrition débutante','Malnutrition légère','Malnutrition modérée','Famine sévère','Famine extrême'].map((label,index)=>situation(`starvation-${index}`,label,-20-index*6,'Nutrition épuisée et malnutrition progressive.'));
const fatigue=[situation('drowsy','Somnolent',-6,'Repos sous 28 %.'),situation('tired','Très fatigué',-12,'Repos sous 14 %.'),situation('exhausted','Épuisé',-18,'Repos sous 1 %.')];
const comforts=[situation('uncomfortable','Inconfortable',-3,'Confort sous 10 %.'),situation('comfortable','Confortable',4,'Confort d’au moins 60 %.'),situation('quite-comfortable','Très confortable',6,'Confort d’au moins 70 %.'),situation('extremely-comfortable','Extrêmement confortable',8,'Confort d’au moins 80 %.'),situation('luxurious','Confort luxueux',10,'Confort d’au moins 90 %.')];
const beauty=[situation('hideous-environment','Environnement affreux',-15,'Beauté perçue sous 1 %.'),situation('very-ugly-environment','Environnement très laid',-10,'Beauté perçue sous 15 %.'),situation('ugly-environment','Environnement laid',-5,'Beauté perçue sous 35 %.'),situation('pretty-environment','Joli environnement',5,'Beauté perçue d’au moins 65 %.'),situation('beautiful-environment','Bel environnement',10,'Beauté perçue d’au moins 85 %.'),situation('gorgeous-environment','Environnement splendide',15,'Beauté perçue d’au moins 99 %.')];
const leisure=[situation('recreation-starved','Privé de loisirs',-20,'Loisirs sous 1 %.'),situation('recreation-deprived','Manque important de loisirs',-10,'Loisirs sous 15 %.'),situation('recreation-low','Manque de loisirs',-5,'Loisirs sous 30 %.'),situation('recreation-high','Loisirs satisfaisants',5,'Loisirs d’au moins 70 %.'),situation('recreation-full','Loisirs pleinement satisfaits',10,'Loisirs d’au moins 85 %.')];
const pains=[situation('minor-pain','Douleur légère',-5,'Douleur présente, sous 15 %.'),situation('serious-pain','Douleur importante',-10,'Douleur d’au moins 15 %.'),situation('intense-pain','Douleur intense',-15,'Douleur d’au moins 40 %.'),situation('extreme-pain','Douleur extrême',-20,'Douleur d’au moins 80 %.')];
const sick=situation('sick','Malade',-5,'Grippe active ; cette pensée disparaît avec la maladie.');
const apparel=[situation('ratty-apparel','Vêtements abîmés',-3,'Au moins une pièce portée a moins de 50 % de ses PV.'),situation('tattered-apparel','Vêtements en lambeaux',-5,'Au moins une pièce portée a moins de 20 % de ses PV.')];
const expectationThoughts=new Map(COLONY_EXPECTATIONS.map(e=>[e.id,situation(`expectations-${e.id}`,e.label,e.moodOffset,'Attentes liées au patrimoine évalué de la colonie ; les valeurs inconnues restent exclues.')]));
const camp=situation('camp-expectations','Attentes extrêmement basses',30,'Profil fixe de ce camp, partagé avec les loisirs ; ne varie pas encore avec la richesse.');
const memoryLabels={'ate-without-table':'Mangé sans table','ate-raw-food':'Mangé cru','ate-fine-meal':'A mangé un bon repas','ate-lavish-meal':'A mangé un repas gastronomique'} as const;
const memoryOffsets={'ate-without-table':-3,'ate-raw-food':-7,'ate-fine-meal':5,'ate-lavish-meal':12} as const;

const hungerStage=(value:number)=>value<=0?2:value<12?1:value<24?0:-1;
const restStage=(value:number)=>value<1?2:value<14?1:value<28?0:-1;
const comfortStage=(value:number)=>value<10?0:value<60?-1:value<70?1:value<80?2:value<90?3:4;
const beautyStage=(value:number)=>value<=1?0:value<15?1:value<35?2:value<65?-1:value<85?3:value<99?4:5;
const joyStage=(value:number)=>value<1?0:value<15?1:value<30?2:value<70?-1:value<85?3:4;
const painStage=(value:number)=>value<.0001?-1:value<.15?0:value<.4?1:value<.8?2:3;
export const comfortMood=(value:number):number=>comforts[comfortStage(value)]?.offset??0;

/** Situation facts are derived, never saved as permanent memories. The same
 * evaluator supplies simulation and inspection, outside render frames. Current
 * content permits one stage per family and one memory per meal kind. */
export type PersonalMoodPeople=Pick<ReadonlyMap<number,{readonly name:string}>,'get'>;
export interface PersonalMoodContext {
  tick:number;people:PersonalMoodPeople;
  /** Local compatibility uses its existing namespace for family/romance labels. */
  relationPeople?:PersonalMoodPeople;
  items:readonly MaterialPile[];expectation?:ColonyExpectation;difficultyMood:number;
  /** Absent off-map: never reuse the former map room, comfort or beauty. */
  environment?:{comfort:number;beauty:number};housing?:MoodThought;
  deathSituation?:MoodThought;
}
export function moodThoughts(world:World,pawn:Pawn,topology?:RelationshipTopology):readonly MoodThought[] {
  if(pawn.state==='dead')return [];
  return personalMoodThoughts(pawn,{tick:world.tick,people:{get:id=>world.pawns.find(p=>p.id===id)},
    ...(pawn.familyBereavement||pawn.romanceMemories?{relationPeople:captureRelationshipPeople(world)}:{}),
    items:world.piles,expectation:colonyExpectation(world,pawn),difficultyMood:colonistMoodOffset(world,pawn),
    environment:{comfort:pawn.comfort,beauty:pawn.beauty},housing:relationshipHousingThought(world,pawn,topology),deathSituation:colonistUnburiedThought(world,pawn)});
}
export function personalMoodThoughts(pawn:Pawn,c:PersonalMoodContext):readonly MoodThought[] {
  if(pawn.state==='dead')return [];
  const expectation=c.expectation;
  const thoughts:MoodThought[]=[expectation?expectationThoughts.get(expectation.id)!:camp,...roomMoodThoughtsAt(pawn,c.tick)];
  if(pawn.bereavement)thoughts.push(...bereavementThoughtsAt(pawn,c.tick,c.people));
  if(pawn.deathThoughts)thoughts.push(...deathThoughtsAt(pawn,c.tick,c.people));
  if(c.deathSituation)thoughts.push(c.deathSituation);
  if(pawn.familyBereavement)thoughts.push(...familyBereavementThoughtsAt(pawn,c.tick,c.relationPeople??c.people));
  if(pawn.romanceMemories)thoughts.push(...romanceMoodThoughtsAt(pawn,c.tick,c.relationPeople??c.people));
  const housing=c.housing;if(housing)thoughts.push(housing);
  const difficultyMood=c.difficultyMood;
  if(difficultyMood)thoughts.push(situation('difficulty-mood','Récit d’aventure',difficultyMood,'Bonus d’humeur du niveau d’aventure choisi.'));
  for(const id of pawn.traits??[]){const trait=TRAITS[id];if(trait.mood)thoughts.push({id:`trait-${id}`,label:trait.label,offset:trait.mood,kind:'situation',description:trait.description});}
  for(const t of [pawn.hunger<=0?starvation[Math.max(0,malnutritionStage(pawn.health?.malnutrition)-1)]:hunger[hungerStage(pawn.hunger)],fatigue[restStage(pawn.rest)],c.environment?comforts[comfortStage(c.environment.comfort)]:undefined,c.environment?beauty[beautyStage(c.environment.beauty)]:undefined,pawn.prisoner?undefined:leisure[joyStage(pawn.recreation.level)],pains[painStage(pawn.health?medicalPain(pawn.health):0)]])if(t)thoughts.push(t);
  if((pawn.health?.flu?.severity??0)>0||(pawn.health?.immuneDiseases?.malaria?.severity??0)>0||(pawn.health?.immuneDiseases?.plague?.severity??0)>0)thoughts.push(sick);
  let condition=1;
  for(const pile of c.items)if(pile.owner.type==='apparel'&&pile.owner.pawnId===pawn.id)condition=Math.min(condition,pile.apparel!.hitPoints/APPAREL[pile.item as keyof typeof APPAREL].hitPoints);
  if(condition<.5)thoughts.push(apparel[condition<.2?1:0]!);
  for(const m of pawn.memories)if(m.expiresAt>c.tick)thoughts.push({id:m.kind,label:memoryLabels[m.kind],offset:memoryOffsets[m.kind],kind:'memory',description:'Souvenir du dernier repas concerné ; une nouvelle occurrence renouvelle sa durée sans cumul.',expiresAt:m.expiresAt});
  const denied=pawn.deniedJoining?.filter(t=>t>c.tick)??[];
  if(denied.length)thoughts.push({id:'denied-joining',label:`Accueil refusé ×${denied.length}`,offset:-3*(1-.75**denied.length)/.25,kind:'memory',description:'Une demande d’accueil refusée ; six jours, au plus cinq souvenirs à effet décroissant.',expiresAt:denied[0]});
  for(const insult of insultMoodMemories(pawn,c.tick)){
    const speaker=c.people.get(insult.otherId);
    thoughts.push({id:`insult-${insult.otherId}`,label:`Insulté par ${speaker?.name??'un colon'}${insult.count>1?` ×${insult.count}`:''}`,offset:insult.offset,kind:'memory',description:'Paroles blessantes reçues ; effet cumulatif dégressif pendant deux jours.',expiresAt:insult.expiresAt});
  }
  for(const words of kindWordsMoodMemories(pawn,c.tick)){
    const speaker=c.people.get(words.otherId);
    thoughts.push({id:`kind-words-${words.otherId}`,label:`Mots gentils de ${speaker?.name??'un colon'}${words.count>1?` ×${words.count}`:''}`,offset:words.offset,kind:'memory',description:'Paroles bienveillantes reçues ; effet cumulatif dégressif pendant deux jours.',expiresAt:words.expiresAt});
  }
  const catharsis=pawn.mental?.catharsis.filter(t=>t>c.tick)??[];
  if(catharsis.length)thoughts.push({id:'catharsis',label:`Catharsis ×${catharsis.length}`,offset:40*(1-.75**catharsis.length)/.25,kind:'memory',description:'Soulagement après crise ; chaque occurrence dure trois jours, au plus cinq, effet décroissant.',expiresAt:catharsis[0]});
  return thoughts;
}
export function moodTarget(thoughts:readonly MoodThought[]):number {
  return Math.max(0,Math.min(100,MOOD_BASE+thoughts.reduce((sum,t)=>sum+t.offset,0)));
}
/** Downed does not mean unconscious. Awake medical rest and a conscious person
 * without usable legs still experience mood; sleep and lost awareness freeze it. */
export function moodFrozen(pawn:Pawn,body?:BodyAssessment):boolean {
  return pawn.state==='dead'||pawn.state==='sleeping'||!!pawn.medicalSleep||!(body??pawnBody(pawn)).canBeAwake;
}
export function updateMood(world:World,pawn:Pawn,body?:BodyAssessment,topology?:RelationshipTopology):void {
  if(moodFrozen(pawn,body))return;
  updateMoodFromThoughts(pawn,moodThoughts(world,pawn,topology),body);
}
export function updateMoodFromThoughts(pawn:Pawn,thoughts:readonly MoodThought[],body?:BodyAssessment):void {
  if(moodFrozen(pawn,body))return;
  const target=moodTarget(thoughts);
  const amount=(target>pawn.mood?MOOD_RISE_PER_HOUR:MOOD_FALL_PER_HOUR)*24/TICKS_PER_DAY;
  pawn.mood=target>pawn.mood?Math.min(target,pawn.mood+amount):Math.max(target,pawn.mood-amount);
}
export function expireMealMemories(world:World,pawn:Pawn):void {expireMealMemoriesAt(pawn,world.tick);}
export function expireMealMemoriesAt(pawn:Pawn,tick:number):void {
  if(pawn.familyBereavement)expireFamilyBereavement(pawn,tick);
  if(pawn.romanceMemories)expireRomanceMemories(pawn,tick);
  if(pawn.bereavement)expireBereavement(pawn,tick);
  if(pawn.deathThoughts)expireDeathThoughts(pawn,tick);
  expireRoomMemoriesAt(pawn,tick);
  if(pawn.deniedJoining?.some(t=>t<=tick)){pawn.deniedJoining=pawn.deniedJoining.filter(t=>t>tick);if(!pawn.deniedJoining.length)delete pawn.deniedJoining;}
  if(pawn.memories.some(m=>m.expiresAt<=tick))pawn.memories=pawn.memories.filter(m=>m.expiresAt>tick);
}
