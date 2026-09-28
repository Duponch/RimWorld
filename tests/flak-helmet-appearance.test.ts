import { expect, test } from 'vitest';
import { createWorld } from '../src/sim/engine';
import { APPAREL, armorPiece, apparelDuration, newApparelState } from '../src/sim/apparel-rules';
import {resolveArmor} from '../src/sim/armor';
import { validApparelShape } from '../src/sim/apparel-save';
import { createDefaultApparelPolicyRegistry } from '../src/sim/apparel-policy';
import { appearanceOf } from '../src/sim/pawn-appearance';
import { apparelAppearance, APPAREL_CARGO, foldedApparel } from '../src/render/character-apparel';
import { pawnGeometry, FLAK_HELMET_DYE } from '../src/render/pawn-geometry';
import { PawnLayer } from '../src/render/PawnLayer';
import { portraitDataUrl } from '../src/ui/pawn-portrait';
import type { MaterialPile } from '../src/sim/types';

function helmet(id:number,pawnId:number):MaterialPile {
  return {id,item:'flak-helmet',kind:'apparel',quantity:1,owner:{type:'apparel',pawnId},apparel:newApparelState('flak-helmet')};
}

test('steel flak helmet protects only upper head, shares the apparel layers and rejects pre-V141 saves',()=>{
  const def=APPAREL['flak-helmet'],pile=helmet(100,1);
  expect(def).toMatchObject({hitPoints:120,equipTicks:9,ratings:{sharp:.63,blunt:.315,heat:.42},coldInsulation:.45,heatInsulation:0,moveOffset:0});
  expect(armorPiece(pile).coverage.parts).toContain('brain');
  expect(armorPiece(pile).coverage.parts).not.toContain('left-eye');
  expect(armorPiece(pile).coverage.parts).not.toContain('torso');
  const strike={amount:12,penetration:.2,category:'sharp' as const,part:'brain' as const},bare={sharp:0,blunt:0,heat:0};
  expect(resolveArmor(strike,[armorPiece(pile)],bare,()=>.5).wear).toHaveLength(1);
  expect(resolveArmor({...strike,part:'left-eye'},[armorPiece(pile)],bare,()=>.5).wear).toHaveLength(0);
  expect(validApparelShape(pile as unknown as Record<string,unknown>,140)).toBe(false);
  expect(validApparelShape(pile as unknown as Record<string,unknown>,141)).toBe(true);
  const world=createWorld(42,32,32),pawn=world.pawns[0]!;
  expect(apparelDuration(world,pawn,pile,'wear')).toBe(9);
  expect(apparelDuration(world,pawn,pile,'remove')).toBe(9);
});

test('new apparel policies include the helmet while the historical default catalogue does not',()=>{
  const current=createDefaultApparelPolicyRegistry();
  expect(current.apparelPolicies.every(policy=>policy.allowedItems.includes('flak-helmet'))).toBe(true);
  const historical=createDefaultApparelPolicyRegistry(false);
  expect(historical.apparelPolicies.every(policy=>!policy.allowedItems.includes('flak-helmet'))).toBe(true);
});

test('helmet, vest and carried model stay in existing resident actor/cargo batches and portrait',()=>{
  const world=createWorld(42,32,32),pawn=world.pawns[0]!,piece=helmet(world.nextId++,pawn.id);
  world.piles.push(piece);
  const look=apparelAppearance([piece]);
  expect(look).toMatchObject({helmet:true,vest:false,silhouette:0});
  expect(APPAREL_CARGO['flak-helmet']).toBe(59);
  expect(foldedApparel('flak-helmet')).toHaveLength(2);
  const geometry=pawnGeometry(),dye=geometry.getAttribute('dye'),bone=geometry.getAttribute('boneId');
  let helmetVertices=0;
  for(let i=0;i<dye.count;i++)if(dye.getX(i)===FLAK_HELMET_DYE){helmetVertices++;expect(bone.getX(i)).toBe(1);}
  expect(helmetVertices).toBeGreaterThan(60);
  // V148's second resident helmet increases the shared pawn model from 2240
  // to 2442 vertices; the V141 flak shell remains in the same actor batch.
  expect(geometry.getAttribute('position').count).toBe(2442);
  geometry.dispose();
  const layer=new PawnLayer();layer.update(world,1,true);
  const actor=layer.feedbackSource!;
  expect(actor.getAttribute('aEquipment').getZ(0)).toBe(2);
  const vest:MaterialPile={id:world.nextId++,item:'flak-vest',kind:'apparel',quantity:1,owner:{type:'apparel',pawnId:pawn.id},apparel:newApparelState('flak-vest')};
  world.piles.push(vest);layer.update(world,1,false);
  expect(layer.feedbackSource!.getAttribute('aEquipment').getZ(0)).toBe(3);
  const bare=decodeURIComponent(portraitDataUrl(appearanceOf(pawn,world.seed),apparelAppearance()).split(',')[1]!);
  const worn=decodeURIComponent(portraitDataUrl(appearanceOf(pawn,world.seed),apparelAppearance([piece,vest])).split(',')[1]!);
  expect(bare).toContain('data-helmet="false"');
  expect(worn).toContain('data-helmet="true"');
  expect(worn).not.toBe(bare);
});
