import {localWorldGroups} from './world-map-context.ts';
import type { World } from './types.ts';

/** Group intentions compete with every ordinary map pickup, including the carrier's needs. */
export function groupReservedQuantities(w:World):ReadonlyMap<number,number> {
  const result=new Map<number,number>();for(const g of w.worldMaps||w.campaignMap?.revision===2?localWorldGroups(w).map(r=>r.state):w.group?[w.group]:[]){
  if(g&&'manifest' in g&&(g.phase==='gathering'||g.phase==='loading'))for(let i=g.cursor;i<g.manifest.length;i++){
    const line=g.manifest[i]!;result.set(line.pileId,(result.get(line.pileId)??0)+line.quantity);
  }
  }return result;
}
export function groupReservedQuantity(w:World,pileId:number):number {
  let n=0;for(const g of w.worldMaps?localWorldGroups(w).map(r=>r.state):w.group?[w.group]:[]){
  if(g&&'manifest' in g&&(g.phase==='gathering'||g.phase==='loading'))for(let i=g.cursor;i<g.manifest.length;i++)if(g.manifest[i]!.pileId===pileId)n+=g.manifest[i]!.quantity;
  }return n;
}
