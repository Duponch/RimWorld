/** Core1.6.4871rev590 physical facts and original ship-part implementation. */
export type ShipOrientation276=0|1|2|3;
export interface ShipCell276 {readonly x:number;readonly z:number}
export const SHIP_ADDED_KINDS_276=Object.freeze(['ship-beam','ship-engine'] as const);
export type ShipAddedKind276=typeof SHIP_ADDED_KINDS_276[number];
export const SHIP_PART_KINDS_276=Object.freeze(['ship-reactor',...SHIP_ADDED_KINDS_276] as const);
export type ShipPartKind276=typeof SHIP_PART_KINDS_276[number];
export const isShipAddedKind276=(value:unknown):value is ShipAddedKind276=>value==='ship-beam'||value==='ship-engine';
export const isShipPartKind276=(value:unknown):value is ShipPartKind276=>value==='ship-reactor'||isShipAddedKind276(value);
export const isShipOrientation276=(value:unknown):value is ShipOrientation276=>value===0||value===1||value===2||value===3;

const common=Object.freeze({support:'Heavy' as const,rotatable:true,blocksMovement:true,blocksLight:true,blocksWind:true,fill:1,
 roof:false,quality:false,minifiable:false,fuel:false,flick:false,breakdown:false,flammability:0,transmitsPower:true,
 powerWatts:0,powerRole:'transmitter' as const,leavesResourcesWhenKilled:true});
export const SHIP_BEAM_CONTENT_276=Object.freeze({
 kind:'ship-beam' as const,label:'Poutre structurelle de vaisseau',nativeDef:'Ship_Beam',
 researchProject:'ship-basics' as const,width:2,depth:6,defaultOrientation:0 as ShipOrientation276,
 constructionSkill:5,maxHitPoints:400,work:800,coreWork:8000,...common,
 ingredients:Object.freeze([
  Object.freeze({item:'steel' as const,quantity:200}),Object.freeze({item:'plasteel' as const,quantity:40}),
  Object.freeze({item:'component' as const,quantity:3}),Object.freeze({item:'advanced-component' as const,quantity:1}),
 ]),
});
export const SHIP_ENGINE_CONTENT_276=Object.freeze({
 kind:'ship-engine' as const,label:'Moteur Johnson–Tanaka',nativeDef:'Ship_Engine',
 researchProject:'ship-engine' as const,width:3,depth:4,defaultOrientation:0 as ShipOrientation276,
 constructionSkill:8,maxHitPoints:400,work:5000,coreWork:50000,...common,
 ingredients:Object.freeze([
  Object.freeze({item:'steel' as const,quantity:260}),Object.freeze({item:'plasteel' as const,quantity:140}),
  Object.freeze({item:'uranium' as const,quantity:70}),Object.freeze({item:'advanced-component' as const,quantity:6}),
 ]),
});
export const SHIP_ADDED_CONTENT_276=Object.freeze({'ship-beam':SHIP_BEAM_CONTENT_276,'ship-engine':SHIP_ENGINE_CONTENT_276});
export const SHIP_PART_DEFAULT_ORIENTATION_276:Readonly<Record<ShipPartKind276,ShipOrientation276>>=Object.freeze({
 'ship-reactor':1,'ship-beam':0,'ship-engine':0,
});

/** Requirement identifiers are report rows, not fictitious buildable kinds. */
export const SHIP_REQUIREMENTS_276=Object.freeze([
 Object.freeze({id:'beam' as const,label:'Poutre structurelle',required:1}),
 Object.freeze({id:'engine' as const,label:'Moteurs Johnson–Tanaka',required:3}),
 Object.freeze({id:'reactor' as const,label:'Réacteur stellaire',required:1}),
 Object.freeze({id:'computer' as const,label:'Ordinateur de vaisseau',required:1}),
 Object.freeze({id:'sensors' as const,label:'Ensemble de capteurs',required:1}),
 Object.freeze({id:'casket' as const,label:'Caisson spatial',required:1}),
]);
export type ShipRequirementId276=typeof SHIP_REQUIREMENTS_276[number]['id'];
