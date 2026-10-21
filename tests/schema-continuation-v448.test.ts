import {expect,test} from 'vitest';
import {isSchema256Or257,isSchema263OrLater,isSchema265OrLater,isSchema267OrLater,isSchema269OrLater,isSchema270OrLater,isSchema271OrLater} from '../src/sim/schema-compatibility-257.ts';
import {validCryptosleepCatalogueDomains271} from '../src/sim/catalogue-save-271.ts';

test('closed capability families include272 once and reject273 without opening270 to clinical or owner fields',()=>{
 for(const guard of [isSchema256Or257,isSchema263OrLater,isSchema265OrLater,isSchema267OrLater,isSchema269OrLater,isSchema270OrLater,isSchema271OrLater]){
  expect(guard(271)).toBe(true);expect(guard(272)).toBe(true);
  for(const future of [273,272.5,'272',NaN,Infinity,null,undefined])expect(guard(future)).toBe(false);
 }
 expect(isSchema271OrLater(270)).toBe(false);
 const actual={pawns:[{health:{tick:1,civilTick271:3}}],worldPawns:{heldPlayerCaskets271:[]}};
 const before=JSON.stringify(actual);
 expect(validCryptosleepCatalogueDomains271(actual,270)).toBe(false);
 expect(validCryptosleepCatalogueDomains271(actual,271)).toBe(true);
 expect(validCryptosleepCatalogueDomains271(actual,272)).toBe(true);
 expect(validCryptosleepCatalogueDomains271(actual,273)).toBe(false);
 expect(JSON.stringify(actual)).toBe(before);
});
