import {WORLD_RIVERS,type WorldRiverLink} from '../sim/world-rivers';
import type {GlobeVector,GlobePatch} from './planet-surface';
type Triple=readonly [GlobeVector,GlobeVector,GlobeVector];
interface RiverTile {id:number;center:GlobeVector;rivers:readonly WorldRiverLink[]}
const mix=(a:GlobeVector,b:GlobeVector,t:number):GlobeVector=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const same=(a:GlobeVector,b:GlobeVector)=>a[0]===b[0]&&a[1]===b[1]&&a[2]===b[2];
/** Original pastel ribbons from potential links and the actual shared edge.
 * No biome visibility filter here: inspection/local terrain use that separate
 * rule. No copied Core shader/mesh; buffers and pigments are our own presentation. */
export function prepareGlobeRivers(tiles:readonly RiverTile[],corners:(id:number)=>readonly GlobeVector[],radius:number):readonly [GlobePatch,GlobePatch] {
 const border=builder([91,143,165]),interior=builder([137,186,201]);
 function builder(pigment:readonly [number,number,number]){
  const positions:number[]=[],colors:number[]=[],indices:number[]=[];
  const vertex=(p:GlobeVector,alpha:number)=>{const index=positions.length/3;positions.push(p[0]/radius,p[1]/radius,p[2]/radius);colors.push(...pigment,alpha);return index;};
  function stripe(a:Triple,b:Triple,alphaA=255,alphaB=255){const first=positions.length/3;for(let i=0;i<3;i++)vertex(a[i]!,i===1?alphaA:0);for(let i=0;i<3;i++)vertex(b[i]!,i===1?alphaB:0);for(let i=0;i<2;i++)indices.push(first+i,first+i+1,first+i+3,first+i+1,first+i+4,first+i+3);}
  function fan(center:GlobeVector,ring:readonly GlobeVector[]){const c=vertex(center,255),first=positions.length/3;for(const p of ring)vertex(p,0);for(let i=0;i<ring.length;i++)indices.push(c,first+i,first+(i+1)%ring.length);}
  return {stripe,fan,finish:():GlobePatch=>({positions:Float32Array.from(positions),colors:Uint8Array.from(colors),indices:Uint32Array.from(indices)})};
 }
 for(const tile of tiles){
  if(!tile.rivers.length)continue;const ring=corners(tile.id),ports=tile.rivers.map(link=>{
   const other=tiles[link.neighbour];if(!other||other.id!==link.neighbour)throw Error('Lien de rivière sans voisin réel.');const adjacent=corners(other.id);let edge=-1;
   for(let i=0;i<ring.length;i++)if(adjacent.some(p=>same(p,ring[i]!))&&adjacent.some(p=>same(p,ring[(i+1)%ring.length]!))){edge=i;break;}
   if(edge<0)throw Error('La rivière ne trouve pas son arête commune.');return {edge,width:WORLD_RIVERS[link.river].widthWorld};
  });
  const center=tile.center;
  for(const [layer,subtract] of [[border,0],[interior,.2]] as const){
   const width=(p:typeof ports[number])=>Math.max(0,p.width-subtract),maximum=Math.max(...ports.map(width));if(maximum===0)continue;
   const port=(p:typeof ports[number]):Triple=>{const a=ring[p.edge]!,b=ring[(p.edge+1)%ring.length]!,w=width(p);return [mix(a,b,.5-w),mix(a,b,.5),mix(a,b,.5+w)];};
   if(ports.length===1){layer.stripe(port(ports[0]!),[center,center,center],255,0);continue;}
   const a=ports[0]!,b=ports[1]!,delta=Math.abs(a.edge-b.edge),opposite=ports.length===2&&delta>1&&delta<ring.length-1;
   if(opposite){const from=port(a),raw=port(b),to:Triple=[raw[2],raw[1],raw[0]];layer.stripe(from,to);
   }else{
    const junction=ring.map(p=>mix(center,p,maximum));layer.fan(center,junction);
    for(const p of ports){if(width(p)===0)continue;layer.stripe(port(p),[junction[p.edge]!,center,junction[(p.edge+1)%ring.length]!]);}
   }
  }
 }
 return [border.finish(),interior.finish()];
}
