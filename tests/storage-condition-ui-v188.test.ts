import { expect,test } from 'vitest';
import { storageConditionSelection } from '../src/ui/storage-item-controls';

test('inactive ranges stay absent while explicitly enabled full ranges remain present',()=>{
  expect(storageConditionSelection()).toEqual({});
  expect(Object.keys(storageConditionSelection())).toHaveLength(0);
  expect(storageConditionSelection({min:'awful',max:'legendary'},{min:'0',max:'100'}))
    .toEqual({quality:{min:'awful',max:'legendary'},hitPoints:{min:0,max:100}});
});

test('quality and hit points can be restricted independently without changing the input',()=>{
  const quality={min:'normal',max:'excellent'},hp={min:'51',max:'100'};
  expect(storageConditionSelection(quality)).toEqual({quality:{min:'normal',max:'excellent'}});
  expect(storageConditionSelection(undefined,hp)).toEqual({hitPoints:{min:51,max:100}});
  expect(quality).toEqual({min:'normal',max:'excellent'});expect(hp).toEqual({min:'51',max:'100'});
});

test('equal boundaries are valid for both filters, including zero and one hundred percent',()=>{
  expect(storageConditionSelection({min:'masterwork',max:'masterwork'},{min:'0',max:'0'}))
    .toEqual({quality:{min:'masterwork',max:'masterwork'},hitPoints:{min:0,max:0}});
  expect(storageConditionSelection(undefined,{min:'100',max:'100'})).toEqual({hitPoints:{min:100,max:100}});
});

test('unknown or inverted quality ranges fail explicitly rather than dropping or swapping the restriction',()=>{
  for(const quality of [{min:'',max:'legendary'},{min:'normal',max:'unknown'},
    {min:'legendary',max:'awful'},{min:'<img src=x>',max:'legendary'}])
    expect(()=>storageConditionSelection(quality)).toThrow();
});

test('empty, fractional, out-of-bounds and inverted hit-point ranges never clamp into accepted input',()=>{
  for(const hp of [{min:'',max:'100'},{min:'0',max:' '},{min:'-1',max:'100'},
    {min:'0',max:'101'},{min:'50.5',max:'100'},{min:'51',max:'50'},
    {min:'NaN',max:'100'},{min:'0',max:'Infinity'}])
    expect(()=>storageConditionSelection(undefined,hp)).toThrow();
});
