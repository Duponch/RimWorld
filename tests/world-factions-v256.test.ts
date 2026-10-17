import {expect,test} from 'vitest';
import {WorldGenerationRandom} from '../src/sim/world-generation-random';
import {defaultWorldGenerationSettings} from '../src/sim/world-generation-settings';
import {generateForeignWorldFactions256,completeWorldFactionRegistry256} from '../src/sim/world-faction-generation';
import {initialWorldGoodwill256,worldRelationKind256} from '../src/sim/world-faction-catalog';
import {validateWorldFactionRegistry256,type WorldFactionValidationHeader256} from '../src/sim/world-faction-save';
import {worldSettlementAccess256,draftWorldSettlementPost256,worldSettlementTradeTarget256,worldFactionPersonOwners256} from '../src/sim/world-faction-access';
import {draftCommercialPostStock} from '../src/sim/commercial-post-stock';
import {ensureCommercialPost} from '../src/sim/commercial-post';
import {generateWorld} from '../src/sim/generation';
import {COMMERCIAL_RESTOCK_TICKS} from '../src/sim/commercial-state';
import type {SettlementTile} from '../src/sim/world-settlement-placement';
import type {WorldFactionRegistry256} from '../src/sim/world-faction-state';
import type {GroupState} from '../src/sim/group-state';

const tiles:readonly SettlementTile[]=Array.from({length:128},(_,i)=>({biome:'temperate-forest',hilliness:'flat',neighbours:[(i+127)%128,(i+1)%128]}));
function foreign(seed=718,selection=defaultWorldGenerationSettings().factions){
 const result=generateForeignWorldFactions256({version:256,tick:0,tiles,selection,population:3,nextFactionId:1,nextSettlementId:1,nextThingId:1000,random:new WorldGenerationRandom(seed)});
 if(!result.ok)throw Error(result.reason);return result;
}
function prepared(seed=718,selection=defaultWorldGenerationSettings().factions){
 const first=foreign(seed,selection),completed=completeWorldFactionRegistry256({version:256,draft:first.draft,playerDef:'PlayerColony',name:'Colonie témoin',postWorldRandom:new WorldGenerationRandom(seed)});
 if(!completed.ok)throw Error(completed.reason);return {...completed,nextThingId:first.nextThingId};
}
const header=(r:{registry:WorldFactionRegistry256;nextThingId:number}):WorldFactionValidationHeader256=>({present:true,tick:0,width:16,height:16,nextId:r.nextThingId,tileCount:tiles.length,postIds:new Set(),knownHumanIds:new Set(),occupiedThingIds:new Set()});

test('ordered ten-instance world draft has real owners, six initial settlements and deterministic original content',()=>{
 const a=prepared(),b=prepared();expect(a).toEqual(b);expect(a.registry.factions.slice(0,-1).map(f=>f.def)).toEqual(defaultWorldGenerationSettings().factions);
 expect(a.registry.leaders).toHaveLength(6);expect(a.registry.leaders.every(o=>o.pawn.id===a.registry.factions.find(f=>f.id===o.factionId)!.leaderOwnerId)).toBe(true);
 expect(a.registry.leaders.every(o=>o.pawn.age&&o.pawn.skills&&o.pawn.orders.active===null&&o.items.length===0&&o.packed.length===0)).toBe(true);
 expect(a.registry.settlements.length).toBeGreaterThanOrEqual(6);expect(new Set(a.registry.settlements.map(s=>s.tile)).size).toBe(a.registry.settlements.length);
 expect(a.registry.settlements.every(s=>!tiles[s.tile]!.neighbours.some(n=>a.registry.settlements.some(o=>o.id!==s.id&&o.tile===n)))).toBe(true);
 expect(a.registry.relations).toHaveLength(55);expect(validateWorldFactionRegistry256(a.registry,256,header(a))).toEqual([]);
 expect(worldFactionPersonOwners256(a.registry).map(o=>o.pawn)).toEqual(a.registry.leaders.map(o=>o.pawn));
 const r=new WorldGenerationRandom(718);expect(a.registry.factions[0]!.randomKey).toBe(r.integer(0,2147483647));expect(a.registry.factions[0]!.colorFromSpectrum).toBe(r.value());
 expect(a.registry.contentModel).toBe('original-faction-content-v1');
 const first=foreign(),before=structuredClone(first.draft),post=new WorldGenerationRandom(991),witness=new WorldGenerationRandom(991);
 expect(Object.hasOwn(first.draft,'playerFactionId')).toBe(false);expect(first.draft.factions.map(f=>f.id)).toEqual(Array.from({length:10},(_,i)=>i+1));expect(first.draft.relations).toHaveLength(45);
 expect(validateWorldFactionRegistry256(first.draft,256,header(a)).length).toBeGreaterThan(0);
 const completed=completeWorldFactionRegistry256({version:256,draft:first.draft,playerDef:'PlayerTribe',name:'Camp témoin',postWorldRandom:post});expect(completed.ok).toBe(true);
 if(!completed.ok)throw Error(completed.reason);const player=completed.registry.factions.at(-1)!;
 expect(player).toMatchObject({id:11,def:'PlayerTribe',leaderOwnerId:null,randomKey:witness.integer(0,2147483647),colorFromSpectrum:witness.value()});for(let i=1;i<20;i++)witness.value();for(let i=0;i<11;i++)witness.integerValue();expect(post.integerValue()).toBe(witness.integerValue());
 expect(first.draft).toEqual(before);expect(completed.registry.factions.slice(0,-1)).toEqual(first.draft.factions);expect(completed.registry.settlements).toEqual(first.draft.settlements);expect(completed.registry.leaders).toEqual(first.draft.leaders);
 expect(validateWorldFactionRegistry256(completed.registry,256,header(a))).toEqual([]);

});

