import {healthRandom} from './health.ts';
import {planetGeography256} from './planet-geography-256.ts';
import {worldBiomeCanSettle} from './world-biome-properties.ts';
import {WORLD_FACTION_DEFINITIONS_256} from './world-faction-catalog.ts';
import {worldNaturalGoodwill274} from './world-diplomacy-274.ts';
import {registeredMap} from './world-map-context.ts';
import {currentPrisoner259} from './world-affiliation-259.ts';
import {caravanMapAllowed261} from './caravan-incidents-261.ts';
import type {CampaignState} from './world-map-state.ts';
import type {PeaceTalksSite293} from './peace-talks-state-293.ts';

const no=(reason:string)=>({ok:false as const,reason});
const writable=(v:object,key:string)=>Object.getOwnPropertyDescriptor(v,key)?.writable===true;
/** The existing geographic surface, not a generated negotiation map. Distance
 * is reachable graph steps5..13; reservations and retired markers stay real. */
function candidateTiles(root:CampaignState,homeTile:number):number[] {
 if(root.planet?.revision!==3)return [];
 const tiles=planetGeography256(root.planet).surface.tiles,distances=new Int16Array(tiles.length).fill(-1),queue=[homeTile],candidates:number[]=[];
 if(!tiles[homeTile])return [];
 const occupied=new Set([...root.worldMaps!.sites.map(s=>s.tile),...root.worldFactions!.settlements.map(s=>s.tile),...root.worldSites263!.entries.filter(s=>!('closed'in s)||!s.closed).map(s=>s.tile),...root.worldMaps!.retired.filter(s=>s.markerUntilCore!==undefined&&s.markerUntilCore>root.tick*10).map(s=>s.tile)]);
 distances[homeTile]=0;
 for(let head=0;head<queue.length;head++){const id=queue[head]!,d=distances[id]!,tile=tiles[id]!;
  if(d>=5&&!occupied.has(id)&&worldBiomeCanSettle(tile.biome)&&tile.hilliness!=='impassable'&&caravanMapAllowed261(root,id))candidates.push(id);
  if(d===13)continue;
  for(const next of tile.neighbours){const t=tiles[next]!;if(distances[next]!==-1||!worldBiomeCanSettle(t.biome)||t.hilliness==='impassable')continue;distances[next]=d+1;queue.push(next);}
 }
 return candidates;
}
/** One prospective birth, shared by the actual calendar and declared incident
 * stimulus. Preparation consumes no source RNG, ID, tag or opportunity. */
export function preparePeaceTalksBirth293(root:CampaignState):{ok:false;reason:string}|{ok:true;site:PeaceTalksSite293;current():boolean;commit():void} {
 const registry=root.worldSites263,maps=root.worldMaps,factions=root.worldFactions,planet=root.planet,groups=root.worldGroups,tick=root.tick,rng=root.rng,nextId=root.nextId;
 const home=maps?.sites.find(s=>s.kind==='settlement'&&s.tile!==null);
 if((Number(root.schemaVersion)!==293&&(Number(root.schemaVersion)!==294&&Number(root.schemaVersion)!==295))||!registry||!maps||!factions||!home||home.tile===null||!registeredMap(root,home.id)||planet?.revision!==3||registry.entries.length>=4096||!Number.isSafeInteger(registry.nextId+1))return no('Les pourparlers exigent un foyer et les registres géographiques actuels.');
 const candidates=factions.factions.filter(faction=>{
  const def=WORLD_FACTION_DEFINITIONS_256[faction.def],leader=factions.leaders.find(l=>l.factionId===faction.id&&l.pawn.id===faction.leaderOwnerId),relation=factions.relations.find(r=>r.aId===Math.min(faction.id,factions.playerFactionId)&&r.bId===Math.max(faction.id,factions.playerFactionId));
  if(faction.id===factions.playerFactionId||def.player||def.hidden||faction.hidden||!def.humanlike||def.permanentEnemy||faction.lifecycle259?.defeated||faction.lifecycle259?.temporary||worldNaturalGoodwill274(faction)===undefined||relation?.kind!=='hostile'||!leader||leader.pawn.state==='dead'||leader.pawn.health?.death||currentPrisoner259(leader.pawn))return false;
  if(maps.sites.some(s=>registeredMap(root,s.id)?.pawns.some(p=>p.id===leader.pawn.id)||s.target263?.kind==='foreign-settlement'&&s.target263.factionId===faction.id)||groups?.groups.some(g=>g.pendingEntry263?.target.kind==='attack-settlement'&&g.pendingEntry263.target.factionId===faction.id))return false;
  const tag='PeaceTalks_'+faction.name;
  return !registry.entries.some(s=>s.kind==='peace-talks'&&(s.questTag===tag||!s.closed&&s.factionId===faction.id));
 });
 if(!candidates.length)return no('Aucune faction hostile admissible sans pourparlers conservés.');
 const tiles=candidateTiles(root,home.tile);if(!tiles.length)return no('Aucun lieu accessible libre à distance5..13 du foyer.');
 const random={rng},draw=()=>healthRandom(random),faction=candidates[Math.floor(draw()*candidates.length)]!,tile=tiles[Math.floor(draw()*tiles.length)]!;
 const expiresAtCore=tick*10+(12+Math.floor(17*draw()))*60000;
 if(!Number.isSafeInteger(expiresAtCore))return no('Le délai des pourparlers dépasse l’horloge sûre.');
 const site:PeaceTalksSite293={kind:'peace-talks',id:registry.nextId,tile,factionId:faction.id,createdAtCore:tick*10,expiresAtCore,mapId:null,questTag:'PeaceTalks_'+faction.name};
 const entries=registry.entries,refs=entries.slice(),nextSiteId=registry.nextId,sites=maps.sites,retired=maps.retired,factionRows=factions.factions,leaders=factions.leaders,relations=factions.relations,settlements=factions.settlements;
 const stamp=()=>JSON.stringify([sites.map(s=>[s.id,s.tile,s.kind,s.target263,registeredMap(root,s.id)?.pawns.map(p=>p.id)]),retired,factionRows,leaders,relations,settlements,entries,groups?.groups.map(g=>[g.state.id,g.pendingEntry263])]);
 const before=stamp(),candidate=JSON.stringify(site);let used=false;
 const current=()=>!used&&(Number(root.schemaVersion)===293||(Number(root.schemaVersion)===294||Number(root.schemaVersion)===295))&&root.tick===tick&&root.rng===rng&&root.nextId===nextId&&root.planet===planet&&root.worldMaps===maps&&root.worldGroups===groups&&root.worldFactions===factions&&root.worldSites263===registry&&maps.sites===sites&&maps.retired===retired&&factions.factions===factionRows&&factions.leaders===leaders&&factions.relations===relations&&factions.settlements===settlements&&registry.entries===entries&&registry.nextId===nextSiteId&&entries.length===refs.length&&entries.every((s,i)=>s===refs[i])&&stamp()===before&&JSON.stringify(site)===candidate&&writable(root,'rng')&&writable(registry,'nextId')&&writable(entries,'length')&&Object.isExtensible(entries);
 if(!current())return no('Les destinataires des pourparlers ne sont pas modifiables.');
 return {ok:true,site,current,commit(){if(!current())throw Error('PeaceTalks birth changed before commit');used=true;entries.push(site);registry.nextId++;root.rng=random.rng;}};
}
