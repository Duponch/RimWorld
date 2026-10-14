/** Exact contained-Resource guard shared by save and snapshot adapter. */
import type {Resource,World} from './types.ts';
import {validPlantGrowthLight} from './plant-light-save.ts';
import {validPlantThermalFactor} from './thermal-plants.ts';
import {validCropBlight} from './plant-blight-save.ts';
import {validStoneIdentity} from './geology.ts';
import {extractTreeDefinition} from './tree-transfer-rules.ts';
import {validPausedTreeLife} from './tree-transfer-clock.ts';
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min:number,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
/** Inner coordinates are provenance only. Caller never adds them to map occupancy. */
export function validOriginalTreeResource(raw:unknown,world:Pick<World,'width'|'height'|'nextId'|'climate'>,version:number,clock:number):boolean {
  if(!record(raw)||!Object.keys(raw).every(k=>['id','kind','amount','x','z','species','plantLife','damage','growth','growthTick','growthThermalFactor','growthLight','stone','blight'].includes(k))||
    !integer(raw.id,1,world.nextId-1)||raw.kind!=='tree'||!integer(raw.amount,1,1000000)||
    !integer(raw.x,0,world.width-1)||!integer(raw.z,0,world.height-1))return false;
  const resource=raw as unknown as Resource,definition=extractTreeDefinition(resource);if(!definition)return false;
  if(raw.damage!==undefined&&!integer(raw.damage,1,definition.maxHP-1))return false;
  if(!validStoneIdentity(raw.stone,raw.kind,version)||!validCropBlight(raw,version,{tick:clock})||!validPlantThermalFactor(raw,version)||
    !validPlantGrowthLight(resource,version,clock)||!validPausedTreeLife(resource,version,{tick:clock,climate:world.climate}))return false;
  if(raw.growth!==undefined||raw.growthTick!==undefined){
    if(raw.species===undefined||typeof raw.growth!=='number'||!Number.isFinite(raw.growth)||raw.growth<0||raw.growth>1||
      !integer(raw.growthTick,0,clock))return false;
  }
  // Known legacy optional undefined values retain their old Resource semantics;
  // the new outer innerResource/plantPack markers are never optional undefined.
  return true;
}