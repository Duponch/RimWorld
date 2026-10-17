import {expect,test} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction';
import {validateFilth} from '../src/sim/filth-save';
import {filthCheckPeriod,FILTH_DEFINITIONS} from '../src/sim/filth-rules';
test('only prospective rock rubble accepts its real inclusive Core50day endpoint',()=>{
 const w=deconstructionCamp(),x=10,z=10,cell=z*w.width+x;w.tiles[cell]!.terrain='soil';delete w.tiles[cell]!.floor;
 const id=w.nextId++;w.filth={rng:1,cleaned:0,items:[{id,kind:'rock-rubble',x,z,thickness:1,grownCore:w.tick*10,expiresAfterCore:3000000,nextCheckCore:w.tick*10+filthCheckPeriod(w)}]};
 expect(validateFilth(w,256)).toEqual([]);expect(validateFilth(w,255)).not.toEqual([]);w.filth.items[0]!.expiresAfterCore++;expect(validateFilth(w,256)).not.toEqual([]);
 const record=w.filth.items[0]!;record.kind='dirt';record.expiresAfterCore=FILTH_DEFINITIONS.dirt.maxDays*60000;expect(validateFilth(w,256)).not.toEqual([]);record.expiresAfterCore--;expect(validateFilth(w,256)).toEqual([]);expect(validateFilth(w,255)).toEqual([]);
});
