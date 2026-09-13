/// <reference types="@webgpu/types" />
import { navigationShader } from './shaders';
import { validateBatch, validateGrid, type NavigationBatch, type NavigationGrid, type NavigationOptions, type NavigationRequest, type NavigationStatus } from './contracts';
export * from './contracts';

export interface NavigationAdapterInfo {
  vendor: string;
  architecture: string;
  device: string;
  description: string;
  isFallbackAdapter: boolean | null;
}

/** Native WebGPU, no canvas/Three/DOM dependency: also usable in a dedicated worker.
 * Experimental static navigation only. Reservations and simulation stay external.
 */
export class GpuNavigator {
  readonly adapter: NavigationAdapterInfo;
  private readonly device: GPUDevice;
  private readonly layout: GPUBindGroupLayout;
  private readonly pipelines: Record<'initialize' | 'relax' | 'checkConvergence' | 'extract', GPUComputePipeline>;
  private grid: NavigationGrid | null = null;
  private generation = 0;
  private busy = false;
  private disposed = false;
  private failure: string | null = null;

  private constructor(device: GPUDevice, adapter: GPUAdapter, layout: GPUBindGroupLayout, pipelines: GpuNavigator['pipelines']) {
    this.device = device; this.layout = layout; this.pipelines = pipelines;
    const info = adapter.info;
    this.adapter = {
      vendor: info.vendor, architecture: info.architecture, device: info.device, description: info.description,
      isFallbackAdapter: 'isFallbackAdapter' in info ? Boolean(info.isFallbackAdapter) : null,
    };
    void device.lost.then(info => { this.failure = `WebGPU device lost (${info.reason}): ${info.message}`; });
  }

