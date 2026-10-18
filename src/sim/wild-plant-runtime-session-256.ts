import type {World} from './types.ts';
import type {WildPlantMapReader256} from './wild-plant-runtime-256.ts';
import type {createWildPlantSpawner256} from './wild-plant-spawner-256.ts';

type Factory256=(world:World,density:number,desired:number)=>ReturnType<typeof createWildPlantSpawner256>;
const factories=new WeakMap<WildPlantMapReader256,{factory:Factory256;density:WildPlantMapReader256['densityFactor'];cell:WildPlantMapReader256['cell'];capture:WildPlantMapReader256['capture']}>();
/** Only the actual-map composition opts in. Copies, public/custom readers,
 * and even a subsequently replaced method keep the complete cold boundary. */
export function registerActualPlantRuntimeSession256(reader:WildPlantMapReader256,factory:Factory256):void {
 factories.set(reader,{factory,density:reader.densityFactor,cell:reader.cell,capture:reader.capture});
}
export function actualPlantRuntimeSessionFactory256(reader:WildPlantMapReader256):Factory256|undefined {
 const entry=factories.get(reader);return entry&&entry.density===reader.densityFactor&&entry.cell===reader.cell&&entry.capture===reader.capture?entry.factory:undefined;
}
