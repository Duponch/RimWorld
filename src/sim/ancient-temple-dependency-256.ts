import type {WorldGenerationRandom} from './world-generation-random.ts';
export type AncientTempleDependency256='loot-artifacts'|'loot-misc'|'loot-luciferium'|'loot-namespace'|'ancient-friendly'|'ancient-incapped'|'ancient-half-eaten'|'ancient-hostile'|'slave'|'mech-sleep-lord'|'dormant-hives';
/** Diagnostic STOP of the whole private candidate, never a successful scatter
 * outcome. No World/original/prefix is returned to the caller in this error. */
export class AncientTempleDependencyError256 extends Error {
 readonly random:Readonly<{seed:number;counter:number}>;
 constructor(readonly producer:AncientTempleDependency256,reason:string,random:WorldGenerationRandom,readonly frontier:Readonly<{nextThingId:number;nextCasketGroupId:number;casketId?:number;count?:number;cell?:Readonly<{x:number;z:number}>;rect?:Readonly<{minX:number;minZ:number;maxX:number;maxZ:number}>}>){
  const where=frontier.cell?`${frontier.cell.x},${frontier.cell.z}`:frontier.rect?`${frontier.rect.minX},${frontier.rect.minZ}..${frontier.rect.maxX},${frontier.rect.maxZ}`:'unresolved';
  super(`Actual ScatterShrines750 blocked [${producer}] at ${where}, seed ${random.state.seed}, draw ${random.state.counter}: ${reason}`);this.name='AncientTempleDependencyError256';this.random=random.state;
 }
}
