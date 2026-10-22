/** Core1.6.4871rev590 physical facts; holder and clinical clocks are separate. */
export const SHIP_CASKET_RESEARCH_POINTS_277=2800;
export const SHIP_CASKET_CONTENT_277=Object.freeze({
 kind:'ship-cryptosleep-casket' as const,label:'Caisson de cryptosommeil spatial',nativeDef:'Ship_CryptosleepCasket',researchProject:'ship-cryptosleep' as const,
 width:1,depth:2,defaultOrientation:2 as const,rotatable:true,work:800,coreWork:8000,constructionSkill:8,maxHitPoints:200,
 support:'Heavy' as const,roof:false,quality:false,minifiable:false,flammability:0,beauty:0,
 blocksMovement:false,passability:'pass-through' as const,pathCostCore:42,fill:.5,blocksLight:false,blocksWind:true,zones:false,
 powerRole:'transmitter' as const,powerWatts:0,transmitsPower:true,fuel:false,flick:false,breakdown:false,stunnable:false,
 leavesResourcesWhenKilled:true,playerEjectable:true,explosionRadius:Math.fround(2.66),explosionDamage:'flame' as const,wickMinCore:140,wickMaxCore:150,wickRemainingHitPoints:40,
 ingredients:Object.freeze([
  Object.freeze({item:'steel' as const,quantity:120}),Object.freeze({item:'uranium' as const,quantity:14}),
  Object.freeze({item:'component' as const,quantity:3}),Object.freeze({item:'advanced-component' as const,quantity:3}),
 ]),
});
export const isShipCasketKind277=(kind:unknown):kind is 'ship-cryptosleep-casket'=>kind==='ship-cryptosleep-casket';
