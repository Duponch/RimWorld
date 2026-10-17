/** Original scalar transcription of the Core4871 no-DLC temple loot table.
 * XML order is data, NOT execution order: Sum shuffles all six options. */
export const ANCIENT_TEMPLE_LOOT_OPTIONS_256=Object.freeze([
 Object.freeze({kind:'artifacts' as const,chance:Math.fround(.7)}),
 Object.freeze({kind:'misc' as const,chance:Math.fround(.5)}),
 Object.freeze({kind:'techprints' as const,chance:Math.fround(.5)}),
 Object.freeze({kind:'luciferium' as const,chance:Math.fround(.35)}),
 Object.freeze({kind:'advanced-components' as const,chance:Math.fround(.35)}),
 Object.freeze({kind:'ultratech-medicine' as const,chance:Math.fround(.35)}),
]);
export type AncientTempleLootOption256=typeof ANCIENT_TEMPLE_LOOT_OPTIONS_256[number]['kind'];
/** These are alternative outcomes, never aliases to currently delivered gear. */
export const ANCIENT_TEMPLE_MISC_DEFS_256=Object.freeze([
 'Apparel_PowerArmor','Apparel_PowerArmorHelmet','Gun_ChargeRifle','Gun_ChargeLance','Gun_AssaultRifle',
 'TechprofSubpersonaCore','ArchotechEye','ArchotechArm','ArchotechLeg','PowerClaw','BionicEye','BionicArm',
 'BionicLeg','BionicSpine','BionicHeart','Joywire','Painstopper','Shell_AntigrainWarhead','MechSerumHealer',
 'MechSerumResurrector','FlatscreenTelevision','MegascreenTelevision','SculptureGrand',
]);
export const ANCIENT_TEMPLE_MISC_TAGS_256=Object.freeze(['SingleUseWeapon','SkillNeurotrainer']);
/** BaseMarketValue of these actual single-Def, no-Stuff, no-quality branches. */
export const ANCIENT_TEMPLE_SUPPORTED_LOOT_256=Object.freeze({
 'advanced-components':Object.freeze({defId:'ComponentSpacer',item:'advanced-component' as const,min:1,max:4,marketValue:200}),
 'ultratech-medicine':Object.freeze({defId:'MedicineUltratech',item:'glitterworld-medicine' as const,min:2,max:8,marketValue:50}),
});
