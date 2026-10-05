import * as repair from './scenarios/repair-conservation.ts';
import * as wood from './scenarios/wood-conservation.ts';
import {test} from 'vitest';
import {instrumentationOrderProof} from './scenarios/instrumentation-order.ts';

test('Campagne : maintenance importée avant bois conserve les vrais producteurs et leur reprise',()=>{
  instrumentationOrderProof(wood,repair);
},10000);