  static async create(): Promise<GpuNavigator> {
    if (!globalThis.navigator?.gpu) throw new Error('WebGPU unavailable in this browser/context');
    const adapter = await globalThis.navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) throw new Error('No WebGPU adapter available');
    const device = await adapter.requestDevice({ label: 'Lisière navigation experiment' });
    try {
      const module = device.createShaderModule({ label: 'integer navigation WGSL', code: navigationShader });
      const compilation = await module.getCompilationInfo();
      const errors = compilation.messages.filter(message => message.type === 'error');
      if (errors.length) throw new Error(errors.map(error => `${error.lineNum}:${error.linePos} ${error.message}`).join('\n'));
      const layout = device.createBindGroupLayout({ entries: [
        ...[0, 1, 2].map(binding => ({ binding, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' as const } })),
        ...[3, 4, 5].map(binding => ({ binding, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' as const } })),
        { binding: 6, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      ] });
      const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [layout] });
      const entries = ['initialize', 'relax', 'checkConvergence', 'extract'] as const;
      const built = await Promise.all(entries.map(entryPoint => device.createComputePipelineAsync({
        label: `navigation ${entryPoint}`, layout: pipelineLayout, compute: { module, entryPoint },
      })));
      const pipelines = Object.fromEntries(entries.map((entry, index) => [entry, built[index]])) as GpuNavigator['pipelines'];
      return new GpuNavigator(device, adapter, layout, pipelines);
    } catch (error) { device.destroy(); throw error; }
  }

  get revision(): number | null { return this.grid?.revision ?? null; }

  setGrid(grid: NavigationGrid): void {
    this.assertUsable(); validateGrid(grid);
    if (this.grid && grid.revision <= this.grid.revision) throw new RangeError('grid revision must strictly increase');
    // Ownership is explicit: caller mutation during GPU execution cannot change this snapshot.
    this.grid = { ...grid, costs: new Uint32Array(grid.costs) };
    this.generation++;
  }

  async solve(requests: readonly NavigationRequest[], options: NavigationOptions = {}): Promise<NavigationBatch> {
    this.assertUsable();
    if (!this.grid) throw new Error('setGrid must be called before solve');
    if (this.busy) throw new Error('one navigation batch may be in flight per navigator');
    const grid = this.grid;
    const capturedRequests = requests.map(request => ({ ...request }));
    const bounds = validateBatch(grid, capturedRequests, options);
    const { maxIterations, maxPathLength, fieldBytes, outputBytes, allocatedBytes } = bounds;
    const count = grid.width * grid.height;
    const device = this.device;
    for (const size of [grid.costs.byteLength, fieldBytes, outputBytes]) {
      if (size > device.limits.maxStorageBufferBindingSize || size > device.limits.maxBufferSize) throw new RangeError('device buffer capacity exceeded');
    }
    if (Math.ceil(count / 64) > device.limits.maxComputeWorkgroupsPerDimension) throw new RangeError('device dispatch capacity exceeded');
    const generation = this.generation;
    const startTime = performance.now();
    this.busy = true;
    const buffers: GPUBuffer[] = [];
    device.pushErrorScope('validation');
    let scopePopped = false;
    try {
      const buffer = (label: string, size: number, usage: GPUBufferUsageFlags) => {
        const result = device.createBuffer({ label, size, usage }); buffers.push(result); return result;
      };
      const storage = GPUBufferUsage.STORAGE;
      const upload = storage | GPUBufferUsage.COPY_DST;
      const costs = buffer('terrain costs', grid.costs.byteLength, upload);
      const pairs = buffer('start goal pairs', capturedRequests.length * 8, upload);
      const fieldA = buffer('distance A', fieldBytes, storage);
      const fieldB = buffer('distance B', fieldBytes, storage);
      const changed = buffer('convergence flags', capturedRequests.length * 4, storage);
      const results = buffer('GPU route results', outputBytes, storage | GPUBufferUsage.COPY_SRC);
      const readback = buffer('final route readback', outputBytes, GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ);
      const params = buffer('navigation params', 16, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
      device.queue.writeBuffer(costs, 0, grid.costs as Uint32Array<ArrayBuffer>);
      device.queue.writeBuffer(pairs, 0, new Uint32Array(capturedRequests.flatMap(request => [request.start, request.goal])));
      device.queue.writeBuffer(params, 0, new Uint32Array([grid.width, grid.height, capturedRequests.length, maxPathLength]));
      const bindGroup = (read: GPUBuffer, write: GPUBuffer) => device.createBindGroup({ layout: this.layout, entries:
        [costs, pairs, read, write, changed, results, params].map((resource, binding) => ({ binding, resource: { buffer: resource } })),
      });
      const ab = bindGroup(fieldA, fieldB);
      const ba = bindGroup(fieldB, fieldA);
      const encoder = device.createCommandEncoder({ label: 'bounded GPU navigation batch' });
      const dispatch = (pipeline: GPUComputePipeline, group: GPUBindGroup, x: number, y = 1) => {
        // Dispatch boundaries provide visibility across workgroups, unlike workgroupBarrier.
        const pass = encoder.beginComputePass(); pass.setPipeline(pipeline); pass.setBindGroup(0, group);
        pass.dispatchWorkgroups(x, y); pass.end();
      };
      const workgroups = Math.ceil(count / 64);
      dispatch(this.pipelines.initialize, ba, workgroups, capturedRequests.length);
      for (let iteration = 0; iteration < maxIterations; iteration++) {
        dispatch(this.pipelines.relax, iteration % 2 === 0 ? ab : ba, workgroups, capturedRequests.length);
      }
      const finalGroup = maxIterations % 2 === 0 ? ab : ba;
      dispatch(this.pipelines.checkConvergence, finalGroup, workgroups, capturedRequests.length);
      dispatch(this.pipelines.extract, finalGroup, Math.ceil(capturedRequests.length / 64));
      encoder.copyBufferToBuffer(results, 0, readback, 0, outputBytes);
      device.queue.submit([encoder.finish()]);
      // Exactly one GPU->CPU readback, bounded by request count × route capacity.
      await readback.mapAsync(GPUMapMode.READ);
      const data = new Uint32Array(readback.getMappedRange().slice(0));
      readback.unmap();
      const error = await device.popErrorScope(); scopePopped = true;
      if (error) throw new Error(`WebGPU navigation validation: ${error.message}`);
      if (this.failure) throw new Error(this.failure);
      const statuses: NavigationStatus[] = ['inconclusive', 'found', 'unreachable', 'inconclusive', 'capacity-exceeded'];
      const paths = capturedRequests.map((request, index) => {
        const offset = index * (maxPathLength + 3);
        const statusCode = data[offset];
        const length = data[offset + 1];
        if (statusCode < 1 || statusCode > 4 || length > maxPathLength) throw new Error('Invalid GPU navigation result header');
        const status = statuses[statusCode];
        return {
          id: request.id, status,
          cells: status === 'found' ? data.slice(offset + 3, offset + 3 + length) : new Uint32Array(),
          totalCost: status === 'found' ? data[offset + 2] : null,
        };
      });
      return {
        revision: grid.revision, stale: generation !== this.generation || this.disposed, paths,
        metrics: { endToEndMs: performance.now() - startTime, iterations: maxIterations, allocatedBytes,
          readbackBytes: outputBytes, cells: count, requests: capturedRequests.length },
      };
    } finally {
      for (const buffer of buffers) buffer.destroy();
      if (!scopePopped) await device.popErrorScope();
      this.busy = false;
    }
  }

  dispose(): void { this.disposed = true; this.generation++; this.device.destroy(); }
  private assertUsable(): void {
    if (this.disposed) throw new Error('GpuNavigator has been disposed');
    if (this.failure) throw new Error(this.failure);
  }
}