test('append after hidden intrinsic instances preserves real array order; zero visible human factions do not force a post',()=>{
 const selection=defaultWorldGenerationSettings().factions;selection.push('OutlanderCivil');const r=prepared(718,selection);
 expect(r.registry.factions.at(-2)!.def).toBe('OutlanderCivil');expect(r.registry.factions.findIndex(f=>f.def==='Ancients')).toBeLessThan(r.registry.factions.length-2);
 const empty=prepared(1,['Mechanoid','Insect','Ancients','AncientsHostile']);expect(empty.registry.settlements).toEqual([]);expect(empty.registry.leaders).toEqual([]);expect(validateWorldFactionRegistry256(empty.registry,256,header(empty))).toEqual([]);
});

test('relations use concrete pairs, rough enemies and permanent hostility; unknown pair never grants trade',()=>{
 expect(initialWorldGoodwill256('PlayerColony','OutlanderCivil')).toBe(0);expect(initialWorldGoodwill256('PlayerColony','OutlanderRough')).toBe(-80);expect(initialWorldGoodwill256('OutlanderCivil','Pirate')).toBe(-100);
 expect(worldRelationKind256(-10)).toBe('hostile');expect(worldRelationKind256(75)).toBe('ally');
 const {registry}=prepared(),civil=registry.factions.find(f=>f.def==='OutlanderCivil')!,pirate=registry.factions.find(f=>f.def==='Pirate')!;
 const open=registry.settlements.find(s=>s.factionId===civil.id)!,closed=registry.settlements.find(s=>s.factionId===pirate.id)!;
 expect(worldSettlementAccess256(registry,open.id)).toMatchObject({ok:true,canTrade:true,goodwill:0});expect(worldSettlementAccess256(registry,closed.id)).toMatchObject({ok:true,canTrade:false,goodwill:-100});
 const pair=registry.relations.findIndex(r=>r.aId===Math.min(registry.playerFactionId,civil.id)&&r.bId===Math.max(registry.playerFactionId,civil.id));registry.relations.splice(pair,1);expect(worldSettlementAccess256(registry,open.id).ok).toBe(false);
});

