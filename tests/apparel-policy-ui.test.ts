import {describe,expect,it} from 'vitest';
import {foodPolicyLayout} from '../src/ui/food-policy-controls';
import {apparelAssignmentLayout} from '../src/ui/apparel-policy-controls';

describe('apparel assignment layout',()=>{
  it('adds compact apparel controls to the shared assignments table',()=>{
    const html=apparelAssignmentLayout(foodPolicyLayout());
    expect(html).toContain('<th>Régime alimentaire</th><th>Tenue</th><th>Auto.</th><th>Réaction hostile</th>');
    expect(html).toContain('Choisissez les aliments et la tenue autorisés pour chaque colon.');
    expect(html).not.toContain('Vêtements, drogues, et réaction Attaquer restent à développer.');
  });
});
