import type { World } from './types.ts';
import type { RelationshipPeople } from './relationship-state.ts';
import { captureHumanOwners } from './human-owners.ts';

/** References are resolved against exclusive real owners, including frozen identities. */
export function captureRelationshipPeople(world:World):RelationshipPeople {return captureHumanOwners(world).people;}
