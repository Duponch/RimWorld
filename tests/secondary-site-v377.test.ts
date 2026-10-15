import {mkdirSync,writeFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {prepareGroupScenario} from '../src/sim/group-scenario.ts';
import {applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld,hashWorld} from '../src/sim/index.ts';
import {groupMemberChoices} from '../src/sim/group-authority.ts';
import {secondaryContext,selectedMap,flushSecondaryContext} from '../src/sim/secondary-site-context.ts';
import {campaignPresentation} from '../src/sim/secondary-site-presentation.ts';
import {captureHumanOwners} from '../src/sim/human-owners.ts';
import {candidateAccess} from '../src/sim/candidate-access.ts';
import {blockedCells,workNeighbours} from '../src/sim/pathfinding.ts';
import {choppable} from '../src/sim/plants.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {validTundraTransport} from '../src/sim/tundra-save.ts';
import {generateSiteWorld} from '../src/sim/site-generation.ts';
import {resolveSite} from '../src/sim/site.ts';
import {generateStartingWorld} from '../src/sim/starting-world.ts';
import {planetTileClimateDefinition} from '../src/sim/site-climate.ts';
import {initializeSnowSurface} from '../src/sim/snow-surface.ts';
import {releaseAssignments} from '../src/sim/work-release.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import type {Command,World} from '../src/sim/types.ts';

function command(w:World,c:Command):void {
  const result=applyCommand(w,c);expect(result.ok,result.reason??JSON.stringify(c)).toBe(true);
}
function until(w:World,predicate:()=>boolean,limit=8000):void {
  for(let i=0;i<limit&&!predicate();i++)stepWorld(w);
  if(!predicate()){mkdirSync('tmp/multimap-v377/failed-state',{recursive:true});writeFileSync('tmp/multimap-v377/failed-state/tick-'+w.tick+'.json',JSON.stringify(w));}
  expect(predicate(),JSON.stringify({tick:w.tick,group:w.group?.phase,localGroup:secondaryContext(w)?.group?.phase,choices:groupMemberChoices(selectedMap(w)).map(c=>({id:c.pawn.id,state:c.pawn.state,hunger:c.pawn.hunger,rest:c.pawn.rest,reason:c.reason})),events:w.events.slice(-5)})).toBe(true);
}
function provisions(w:World,quantity=8):{pileId:number;quantity:number}[] {
  const result:{pileId:number;quantity:number}[]=[];let left=quantity;
  for(const p of selectedMap(w).piles)if(p.owner.type==='ground'&&p.item==='survival-meal'&&!p.foodPoison&&left){const take=Math.min(left,p.quantity);result.push({pileId:p.id,quantity:take});left-=take;}
  expect(left,'Prepared scenario must provide actual healthy rations on this map').toBe(0);return result;
}
function ready(w:World,ids:number[]):void {
  until(w,()=>ids.every(id=>groupMemberChoices(selectedMap(w)).some(c=>c.pawn.id===id&&c.ok)),12000);
}
function preparation(){
  const w=prepareGroupScenario();command(w,{type:'planet-adopt'});
  for(const pawn of w.pawns)pawn.health=createMedicalRecord(w.tick);
  // Fixed warm neighbour for this transport/work fixture. The initial cold42
  // failure is retained separately; this is not a winter survival campaign.
  const tile=52;expect(w.planet!.tiles[w.planet!.homeTile]!.neighbours).toContain(tile);
  expect(tile).toBeDefined();if(tile===undefined)throw Error('Prepared geography has no neighbouring terrestrial site');
  return {w,tile,originals:w.pawns.slice(0,2),ids:w.pawns.slice(0,2).map(p=>p.id)};
}
function departAndEnter(f:ReturnType<typeof preparation>,food=8):void {
  ready(f.w,f.ids);command(f.w,{type:'group-start',memberIds:f.ids,destination:f.tile,sources:provisions(f.w,food)});
  until(f.w,()=>f.w.group?.phase==='at-site');
  command(f.w,{type:'secondary-enter'});
  until(f.w,()=>!secondaryContext(f.w)!.group);
}

describe('V377 real second map',()=>{
  it('physically visits, chops through ordinary work, returns after real loading, and revisits original changes',()=>{
    const f=preparation(),{w,ids,originals}=f;departAndEnter(f);
    const local=secondaryContext(w)!;
    expect(ids.every(id=>!w.pawns.some(p=>p.id===id)&&local.pawns.some(p=>p.id===id))).toBe(true);
    for(const p of originals)expect(local.pawns.find(q=>q.id===p.id)).toBe(p);
    expect(captureHumanOwners(w).pawnOwners.some(o=>ids.includes(o.id))).toBe(false);
    expect(ids.every(id=>captureHumanOwners(w).people.get(id)?.status==='away')).toBe(true);
    const blocked=blockedCells(local),access=originals.map(p=>candidateAccess(local,p,blocked,new Set(),true));
    const tree=local.resources.find(r=>r.kind==='tree'&&choppable(local,r)&&workNeighbours(r).some(c=>c.x>=0&&c.z>=0&&c.x<local.width&&c.z<local.height&&access.some(q=>q.has(c.z*local.width+c.x))));
    expect(tree,'A reachable mature tree is required by this prepared route').toBeDefined();if(!tree)throw Error('No accessible chop target');
    const treeId=tree.id;
    for(const pawnId of ids)command(w,{type:'priority',pawnId,work:'gather',value:1});
    command(w,{type:'designate',kind:'chop',x:tree.x,z:tree.z});
    until(w,()=>!local.resources.some(r=>r.id===treeId),3000);
    expect(local.piles.some(p=>p.owner.type==='ground'&&p.item==='wood'&&p.quantity>0)).toBe(true);
    for(const pawnId of ids)command(w,{type:'priority',pawnId,work:'gather',value:0});
    expect(validateWorld(w)).toEqual([]);
    const restored=deserializeWorld(serializeWorld(w));stepWorld(w,7);stepWorld(restored,7);expect(hashWorld(restored)).toBe(hashWorld(w));
    ready(w,ids);command(w,{type:'group-start',memberIds:ids,destination:w.planet!.homeTile,sources:provisions(w,ids.length)});
    expect(local.group&&'manifest' in local.group).toBe(true);
    until(w,()=>!!w.group&&'members' in w.group);
    expect(w.group&&'members' in w.group&&w.group.originTile).toBe(f.tile);
    expect(ids.every(id=>!local.pawns.some(p=>p.id===id)&&!w.pawns.some(p=>p.id===id))).toBe(true);
    until(w,()=>!w.group&&ids.every(id=>w.pawns.some(p=>p.id===id)));
    for(const p of originals)expect(w.pawns.find(q=>q.id===p.id)).toBe(p);
    expect(local.resources.some(r=>r.id===treeId)).toBe(false);
    departAndEnter(f,ids.length);
    expect(secondaryContext(w)).toBe(local);
    expect(local.resources.some(r=>r.id===treeId)).toBe(false);
    expect(local.piles.some(p=>p.owner.type==='ground'&&p.item==='wood'&&p.quantity>0)).toBe(true);
    expect(validateWorld(w)).toEqual([]);
  },120000);

  it('shares campaign state, retains physical guards and releases prepared research tasks on both actual maps',()=>{
    const f=preparation();departAndEnter(f);const local=secondaryContext(f.w)!;
    expect(Object.hasOwn(f.w.secondarySite!.map,'tick')).toBe(false);
    expect(Object.hasOwn(f.w.secondarySite!.map,'rng')).toBe(false);
    expect(Object.hasOwn(f.w.secondarySite!.map,'nextId')).toBe(false);
    const before=new Map([...f.w.pawns,...local.pawns].map(p=>[p.id,p.age!.biologicalTicks]));
    stepWorld(f.w,11);expect(local.tick).toBe(f.w.tick);expect(local.rng).toBe(f.w.rng);expect(local.nextId).toBe(f.w.nextId);
    for(const p of [...f.w.pawns,...local.pawns]){expect(p.age!.biologicalTicks-before.get(p.id)!).toBe(11);expect(p.health!.tick).toBe(f.w.tick);}
    expect(captureHumanOwners(local).slots.filter(s=>s.kind==='map').map(s=>s.id).sort()).toEqual(local.pawns.map(p=>p.id).sort());
    expect(captureHumanOwners(local).people.size).toBe(captureHumanOwners(f.w).people.size);
    // A registry command on the home map must still see the real user on
    // the other map, without accepting a remote spatial assignment.
    const originalPolicy=local.pawns[0]!.foodPolicyId,policyId=f.w.nextFoodPolicyId;
    command(f.w,{type:'food-policy-create',name:'Régime de l’expédition'});
    command(f.w,{type:'food-policy-assign',pawnId:local.pawns[0]!.id,policyId});
    command(f.w,{type:'secondary-view',site:'home'});
    const beforeDelete=serializeWorld(f.w);
    expect(applyCommand(f.w,{type:'food-policy-delete',policyId}).ok).toBe(false);
    expect(serializeWorld(f.w)).toBe(beforeDelete);
    expect(applyCommand(f.w,{type:'food-policy-assign',pawnId:local.pawns[0]!.id,policyId:originalPolicy}).ok).toBe(false);
    command(f.w,{type:'food-policy-update',policyId,name:'Rations partagées',allowed:['survival-meal']});
    expect(local.pawns[0]!.needCooldown).toBe(0);
    command(f.w,{type:'secondary-view',site:'secondary'});
    command(f.w,{type:'food-policy-assign',pawnId:local.pawns[0]!.id,policyId:originalPolicy});
    command(f.w,{type:'food-policy-delete',policyId});
    expect(validateWorld(f.w)).toEqual([]);
    // Prepared bench/task checkpoint, solely for cancellation. This is not
    // evidence of construction, research production or movement to a bench.
    command(f.w,{type:'research-project',project:'batteries'});
    for(const map of [f.w,local]){
      const p=map.pawns[0]!;releaseAssignments(map,p);
      const bench={id:map.nextId++,kind:'research-bench' as const,x:5,z:5,orientation:0 as const,material:'wood' as const,footprint:'standard' as const};
      const cells=new Set([...footprintCells(bench),{x:5,z:4}].map(c=>c.z*map.width+c.x));
      for(const cell of cells)map.tiles[cell]={terrain:'grass'};
      map.resources=map.resources.filter(r=>!cells.has(r.z*map.width+r.x));map.structures.push(bench);
      p.priorities.research=1;p.research={stationId:bench.id,spot:{x:5,z:4},worked:0};
      p.x=5;p.z=4;p.state='working';p.moveCooldown=0;delete p.motion;
    }
    flushSecondaryContext(f.w);expect(validateWorld(f.w)).toEqual([]);
    command(f.w,{type:'research-project',project:null});
    expect(f.w.pawns.every(p=>p.research===undefined)&&local.pawns.every(p=>p.research===undefined)).toBe(true);
    expect(validateWorld(f.w)).toEqual([]);
  },120000);

  it('admits the prepared tundra expedition landscape through its own provenance guard',()=>{
    // Guard fixture only: no route, party, supplies or acquired colony are
    // claimed here. The full physical route is exercised above.
    const planet=generateStartingWorld(216,2),tile=planet.tiles.find(t=>t.biome==='tundra'&&t.hilliness!=='mountainous'&&t.id!==planet.homeTile&&t.id!==planet.civilianTile);
    expect(tile).toBeDefined();if(!tile||tile.biome==='ocean'||tile.hilliness==='mountainous')throw Error('Prepared globe needs a local tundra tile');
    const site=resolveSite(377,{biome:tile.biome,hilliness:tile.hilliness}),map=generateSiteWorld(377,32,32,site);
    initializeSnowSurface(map);map.site=site;map.planet=planet;
    map.expeditionSite={tile:tile.id,createdAt:0,calendarOffset:0};
    map.climate={revision:3,adoptedAt:0,calendarOrigin:0,definition:planetTileClimateDefinition(tile)};
    expect(validTundraTransport(map,240)).toBe(true);
    expect(validTundraTransport(map,239)).toBe(false);
  });

  it('publishes only the selected map, accepts same-tick epoch switches and retains global relationships',()=>{
    const f=preparation(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();departAndEnter(f);
    const local=secondaryContext(f.w)!,visible=campaignPresentation(f.w),packet=structuredClone(encoder.encode(visible,0,0,true));
    expect(Object.hasOwn(packet.world,'secondarySite')).toBe(false);
    expect(packet.world.pawns.map(p=>p.id)).toEqual(local.pawns.map(p=>p.id));
    const first=decoder.adopt(packet);expect(first.status,first.status==='resync'?first.reason:'').toBe('applied');
    command(f.w,{type:'secondary-view',site:'home'});
    const home=structuredClone(encoder.encode(campaignPresentation(f.w),0,0));expect(home.epoch).toBeGreaterThan(packet.epoch);
    if(home.kind!=='checkpoint')throw Error('A map switch must publish a complete checkpoint');
    expect(home.world.tick).toBe(packet.world.tick);
    const second=decoder.adopt(home);expect(second.status,second.status==='resync'?second.reason:'').toBe('applied');
    expect(home.world.campaignPeople?.filter(p=>f.ids.includes(p.id)).every(p=>p.status==='away')).toBe(true);
    expect(home.world.resources).toEqual(f.w.resources);
    command(f.w,{type:'secondary-view',site:'secondary'});
    const again=structuredClone(encoder.encode(campaignPresentation(f.w),0,0));expect(again.epoch).toBeGreaterThan(home.epoch);
    const third=decoder.adopt(again);expect(third.status,third.status==='resync'?third.reason:'').toBe('applied');
  },120000);

  it('rejects future fields and duplicate owners atomically and migrates schema239 without creating a site',()=>{
    const f=preparation(),old=JSON.parse(serializeWorld(f.w));old.schemaVersion=239;
    const migrated=deserializeWorld(JSON.stringify(old));expect(migrated.secondarySite).toBeUndefined();expect(migrated.rng).toBe(old.rng);expect(migrated.nextId).toBe(old.nextId);
    Object.defineProperty(old,'secondarySite',{value:undefined,enumerable:true});expect(validateWorld(old).length).toBeGreaterThan(0);
    departAndEnter(f);const local=secondaryContext(f.w)!,before=serializeWorld(f.w);
    command(f.w,{type:'secondary-view',site:'home'});
    const refused=applyCommand(f.w,{type:'group-start',memberIds:f.ids,destination:f.tile,sources:[]});expect(refused.ok).toBe(false);
    command(f.w,{type:'secondary-view',site:'secondary'});expect(serializeWorld(f.w)).toBe(before);
    const invalid=JSON.parse(before);invalid.secondarySite.map.pawns.push(structuredClone(invalid.pawns[0]));
    expect(()=>deserializeWorld(JSON.stringify(invalid))).toThrow();expect(serializeWorld(f.w)).toBe(before);expect(local.pawns.length).toBe(f.ids.length);
  },120000);
});
