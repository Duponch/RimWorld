/** Instrumentation only: records native pipeline requests during the measured
 * phase. No wrapped descriptor, shader, buffer or command is modified. */
export function installGpuCallProbe(shaderDiff=false) {
  const modules=new WeakMap(),shaders=new Set(),createModule=GPUDevice.prototype.createShaderModule;
  GPUDevice.prototype.createShaderModule=function(descriptor){const module=createModule.call(this,descriptor);modules.set(module,descriptor.code);if(shaderDiff&&!window.__miningBench?.active)shaders.add(descriptor.code);return module;};
  for(const method of ['createRenderPipeline','createRenderPipelineAsync','createComputePipeline','createComputePipelineAsync']) {
    const original=GPUDevice.prototype[method];
    GPUDevice.prototype[method]=function(descriptor) {
      const b=window.__miningBench;
      if(b?.active) {
        const info={at:performance.now(),method,label:descriptor.label,primitive:descriptor.primitive,depthStencil:descriptor.depthStencil,targets:descriptor.fragment?.targets,buffers:descriptor.vertex?.buffers};
        info.vertexArrays=[...(modules.get(descriptor.vertex?.module)??'').matchAll(/value\s*:\s*array<[^\n]+/g)].map(m=>m[0]);
        info.object=b.pipelineObject;
        if(shaderDiff)for(const stage of ['vertex','fragment']){const code=modules.get(descriptor[stage]?.module)??'';let best='',at=-1;for(const old of shaders){let i=0;while(i<Math.min(old.length,code.length)&&old[i]===code[i])i++;if(i>at){at=i;best=old;}}info[stage+'Difference']={at,old:best.slice(Math.max(0,at-100),at+400),next:code.slice(Math.max(0,at-100),at+400)};}
        b.pipelines.push(info);performance.mark(`mining-pipeline-${b.pipelines.length}`);
      }
      return original.call(this,descriptor);
    };
  }
}
