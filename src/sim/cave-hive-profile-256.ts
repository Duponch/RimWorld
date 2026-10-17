/** Core4871 Medium, label adventure story: explicit XML value .5. The class
 * default1 is not a fallback for absent or unknown product profiles. */
import type {World} from './types.ts';
export function hiveReproductionFactor256(w:Pick<World,'gameProfile'>):number {
 const p=w.gameProfile;
 if(!p||p.revision!==1||p.storyteller!=='cassandra-partial'||p.difficulty!=='adventure-story'||p.saveMode!=='reloadable')throw Error('Hive runtime requires the actual supported AdventureStory profile');
 return .5;
}
