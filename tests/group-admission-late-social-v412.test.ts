import {expect,test} from 'vitest';
import {harness,exact} from './helpers/group-admission-v412.ts';
import {flushRegisteredMap} from '../src/sim/world-map-context.ts';
import {passiveSocialWeights} from '../src/sim/social.ts';
import {socialRandom} from '../src/sim/social-state.ts';

test('a real advanceSocial fight born after the first reconcile cancels only admission, keeping the physical fight and same-tick RAW',()=>{
 const f=harness(),[a,b,other]=f.map.pawns;
 if(!a||!b||!other)throw Error('Declared original three-person32² fixture absent');
 // Declared test stimulus before formation: one nearby interlocutor, a queued
 // social attempt and private social rolls. No fight/task is prepared or
 // started directly; stepWorld must create it in its actual late social pass.
 other.x=27;other.z=27;
 expect(a.traits??[]).not.toContain('kind');expect(((f.w.tick+1)*10+a.id)%91).toBeLessThan(10);
 const weights=passiveSocialWeights(f.map,a,b),total=Object.values(weights).reduce((n,x)=>n+x,0),lower=weights.chitchat+weights['deep-talk']+weights['kind-words'];
 let socialSeed:number|undefined;
 for(let candidate=1;candidate<=100_000;candidate++){
  const privateStream={rng:candidate};socialRandom(privateStream);const choice=socialRandom(privateStream)*total;
  if(choice>=lower&&choice<lower+weights.slight){socialSeed=candidate;break;}
 }
 if(socialSeed===undefined)throw Error('Deterministic slight stimulus unavailable');
 a.social={rng:socialSeed,wants:true,memories:[]};b.social={rng:1,memories:[]};
 flushRegisteredMap(f.map);
 const goods=()=>f.map.piles.map(p=>({id:p.id,item:p.item,quantity:p.quantity,owner:structuredClone(p.owner)})),beforeGoods=goods(),originals=[a,b],id=f.start(originals);
 expect(f.w.worldGroups!.groups.find(row=>row.state.id===id)!.state).toMatchObject({admission:{revision:1},phase:'gathering'});
 expect(a.social.fight).toBeUndefined();expect(b.social.fight).toBeUndefined();exact(f.w,'09-before-real-late-social');
 f.step();
 // Export the true current tick before any assertion can hide a save refusal.
 // Without the final guard this checkpoint rejects the still-attached group.
 exact(f.w,'09-after-real-late-social-before-assertions');
 expect(a.social?.last).toMatchObject({otherId:b.id,kind:'slight',tick:f.w.tick,initiated:true});
 expect(a.social?.fight).toEqual({opponentId:b.id,startedAt:f.w.tick});expect(b.social?.fight).toEqual({opponentId:a.id,startedAt:f.w.tick});
 expect(a.melee?.order).toEqual({targetId:b.id,startedDowned:false,auto:'social'});expect(b.melee?.order).toEqual({targetId:a.id,startedDowned:false,auto:'social'});
 expect(f.w.worldGroups!.groups.some(row=>row.state.id===id)).toBe(false);expect(f.w.tick).toBe(1);
 for(const original of originals)expect(f.map.pawns).toContain(original);expect(goods()).toEqual(beforeGoods);
});
