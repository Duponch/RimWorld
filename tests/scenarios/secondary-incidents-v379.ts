import {createScenarioWorld} from '../../src/sim/new-game.ts';
import {applyCommand,stepWorld} from '../../src/sim/engine.ts';
import {createMedicalRecord} from '../../src/sim/injury-state.ts';
import {addMaterial,refreshStock} from '../../src/sim/materials.ts';
import {groupMemberChoices} from '../../src/sim/group-authority.ts';
import {secondaryContext,flushSecondaryContext} from '../../src/sim/secondary-site-context.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../../src/sim/serialization.ts';
import {raidEntries} from '../../src/sim/raid-space.ts';
import {createRaidGroup} from '../../src/sim/raid-spawn.ts';
import type {Command,Pawn,World} from '../../src/sim/types.ts';

let prepared:string|undefined;
export function incidentCommand(w:World,c:Command):void {const r=applyCommand(w,c);if(!r.ok)throw Error(r.reason??JSON.stringify(c));}
/** Real crashlanded creation + ordinary finite group transitions. Access,
 * healthy/free actors and eight rations are explicit preparation, no credited
 * production or natural incident. Cached JSON is immutable between cases. */
export function preparedCassandraExpedition(){
  if(!prepared){
    const w=createScenarioWorld(216,32,'crashlanded',{biome:'temperate-forest',hilliness:'small-hills'});
    w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.structures=[];w.jobs=[];w.packed=[];
    w.stockpiles=[];w.growingZones=[];w.growingCursor=0;w.piles=w.piles.filter(p=>p.owner.type!=='ground');
    for(const [i,p] of w.pawns.entries()){
      p.x=12+i*3;p.z=14;p.health=createMedicalRecord(w.tick);p.hunger=p.rest=p.mood=100;p.recreation.level=100;p.schedule.fill('anything');p.apparelAutomation=false;
      for(const work of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[work]=0;
    }
    addMaterial(w,'food',8,{type:'ground',x:13,z:20},'survival-meal');refreshStock(w);
    const ids=w.pawns.slice(0,2).map(p=>p.id),command=(c:Command)=>incidentCommand(w,c);
    const until=(done:()=>boolean)=>{let n=0;while(!done()&&n++<12000)stepWorld(w);if(!done())throw Error('Préparation V379 interrompue au tick '+w.tick);};
    command({type:'planet-adopt'});
    if(!w.planet!.tiles[w.planet!.homeTile]!.neighbours.includes(52)||w.planet!.tiles[52]!.biome!=='temperate-forest')throw Error('Le voisin tempéré52 de216 a changé.');
    until(()=>ids.every(id=>groupMemberChoices(w).some(c=>c.pawn.id===id&&c.ok)));
    const food=w.piles.find(p=>p.owner.type==='ground'&&p.item==='survival-meal'&&p.quantity>=8);if(!food)throw Error('Huit rations préparées requises.');
    command({type:'group-start',memberIds:ids,destination:52,sources:[{pileId:food.id,quantity:8}]});
    until(()=>w.group?.phase==='at-site');command({type:'secondary-enter'});
    until(()=>!secondaryContext(w)!.group);flushSecondaryContext(w);
    const errors=validateWorld(w);if(errors.length)throw Error(errors.join(' '));prepared=serializeWorld(w);
  }
  const w=deserializeWorld(prepared);return {w,local:secondaryContext(w)!,ids:[...w.secondarySite!.visit!.memberIds],tile:52};
}

/** Opt-in short UI checkpoint: real raid producer on the secondary map,
 * home displayed and paused by the loader. No natural-roll or UI-trip credit. */
export function preparedSecondaryRaidAlert(){
  const f=preparedCassandraExpedition(),sites=raidEntries(f.local,379,1);
  if(!sites)throw Error('Aucun bord physique admis pour le raid préparé V379.');
  const raid=createRaidGroup(f.local,{count:1,sites,random:{rng:f.local.raids!.rng}});
  if(!raid)throw Error('Le producteur ordinaire refuse le raid préparé V379.');
  flushSecondaryContext(f.w);incidentCommand(f.w,{type:'secondary-view',site:'home'});
  return {...f,hostileId:raid.members[0]!,serialized:serializeWorld(f.w),
    notice:'CHECKPOINT PRÉPARÉ V379 : vraie création Cassandra216 et formation/chargement/voyage/entrée CPU exécutés avant navigateur ; un raid secondaire admis par le producteur ordinaire, sans tirage naturel revendiqué. Vue foyer. Le parcours UI doit encore cliquer l’alerte, basculer/centrer et recharger la campagne complète.'};
}

