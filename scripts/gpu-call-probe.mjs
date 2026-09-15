/** Instrumentation only: records native pipeline requests during the measured
 * phase. No wrapped descriptor, shader, buffer or command is modified. */
export function installGpuCallProbe() {
  for(const method of ['createRenderPipeline','createRenderPipelineAsync','createComputePipeline','createComputePipelineAsync']) {
    const original=GPUDevice.prototype[method];
    GPUDevice.prototype[method]=function(descriptor) {
      const b=window.__miningBench;
      if(b?.active) {
        const info={at:performance.now(),method,label:descriptor.label,primitive:descriptor.primitive,depthStencil:descriptor.depthStencil,targets:descriptor.fragment?.targets,buffers:descriptor.vertex?.buffers};
        b.pipelines.push(info);performance.mark(`mining-pipeline-${b.pipelines.length}`);
      }
      return original.call(this,descriptor);
    };
  }
}
