import {hiveDoorFreePassage256} from './cave-hive-closewalk-256.ts';
import {captureActualLocalDistricts256} from './actual-local-districts-256.ts';
import {captureGeographicGenerationReachability256} from './geographic-generation-reachability-256.ts';
import {captureRandomClosewalk256} from './random-closewalk-256.ts';
import {drawCampSpawnCell256,stagedCampArrivalRandom256} from './camp-center-entry-256.ts';
import {blockedCells} from './pathfinding.ts';
import {footprintCells} from './definitions.ts';
import {carrierOf} from './rescue-state.ts';
import {kidnapCarrierOf261} from './caravan-kidnap-261.ts';
import {animalCarrier} from './animal-rest-state.ts';
import {foggedCell256} from './exploration-state-256.ts';
import {healthRandom} from './health.ts';
import type {World,Cell} from './types.ts';
/** Rare actual-map admission: PassDoors, never demolish barriers to create an
 * entry. The existing structure contract treats absent factionId as player. */
export function findTempAmbushEntry261(w:World,random:{rng:number}):Cell|undefined {
 const player=w.worldFactions!.playerFactionId,physical=captureActualLocalDistricts256(w),blocked=blockedCells(w,true),n=w.width*w.height,seen=new Uint8Array(n),queue=new Int32Array(n);let head=0,tail=0;
 const add=(i:number)=>{if(i>=0&&i<n&&!blocked[i]&&!seen[i]){seen[i]=1;queue[tail++]=i;}};
 for(const p of w.pawns)if(p.worldAffiliation259?.factionId===player&&p.state!=='dead'&&!carrierOf(w,p.id)&&!kidnapCarrierOf261(w,p.id))add(p.z*w.width+p.x);
 for(const a of w.wildlife?.animals??[])if(a.domestic&&a.state!=='dead'&&!animalCarrier(w,a.id))add(a.z*w.width+a.x);
 for(const s of w.structures)if(s.factionId===undefined||s.factionId===player)for(const c of footprintCells(s)){const i=c.z*w.width+c.x;for(const d of [-w.width,-1,1,w.width]){const j=i+d;if(j>=0&&j<n&&(Math.abs(d)!==1||Math.floor(j/w.width)===c.z))add(j);}}
 while(head<tail){const i=queue[head++]!,x=i%w.width;if(i>=w.width)add(i-w.width);if(x)add(i-1);if(x+1<w.width)add(i+1);if(i+w.width<n)add(i+w.width);}
 const valid=(i:number)=>seen[i]===1&&physical.standable(i),choose=(xs:readonly number[])=>xs.length?xs[Math.floor(healthRandom(random)*xs.length)]:undefined;
 if(healthRandom(random)<.2){const road=choose((w.roadInfo?.edgeCells??[]).filter(valid));if(road!==undefined)return {x:road%w.width,z:Math.floor(road/w.width)};}
 for(let k=0;k<100;k++){const vertical=healthRandom(random)<.5,low=healthRandom(random)<.5,i=vertical?Math.floor(healthRandom(random)*w.height)*w.width+(low?0:w.width-1):(low?0:(w.height-1)*w.width)+Math.floor(healthRandom(random)*w.width);if(valid(i))return {x:i%w.width,z:Math.floor(i/w.width)};}
 const edge:number[]=[];for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)if(!x||!z||x===w.width-1||z===w.height-1)edge.push(z*w.width+x);
 for(let i=edge.length-1;i>0;i--){const j=Math.floor(healthRandom(random)*(i+1));[edge[i],edge[j]]=[edge[j]!,edge[i]!];}
 const found=edge.find(valid);return found===undefined?undefined:{x:found%w.width,z:Math.floor(found/w.width)};
}
/** Same live closed-door capture and native SpawnCellNear stages as arrival;
 * no terrain edit/World alias. Prior original spawns reserve their real cell. */
export function tempAmbushCells261(w:World,entry:Cell,count:number,random:{rng:number}):Cell[] {
 const doors=new Map(w.structures.filter(s=>s.door).map(s=>[s.z*w.width+s.x,hiveDoorFreePassage256(w,s)])),reach=captureGeographicGenerationReachability256(w,doors),capture=captureRandomClosewalk256(w,reach),stream=stagedCampArrivalRandom256(random.rng);
 const used=new Set([...w.pawns,...w.wildlife?.animals??[],...w.mechanoids??[]].filter(a=>a.state!=='dead').map(a=>a.z*w.width+a.x)),cells:Cell[]=[];
 for(let i=0;i<count;i++){const at=drawCampSpawnCell256(capture,entry.z*w.width+entry.x,used,c=>foggedCell256(w,c),stream);used.add(at);cells.push({x:at%w.width,z:Math.floor(at/w.width)});}
 random.rng=stream.rng;return cells;
}
