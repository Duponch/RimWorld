/** One authored rigid shape, reused on the ground, in cargo and at the hip.
 * Dimensions are metres before the pawn's model conversion. */
export const REVOLVER_PARTS = [
  {size:[.31,.065,.065],center:[.05,.065,0],color:0x69757a},
  {size:[.10,.10,.09],center:[-.055,.045,0],color:0x839093},
  {size:[.075,.14,.065],center:[-.105,-.055,0],color:0x705446},
] as const;

const RIFLE_PARTS = [
  {size:[.64,.045,.045],center:[.20,.055,0],color:0x667277},
  {size:[.35,.08,.07],center:[-.085,.025,0],color:0x725740},
  {size:[.24,.14,.06],center:[-.31,-.005,0],color:0x8b6b4c},
  {size:[.11,.09,.055],center:[-.015,.065,0],color:0x859195},
  {size:[.055,.04,.11],center:[-.07,.075,.035],color:0x596367},
] as const;
const KNIFE_PARTS = [
  {size:[.25,.055,.018],center:[.07,.005,0],color:0xb8d0d2},
  {size:[.06,.035,.016],center:[.205,.005,0],color:0xd4e6e5},
  {size:[.11,.045,.035],center:[-.11,0,0],color:0x53656b},
  {size:[.025,.105,.04],center:[-.045,0,0],color:0x849ea3},
] as const;

/** Resident variants share one rig, one cargo batch and the same authored parts
 * as ground piles. Dye tags -2/-3 are already used by clothing. */
export const WEAPON_VISUALS = [
  {item:'revolver',equipment:1,cargo:21,dye:-1,parts:REVOLVER_PARTS},
  // 31–53 belong to folded apparel. Cargo IDs are render-only, never saved.
  {item:'bolt-action-rifle',equipment:2,cargo:70,dye:-4,parts:RIFLE_PARTS},
  {item:'plasteel-knife',equipment:3,cargo:71,dye:-5,parts:KNIFE_PARTS},
] as const;
export const weaponVisual=(item:string|undefined)=>WEAPON_VISUALS.find(v=>v.item===item);
