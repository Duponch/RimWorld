import {expect,it} from 'vitest';
import {campPreparationLabel256} from '../src/ui/camp-preparation-view-256';
it('shows player-facing phase labels without displaying raw generator identifiers',()=>{
 expect(campPreparationLabel256('animals1200')).toBe('Faune');
 expect(campPreparationLabel256('preparing')).toBe('Préparation de la carte locale');
 expect(campPreparationLabel256('plants900')).toBe('Végétation');
 expect(campPreparationLabel256('toString')).toBe('Préparation du terrain');
 expect(campPreparationLabel256('flowPostFog1600')).toBe('Courants');
 expect(campPreparationLabel256('<untrusted phase>')).toBe('Préparation du terrain');
});

it('names actual colony generation phases for the shared cancellable preparation',()=>{expect(campPreparationLabel256('shrines750')).toBe('Temples anciens');expect(campPreparationLabel256('hives1120')).toBe('Ruches des grottes');});
