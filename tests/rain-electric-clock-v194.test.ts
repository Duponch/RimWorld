import { expect,test } from 'vitest';
import { createWorld } from '../src/sim/engine.ts';
import { newWeatherState } from '../src/sim/weather.ts';
import { adoptRainElectrical,advanceRainElectrical } from '../src/sim/rain-electric.ts';
import { validRainElectrical } from '../src/sim/rain-electric-save.ts';

test('due opportunities and strict history stay exact near the safe Core clock limit',()=>{
  const world=createWorld(42,32,32);
  world.tick=Math.floor(Number.MAX_SAFE_INTEGER/10)-25;
  world.structures=[];world.weather=newWeatherState(world.seed,world.tick);adoptRainElectrical(world);
  let oracle=world.rainElectrical!.rng;
  const due:number[]=[];
  for(let tick=0;tick<25;tick++){
    world.tick++;world.weather.lastCoreTick=world.tick*10;
    for(let offset=9;offset>=0;offset--){
      const core=world.tick*10-offset;if(core%97!==0)continue;
      due.push(core);
      oracle=(oracle^((oracle*8192)>>>0))>>>0;
      oracle=(oracle^Math.floor(oracle/131072))>>>0;
      oracle=(oracle^((oracle*32)>>>0))>>>0;
    }
    advanceRainElectrical(world);
    expect(world.rainElectrical!.rng).toBe(oracle);
    expect(validRainElectrical(world.rainElectrical,181,world)).toBe(true);
  }
  expect(due.length).toBeGreaterThan(1);
  const historical={...world.rainElectrical!,discharges:due.length,
    lastDischarge:{coreTick:due.at(-1)!,structureId:1,kind:'battery' as const,x:10,z:10}};
  expect(validRainElectrical(historical,181,world)).toBe(true);
  expect(validRainElectrical({...historical,discharges:due.length+1},181,world)).toBe(false);
});
