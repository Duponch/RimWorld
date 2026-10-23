import type {ShelfStorageSettings} from './shelf-storage.ts';

/** The effective policy stays in shelf.settings for existing local readers.
 * The native independent policy is hidden while linked, never a fallback. */
export interface LinkedShelfMember286 {
 readonly revision:1;
 groupId:number;
 independent:ShelfStorageSettings;
}
export interface LinkedStorageGroup286 {
 id:number;
 originMapId:number;
 name:string;
 settings:ShelfStorageSettings;
 memberIds:number[];
}
/** Policy ownership only: no furniture, cargo, cells or people live here. */
export interface LinkedStorageRegistry286 {
 readonly revision:1;
 nextId:number;
 groups:LinkedStorageGroup286[];
}
export type LinkedStorageCommand286=
 |{type:'shelf-link';structureIds:number[]}
 |{type:'shelf-unlink';structureId:number}
 |{type:'shelf-group-rename';structureId:number;name:string};
