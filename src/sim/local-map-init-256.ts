/** Core4871 Base_Player, Core-only, successful ConstructComponents path.
 * Generation owns its private stream. The actual GasGrid constructor consumes
 * one Range draw and retains its diffusion index before mutator.Init begins.
 * No guessed skip count or game RNG is used. Constructor metadata review and
 * isolated managed witnesses are private references, not a full-map result. */
import {WorldGenerationRandom} from './world-generation-random.ts';
import type {LocalCompositionInputs256} from './local-composition-256.ts';

export function localMapInit256(mapSeed:number,width:number,height:number):LocalCompositionInputs256['init']&{readonly gasDiffusionCycleIndex:number} {
 if(!Number.isSafeInteger(width)||width<8||width>400||!Number.isSafeInteger(height)||height<8||height>400)throw Error('Invalid actual local initialization dimensions');
 const random=new WorldGenerationRandom(mapSeed);
 const gasDiffusionCycleIndex=random.integer(0,Math.floor(width*height/2));
 return {random,gasDiffusionCycleIndex,provenance:{revision:1,mapSeed,...random.state,source:'Core4871 Core-only successful Base_Player component path; actual GasGrid diffusion index draw'}};
}
