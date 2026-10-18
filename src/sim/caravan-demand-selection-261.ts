/** Pure bounded selection. No save state, World or PRNG owner is mutated.
 * Reimplementation from the facts in NOTE-B1/FORMAT261, not native source.
 * The caller captures every real holder and supplies real unit market value/mass.
 * Missing authority is a refusal, never an omitted candidate or a default value.
 * Logical draws use an immutable tape; equivalent cumulative weighted selection
 * is an explicit Elsewhere RNG adaptation, not the native internal draw stream. */
export interface DemandHuman {
  readonly id:number;readonly owner:boolean;readonly prisoner:boolean;
}
export interface DemandAnimal {readonly id:number;readonly marketValue:number|undefined}
export interface DemandObject {
  readonly kind:'pile'|'packed';readonly id:number;readonly quantity:number;
  readonly unitMarketValue:number|undefined;readonly unitMassKg:number|undefined;
  readonly apparel:boolean;readonly equipmentDestroyedOnDrop:boolean;
}
export interface DemandCapture {
  readonly humans:readonly DemandHuman[];readonly animals:readonly DemandAnimal[];
  readonly objects:readonly DemandObject[];
}
export type DemandSelection=
  | {kind:'human'|'animal';id:number}
  | {kind:'pile'|'packed';id:number;quantity:number};
export type DemandResult=
  | {kind:'selected';lines:DemandSelection[];drawsUsed:number}
  | {kind:'unavailable'|'blocked';reason:string;drawsUsed:number};
const f=Math.fround;
const whole=(n:number)=>Number.isSafeInteger(n)&&n>0;
const nonnegative=(n:number|undefined):n is number=>n!==undefined&&Number.isFinite(n)&&n>=0;
const positive=(n:number|undefined):n is number=>nonnegative(n)&&n>0;
class TapeExhausted extends Error {}

/** One bounded candidate capture. Output refers to IDs only and grants no ownership.
 * List order is the captured real holder order; tied animals keep that order. */
export function selectDemand(c:DemandCapture,tape:readonly number[]):DemandResult {
  let cursor=0;
  const result=(kind:'blocked'|'unavailable',reason:string):DemandResult=>({kind,reason,drawsUsed:cursor});
  const draw=():number=>{
    const value=tape[cursor];
    if(value===undefined||!Number.isFinite(value)||value<0||value>=1)throw new TapeExhausted();
    cursor++;return value;
  };
  const ids=[...c.humans,...c.animals,...c.objects].map(v=>v.id);
  if(ids.some(id=>!whole(id))||new Set(ids).size!==ids.length)return result('blocked','Non-exclusive original namespace');
  if(c.humans.some(h=>h.owner&&h.prisoner))return result('blocked','A captive cannot be an owner');
  if(c.animals.some(a=>!nonnegative(a.marketValue)))return result('blocked','Missing actual animal market value');
  if(c.objects.some(o=>!whole(o.quantity)||!nonnegative(o.unitMarketValue)||!positive(o.unitMassKg)))return result('blocked','Missing actual object quantity/value/mass');
  const human=():DemandSelection[]|null=>{
    const owners=c.humans.filter(h=>h.owner),eligible=c.humans.filter(h=>h.prisoner||owners.length>=2&&h.owner);
    return eligible.length?[{kind:'human',id:eligible[Math.floor(draw()*eligible.length)]!.id}]:null;
  };
  const animal=():DemandSelection[]|null=>{
    if(!c.animals.length)return null;
    const maximum=Math.floor(Math.max(f(c.animals.length*f(.6)),1));
    const count=1+Math.floor(draw()*maximum);
    return c.animals.map((a,index)=>({a,index})).sort((a,b)=>b.a.marketValue!-a.a.marketValue!||a.index-b.index)
      .slice(0,count).map(({a})=>({kind:'animal' as const,id:a.id}));
  };
  const objects=():DemandSelection[]|null=>{
    const pool=c.objects.filter(o=>f(o.unitMarketValue!*o.quantity)>=50&&!(o.apparel&&o.unitMarketValue!<500)&&!o.equipmentDestroyedOnDrop);
    const total=f(pool.reduce((sum,o)=>sum+f(o.unitMarketValue!*o.quantity),0));
    let remaining=f(Math.max(300,Math.min(3500,f(f(.05+f(draw()*f(.15)))*total))));
    const lines:DemandSelection[]=[];
    // Each iteration removes one original; bounded by captured object count.
    while(remaining>50){
      const eligible=pool.map((o,index)=>({o,index})).filter(({o})=>f(o.unitMarketValue!*o.quantity)<=f(remaining*2));
      if(!eligible.length)return null;
      const weighted=eligible.map(entry=>({...entry,weight:f(Math.pow(f(entry.o.unitMarketValue!/entry.o.unitMassKg!),2))}));
      const weight=weighted.reduce((sum,entry)=>sum+entry.weight,0);
      if(!Number.isFinite(weight)||weight<=0)throw new RangeError('Unsupported actual weighted selection');
      const ticket=draw()*weight;
      let cumulative=0;
      const picked=weighted.find(entry=>(cumulative+=entry.weight)>ticket)??weighted.at(-1)!;
      const q=Math.max(1,Math.min(picked.o.quantity,Math.floor(f(remaining/picked.o.unitMarketValue!))));
      remaining=f(remaining-f(picked.o.unitMarketValue!*q));
      lines.push({kind:picked.o.kind,id:picked.o.id,quantity:q});
      pool.splice(picked.index,1);
    }
    return lines.length?lines:null;
  };
  try {
    const branch=f(draw()*f(1.8));let lines:DemandSelection[]|null=null;
    if(branch<f(.15))lines=human();
    if(!lines&&branch<f(.3))lines=animal();
    lines??=objects();
    if(!lines)lines=draw()<.5?(human()??animal()):(animal()??human());
    return lines?{kind:'selected',lines,drawsUsed:cursor}:result('unavailable','No admissible native demand');
  }catch(error){
    if(error instanceof TapeExhausted)return result('blocked','Actual random tape is incomplete or invalid');
    if(error instanceof RangeError)return result('blocked',error.message);
    throw error;
  }
}

/** Native clamp and midpoint-to-even; counts include the actual animals too. */
export function ambushMapSide(playerCount:number,enemyCount:number):number|undefined {
  if(!Number.isSafeInteger(playerCount)||playerCount<1||!Number.isSafeInteger(enemyCount)||enemyCount<1)return;
  const raw=f(Math.sqrt(f((playerCount+enemyCount)*900))),lower=Math.floor(raw),part=raw-lower;
  const rounded=part===.5?lower+lower%2:Math.round(raw);
  return Math.max(75,Math.min(110,rounded));
}

/** A retained fraction is applied to the newly computed actual cost.
 * It does not pay distance, set pause or choose/revalidate any destination. */
export function resumedSegmentRemainder(newTotalCore:number,leftFraction:number):number|undefined {
  if(!positive(newTotalCore)||!Number.isFinite(leftFraction)||leftFraction< -16||leftFraction>1)return;
  const remaining=f(f(newTotalCore)*f(leftFraction));
  return Number.isFinite(remaining)?remaining:undefined;
}
