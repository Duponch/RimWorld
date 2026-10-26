import type {World} from './types.ts';

/** Original local content; Electricity is already known at colony creation. */
export const FIREFOAM_CONTENT_290=Object.freeze({
 kind:'firefoam-popper' as const,researchPoints:600,
 ingredients:Object.freeze([Object.freeze({item:'steel' as const,quantity:75}),Object.freeze({item:'component' as const,quantity:1})]),
 coreWork:1500,work:150,minSkill:5,maxHp:50,flammability:1,beauty:-8,massGrams:10000,
 pathCostCore:30,detectRadius:3,effectRadius:9.9,useCore:100,
});
export const isFirefoamPopper290=(value:unknown):value is 'firefoam-popper'=>value==='firefoam-popper';
export const firefoamResearchUnlocked290=(world:Pick<World,'schemaVersion'|'research'>):boolean=>(Number(world.schemaVersion)===290||(Number(world.schemaVersion)===291||(Number(world.schemaVersion)===292||(Number(world.schemaVersion)===293||Number(world.schemaVersion)===294))))&&world.research?.firefoam?.completedAt!==undefined;
