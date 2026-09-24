import { createHash } from 'node:crypto';
import { researchLoad } from '../tests/scenarios/research-load.ts';
import { habitatApparelLoad } from '../tests/scenarios/habitat-apparel-load.ts';
import { serializeWorld,stepWorld,validateWorld } from '../src/sim/index.ts';

// Short deterministic mixed-activity replay, independent of timing measurements.
const count=Number(process.argv[2]??3),ticks=Number(process.argv[3]??40),stride=Number(process.argv[4]??1);
const habitat=process.env.HABITAT==='1',world=habitat?habitatApparelLoad(count):researchLoad(count),hashes:string[]=[];
for(let i=0;i<=ticks;i++){
  if(i%stride===0){const saved=serializeWorld(world);hashes.push(createHash('sha256').update(saved).digest('hex'));}
  if(i<ticks)stepWorld(world);
}
const errors=validateWorld(world);if(errors.length)throw Error(errors.join('; '));
console.log(JSON.stringify({scenario:`${habitat?'habitat-apparel':'research'}/${count}`,ticks,stride,hashes,rng:world.rng}));
