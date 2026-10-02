import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/index.ts';
import { newWeatherState } from '../src/sim/weather.ts';
import { ensureFireState } from '../src/sim/fire-rules.ts';

// A deliberately prepared, strictly validated rendering fixture, not a
// natural colony campaign. The historical input stays byte-identical.
const raw=JSON.parse(readFileSync('public/test-saves/v98/mixed-100.json','utf8'));
const world=deserializeWorld(gunzipSync(Buffer.from(raw.payload,'base64')).toString('utf8'));
world.weather=newWeatherState(world.seed,world.tick);
world.weather.current=world.weather.previous='rainy-thunderstorm';
world.weather.ageCore=4000;world.weather.durationCore=20000;
const state=ensureFireState(world),focus=world.pawns[0]!;
const cx=Math.max(4,Math.min(world.width-5,Math.round(focus.x))),cz=Math.max(4,Math.min(world.height-5,Math.round(focus.z)));
for(let i=0;i<64;i++){
  const x=cx-4+i%8,z=cz-4+Math.floor(i/8);
  if(state.items.some(f=>f.x===x&&f.z===z&&f.attachedPawnId===undefined&&f.attachedAnimalId===undefined))continue;
  state.items.push({id:world.nextId++,x,z,size:1.75,bornCore:world.tick*10,nextPulseCore:world.tick*10+15,complexCore:0,spreadCore:0});
  state.ledger.ignitions++;
}
const errors=validateWorld(world);if(errors.length)throw new Error(errors.join(' '));
mkdirSync('tmp/v185',{recursive:true});
writeFileSync('tmp/v185/performance-world.json',serializeWorld(world));
console.log(JSON.stringify({prepared:true,schema:world.schemaVersion,size:[world.width,world.height],fires:state.items.length,pawns:world.pawns.length,animals:world.wildlife?.animals.length,focus:{x:focus.x,z:focus.z}}));
