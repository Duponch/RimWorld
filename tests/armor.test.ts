import { describe, expect, it } from 'vitest';
import { apparelCompatible, apparelCoverage, resolveArmor, type ArmorHit, type ArmorPiece, type ArmorRatings } from '../src/sim/armor';

const none: ArmorRatings = Object.freeze({sharp:0,blunt:0,heat:0});
const torso = apparelCoverage(['middle'], ['torso','neck']);
const hit: ArmorHit = {amount:12,penetration:.25,category:'sharp',part:'torso'};
const piece = (id=1, rating=1, coverage=torso, hp=200): ArmorPiece => ({id,ratings:{sharp:rating,blunt:0,heat:0},coverage,hitPoints:hp});
function rolls(values: number[]) {
  let count=0;
  return {draw:()=>{if(count>=values.length)throw new Error('Unexpected armor draw');return values[count++]!;},count:()=>count};
}

describe('armor transaction before anatomical propagation',()=>{
  it('uses anatomical overlap for compatibility, direct coverage for internal organs and one entry for multilayer garments',()=>{
    const shirt=apparelCoverage(['skin'],['torso','neck','shoulders','arms']);
    const pants=apparelCoverage(['skin'],['legs']);
    const plate=apparelCoverage(['middle','shell'],['torso','neck','shoulders','arms','legs']);
    expect(apparelCompatible(shirt,pants)).toBe(true);
    expect(apparelCompatible(shirt,torso)).toBe(true);
    expect(apparelCompatible(torso,plate)).toBe(false);
    const full=apparelCoverage(['headgear'],['full-head']),upper=apparelCoverage(['headgear'],['upper-head']);
    expect(apparelCompatible(full,upper)).toBe(false); // No shared group name.
    expect(upper.parts).toContain('brain');expect(upper.parts).not.toContain('left-eye');
    expect(shirt.parts).toContain('heart');expect(shirt.parts).toContain('left-clavicle');
    expect(shirt.parts).not.toContain('left-hand');expect(shirt.parts).not.toContain('left-leg');
    expect(Object.isFrozen(shirt.parts)).toBe(true);
    for(const part of ['torso','heart','neck'] as const) {
      const rng=rolls([.4,.1]);const result=resolveArmor({...hit,part},[piece(1,2,plate)],none,rng.draw);
      expect(result.amount).toBe(0);expect(result.wear).toHaveLength(1);expect(rng.count()).toBe(2);
    }
    const rng=rolls([.7]);expect(resolveArmor({...hit,part:'left-hand'},[piece()],none,rng.draw).wear).toEqual([]);expect(rng.count()).toBe(1);
  });

  it('honors every strict threshold, penetration, zero/over-100% ratings and exact distribution without flaky sampling',()=>{
    for(const [roll,expected] of [[0,0],[.374999999,0],[.375,6],[.749999999,6],[.75,12],[.999999999,12]]) {
      const rng=rolls(expected===6?[.2,roll!,.9,.9]:expected===12?[.2,roll!,.9]:[.2,roll!]);
      expect(resolveArmor(hit,[piece()],none,rng.draw).amount).toBe(expected);
    }
    for(const effective of [0,.25,.75,1,1.5,2,2.5]) {
      const counts={zero:0,half:0,full:0};
      for(let i=0;i<2000;i++) {
        const sequence=[.5,(i+.5)/2000,.5,.5],rng=rolls(sequence);
        const amount=resolveArmor(hit,[piece(1,effective+.25)],none,rng.draw).amount;
        if(amount===0)counts.zero++;else if(amount===6)counts.half++;else {expect(amount).toBe(12);counts.full++;}
      }
      const deflect=Math.min(1,effective/2),half=Math.min(1,effective)-deflect;
      expect(counts).toEqual({zero:2000*deflect,half:2000*half,full:2000*(1-deflect-half)});
    }
    expect(resolveArmor({...hit,penetration:100},[piece(1,2)],none,()=>0).amount).toBe(12);
    expect(resolveArmor({...hit,penetration:0},[],{sharp:2,blunt:0,heat:0},()=>.99).amount).toBe(0);
  });

  it('wears outer pieces before mitigation, retains the original stat after conversion, and stops when deflected',()=>{
    const inner=piece(1,1,apparelCoverage(['skin'],['torso'])),outer=piece(2,1,torso);
    const rng=rolls([.9,.5,.9, .9,.1]);
    const result=resolveArmor(hit,[outer,inner],none,rng.draw);
    expect(result).toEqual({amount:0,category:'blunt',wear:[{id:2,damage:3,remaining:197},{id:1,damage:1,remaining:199}]});
    expect(rng.count()).toBe(5); // Inner sharp=1 protects even after conversion; blunt=0 does not replace it.
    const destroyed=piece(7,2,torso,1),before=structuredClone(destroyed);
    expect(resolveArmor(hit,[destroyed,inner],none,()=>0)).toEqual({amount:0,category:'sharp',wear:[{id:7,damage:3,remaining:0}]});
    expect(destroyed).toEqual(before);expect(inner.hitPoints).toBe(200);
    // Same last-layer ties are stable and reversed, not randomized or sorted by ID.
    expect(resolveArmor(hit,[piece(9,2),piece(2,2)],none,()=>0).wear[0]!.id).toBe(2);
    const thermal={...outer,ratings:{sharp:2,blunt:2,heat:0}};
    expect(resolveArmor({...hit,category:'heat'},[thermal],none,()=>0).amount).toBe(12);
    expect(resolveArmor({...hit,category:null},[thermal],none,()=>{throw new Error('No armor draws for this damage');})).toEqual({amount:12,category:null,wear:[]});
  });

  it('keeps fractional wear and halving unbiased, even with a single HP, without mutating input on failure',()=>{
    for(const [wearRoll,halfRoll,wearDamage,amount] of [[.249,.499,4,7],[.25,.5,3,6]]) {
      const rng=rolls([wearRoll!, .5, halfRoll!, .9]);
      expect(resolveArmor({...hit,amount:13},[piece(1,1,torso,1)],none,rng.draw)).toEqual({amount,category:'blunt',wear:[{id:1,damage:wearDamage,remaining:0}]});
      expect(rng.count()).toBe(4);
    }
    const rng=rolls([.9,.5,.7]);
    expect(resolveArmor({...hit,amount:1},[piece()],none,rng.draw).amount).toBe(0);expect(rng.count()).toBe(3);
    const original=piece(),frozen=Object.freeze({...original,ratings:Object.freeze({...original.ratings})});
    for(const bad of [NaN,Infinity,-.1,1])expect(()=>resolveArmor(hit,[frozen],none,()=>bad)).toThrow('Invalid armor random');
    const late=rolls([.5,.5,NaN]);expect(()=>resolveArmor(hit,[frozen],none,late.draw)).toThrow('Invalid armor random');
    expect(frozen).toEqual(original);
    expect(resolveArmor({...hit,amount:0},[frozen],none,()=>{throw new Error('Unexpected draw');}).wear).toEqual([]);
  });

  it('rejects corrupt inputs before consuming any random state, including duplicated physical identities',()=>{
    let consumed=0;const draw=()=>{consumed++;return .5;};
    const invalid: ArmorHit[]=[{...hit,amount:-1},{...hit,amount:NaN},{...hit,penetration:Infinity},{...hit,part:'waist'},{...hit,part:'bad' as any},{...hit,category:'cold' as any}];
    for(const input of invalid)expect(()=>resolveArmor(input,[piece()],none,draw)).toThrow();
    for(const pieces of [[piece(),piece()],[{...piece(),hitPoints:0}],[{...piece(),hitPoints:1.5}],[{...piece(),ratings:{...none,sharp:NaN}}],[{...piece(),coverage:{...torso,outerLayer:5}}]])expect(()=>resolveArmor(hit,pieces,none,draw)).toThrow();
    expect(()=>resolveArmor(hit,[],{...none,heat:NaN},draw)).toThrow();
    for(const [layers,groups] of [[[],['torso']],[['skin'],[]],[['skin','skin'],['torso']],[['skin'],['torso','torso']],[['bad'],['torso']],[['skin'],['bad']]] as any[])expect(()=>apparelCoverage(layers,groups)).toThrow();
    expect(consumed).toBe(0);
  });
});
