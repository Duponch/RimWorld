/** Profile admission only. The three historical families keep their literal
 * versions and population contracts. No creation, density or arrival is
 * inferred from the presence of this new name. */
export const GEOGRAPHIC_FAUNA_PROFILE_256='geographic-fauna-v3' as const;
export function validWildlifeProfileVersion256(world:{site?:{revision:number}},version:number,state:unknown):boolean {
 if(state===undefined)return true;
 if(!state||typeof state!=='object'||Array.isArray(state))return false;
 const s=state as {profile?:unknown;population?:unknown};
 switch(s.profile){
  case 'temperate-hares-v1':return version>=76;
  case 'biome-herbivores-v1':return version>=91;
  case 'biome-fauna-v2':return version>=178;
  case GEOGRAPHIC_FAUNA_PROFILE_256:return version===256&&world.site?.revision===3&&!Object.hasOwn(s,'population');
  default:return false;
 }
}