test('historical RAW/full/delta input guard is strict and does not read hostile descriptors or mutate any owner',()=>{
 const r=prepared(),c=header(r),before=structuredClone(r);
 expect(validateWorldFactionRegistry256(r.registry,255,c).length).toBeGreaterThan(0);expect(validateWorldFactionRegistry256(undefined,255,c).length).toBeGreaterThan(0);expect(validateWorldFactionRegistry256(undefined,255,{...c,present:false})).toEqual([]);
 const duplicate=structuredClone(r.registry);duplicate.leaders[1]!.pawn.id=duplicate.leaders[0]!.pawn.id;duplicate.factions.find(f=>f.id===duplicate.leaders[1]!.factionId)!.leaderOwnerId=duplicate.leaders[0]!.pawn.id;expect(validateWorldFactionRegistry256(duplicate,256,c).length).toBeGreaterThan(0);
 const unknown=structuredClone(r.registry);Object.assign(unknown.leaders[0]!.pawn,{map:{tiles:[]}});expect(validateWorldFactionRegistry256(unknown,256,c).length).toBeGreaterThan(0);
 for(const mutate of [(v:any)=>v.leaders[0].pawn.orders=null,(v:any)=>v.leaders[0].pawn.foodPolicyId=999,(v:any)=>v.relations[0].kind='ally']){const bad=structuredClone(r.registry);mutate(bad);expect(validateWorldFactionRegistry256(bad,256,c).length).toBeGreaterThan(0);}
 let reads=0;const getter=structuredClone(r.registry);Object.defineProperty(getter.leaders[0]!.pawn,'hunger',{enumerable:true,get(){reads++;return 100;}});expect(validateWorldFactionRegistry256(getter,256,c).length).toBeGreaterThan(0);expect(reads).toBe(0);expect(r).toEqual(before);
});

test('settlement stock draft requires real arrival and exact target; refusals allocate nothing and stocks never alias',()=>{
 const r=prepared(),registry=r.registry,civil=registry.factions.find(f=>f.def==='OutlanderCivil')!,settlement=registry.settlements.find(s=>s.factionId===civil.id)!;
 // Declared projection fragment for this arrival adapter; group owner/mass/ledger
 // validation and played trips stay with the existing group producer tests.
 const group={id:44,members:[r.registry.leaders[0]!.pawn],phase:'at-site',tile:settlement.tile,lastPersonalTick:0} as unknown as GroupState;
 const h={seed:718,tick:0,nextId:r.nextThingId},before=structuredClone(registry);
 expect(draftWorldSettlementPost256(registry,settlement.id,{...group,tile:(settlement.tile+1)%128} as GroupState,[],h,1)).toBeUndefined();expect(registry).toEqual(before);
 const draft=draftWorldSettlementPost256(registry,settlement.id,group,[],h,1)!;expect(draft).toBeDefined();expect(registry).toEqual(before);
 expect(draft.post.state.stock.length).toBeGreaterThan(0);expect(draft.post.state.stock.every(p=>p.id>=r.nextThingId)).toBe(true);expect(draft.registry.settlements.find(s=>s.id===settlement.id)!.postId).toBe(1);
 const target=worldSettlementTradeTarget256(draft.registry,settlement.id,group,[draft.post],0)!;expect(target.post).toBe(draft.post.state);expect(target.settlementId).toBe(settlement.id);
 expect(worldSettlementTradeTarget256(draft.registry,settlement.id,group,[],0)).toBeUndefined();expect(worldSettlementTradeTarget256(draft.registry,settlement.id,group,[draft.post],1)).toBeUndefined();
});

test('scalar stock extraction preserves legacy arrival output, freshness no-op and strict restock boundary',()=>{
 const w=generateWorld(718,16,16);delete w.civilianPost;const base={seed:w.seed,tick:w.tick,nextId:w.nextId},draft=draftCommercialPostStock(base)!;
 expect(ensureCommercialPost(w)).toBe(true);expect(w.civilianPost).toEqual(draft.post);expect(w.nextId).toBe(draft.nextId);
 const post=w.civilianPost!,next=w.nextId;Object.defineProperty(w,'civilianPost',{configurable:true,enumerable:true,get:()=>post,set(){throw Error('Fresh stock must not be committed again');}});
 expect(ensureCommercialPost(w)).toBe(true);expect(w.nextId).toBe(next);
 expect(draftCommercialPostStock({...base,tick:post.stockedAt+COMMERCIAL_RESTOCK_TICKS,nextId:next},post)).toMatchObject({changed:false,nextId:next});
 expect(draftCommercialPostStock({...base,tick:post.stockedAt+COMMERCIAL_RESTOCK_TICKS+1,nextId:next},post)).toMatchObject({changed:true});
 expect(draftCommercialPostStock({...base,nextId:Number.MAX_SAFE_INTEGER})).toBeUndefined();
});
