/** The shared native Human birth leaf, called AFTER real MakeThing and both
 * initial component calls, BEFORE GenerateRandomAge. Inputs are resolved
 * request/KindDef/RaceProperties facts, never render appearance or a750 draw.
 * No actor, persistent header, RNG stream or missing input is constructed. */
export type ActualHumanGender256='None'|'Male'|'Female';
export interface ActualHumanGenderInputs256 {
 readonly requestFixedGender:ActualHumanGender256|null;
 readonly kindFixedGender:ActualHumanGender256|null;
 readonly raceHasGenders:boolean;
 readonly raceForceGender:ActualHumanGender256;
}
const known=(v:unknown):v is ActualHumanGender256=>v==='None'||v==='Male'||v==='Female';
export function drawActualHumanGender256(input:ActualHumanGenderInputs256,random:{value():number}):ActualHumanGender256 {
 if(!input||input.requestFixedGender!==null&&!known(input.requestFixedGender)
  ||input.kindFixedGender!==null&&!known(input.kindFixedGender)
  ||typeof input.raceHasGenders!=='boolean'||!known(input.raceForceGender))throw Error('Actual explicit Human gender inputs are required');
 // A present nullable FixedGender=None is still a true override. Neither
 // request nor KindDef override may fall through to the random branch.
 if(input.requestFixedGender!==null)return input.requestFixedGender;
 if(input.kindFixedGender!==null)return input.kindFixedGender;
 if(!input.raceHasGenders)return 'None';
 if(input.raceForceGender!=='None')return input.raceForceGender;
 return random.value()<Math.fround(.5)?'Male':'Female';
}
