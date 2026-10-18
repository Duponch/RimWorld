import {preparePlayerRetreat261} from './caravan-player-retreat-261.ts';
import {admitBornCaravan261} from './caravan-incidents-261.ts';
import type {GroupReformCommand260} from './group-reform-260.ts';
import type {World,CommandResult} from './types.ts';
import type {CampaignState,WorldGroupRecord} from './world-map-state.ts';
import type {GroupReorganizationCommand} from './group-reorganization-state.ts';
import type {GroupCommand} from './group-state.ts';
import {validGroupCommand} from './group-command-shape.ts';
import {applyGroupCommand} from './group-authority.ts';
import {registeredCampaign,registeredMap,registeredMapId,withWorldGroup} from './world-map-context.ts';
const fail=(reason:string):CommandResult=>({ok:false,code:'invalid-command',reason});
/** Explicit IDs select the actual owner; no singleton or implicit selected caravan mutates. */
export function applyRegisteredGroupCommand(input:CampaignState,c:GroupCommand,reorganization?:{apply(root:CampaignState,c:GroupReorganizationCommand):CommandResult;reform?(root:CampaignState,c:GroupReformCommand260):CommandResult}):CommandResult {
 const root=registeredCampaign(input),r=root.worldGroups!,maps=root.worldMaps!;
 if(!validGroupCommand(c,root.schemaVersion))return fail('Commande de groupe invalide.');
 if(c.type==='group-reform'){if(maps.selectedMapId!==c.originMapId)return fail('Le Camp source doit être confirmé et affiché.');return reorganization?.reform?reorganization.reform(root,c):fail('Le vrai contexte de caravane est indisponible.');}
 if(c.type==='group-split'||c.type==='group-merge')return reorganization?reorganization.apply(root,c):fail('Le contexte de mouvement confirme de la caravane est indisponible.');
 if(c.type==='planet-adopt'){const map=maps.selectedMapId===null?undefined:registeredMap(root,maps.selectedMapId);return map?applyGroupCommand(map,c):fail('Sélectionnez une carte réelle.');}
 const creation=c.type==='group-start'||c.type==='group-unload'&&c.groupId===undefined;
 if(creation){const id=c.originMapId!,map=registeredMap(root,id);if(c.type==='group-start'&&c.retreat261){if(!map||maps.selectedMapId!==id)return fail('La carte source doit être confirmée et affichée.');const retreat=preparePlayerRetreat261(map,c);return retreat.ok?retreat.commit():fail(retreat.reason);}if(c.type==='group-start'&&maps.sites.some(s=>s.id===id&&s.battlefield261&&!s.battlefield261.won))return fail('Remportez la bataille avant d’emprunter la sortie physique.');if(!map||maps.selectedMapId!==id)return fail('La carte source doit être confirmée et affichée.');const result=applyGroupCommand(map,c);if(!result.ok)return result;const g=map.group;if(!g)throw Error('Formation missing after successful command');const record=maps.sites.find(m=>m.id===id)!;const born:WorldGroupRecord={originMapId:id,localMapId:id,...r.canonicalPostId!==null?{postId:r.canonicalPostId}:{},context:{seed:map.seed,width:map.width,height:map.height,...map.climate?{climate:map.climate}:{},...map.site?{site:map.site}:{},...map.scenario?{scenario:map.scenario}:{}},state:g};admitBornCaravan261(root,born);if(born.encounters261){const target=maps.sites.find(s=>s.tile===g.destination);if(target)born.arrival261={tile:g.destination,action:{kind:'enter',mapId:target.id}};}r.groups.push(born);delete map.group;r.selectedGroupId=g.id;return result;}
 const groupId=c.groupId!,record=r.groups.find(g=>g.state.id===groupId);if(record?.pending261)return fail('Cette rencontre attend sa décision.');if(!record)return fail('Ce groupe n’existe plus.');
 if(c.type==='group-unload'&&(record.localMapId!==c.originMapId||maps.selectedMapId!==c.originMapId))return fail('Le déchargement appartient à une autre carte.');
 const result=withWorldGroup(root,groupId,view=>applyGroupCommand(view,c))??fail('Groupe absent.');if(result.ok&&c.type==='group-route'&&record.encounters261){delete record.arrival261;const target=maps.sites.find(s=>s.tile===c.destination);if(target)record.arrival261={tile:c.destination,action:{kind:'enter',mapId:target.id}};}return result;
}
