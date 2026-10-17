/** Mechanical facts only. Native story prose/titles and name words are not
 * product data. All pool rows retain their observed native order. */
export interface AncientBackstoryFact256 {
 readonly id:string;readonly slot:'Childhood'|'Adulthood';readonly shuffleable:boolean;
 readonly requiresSpawnCategory:boolean;readonly categories:readonly string[];
 readonly workDisables:number;readonly requiredWorkTags:number;
 readonly skills:readonly (readonly [string,number])[];
 readonly forcedTraits:readonly (readonly [string,number])[]|null;
 readonly disallowedTraits:readonly (readonly [string,number])[]|null;
 readonly bodyGlobal:string|null;readonly bodyMale:string|null;readonly bodyFemale:string|null;
 readonly nameMaker:string|null;readonly possessions:readonly (readonly [string,number,number])[];
}
export type AncientNameTokenTriple256=readonly [first:number,nick:number,last:number,nickSet:boolean];
export interface AncientSolidBioFact256 {readonly gender:'Male'|'Female'|'Either';readonly childhood:string;readonly adulthood:string;readonly rare:boolean;readonly pirateKing:boolean;readonly name:AncientNameTokenTriple256}
export interface AncientHumanBioFacts256 {
 readonly revision:1;readonly observationSha256:string;readonly wordCount:number;
 readonly stories:readonly AncientBackstoryFact256[];readonly solidBios:readonly AncientSolidBioFact256[];
 readonly solidNames:Readonly<Record<'Male'|'Female'|'Either',readonly AncientNameTokenTriple256[]>>;
 readonly shuffled:Readonly<{maleFirst:readonly number[];femaleFirst:readonly number[];maleNick:readonly number[];femaleNick:readonly number[];unisexNick:readonly number[];last:readonly number[]}>;
 readonly tags:Readonly<Record<string,number>>;readonly workTypes:readonly number[];
}
export interface AncientHumanNameTriple256 {readonly first:string;readonly nick:string;readonly last:string;readonly nickSet:boolean}
export type AncientHumanKnownName256={readonly kind:'single';readonly value:string}|{readonly kind:'triple';readonly name:AncientHumanNameTriple256};

