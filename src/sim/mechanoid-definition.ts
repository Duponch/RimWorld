/** Core 1.6.4871 mechanical actor constants, independent of graphical bones. */
export type MechanoidKind='scyther'|'lancer'|'pikeman';
export const isMechanoidKind=(value:unknown):value is MechanoidKind=>value==='scyther'||value==='lancer'||value==='pikeman';
export const SCYTHER_DEFINITION=Object.freeze({
  mechKind:'scyther' as const,label:'Scyther',bodySize:1,healthScale:1.32,moveSpeed:4.7,mass:60,combatPower:150,
  armor:Object.freeze({sharp:.4,blunt:.2,heat:2}),
  bladeParts:Object.freeze(['scyther-left-blade','scyther-right-blade'] as const),headPart:'scyther-head' as const,
});
export const LANCER_DEFINITION=Object.freeze({
  mechKind:'lancer' as const,label:'Lancier',bodySize:1,healthScale:.72,moveSpeed:4.7,mass:60,combatPower:190,
  armor:SCYTHER_DEFINITION.armor,headPart:'lancer-head' as const,
});
export const PIKEMAN_DEFINITION=Object.freeze({
  mechKind:'pikeman' as const,label:'Piquier',bodySize:1,healthScale:.85,moveSpeed:2.5,mass:60,combatPower:110,
  armor:SCYTHER_DEFINITION.armor,headPart:'pikeman-head' as const,
});
export type MechanoidDefinition=typeof SCYTHER_DEFINITION|typeof LANCER_DEFINITION|typeof PIKEMAN_DEFINITION;
const DEFINITIONS=Object.freeze({scyther:SCYTHER_DEFINITION,lancer:LANCER_DEFINITION,pikeman:PIKEMAN_DEFINITION});
export const mechanoidDefinition=(kind:MechanoidKind):MechanoidDefinition=>DEFINITIONS[kind];
