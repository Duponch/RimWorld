import {backgroundWorkRefusal} from '../../src/sim/colonist-backgrounds';
import {medicalWorkRefusal} from '../../src/sim/health-rules';
import {releaseWork} from '../../src/sim/work-release';
import {setSnowDepth} from '../../src/sim/snow-surface';
import {outdoorTemperature} from '../../src/sim/temperature';
import {validateWorld,serializeWorld} from '../../src/sim/serialization';
import {generateStartingWorld,startingSiteChoices,resolveStartingSite} from '../../src/sim/starting-world';
import type {World,WorkType} from '../../src/sim/types';

/** Fixed seed, deterministic coldest accessible tundra tile; no retries/reroll. */
export function fixedTundraSite(){
  const seed=42,planet=generateStartingWorld(seed,2);
  const tile=startingSiteChoices(planet).filter(id=>id!==0&&planet.tiles[id]!.biome==='tundra')
    .sort((a,b)=>planet.tiles[a]!.meanTemperature-planet.tiles[b]!.meanTemperature||a-b)[0];
  if(tile===undefined)throw Error('Fixed globe42 has no selectable tundra');
  const choice={version:2 as const,seed,tile};return {choice,resolved:resolveStartingSite(choice)};
}
/** Explicitly PREPARED from the actual opened colony: cleared patch, stationary
 * rested people and pre-existing snow. No completed zone, work or shovel state.
 * Everything after import is a normal UI command and confirmed worker tick. */
export function prepareSnowScene(source:World){
  const w=structuredClone(source);
  if(w.site?.biome!=='tundra'||!w.snow||w.startingArrival?.phase!=='opened')throw Error('Expected opened real tundra colony');
  const worker=w.pawns.find(p=>!backgroundWorkRefusal(p,'clean')&&!medicalWorkRefusal(p));
  if(!worker)throw Error('Fixed party has no healthy cleaner');
  const center=w.scenario!.landing,target={x:center.x+3,z:center.z},from={x:center.x-5,z:center.z};
  const inside=(x:number,z:number)=>x>=center.x-7&&x<=center.x+7&&z>=center.z-5&&z<=center.z+5;
  w.resources=w.resources.filter(r=>!inside(r.x,r.z));
  w.piles=w.piles.filter(p=>!(p.kind==='chunk'&&p.owner.type==='ground'&&inside(p.owner.x,p.owner.z)));
  for(let z=center.z-5;z<=center.z+5;z++)for(let x=center.x-7;x<=center.x+7;x++)w.tiles[z*w.width+x]={terrain:'soil'};
  for(const [n,p] of w.pawns.entries()){
    if(!releaseWork(w,p))throw Error('Cannot release prepared actor without losing possessions');
    p.x=from.x;p.z=from.z+n;p.motion=null;p.moveCooldown=0;p.path=[];p.state='idle';p.planCooldown=0;p.needCooldown=0;
    p.hunger=100;p.rest=100;p.recreation.level=100;p.schedule.fill('work');
    for(const work of Object.keys(p.priorities) as WorkType[])p.priorities[work]=0;
  }
  worker.priorities.clean=1;delete w.snowClearArea;
  for(let z=center.z-5;z<=center.z+5;z++)for(let x=center.x-7;x<=center.x+7;x++)setSnowDepth(w,z*w.width+x,1);
  const errors=validateWorld(w);if(errors.length)throw Error('Prepared snow scene invalid: '+errors.join(' '));
  return {world:w,raw:serializeWorld(w),workerId:worker.id,target,index:target.z*w.width+target.x,outside:outdoorTemperature(w),from:{x:worker.x,z:worker.z}};
}
