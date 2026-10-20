import {isSchema263OrLater} from '../sim/schema-compatibility-257.ts';
import {draftSiteManhunterRoster263} from './caravan-manhunter-261.ts';
import {prepareManhunterSpawn261} from './animal-scaria-261.ts';
import {captureGeographicGenerationReachability256} from './geographic-generation-reachability-256.ts';
import {captureRandomClosewalk256,tryRandomClosewalkCellNear256} from './random-closewalk-256.ts';
import {findLocalCentralCell256} from './local-cell-selection-256.ts';
import {foggedCell256} from './exploration-state-256.ts';
import {MAX_WILDLIFE} from './wildlife-state.ts';
import type {World} from './types.ts';
import type {ItemStash263} from './world-sites-state-263.ts';
import type {AncientRect256} from './local-ancient-placement-256.ts';
import type {WorldGenerationRandom} from './world-generation-random.ts';

export const SITE_MANHUNTER_SEED_PART_263=457293335;
/** Native Site1600 distinct from the travelling incident. Actual central
 * standable, unfogged, edge-reachable room>=225, outside UsedRects. The current
 * roster remains the declared provisional animal producer, without rerolls. */
export function constructDirectSiteManhunters263(w:World,site:ItemStash263,_storage:AncientRect256,usedRects:AncientRect256[],random:WorldGenerationRandom):void {
 if(!isSchema263OrLater(Number(w.schemaVersion))||site.threat.kind!=='manhunters'||w.site?.revision!==3||w.site.tileId!==site.tile||!w.wildlife)throw Error('Actual Site manhunter generation required');
 const reach=captureGeographicGenerationReachability256(w),capture=captureRandomClosewalk256(w,reach),outside=(c:number)=>{const x=c%w.width,z=Math.floor(c/w.width);return !usedRects.some(r=>x>=r.minX&&x<=r.maxX&&z>=r.minZ&&z<=r.maxZ);};
 const root=findLocalCentralCell256({width:w.width,height:w.height,tightness:2,minimumDistrictCells:225,invalidOnFailure:true,readers:{standable:c=>reach.physical.standable(c),district:c=>reach.physical.district(c),extra:c=>outside(c)&&!foggedCell256(w,c)&&reach.canReachMapEdgeNoPassClosedDoorsOrWater(c)}},random);
 if(root===null)return;
 const roster=draftSiteManhunterRoster263(w,site.tile,site.threat.points,(random.integerValue()>>>0)||1);if(!roster)return;
 if(w.wildlife.animals.length+roster.animals.length>MAX_WILDLIFE)throw Error('Actual Site manhunter capacity exceeded');
 const occupied=new Set([...w.pawns,...w.wildlife.animals,...w.mechanoids??[]].filter(p=>p.state!=='dead').map(p=>p.z*w.width+p.x)),animals=[];
 for(const original of roster.animals){
  const c=tryRandomClosewalkCellNear256(capture,root,10,random,c=>outside(c)&&!occupied.has(c));if(c===null)throw Error('Actual Site manhunter spawn cell unavailable');
  original.x=c%w.width;original.z=Math.floor(c/w.width);occupied.add(c);
  const animal=prepareManhunterSpawn261(w,original);if(!animal)throw Error('Actual Site manhunter Scaria admission refused');animals.push(animal);
 }
 // Private candidate only: the ordinary adoption replaces selected old fauna
 // by their originals and keeps these genuinely new post1200 owners.
 w.nextId=roster.nextId;w.wildlife.animals.push(...animals);
}
