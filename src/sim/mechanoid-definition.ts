/** Scyther 1.6.4871. Physical actor constants, independent of graphical bones. */
export const SCYTHER_DEFINITION=Object.freeze({
  mechKind:'scyther' as const,bodySize:1,healthScale:1.32,moveSpeed:4.7,mass:60,combatPower:150,
  armor:Object.freeze({sharp:.4,blunt:.2,heat:2}),
  bladeParts:Object.freeze(['scyther-left-blade','scyther-right-blade'] as const),headPart:'scyther-head' as const,
});
