import * as wood from './scenarios/wood-conservation.ts';
import * as repair from './scenarios/repair-conservation.ts';
import {test} from 'vitest';
import {instrumentationOrderProof} from './scenarios/instrumentation-order.ts';

test('Campagne : bois importé avant maintenance conserve les vrais producteurs et leur reprise',()=>{
  instrumentationOrderProof(wood,repair);
},10000);
