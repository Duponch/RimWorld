import {planetTiles} from './planet-geography-256.ts';
import {WORLD_FACTION_DEFINITIONS_256,worldRelationKind256} from './world-faction-catalog.ts';
import type {WorldSurfaceTile} from './world-surface-geography.ts';
import type {WorldFactionSettlement256,WorldFactionRegistry256} from './world-faction-state.ts';
import type {WorldEvent} from './types.ts';
import type {CampaignState} from './world-map-state.ts';

type ProximityTile263=Pick<WorldSurfaceTile,'id'|'biome'|'hilliness'|'neighbours'>;
export interface SettlementProximityOffset263 {settlementId:number;factionId:number;name:string;distance:number;goodwill:number}
const passable=(t:ProximityTile263|undefined)=>!!t&&t.biome!=='ocean'&&t.biome!=='lake'&&t.hilliness!=='impassable';
/** Five land edges at most. One tiny breadth-first capture for a deliberate
 * confirmation or the real quadrum boundary, never a snapshot/frame scan. */
export function settlementProximityOffsets263(tiles:readonly ProximityTile263[],tile:number,settlements:readonly Pick<WorldFactionSettlement256,'id'|'factionId'|'tile'|'name'>[],excluded:ReadonlySet<number>=new Set()):SettlementProximityOffset263[] {
 if(!passable(tiles[tile]))return [];
 const distance=new Map<number,number>([[tile,0]]),queue=[tile];
 for(let at=0;at<queue.length;at++){const id=queue[at]!,d=distance.get(id)!;if(d>=5)continue;for(const next of tiles[id]!.neighbours)if(!distance.has(next)&&passable(tiles[next])){distance.set(next,d+1);queue.push(next);}}
 const offsets:SettlementProximityOffset263[]=[];
 for(const s of settlements){const d=distance.get(s.tile);if(s.tile===tile||excluded.has(s.factionId)||d===undefined||d>=5)continue;
  offsets.push({settlementId:s.id,factionId:s.factionId,name:s.name,distance:d,goodwill:d<=2?-30:d===3?-20:-10});
 }
 return offsets.sort((a,b)=>a.factionId-b.factionId||Math.abs(b.goodwill)-Math.abs(a.goodwill));
}
export function settlementProximityWarning263(view:Pick<CampaignState,'schemaVersion'|'planet'|'worldFactions'>,tile:number):SettlementProximityOffset263[] {
 const f=view.worldFactions;if(Number(view.schemaVersion)!==263||view.planet?.revision!==3||!f)return [];
 const excluded=new Set(f.factions.filter(x=>x.id===f.playerFactionId||WORLD_FACTION_DEFINITIONS_256[x.def].permanentEnemy).map(x=>x.id));
 return settlementProximityOffsets263(planetTiles(view.planet),tile,f.settlements,excluded);
}
const writable=(o:object,k:string)=>{const d=Object.getOwnPropertyDescriptor(o,k);return !!d&&Object.hasOwn(d,'value')&&d.writable===true;};
/** Actual game ticks only, no saved timer, bootstrap, UI or catch-up. Existing
 * colonies count even when empty; caravans and retired maps never count. */
export function advanceSettlementProximity263(root:CampaignState):void {
 const f=root.worldFactions,maps=root.worldMaps,groups=root.worldGroups;
 if(Number(root.schemaVersion)!==263||!root.tick||root.tick%90000!==0||root.planet?.revision!==3||!f||!maps||!groups)return;
 const excluded=new Set(f.factions.filter(x=>x.id===f.playerFactionId||f.relations.some(r=>r.aId===Math.min(x.id,f.playerFactionId)&&r.bId===Math.max(x.id,f.playerFactionId)&&r.goodwill===-100)).map(x=>x.id));
 const tiles=planetTiles(root.planet),offsets:SettlementProximityOffset263[]=[];
 for(const home of maps.sites)if(home.kind==='settlement'&&home.tile!==null)offsets.push(...settlementProximityOffsets263(tiles,home.tile,f.settlements,excluded));
 applySettlementProximity263(f,offsets,groups.events,root.tick);
}
/** Narrow diplomacy responsibility; callers provide offsets from the actual
 * bounded land graph, not a count of invented settlements or people. */
export function applySettlementProximity263(f:Pick<WorldFactionRegistry256,'playerFactionId'|'relations'|'factions'>,offsets:readonly SettlementProximityOffset263[],events:WorldEvent[],tick:number):void {
 const totals=new Map<number,number>();for(const o of offsets)totals.set(o.factionId,(totals.get(o.factionId)??0)+o.goodwill);
 const changes=[...totals].flatMap(([id,amount])=>{const row=f.relations.find(r=>r.aId===Math.min(id,f.playerFactionId)&&r.bId===Math.max(id,f.playerFactionId));if(!row)return [];const goodwill=Math.max(-100,row.goodwill+amount);return goodwill===row.goodwill?[]:[{row,goodwill,kind:worldRelationKind256(goodwill),id,amount}];});
 if(!changes.length)return;
 if(!changes.every(c=>writable(c.row,'goodwill')&&writable(c.row,'kind'))||!Array.isArray(events)||!Object.isExtensible(events)||Reflect.ownKeys(events).some(k=>!writable(events,String(k))||k!=='length'&&Object.getOwnPropertyDescriptor(events,k)?.configurable!==true))throw Error('Actual settlement proximity recipients are immutable');
 for(const c of changes){c.row.goodwill=c.goodwill;c.row.kind=c.kind;}
 events.push({tick,type:'command',message:'La proximité des colonies affecte les relations : '+changes.map(c=>`${f.factions.find(x=>x.id===c.id)!.name} ${c.amount}`).join(', ')+'.'});
 if(events.length>80)events.splice(0,events.length-80);
}
