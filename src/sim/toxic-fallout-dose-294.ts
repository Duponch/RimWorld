import {isCorePhysicalSchema297} from './physical-schema-297.ts';
import {CORE_ANIMAL_DATA_256} from './animal-core-data-v256.ts';
import {isAnimalSpecies256} from './animal-core-v256.ts';
import {isMechanoidKind} from './mechanoid-definition.ts';
import {isRoofed,roofIndex} from './roof-rules.ts';
import {getToxicFallout294,TOXIC_FALLOUT_DOSE_INTERVAL294} from './toxic-fallout-state-294.ts';
import {toxicResistance256} from './toxic-victim-256.ts';
import type {MedicalRandom,MedicalRecord} from './injury-types.ts';
import type {Pawn,World} from './types.ts';
import type {WildAnimal} from './wildlife-state.ts';

const f=Math.fround;
/** Captured only for a real outdoor segment containing a global dose boundary.
 * Civil Core bounds remain distinct from the record's suspended clinical age. */
export interface ToxicFalloutExposure294 {firstCore:number;lastCore:number;dose:number}

/** Cheap opportunity guard before an adapter reads carriers/geometry. */
export function toxicFalloutDue294(world:World,fromCivil=world.tick-1):boolean {
 const active=getToxicFallout294(world);if(!active)return false;
 const first=Math.max(fromCivil*10+1,active.startCore),last=Math.min(world.tick*10,active.endCore);
 return Math.ceil(first/TOXIC_FALLOUT_DOSE_INTERVAL294)*TOXIC_FALLOUT_DOSE_INTERVAL294<=last;
}

/** The native factor is seeded by Thing identity. Our explicit adaptation uses
 * the existing product actor ID and a pure xorshift mix, not Unity Rand's
 * generator. It is stable across transfers/reload and consumes no World RNG. */
export function toxicFalloutIdentityFactor294(id:number):number {
 if(!Number.isSafeInteger(id)||id<1)throw Error('Invalid actual fallout identity');
 let n=(id^0x46edc5d)>>>0;n^=n<<13;n^=n>>>17;n^=n<<5;
 return f(f(.85)+f(f(.3)*f((n>>>0)/0x100000000)));
}

/** Both native resistance factors apply; body size and faction do not. */
export function toxicFalloutDose294(id:number,resistance:number,environmentResistance:number):number {
 if(!Number.isFinite(resistance)||!Number.isFinite(environmentResistance))throw Error('Invalid actual fallout resistance');
 let dose=f(.023006668);
 dose=f(dose*Math.max(f(1-f(resistance)),0));
 dose=f(dose*Math.max(f(1-f(environmentResistance)),0));
 return dose===0?0:f(dose*toxicFalloutIdentityFactor294(id));
}

/** Prospective representation at the first actual positive environmental dose,
 * not construction, migration, inspection or a past mental episode. Native
 * humans already have this mind; historical literal product humans may not.
 * Only the existing wander authority is added inside the staged Pawn outcome.
 * No existing mind state is reset and no random draw or memory is created. */
export function adoptFalloutClinicalMind294(pawn:Pawn,version:number,exposure:ToxicFalloutExposure294):void {
 if((version!==294&&(version!==295&&(version!==296&&!isCorePhysicalSchema297(version))))||!(exposure.dose>0)||pawn.mental&&Object.hasOwn(pawn.mental,'wander'))return;
 const mental=pawn.mental??={below:[0,0,0],cooldown:0,catharsis:[]};
 mental.wander={revision:1,nextMoveOrderIsWait:false};
}

/** No geometry, allocation or clinical record is required on ordinary steps.
 * The adapter supplies the actual spawned owner; containers/caravans never
 * become map victims through a held position or an origin-map projection. */
export function toxicFalloutExposure294(world:World,actor:Pawn|WildAnimal,spawned:boolean,fromCivil:number):ToxicFalloutExposure294|undefined {
 const active=getToxicFallout294(world);
 if(!active||!spawned||actor.state==='dead'||actor.health?.death)return;
 if(!Number.isSafeInteger(fromCivil)||fromCivil<0||fromCivil>world.tick||!Number.isSafeInteger(world.tick*10))throw Error('Invalid actual fallout civil interval');
 if('species'in actor)fromCivil=Math.max(fromCivil,world.tick-actor.ageTicks);
 // A delayed dossier can evolve its existing illnesses, but today's physical
 // roof/owner cannot establish exposure during an unobserved earlier segment.
 const firstCore=Math.ceil(Math.max(fromCivil*10+1,(world.tick-1)*10+1,active.startCore)/TOXIC_FALLOUT_DOSE_INTERVAL294)*TOXIC_FALLOUT_DOSE_INTERVAL294;
 const lastCore=Math.floor(Math.min(world.tick*10,active.endCore)/TOXIC_FALLOUT_DOSE_INTERVAL294)*TOXIC_FALLOUT_DOSE_INTERVAL294;
 if(firstCore>lastCore)return;
 const physical=actor.motion&&actor.motion.end>world.tick?actor.motion.from:actor;
 if(isRoofed(world,roofIndex(world,physical)))return;
 const environmentResistance='species'in actor&&isAnimalSpecies256(actor.species)?CORE_ANIMAL_DATA_256[actor.species].stats.ToxicEnvironmentResistance:0;
 // Current represented human apparel adds neither stat. No unimplemented
 // mask, DLC gene or implant is inferred from a clothing slot or label.
 const dose=toxicFalloutDose294(actor.id,toxicResistance256(actor),environmentResistance);
 if(dose===0)return;
 return {firstCore,lastCore,dose};
}

/** HealthUtility.AdjustSeverity creates a hediff only for a positive dose.
 * Creation consumes PostMake's noPain draw once; later doses do not reroll it.
 * Caller owns the staged record/PRNG and the terminal toxic-corpse decision. */
export function applyToxicFalloutDose294(record:MedicalRecord,dose:number,random:MedicalRandom):void {
 if(!Number.isFinite(dose)||dose<0||f(dose)!==dose)throw Error('Invalid actual fallout dose');
 if(dose===0||record.death||isMechanoidKind(record.body))return;
 const old=record.toxicBuildup,severity=f(f(old?.severity??0)+dose);
 if(!Number.isFinite(severity))throw Error('Toxic severity exhausted');
 if(!old){const noPain=random();if(!Number.isFinite(noPain)||noPain<0||noPain>=1)throw Error('Invalid hediff creation draw');}
 if(old)old.severity=severity;else record.toxicBuildup={severity,bornAt:record.tick};
}
