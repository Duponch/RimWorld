import type {BodyAssessmentInput,BodyAssessment} from './body-capacities.ts';
import type {BodyModel} from './body-model-compiler.ts';
/** Original tag projection for the new actual anatomies. It reads already
 * computed injury efficiencies; no actor, time or RNG is acquired here. */
export function assessNativeAnimalBody256(input:BodyAssessmentInput,model:BodyModel,efficiency:Float64Array):BodyAssessment {
  const parts=model.parts,parents=model.parents;
  const has=(index:number,tag:string)=>parts[index]!.nativeTags?.includes(tag)===true;
  const under=(index:number,ancestor:number)=>{for(let p=index;p>=0;p=parents[p]!)if(p===ancestor)return true;return false;};
  const average=(values:readonly number[])=>values.length?values.reduce((a,b)=>a+b,0)/values.length:1;
  const tag=(name:string,bestWeight=0)=>{
    const values=parts.flatMap((_,i)=>has(i,name)?[efficiency[i]!]:[]);if(!values.length)return 1;
    if(!bestWeight||values.length===1)return average(values);
    const best=Math.max(...values),index=values.indexOf(best);values.splice(index,1);return best*bestWeight+average(values)*(1-bestWeight);
  };
  const limb=(core:string,segment:string,digit:string,weight:number)=>{
    const cores=parts.flatMap((_,i)=>has(i,core)?[i]:[]);if(!cores.length)return {value:0,functional:0};
    let sum=0,functional=0;
    for(const i of cores){let root=i;while(parents[root]!>=0&&has(parents[root]!,segment))root=parents[root]!;
      let value=efficiency[i]!;
      for(let j=0;j<parts.length;j++)if(under(j,root)&&has(j,segment))value*=efficiency[j]!;
      const digits=parts.flatMap((_,j)=>under(j,i)&&has(j,digit)?[efficiency[j]!]:[]);
      if(digits.length)value*=1-weight+weight*average(digits);
      sum+=value;if(value>0)functional++;
    }
    return {value:sum/cores.length,functional:functional/cores.length};
  };
  // Match the established published hundredth rounding without importing the
  // capacity module back into itself at runtime.
  const round=(n:number)=>{const v=Math.max(0,n)*100,l=Math.floor(v);return (v-l===.5?l+l%2:Math.round(v))/100;};
  const bloodPumping=round(tag('BloodPumpingSource'));
  const kidney=parts.some((_,i)=>has(i,'BloodFiltrationKidney'));
  const bloodFiltration=round(((kidney?tag('BloodFiltrationKidney')*tag('BloodFiltrationLiver'):tag('BloodFiltrationSource'))+(input.bloodFiltrationOffset??0))*(input.bloodFiltrationFactor??1));
  const breathing=round(tag('BreathingSource')*Math.min(1,tag('BreathingPathway'))*Math.min(1,tag('BreathingSourceCage'))+(input.breathingOffset??0));
  const digestion=round(tag('MetabolismSource')+(input.digestionOffset??0));
  const pain=Math.min(.4,Math.max(0,(input.pain-.1)*(.4/.9)));
  const natural=(tag('ConsciousnessSource')-(pain>=.01?pain:0))*(.8+.2*Math.min(1,bloodPumping))*(.8+.2*Math.min(1,breathing))*(.9+.1*Math.min(1,bloodFiltration));
  const consciousness=round(Math.min(input.consciousnessMax??Infinity,(natural+(input.consciousnessOffset??0))*(input.consciousnessFactor??1))),canBeAwake=consciousness>=.3;
  const legs=limb('MovingLimbCore','MovingLimbSegment','MovingLimbDigit',.4),arms=limb('ManipulationLimbCore','ManipulationLimbSegment','ManipulationLimbDigit',.8);
  const moving=canBeAwake&&legs.functional>=.4999?round((legs.value*tag('Pelvis')*tag('Spine')*(.8+.2*breathing)*(.8+.2*bloodPumping)*Math.min(1,consciousness)+(input.movingOffset??0))*(input.movingFactor??1)):0;
  const capacities=Object.freeze({consciousness,moving,manipulation:canBeAwake?round((arms.value*consciousness+(input.manipulationOffset??0))*(input.manipulationFactor??1)):0,
    sight:round(tag('SightSource',.75)+(input.sightOffset??0)),hearing:round(tag('HearingSource',.75)+(input.hearingOffset??0)),talking:0,
    eating:canBeAwake?round(tag('EatingSource')*Math.min(1,tag('EatingPathway'))*(.5+.5*tag('Tongue'))*consciousness*(input.eatingFactor??1)):0,
    breathing,bloodPumping,bloodFiltration,digestion});
  return Object.freeze({capacities,canBeAwake,movingCapable:moving>.15,painShock:input.pain>=.8,
    vitalFailure:efficiency[0]!<=.0001||[consciousness,breathing,bloodPumping,bloodFiltration,digestion].some(n=>n<=0)});
}
