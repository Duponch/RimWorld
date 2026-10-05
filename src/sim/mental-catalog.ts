export type MentalCrisisKind='sad-wander'|'food-binge'|'tantrum'|'berserk'|'murderous-rage';
export const MENTAL_CRISIS_CATALOG={
  'sad-wander':{label:'Errance triste',intensity:0,weight:.5,minCore:40000,maxCore:60000,recoveryMtb:.166},
  'food-binge':{label:'Frénésie alimentaire',intensity:0,weight:.8,minCore:25000,maxCore:45000,recoveryMtb:.166},
  tantrum:{label:'Crise de destruction',intensity:1,weight:.333,minCore:8000,maxCore:12000,recoveryMtb:.033},
  berserk:{label:'Fureur violente',intensity:2,weight:1,minCore:40000,maxCore:60000,recoveryMtb:.166},
  'murderous-rage':{label:'Colère meurtrière',intensity:2,weight:1,minCore:100000,maxCore:100000,recoveryMtb:0},
} as const;
export const mentalCrisisLabel=(kind:MentalCrisisKind):string=>MENTAL_CRISIS_CATALOG[kind].label;
/** Core population curve; local population is living free colonists on this map. */
export const murderousRageWeight=(population:number):number=>Math.max(.1,Math.min(1,.1+(population-2)*.18));
