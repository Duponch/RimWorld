import {test,expect} from 'vitest';
import {WildlifeFrameState} from '../src/render/wildlife-frame-state';
test('a physical phase invalidates only its changed animal slot',()=>{const s=new WildlifeFrameState();expect(s.begin(7,0).value(1).unchanged()).toBe(false);expect(s.begin(8,0).value(2).unchanged()).toBe(false);expect(s.begin(7,0).value(1).unchanged()).toBe(true);s.invalidate(7);expect(s.begin(8,0).value(2).unchanged()).toBe(true);expect(s.begin(7,0).value(1).unchanged()).toBe(false);expect(s.begin(7,0).value(1).unchanged()).toBe(true);});
