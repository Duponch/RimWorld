// Vite resolves these package imports to the active pinned runtime. Native
// diagnostics must not assume a particular optimized-dependency filename.
import * as THREE from 'three/webgpu';
import { vec3 } from 'three/tsl';
export { THREE, vec3 };
