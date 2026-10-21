import {expect,test} from 'vitest';
import {isSchema256Or257,isSchema263OrLater,isSchema265OrLater,isSchema267OrLater,isSchema269OrLater,isSchema270OrLater,isSchema271OrLater,isSchema272OrLater,isSchema273OrLater,isSchema274OrLater,isSchema275OrLater} from '../src/sim/schema-compatibility-257.ts';
import {validGroupCommand} from '../src/sim/group-command-shape.ts';
import {validWorldRelationKind274} from '../src/sim/world-diplomacy-274.ts';
import {validGiftHistoricalTransport274} from '../src/sim/diplomatic-gift-transport-274.ts';
import {validShipReactorHistoricalTransport275} from '../src/sim/ship-reactor-save-275.ts';

test('all supported capability families close at276 while old gift and relation contracts continue',()=>{
  for(const guard of [isSchema256Or257,isSchema263OrLater,isSchema265OrLater,isSchema267OrLater,isSchema269OrLater,isSchema270OrLater,isSchema271OrLater,isSchema272OrLater,isSchema273OrLater,isSchema274OrLater,isSchema275OrLater]){
    expect(guard(275)).toBe(true);expect(guard(276)).toBe(true);
    for(const future of [277,275.1,'275',NaN,Infinity,null,undefined])expect(guard(future)).toBe(false);
  }
  expect(isSchema274OrLater(273)).toBe(false);expect(isSchema275OrLater(274)).toBe(false);
  const c={type:'group-gift274',groupId:5,lines:[{pileId:17,quantity:2}],quote:'correlated'};
  for(const version of [274,275,276]){
    expect(validGroupCommand(c,version)).toBe(true);
    expect(validWorldRelationKind274(2,'ally',version)).toBe(true);
    expect(validWorldRelationKind274(-2,'hostile',version)).toBe(true);
    expect(validGiftHistoricalTransport274({civilianPost:{gifts274:false}},version)).toBe(true);
  }
  for(const version of [273,277])expect(validGroupCommand(c,version)).toBe(false);
});

test('strict274 never accepts ship fields from an inactive map or retained owner, including undefined',()=>{
  const cases=[
    {structures:[{kind:'ship-reactor'}]},
    {structures:[{kind:'wall',shipReactor275:undefined}]},
    {worldMaps:{sites:[{map:{jobs:[{kind:'ship-reactor'}]}}]}},
    {worldGroups:{abandonedPawns:[{packed:[{building:{kind:'ship-reactor'}}]}]}},
    {research:{shipBasics:{points:0}}},
    {destroyed:{lost:{plasteel:undefined}}},
  ];
  expect(validShipReactorHistoricalTransport275({piles:[{item:'plasteel',kind:'plasteel'}]},274)).toBe(true);
  for(const raw of cases){expect(validShipReactorHistoricalTransport275(raw,274)).toBe(false);expect(validShipReactorHistoricalTransport275(raw,277)).toBe(false);}
});
