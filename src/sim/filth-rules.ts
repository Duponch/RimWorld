import type { Cell,World } from './types.ts';

export const FILTH_KINDS=['dirt','trash','blood','ash','vomit','corpse-bile'] as const;
export type FilthKind=typeof FILTH_KINDS[number];
export interface FilthRecord extends Cell {
  id:number;kind:FilthKind;thickness:number;grownCore:number;expiresAfterCore:number;nextCheckCore:number;
}
export interface FilthFeet {lastTerrain?:'dirt';carried:{kind:FilthKind;thickness:number}[]}
export interface FilthState {rng:number;items:FilthRecord[];cleaned:number}
export const FILTH_DEFINITIONS:Readonly<Record<FilthKind,{label:string;cleanliness:number;work:number;minDays:number;maxDays:number;rain:boolean}>>=Object.freeze({
  dirt:{label:'Terre',cleanliness:-5,work:35,minDays:45,maxDays:50,rain:true},
  trash:{label:'Déchets',cleanliness:-5,work:35,minDays:45,maxDays:50,rain:false},
  blood:{label:'Sang',cleanliness:-10,work:70,minDays:35,maxDays:40,rain:true},
  ash:{label:'Cendres',cleanliness:-15,work:70,minDays:10,maxDays:15,rain:false},
  vomit:{label:'Vomi',cleanliness:-15,work:70,minDays:35,maxDays:40,rain:true},
  'corpse-bile':{label:'Bile de dépouille',cleanliness:-20,work:80,minDays:35,maxDays:40,rain:true},
});
export const isFilthKind=(v:unknown):v is FilthKind=>typeof v==='string'&&(FILTH_KINDS as readonly string[]).includes(v);
export function ensureFilth(w:World):FilthState {return w.filth??={rng:((w.seed^0x357ddacf)>>>0)||1,items:[],cleaned:0};}
export function filthRandom(s:FilthState):number {let n=s.rng;n^=n<<13;n^=n>>>17;n^=n<<5;s.rng=n>>>0;return s.rng/4294967296;}
/** Same map-fraction cadence, deterministic cell phases rather than Unity's
 * shuffled whole-map sweep. No board traversal is needed while no filth exists. */
export const filthCheckPeriod=(w:Pick<World,'width'|'height'>):number=>Math.ceil(w.width*w.height/Math.ceil(w.width*w.height*.0006));
