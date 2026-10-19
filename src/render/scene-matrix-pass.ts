import type {Scene} from 'three/webgpu';

/** All CPU poses are settled before the draw. Three r186 otherwise traverses
 * the same game scene again for each nested shadow render. Keep one complete
 * update for this draw; preparation and callers outside it retain normal
 * automatic updates, including after a failed render. */
export function withPreparedSceneMatrices<T>(scene:Scene,draw:()=>T):T {
  const automatic=scene.matrixWorldAutoUpdate;
  if(automatic){scene.updateMatrixWorld();scene.matrixWorldAutoUpdate=false;}
  try{return draw();}
  finally{scene.matrixWorldAutoUpdate=automatic;}
}
